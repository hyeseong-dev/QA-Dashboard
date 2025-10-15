# 세션 관리 시스템 설계서

**문서 버전**: 1.0  
**작성일**: 2025-01-15  
**프로젝트**: QA Dashboard - Session Management System

---

## 1. 개요

### 1.1 목적
- 사용자 로그인/로그아웃 상태 실시간 추적
- 온라인/오프라인 상태 정확한 관리
- 자동 세션 만료 및 보안 강화
- 다중 디바이스 접속 관리

### 1.2 핵심 기능
- 세션 기반 인증 관리
- 실시간 온라인 상태 추적
- 자동 로그아웃 (타임아웃)
- 세션 히스토리 관리
- 동시 접속 제한 옵션

---

## 2. 데이터베이스 스키마

### 2.1 sessions 테이블
```sql
CREATE TABLE sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  
  -- 세션 정보
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  
  -- 시간 정보
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  logged_out_at TIMESTAMP,
  
  -- 상태 정보
  is_active BOOLEAN DEFAULT true,
  logout_reason VARCHAR(50), -- 'manual', 'timeout', 'forced', 'expired'
  
  -- 인덱스
  INDEX idx_sessions_user_id (user_id),
  INDEX idx_sessions_token_hash (token_hash),
  INDEX idx_sessions_is_active (is_active),
  INDEX idx_sessions_expires_at (expires_at)
);
```

### 2.2 session_activities 테이블 (선택적 - 상세 추적용)
```sql
CREATE TABLE session_activities (
  activity_id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
  activity_type VARCHAR(50), -- 'page_view', 'api_call', 'test_submit'
  activity_details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_activities_session_id (session_id),
  INDEX idx_activities_created_at (created_at)
);
```

### 2.3 users 테이블 업데이트
```sql
-- 기존 is_online 필드를 세션 기반으로 계산하도록 변경
ALTER TABLE users 
DROP COLUMN IF EXISTS is_online;

-- 뷰 생성: 활성 세션이 있는 사용자를 온라인으로 표시
CREATE OR REPLACE VIEW users_with_status AS
SELECT 
  u.*,
  CASE WHEN s.active_sessions > 0 THEN true ELSE false END as is_online,
  s.active_sessions,
  s.last_activity_at
FROM users u
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) as active_sessions,
    MAX(last_activity_at) as last_activity_at
  FROM sessions
  WHERE is_active = true 
    AND expires_at > CURRENT_TIMESTAMP
  GROUP BY user_id
) s ON u.user_id = s.user_id;
```

---

## 3. API 설계

### 3.1 로그인 프로세스

