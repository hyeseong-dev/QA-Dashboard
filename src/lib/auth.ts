import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

export async function validateJWT(token: string): Promise<AuthUser | null> {
  try {
    // JWT 토큰 검증 (만료 시간도 자동으로 체크됨)
    const decoded = verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch (error) {
    console.error('JWT validation error:', error);
    return null;
  }
}

export async function requireAuth(request: Request): Promise<AuthUser> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized: No token provided');
  }

  const token = authHeader.substring(7);
  const user = await validateJWT(token);

  if (!user) {
    throw new Error('Unauthorized: Invalid or expired token');
  }

  return user;
}