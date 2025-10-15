import { verify } from 'jsonwebtoken';
import { query } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export interface SessionUser {
  userId: string;
  email: string;
  role: string;
  sessionToken: string;
}

export async function validateSession(token: string): Promise<SessionUser | null> {
  try {
    // 1. Verify JWT token
    const decoded = verify(token, JWT_SECRET) as SessionUser;
    
    // 2. Check if session exists and is active
    const sessionResult = await query(
      `SELECT * FROM sessions 
       WHERE user_id = $1 
         AND token = $2 
         AND is_active = true 
         AND expires_at > CURRENT_TIMESTAMP`,
      [decoded.userId, decoded.sessionToken]
    );

    if (sessionResult.rows.length === 0) {
      return null;
    }

    const session = sessionResult.rows[0];

    // 3. Update last activity if it's been more than 5 minutes
    const lastActivity = new Date(session.last_activity);
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000;

    if (now.getTime() - lastActivity.getTime() > fiveMinutes) {
      await query(
        'UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE token = $1',
        [decoded.sessionToken]
      );
    }

    // 4. Check if session has been inactive for more than 30 minutes
    const thirtyMinutes = 30 * 60 * 1000;
    const timeDiff = now.getTime() - lastActivity.getTime();
    
    if (timeDiff > thirtyMinutes) {
      // Deactivate session due to inactivity
      await query(
        'UPDATE sessions SET is_active = false WHERE token = $1',
        [decoded.sessionToken]
      );
      return null;
    }
    return decoded;
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

export async function requireAuth(request: Request): Promise<SessionUser> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized: No token provided');
  }

  const token = authHeader.substring(7);
  const user = await validateSession(token);

  if (!user) {
    throw new Error('Unauthorized: Invalid or expired session');
  }

  return user;
}