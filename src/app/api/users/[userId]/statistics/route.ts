import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// GET /api/users/[userId]/statistics - 사용자의 테스트 통계 조회
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

    // 관리자만 다른 사용자의 통계 조회 가능
    if (decoded.role !== 'Admin' && decoded.userId !== userId) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    }

    // 전체 테스트 통계
    const totalStats = await query(
      `SELECT 
        COUNT(*) as total_tests,
        COUNT(CASE WHEN status = 'pass' THEN 1 END) as passed_tests,
        COUNT(CASE WHEN status = 'fail' THEN 1 END) as failed_tests,
        COUNT(CASE WHEN status = 'blocker' THEN 1 END) as blocker_tests
       FROM test_results
       WHERE tester = $1`,
      [userId]
    );

    // 최근 7일 테스트 통계
    const recentStats = await query(
      `SELECT 
        DATE(created_at) as test_date,
        COUNT(*) as test_count,
        COUNT(CASE WHEN status = 'pass' THEN 1 END) as passed,
        COUNT(CASE WHEN status = 'fail' THEN 1 END) as failed
       FROM test_results
       WHERE tester = $1 
         AND created_at >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY DATE(created_at)
       ORDER BY test_date DESC`,
      [userId]
    );

    // 프로젝트별 통계
    const projectStats = await query(
      `SELECT 
        p.project_name,
        COUNT(tr.result_id) as test_count,
        COUNT(CASE WHEN tr.status = 'pass' THEN 1 END) as passed,
        COUNT(CASE WHEN tr.status = 'fail' THEN 1 END) as failed
       FROM test_results tr
       JOIN test_cases tc ON tr.case_id = tc.case_id
       JOIN projects p ON tc.project_id = p.project_id
       WHERE tr.tester = $1
       GROUP BY p.project_name
       ORDER BY test_count DESC
       LIMIT 5`,
      [userId]
    );

    // 최근 활동
    const recentActivity = await query(
      `SELECT 
        tr.result_id,
        tr.status,
        tr.created_at,
        tc.item as test_item,
        p.project_name
       FROM test_results tr
       JOIN test_cases tc ON tr.case_id = tc.case_id
       JOIN projects p ON tc.project_id = p.project_id
       WHERE tr.tester = $1
       ORDER BY tr.created_at DESC
       LIMIT 10`,
      [userId]
    );

    return NextResponse.json({
      total: totalStats.rows[0],
      recent: recentStats.rows,
      projects: projectStats.rows,
      activity: recentActivity.rows
    });
  } catch (error: any) {
    console.error('Get user statistics error:', error);
    return NextResponse.json(
      { error: '통계 조회 실패' },
      { status: 500 }
    );
  }
}