import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Fix Check 업데이트 API
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; caseId: string }> }
) {
  try {
    const { projectId, caseId } = await params;
    const { fix_checked } = await request.json();

    // 입력 검증
    if (!validateFixCheck(fix_checked)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid fix_checked value. Must be a boolean',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    // 테스트 케이스 존재 및 프로젝트 소속 확인
    const caseExists = await query(
      'SELECT 1 FROM test_cases WHERE case_id = $1 AND project_id = $2',
      [caseId, projectId]
    );

    if (caseExists.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Test case not found or does not belong to this project',
          code: 'NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Fix Check 업데이트
    await query(
      'UPDATE test_cases SET fix_checked = $1 WHERE case_id = $2 AND project_id = $3',
      [fix_checked, caseId, projectId]
    );

    return NextResponse.json({
      success: true,
      message: 'Fix check updated successfully',
      data: {
        case_id: caseId,
        fix_checked: fix_checked
      }
    });

  } catch (error) {
    return handleApiError(error);
  }
}

// Fix Check 검증 함수
function validateFixCheck(fix_checked: any): boolean {
  return typeof fix_checked === 'boolean';
}

// 공통 에러 핸들링 함수
function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);
  
  return NextResponse.json(
    { 
      success: false, 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    },
    { status: 500 }
  );
}