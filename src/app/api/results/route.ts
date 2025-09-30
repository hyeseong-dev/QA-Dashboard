import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { CreateTestResultRequest } from '@/types';

export async function POST(request: Request) {
  try {
    const body: CreateTestResultRequest = await request.json();
    const { case_id, user_id, status, environment, notes, bug_id } = body;
    
    // Validate required fields
    if (!case_id || !user_id || !status) {
      return NextResponse.json(
        { error: 'case_id, user_id, and status are required' },
        { status: 400 }
      );
    }
    
    // Validate status
    if (!['pass', 'fail', 'blocker'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be pass, fail, or blocker' },
        { status: 400 }
      );
    }
    
    // Validate user exists
    const userCheck = await query(
      'SELECT user_id FROM users WHERE user_id = $1',
      [user_id]
    );
    
    if (userCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Insert the test result
    const result = await query(
      `INSERT INTO test_results (case_id, user_id, status, environment, notes, bug_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING result_id, case_id, user_id, status, environment, notes, bug_id, created_at`,
      [case_id, user_id, status, JSON.stringify(environment), notes, bug_id]
    );
    
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating test result:', error);
    return NextResponse.json(
      { error: 'Failed to create test result' },
      { status: 500 }
    );
  }
}