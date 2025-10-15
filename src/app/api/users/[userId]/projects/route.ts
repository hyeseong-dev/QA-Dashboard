import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// GET /api/users/[userId]/projects - 사용자의 프로젝트 목록 조회
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    
    // 토큰 검증
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // 관리자만 다른 사용자의 프로젝트 조회 가능
    if (decoded.role !== 'Admin' && decoded.userId !== userId) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    }

    // 사용자가 참여한 프로젝트 목록 조회
    const result = await query(
      `SELECT DISTINCT 
        p.project_id,
        p.project_name,
        p.description,
        p.status,
        COUNT(DISTINCT tc.case_id) as total_cases,
        COUNT(DISTINCT tr.result_id) as user_tests
       FROM projects p
       LEFT JOIN test_cases tc ON p.project_id = tc.project_id
       LEFT JOIN test_results tr ON tc.case_id = tr.case_id AND tr.tester = $1
       WHERE p.status = 'active'
         AND EXISTS (
           SELECT 1 FROM test_results tr2
           JOIN test_cases tc2 ON tr2.case_id = tc2.case_id
           WHERE tc2.project_id = p.project_id AND tr2.tester = $1
         )
       GROUP BY p.project_id, p.project_name, p.description, p.status
       ORDER BY p.project_name`,
      [userId]
    );

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Get user projects error:', error);
    return NextResponse.json(
      { error: '프로젝트 목록 조회 실패' },
      { status: 500 }
    );
  }
}