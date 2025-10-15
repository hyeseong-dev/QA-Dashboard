import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sign } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // Find user by email
    const userResult = await query(
      'SELECT user_id, email, password_hash, user_name, role FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: '존재하지 않는 이메일입니다.' },
        { status: 401 }
      );
    }

    const user = userResult.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: '비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // 1. Deactivate existing sessions for this user (single session policy)
    await query(
      'UPDATE sessions SET is_active = false WHERE user_id = $1 AND is_active = true',
      [user.user_id]
    );

    // 2. Generate session token
    const sessionToken = randomBytes(32).toString('hex');
    const sessionId = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // 3. Create new session in database
    await query(
      `INSERT INTO sessions (user_id, token, expires_at, last_activity)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [user.user_id, sessionToken, expiresAt]
    );

    // 4. Update last login time in users table
    await query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE user_id = $1',
      [user.user_id]
    );

    // 5. Generate JWT token with session info
    const token = sign(
      { 
        userId: user.user_id, 
        email: user.email,
        role: user.role,
        sessionToken: sessionToken
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data without password
    const userData = {
      user_id: user.user_id,
      email: user.email,
      user_name: user.user_name,
      role: user.role
    };

    return NextResponse.json({
      success: true,
      token,
      user: userData
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}