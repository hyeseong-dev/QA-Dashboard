import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다.' },
        { status: 401 }
      );
    }

    const token = authorization.split(' ')[1];

    // Verify JWT token
    const decoded = verify(token, JWT_SECRET) as any;
    
    // Check if session is still active in database
    const sessionResult = await query(
      `SELECT * FROM sessions 
       WHERE user_id = $1 
         AND token = $2 
         AND is_active = true 
         AND expires_at > CURRENT_TIMESTAMP`,
      [decoded.userId, decoded.sessionToken]
    );

    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        { error: '세션이 만료되었거나 로그아웃되었습니다.' },
        { status: 401 }
      );
    }
    
    // Get fresh user data from database
    const userResult = await query(
      'SELECT user_id, email, user_name, role FROM users WHERE user_id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    return NextResponse.json(user);

  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json(
      { error: '인증에 실패했습니다.' },
      { status: 401 }
    );
  }
}