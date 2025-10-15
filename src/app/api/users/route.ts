import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // Validate session
    try {
      await requireAuth(request);
    } catch (error) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // Fetch all users from users table
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
        last_login_at,
        created_at,
        updated_at
      FROM users
      ORDER BY user_name ASC`
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: '사용자 목록을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}