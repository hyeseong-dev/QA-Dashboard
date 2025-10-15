import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export async function POST(request: Request) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증 토큰이 없습니다.' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    try {
      // Verify and decode token
      const decoded = verify(token, JWT_SECRET) as any;
      
      // Deactivate session in database
      await query(
        `UPDATE sessions 
         SET is_active = false 
         WHERE user_id = $1 AND token = $2 AND is_active = true`,
        [decoded.userId, decoded.sessionToken]
      );

      return NextResponse.json({
        success: true,
        message: '로그아웃 되었습니다.'
      });
      
    } catch (tokenError) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: '로그아웃 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}