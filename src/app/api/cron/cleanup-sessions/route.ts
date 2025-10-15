import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// This endpoint should be called periodically (e.g., every 5 minutes)
// Can be triggered by a cron job or external scheduler
export async function POST(request: Request) {
  try {
    // Optional: Add a secret key check for security
    const authHeader = request.headers.get('x-cron-secret');
    const cronSecret = process.env.CRON_SECRET || 'default-cron-secret';
    
    if (authHeader !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 1. Deactivate sessions that have been inactive for more than 30 minutes
    const inactiveResult = await query(`
      UPDATE sessions 
      SET is_active = false
      WHERE is_active = true
        AND last_activity < CURRENT_TIMESTAMP - INTERVAL '30 minutes'
      RETURNING session_id
    `);

    // 2. Deactivate expired sessions
    const expiredResult = await query(`
      UPDATE sessions 
      SET is_active = false
      WHERE is_active = true
        AND expires_at < CURRENT_TIMESTAMP
      RETURNING session_id
    `);

    // 3. Delete old session records (older than 30 days)
    const deletedResult = await query(`
      DELETE FROM sessions 
      WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
      RETURNING session_id
    `);

    return NextResponse.json({
      success: true,
      cleaned: {
        inactive: inactiveResult.rows.length,
        expired: expiredResult.rows.length,
        deleted: deletedResult.rows.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Session cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup sessions' },
      { status: 500 }
    );
  }
}

// GET endpoint for manual testing
export async function GET(request: Request) {
  return NextResponse.json({
    message: 'Session cleanup endpoint',
    description: 'POST to this endpoint with x-cron-secret header to cleanup sessions'
  });
}