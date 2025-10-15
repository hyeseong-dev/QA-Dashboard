import { NextRequest } from 'next/server';
import { Client } from 'pg';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://qa_user:qa_password@localhost:5432/qa_dashboard';

// SSE 연결 관리
const connections = new Map<string, {
  controller: ReadableStreamDefaultController;
  userId: string;
  lastPing: number;
}>();

// PostgreSQL 클라이언트 (LISTEN용)
let pgClient: Client | null = null;
let isListening = false;

async function initializePostgresListener() {
  if (isListening) return;
  
  try {
    pgClient = new Client({
      connectionString: DATABASE_URL,
    });
    
    await pgClient.connect();
    
    // 세션 업데이트 채널 구독
    await pgClient.query('LISTEN session_updates');
    await pgClient.query('LISTEN user_status_updates');
    
    // 알림 처리
    pgClient.on('notification', (msg) => {
      try {
        const payload = JSON.parse(msg.payload || '{}');
        
        // 모든 연결된 클라이언트에게 브로드캐스트
        connections.forEach((connection, connectionId) => {
          try {
            const data = JSON.stringify({
              type: payload.type,
              data: payload,
              timestamp: new Date().toISOString()
            });
            
            connection.controller.enqueue(`data: ${data}\n\n`);
          } catch (error) {
            console.error('브로드캐스트 오류:', error);
            connections.delete(connectionId);
          }
        });
      } catch (error) {
        console.error('알림 처리 오류:', error);
      }
    });
    
    pgClient.on('error', (error) => {
      console.error('PostgreSQL 연결 오류:', error);
      isListening = false;
      pgClient = null;
    });
    
    isListening = true;
    console.log('PostgreSQL LISTEN 시작됨');
    
  } catch (error) {
    console.error('PostgreSQL LISTEN 초기화 실패:', error);
    isListening = false;
    pgClient = null;
  }
}

// 연결 정리
function cleanupConnections() {
  const now = Date.now();
  const timeout = 65000; // 65초 타임아웃
  
  connections.forEach((connection, connectionId) => {
    if (now - connection.lastPing > timeout) {
      try {
        connection.controller.close();
      } catch (error) {
        console.error('연결 정리 오류:', error);
      }
      connections.delete(connectionId);
    }
  });
}

// 정기적으로 연결 정리
setInterval(cleanupConnections, 30000);

export async function GET(request: NextRequest) {
  // URL에서 토큰 추출 (EventSource는 헤더 설정 불가)
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  
  if (!token) {
    return new Response('Unauthorized - Token required', { status: 401 });
  }
  let decoded: any;
  
  try {
    decoded = verify(token, JWT_SECRET);
  } catch (error) {
    return new Response('Invalid token', { status: 401 });
  }

  // PostgreSQL LISTEN 초기화
  await initializePostgresListener();

  // SSE 스트림 생성
  const stream = new ReadableStream({
    start(controller) {
      const connectionId = `${decoded.userId}_${Date.now()}_${Math.random()}`;
      
      // 연결 등록
      connections.set(connectionId, {
        controller,
        userId: decoded.userId,
        lastPing: Date.now()
      });

      // 초기 연결 메시지
      controller.enqueue(`data: ${JSON.stringify({
        type: 'connected',
        message: 'SSE 연결 성공',
        userId: decoded.userId,
        timestamp: new Date().toISOString()
      })}\n\n`);

      // Keep-alive ping (30초마다)
      const pingInterval = setInterval(() => {
        try {
          const connection = connections.get(connectionId);
          if (connection) {
            connection.lastPing = Date.now();
            controller.enqueue(`data: ${JSON.stringify({
              type: 'ping',
              timestamp: new Date().toISOString()
            })}\n\n`);
          } else {
            clearInterval(pingInterval);
          }
        } catch (error) {
          console.error('Ping 오류:', error);
          clearInterval(pingInterval);
          connections.delete(connectionId);
        }
      }, 30000);

      // 연결 종료 시 정리
      request.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        connections.delete(connectionId);
        console.log(`SSE 연결 종료: ${connectionId}`);
      });
    },
    
    cancel() {
      // 스트림 취소 시 정리
      console.log('SSE 스트림 취소됨');
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

// 연결 상태 확인 엔드포인트
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'status') {
      return Response.json({
        connections: connections.size,
        isListening,
        timestamp: new Date().toISOString()
      });
    }
    
    if (action === 'test') {
      // 테스트 알림 전송
      if (pgClient && isListening) {
        await pgClient.query('SELECT test_notification()');
        return Response.json({ message: '테스트 알림 전송됨' });
      } else {
        return Response.json({ error: 'PostgreSQL 연결 없음' }, { status: 500 });
      }
    }
    
    return Response.json({ error: '지원하지 않는 액션' }, { status: 400 });
    
  } catch (error) {
    console.error('POST 요청 오류:', error);
    return Response.json({ error: '서버 오류' }, { status: 500 });
  }
}