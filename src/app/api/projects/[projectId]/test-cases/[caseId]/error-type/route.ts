import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ErrorType } from '@/types';

// Error Type 업데이트 API
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; caseId: string }> }
) {
  try {
    const { projectId, caseId } = await params;
    const { error_type } = await request.json();

    // 입력 검증
    if (!validateErrorType(error_type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid error type. Must be one of: 기능오류, 신규개발(개선), UI/UX오류, 시스템연동오류, or null',
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

    // Error Type 업데이트
    await query(
      'UPDATE test_cases SET error_type = $1 WHERE case_id = $2 AND project_id = $3',
      [error_type || null, caseId, projectId]
    );

    return NextResponse.json({
      success: true,
      message: 'Error type updated successfully',
      data: {
        case_id: caseId,
        error_type: error_type || null
      }
    });

  } catch (error) {
    return handleApiError(error);
  }
}

// Error Type 검증 함수
function validateErrorType(error_type: any): boolean {
  if (error_type === null || error_type === undefined || error_type === '') {
    return true; // null 값 허용
  }
  
  const validTypes: ErrorType[] = ['기능오류', '신규개발(개선)', 'UI/UX오류', '시스템연동오류'];
  return validTypes.includes(error_type);
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