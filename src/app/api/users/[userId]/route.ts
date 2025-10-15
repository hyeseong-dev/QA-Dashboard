import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// GET /api/users/[userId] - 특정 사용자 상세 정보 조회
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    
    // 토큰 검증
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // 관리자만 다른 사용자 정보 조회 가능
    if (decoded.role !== 'Admin' && decoded.userId !== userId) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    }

    const result = await query(
      `SELECT 
        user_id, 
        user_name, 
        email, 
        role,
        department,
        position,
        phone,
        profile_image,
        is_online,
        last_login_at,
        created_at,
        updated_at
       FROM users 
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: '사용자 정보 조회 실패' },
      { status: 500 }
    );
  }
}

// PATCH /api/users/[userId]/status - 사용자 온라인 상태 업데이트
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { is_online } = await request.json();
    
    // 토큰 검증
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // 본인 또는 관리자만 상태 업데이트 가능
    if (decoded.userId !== userId && decoded.role !== 'Admin') {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    }

    const updateQuery = is_online
      ? `UPDATE users 
         SET is_online = true, last_login_at = CURRENT_TIMESTAMP 
         WHERE user_id = $1 
         RETURNING user_id, is_online, last_login_at`
      : `UPDATE users 
         SET is_online = false 
         WHERE user_id = $1 
         RETURNING user_id, is_online, last_login_at`;

    const result = await query(updateQuery, [userId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update user status error:', error);
    return NextResponse.json(
      { error: '상태 업데이트 실패' },
      { status: 500 }
    );
  }
}