import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export async function PATCH(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    const body = await request.json();
    const { status } = body;
    
    // JWT 토큰 검증 및 관리자 권한 확인
    const authorization = request.headers.get('authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authorization.split(' ')[1];
    
    try {
      const decoded = verify(token, JWT_SECRET) as any;
      
      // 사용자 정보 조회
      const userResult = await query(
        'SELECT user_id, user_name, role FROM users WHERE user_id = $1',
        [decoded.userId]
      );

      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const user = userResult.rows[0];
      
      // 관리자 권한 확인
      if (user.role !== 'Admin') {
        return NextResponse.json(
          { error: 'Admin privileges required' },
          { status: 403 }
        );
      }
    } catch (tokenError) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    // 상태 값 검증
    const validStatuses = ['Active', 'Archived'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be Active or Archived' },
        { status: 400 }
      );
    }
    
    // 프로젝트 존재 여부 확인
    const existingProject = await query(
      'SELECT project_id, project_name, status FROM projects WHERE project_id = $1',
      [projectId]
    );
    
    if (existingProject.rows.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    const currentProject = existingProject.rows[0];
    
    // 상태가 이미 동일한 경우
    if (currentProject.status === status) {
      return NextResponse.json({
        message: `Project is already ${status}`,
        project: currentProject
      });
    }
    
    // 프로젝트 상태 업데이트
    const result = await query(
      'UPDATE projects SET status = $1 WHERE project_id = $2 RETURNING project_id, project_name, description, status',
      [status, projectId]
    );
    
    const updatedProject = result.rows[0];
    
    return NextResponse.json({
      message: `Project status updated to ${status}`,
      project: updatedProject
    });
    
  } catch (error) {
    console.error('Error updating project status:', error);
    return NextResponse.json(
      { error: 'Failed to update project status' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    
    // 프로젝트 상태 조회
    const result = await query(
      'SELECT project_id, project_name, description, status FROM projects WHERE project_id = $1',
      [projectId]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(result.rows[0]);
    
  } catch (error) {
    console.error('Error fetching project status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project status' },
      { status: 500 }
    );
  }
}