// Session cleanup utility
// This can be called on server startup or scheduled intervals

import { query } from './db';

export async function cleanupSessions() {
  try {
    // 1. Deactivate inactive sessions (30+ minutes)
    const inactiveResult = await query(`
      UPDATE sessions 
      SET is_active = false
      WHERE is_active = true
        AND last_activity < CURRENT_TIMESTAMP - INTERVAL '30 minutes'
    `);

    // 2. Deactivate expired sessions
    const expiredResult = await query(`
      UPDATE sessions 
      SET is_active = false
      WHERE is_active = true
        AND expires_at < CURRENT_TIMESTAMP
    `);

    // 3. Delete old session records (30+ days)
    const deletedResult = await query(`
      DELETE FROM sessions 
      WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
    `);

    console.log('Session cleanup completed:', {
      inactive: inactiveResult.rowCount,
      expired: expiredResult.rowCount,
      deleted: deletedResult.rowCount,
      timestamp: new Date().toISOString()
    });

    return {
      inactive: inactiveResult.rowCount,
      expired: expiredResult.rowCount,
      deleted: deletedResult.rowCount
    };
  } catch (error) {
    console.error('Session cleanup error:', error);
    throw error;
  }
}

// Schedule cleanup every 5 minutes
let cleanupInterval: NodeJS.Timeout | null = null;

export function startSessionCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }

  // Run cleanup immediately
  cleanupSessions().catch(console.error);

  // Then run every 5 minutes
  cleanupInterval = setInterval(() => {
    cleanupSessions().catch(console.error);
  }, 5 * 60 * 1000);

  console.log('Session cleanup scheduler started');
}

export function stopSessionCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('Session cleanup scheduler stopped');
  }
}