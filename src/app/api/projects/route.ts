import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Project } from '@/types';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // Validate session
    try {
      await requireAuth(request);
    } catch (error) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }
    const result = await query(
      'SELECT project_id, project_name, description, status FROM projects ORDER BY project_name'
    );
    
    const projects: Project[] = result.rows;
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Validate session
    try {
      await requireAuth(request);
    } catch (error) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }
    const body = await request.json();
    const { project_id, project_name, description, status } = body;
    
    // 필수 필드 검증
    if (!project_id || !project_name) {
      return NextResponse.json(
        { error: 'project_id and project_name are required' },
        { status: 400 }
      );
    }
    
    // 프로젝트 ID 형식 검증
    if (!/^[a-zA-Z0-9-_]+$/.test(project_id)) {
      return NextResponse.json(
        { error: 'project_id can only contain letters, numbers, hyphens, and underscores' },
        { status: 400 }
      );
    }
    
    // 길이 제한 검증
    if (project_id.length > 50) {
      return NextResponse.json(
        { error: 'project_id must be 50 characters or less' },
        { status: 400 }
      );
    }
    
    if (project_name.length > 100) {
      return NextResponse.json(
        { error: 'project_name must be 100 characters or less' },
        { status: 400 }
      );
    }
    
    if (description && description.length > 1000) {
      return NextResponse.json(
        { error: 'description must be 1000 characters or less' },
        { status: 400 }
      );
    }
    
    // 상태 값 검증
    const validStatuses = ['Active', 'Archived'];
    const projectStatus = status || 'Active';
    if (!validStatuses.includes(projectStatus)) {
      return NextResponse.json(
        { error: 'status must be Active or Archived' },
        { status: 400 }
      );
    }
    
    // 중복 프로젝트 ID 검사
    const existingProject = await query(
      'SELECT project_id FROM projects WHERE project_id = $1',
      [project_id]
    );
    
    if (existingProject.rows.length > 0) {
      return NextResponse.json(
        { error: 'Project ID already exists' },
        { status: 409 }
      );
    }
    
    // 프로젝트 생성
    const result = await query(
      'INSERT INTO projects (project_id, project_name, description, status) VALUES ($1, $2, $3, $4) RETURNING project_id, project_name, description, status',
      [project_id, project_name, description || null, projectStatus]
    );
    
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}