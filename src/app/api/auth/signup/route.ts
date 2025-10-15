import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sign } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export async function POST(request: Request) {
  try {
    const { email, password, user_name, role } = await request.json();

    if (!email || !password || !user_name || !role) {
      return NextResponse.json(
        { error: '모든 필드를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (!['Admin', 'Tester'].includes(role)) {
      return NextResponse.json(
        { error: '올바른 역할을 선택해주세요.' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await query(
      'SELECT user_id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: '이미 존재하는 이메일입니다.' },
        { status: 409 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Generate user_id
    const userIdPrefix = role.substring(0, 1).toLowerCase(); // 'a' for Admin, 't' for Tester
    const countResult = await query('SELECT COUNT(*) as count FROM users');
    const userNumber = String(parseInt(countResult.rows[0].count) + 1).padStart(3, '0');
    const user_id = `user-${userIdPrefix}${userNumber}`;

    // Create user
    const insertResult = await query(
      `INSERT INTO users (user_id, email, password_hash, user_name, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING user_id, email, user_name, role`,
      [user_id, email, password_hash, user_name, role]
    );

    const newUser = insertResult.rows[0];

    // Update last login time in users table
    await query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE user_id = $1',
      [newUser.user_id]
    );

    // Generate JWT token (stateless)
    const token = sign(
      { 
        userId: newUser.user_id, 
        email: newUser.email,
        role: newUser.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return NextResponse.json({
      success: true,
      token,
      user: newUser
    });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: '회원가입 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}