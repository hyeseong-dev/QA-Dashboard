import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: Request) {
  try {
    // Check authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Only allow admin
    if (decoded.role !== 'Admin') {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 });
    }

    // Execute schema updates
    const updates = [
      // Add timestamp columns
      `ALTER TABLE users 
       ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
      
      // Add activity tracking columns
      `ALTER TABLE users
       ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
       ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false`,
      
      // Add profile columns
      `ALTER TABLE users
       ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255),
       ADD COLUMN IF NOT EXISTS department VARCHAR(100),
       ADD COLUMN IF NOT EXISTS position VARCHAR(100),
       ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`,
      
      // Create trigger function
      `CREATE OR REPLACE FUNCTION update_updated_at_column()
       RETURNS TRIGGER AS $$
       BEGIN
           NEW.updated_at = CURRENT_TIMESTAMP;
           RETURN NEW;
       END;
       $$ LANGUAGE plpgsql`,
      
      // Apply trigger
      `DROP TRIGGER IF EXISTS update_users_updated_at ON users`,
      
      `CREATE TRIGGER update_users_updated_at
       BEFORE UPDATE ON users
       FOR EACH ROW
       EXECUTE FUNCTION update_updated_at_column()`,
      
      // Update existing records
      `UPDATE users 
       SET created_at = CURRENT_TIMESTAMP 
       WHERE created_at IS NULL`,
      
      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_users_is_online ON users(is_online)`,
      `CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at DESC)`
    ];

    const results = [];
    for (const sql of updates) {
      try {
        await query(sql);
        results.push({ sql: sql.substring(0, 50) + '...', status: 'success' });
      } catch (error: any) {
        results.push({ 
          sql: sql.substring(0, 50) + '...', 
          status: 'error', 
          message: error.message 
        });
      }
    }

    return NextResponse.json({ 
      message: '스키마 업데이트 완료',
      results 
    });

  } catch (error: any) {
    console.error('Schema update error:', error);
    return NextResponse.json(
      { error: '스키마 업데이트 실패', details: error.message },
      { status: 500 }
    );
  }
}