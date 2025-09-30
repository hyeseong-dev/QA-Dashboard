import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { User } from '@/types';

export async function GET() {
  try {
    const result = await query(
      'SELECT user_id, user_name, email, role FROM users ORDER BY user_name'
    );
    
    const users: User[] = result.rows;
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}