#### POST /api/auth/login
```typescript
// Request
{
  email: string;
  password: string;
  remember_me?: boolean;
}

// Process
1. 사용자 인증
2. 기존 활성 세션 확인
3. 새 세션 생성
4. JWT 토큰 발급
5. 세션 테이블에 기록

// Response
{
  success: true,
  token: string,
  sessionId: string,
  user: User,
  expiresIn: number // 초 단위
}

// Implementation
async function login(email, password, rememberMe = false) {
  // 1. 사용자 인증
  const user = await authenticateUser(email, password);
  
  // 2. 세션 만료 시간 설정
  const sessionDuration = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30일 or 24시간
  const expiresAt = new Date(Date.now() + sessionDuration * 1000);
  
  // 3. JWT 토큰 생성
  const token = jwt.sign(
    { userId: user.user_id, sessionId: sessionId },
    JWT_SECRET,
    { expiresIn: sessionDuration }
  );
  
  // 4. 세션 저장
  const session = await query(`
    INSERT INTO sessions (
      user_id, token_hash, ip_address, user_agent, 
      device_info, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING session_id
  `, [
    user.user_id,
    hashToken(token),
    request.ip,
    request.headers['user-agent'],
    { browser: getBrowserInfo(request) },
    expiresAt
  ]);
  
  // 5. 마지막 로그인 시간 업데이트
  await query(`
    UPDATE users SET last_login_at = CURRENT_TIMESTAMP 
    WHERE user_id = $1
  `, [user.user_id]);
  
  return { token, sessionId: session.session_id, expiresIn: sessionDuration };
}
```

### 3.2 로그아웃 프로세스

#### POST /api/auth/logout
```typescript
// Request Headers
Authorization: Bearer <token>

// Process
1. 토큰에서 세션 ID 추출
2. 세션 비활성화
3. 로그아웃 시간 및 이유 기록

// Implementation
async function logout(token) {
  const decoded = jwt.verify(token, JWT_SECRET);
  
  await query(`
    UPDATE sessions 
    SET 
      is_active = false,
      logged_out_at = CURRENT_TIMESTAMP,
      logout_reason = 'manual'
    WHERE session_id = $1 AND user_id = $2
  `, [decoded.sessionId, decoded.userId]);
}
```

### 3.3 세션 검증 및 활동 업데이트

#### Middleware: validateSession
```typescript
async function validateSession(request) {
  const token = extractToken(request);
  if (!token) return null;
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 세션 유효성 확인
    const session = await query(`
      SELECT * FROM sessions 
      WHERE session_id = $1 
        AND is_active = true 
        AND expires_at > CURRENT_TIMESTAMP
    `, [decoded.sessionId]);
    
    if (!session.rows[0]) {
      throw new Error('Session expired or invalid');
    }
    
    // 마지막 활동 시간 업데이트 (5분마다)
    const lastActivity = new Date(session.rows[0].last_activity_at);
    if (Date.now() - lastActivity.getTime() > 5 * 60 * 1000) {
      await query(`
        UPDATE sessions 
        SET last_activity_at = CURRENT_TIMESTAMP 
        WHERE session_id = $1
      `, [decoded.sessionId]);
    }
    
    return { user: decoded, session: session.rows[0] };
  } catch (error) {
    return null;
  }
}
```

### 3.4 자동 로그아웃 시스템

#### 클라이언트 측 (Frontend)
```typescript
// contexts/SessionContext.tsx
import { createContext, useContext, useEffect, useRef } from 'react';

const SessionContext = createContext({});

export function SessionProvider({ children }) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningTimeoutRef = useRef<NodeJS.Timeout>();
  
  const IDLE_TIMEOUT = 30 * 60 * 1000; // 30분
  const WARNING_TIME = 5 * 60 * 1000; // 5분 전 경고
  
  const resetTimer = () => {
    // 기존 타이머 취소
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    
    // 경고 타이머 설정
    warningTimeoutRef.current = setTimeout(() => {
      showWarning('5분 후 자동 로그아웃됩니다.');
    }, IDLE_TIMEOUT - WARNING_TIME);
    
    // 로그아웃 타이머 설정
    timeoutRef.current = setTimeout(() => {
      handleAutoLogout();
    }, IDLE_TIMEOUT);
  };
  
  const handleAutoLogout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Logout-Reason': 'timeout'
      }
    });
    
    // 로그아웃 처리
    logout();
    router.push('/login?reason=timeout');
  };
  
  useEffect(() => {
    // 사용자 활동 감지
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const handleUserActivity = () => {
      resetTimer();
      // 서버에 활동 알림 (throttle 적용)
      notifyActivity();
    };
    
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity);
    });
    
    // 초기 타이머 설정
    resetTimer();
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    };
  }, []);
  
  return (
    <SessionContext.Provider value={{}}>
      {children}
    </SessionContext.Provider>
  );
}
```

#### 서버 측 - 만료 세션 정리 (Cron Job)
```typescript
// api/cron/cleanup-sessions.ts
export async function cleanupExpiredSessions() {
  // 1. 만료된 세션 비활성화
  await query(`
    UPDATE sessions 
    SET 
      is_active = false,
      logout_reason = 'expired'
    WHERE is_active = true 
      AND expires_at < CURRENT_TIMESTAMP
  `);
  
  // 2. 비활성 세션 비활성화 (30분 이상 활동 없음)
  await query(`
    UPDATE sessions 
    SET 
      is_active = false,
      logout_reason = 'timeout',
      logged_out_at = CURRENT_TIMESTAMP
    WHERE is_active = true 
      AND last_activity_at < CURRENT_TIMESTAMP - INTERVAL '30 minutes'
  `);
  
  // 3. 오래된 세션 기록 삭제 (90일 이상)
  await query(`
    DELETE FROM sessions 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
  `);
}

// 5분마다 실행
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);
```

---

## 4. 세션 관리 정책

### 4.1 세션 수명 주기
```
생성 (Login) → 활성 (Active) → 만료/로그아웃 → 정리 (Cleanup)
     ↓              ↓                ↓
  session_id    heartbeat      logout_reason
   created      updates         logged_out_at
```

### 4.2 동시 접속 정책
```typescript
// Option 1: 단일 세션만 허용
async function enforceSingleSession(userId) {
  await query(`
    UPDATE sessions 
    SET 
      is_active = false,
      logout_reason = 'forced',
      logged_out_at = CURRENT_TIMESTAMP
    WHERE user_id = $1 AND is_active = true
  `, [userId]);
}

// Option 2: 최대 N개 세션 허용
async function enforceMaxSessions(userId, maxSessions = 3) {
  const sessions = await query(`
    SELECT session_id FROM sessions 
    WHERE user_id = $1 AND is_active = true 
    ORDER BY created_at DESC
  `, [userId]);
  
  if (sessions.rows.length >= maxSessions) {
    // 가장 오래된 세션 종료
    const oldestSession = sessions.rows[sessions.rows.length - 1];
    await query(`
      UPDATE sessions 
      SET is_active = false, logout_reason = 'forced'
      WHERE session_id = $1
    `, [oldestSession.session_id]);
  }
}
```

### 4.3 보안 고려사항

1. **토큰 해싱**: 데이터베이스에 토큰을 평문으로 저장하지 않음
2. **IP 검증**: 의심스러운 IP 변경 감지
3. **User-Agent 검증**: 브라우저 변경 감지
4. **Rate Limiting**: 로그인 시도 제한
5. **세션 고정 공격 방지**: 로그인 시 새 세션 ID 생성

---

## 5. 사용자 온라인 상태 표시

### 5.1 실시간 상태 조회
```typescript
// GET /api/users (관리자용)
async function getUsersWithStatus() {
  const users = await query(`
    SELECT 
      u.user_id,
      u.user_name,
      u.email,
      u.role,
      u.created_at,
      COALESCE(s.is_online, false) as is_online,
      s.active_sessions,
      s.last_activity_at
    FROM users u
    LEFT JOIN (
      SELECT 
        user_id,
        true as is_online,
        COUNT(*) as active_sessions,
        MAX(last_activity_at) as last_activity_at
      FROM sessions
      WHERE is_active = true 
        AND expires_at > CURRENT_TIMESTAMP
        AND last_activity_at > CURRENT_TIMESTAMP - INTERVAL '30 minutes'
      GROUP BY user_id
    ) s ON u.user_id = s.user_id
    ORDER BY s.is_online DESC, u.user_name
  `);
  
  return users.rows;
}
```

### 5.2 WebSocket을 통한 실시간 업데이트 (선택적)
```typescript
// 실시간 온라인 상태 브로드캐스트
io.on('connection', (socket) => {
  socket.on('user:online', async (userId) => {
    await updateSessionActivity(userId);
    io.emit('status:update', { userId, status: 'online' });
  });
  
  socket.on('disconnect', async () => {
    const userId = socket.userId;
    if (userId) {
      const hasOtherSessions = await checkOtherActiveSessions(userId);
      if (!hasOtherSessions) {
        io.emit('status:update', { userId, status: 'offline' });
      }
    }
  });
});
```

---

## 6. 구현 로드맵

### Phase 1: 기본 세션 관리 (1주)
- [ ] sessions 테이블 생성
- [ ] 로그인/로그아웃 API 수정
- [ ] 세션 검증 미들웨어
- [ ] 기본 온라인 상태 표시

### Phase 2: 자동 로그아웃 (1주)
- [ ] 클라이언트 idle 타이머
- [ ] 서버 세션 정리 크론
- [ ] 경고 메시지 UI
- [ ] 세션 만료 처리

### Phase 3: 고급 기능 (선택적)
- [ ] 세션 히스토리 조회
- [ ] 디바이스별 세션 관리
- [ ] 강제 로그아웃 기능
- [ ] 실시간 상태 업데이트

---

## 7. 테스트 시나리오

### 7.1 기능 테스트
1. 정상 로그인/로그아웃
2. 자동 로그아웃 (30분 비활성)
3. 토큰 만료 처리
4. 동시 접속 제한
5. 세션 복구

### 7.2 보안 테스트
1. 만료된 토큰 접근 차단
2. 다른 사용자 세션 접근 방지
3. SQL Injection 방어
4. XSS 방어

### 7.3 성능 테스트
1. 대량 세션 처리
2. 세션 조회 속도
3. 정리 작업 부하

---

## 8. 모니터링 및 로깅

### 8.1 모니터링 지표
- 활성 세션 수
- 평균 세션 지속 시간
- 로그아웃 이유 분포
- 동시 접속자 수

### 8.2 로그 수집
```typescript
// 로그인 이벤트
logger.info('User login', {
  userId,
  sessionId,
  ip: request.ip,
  userAgent: request.headers['user-agent']
});

// 로그아웃 이벤트
logger.info('User logout', {
  userId,
  sessionId,
  reason: logout_reason,
  sessionDuration: Date.now() - session.created_at
});

// 세션 만료
logger.warn('Session expired', {
  sessionId,
  userId,
  lastActivity: session.last_activity_at
});
```

---

**문서 버전 관리**
- v1.0 (2025-01-15): 초기 설계서 작성