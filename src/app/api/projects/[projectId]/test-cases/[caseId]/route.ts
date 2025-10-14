import { NextResponse } from 'next/server';
import { query, getPool } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; caseId: string }> }
) {
  try {
    const { projectId, caseId } = await params;
    const updates = await request.json();
    
    console.log('PATCH request received:', { projectId, caseId, updates });
    
    // 허용된 필드만 업데이트 가능 (case_id는 보안상 수정 불가)
    const allowedFields = ['item', 'steps', 'expected', 'priority', 'error_type', 'fix_checked', 'category_id'];
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCounter = 1;
    
    for (const [field, value] of Object.entries(updates)) {
      if (allowedFields.includes(field)) {
        updateFields.push(`${field} = $${paramCounter}`);
        updateValues.push(value);
        paramCounter++;
      }
    }
    
    if (updateFields.length === 0) {
      console.log('No valid fields found to update. Received fields:', Object.keys(updates));
      return NextResponse.json(
        { error: 'No valid fields to update', receivedFields: Object.keys(updates), allowedFields },
        { status: 400 }
      );
    }
    
    console.log('Valid update fields:', updateFields, 'Values:', updateValues);
    
    // 테스트 케이스 존재 확인
    const existingCase = await query(
      'SELECT case_id FROM test_cases WHERE case_id = $1 AND project_id = $2',
      [caseId, projectId]
    );
    
    if (existingCase.rows.length === 0) {
      return NextResponse.json(
        { error: 'Test case not found' },
        { status: 404 }
      );
    }
    
    // 업데이트 실행
    const updateQuery = `
      UPDATE test_cases 
      SET ${updateFields.join(', ')}
      WHERE case_id = $${paramCounter} AND project_id = $${paramCounter + 1}
      RETURNING *
    `;
    
    const result = await query(updateQuery, [...updateValues, caseId, projectId]);
    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating test case:', error);
    return NextResponse.json(
      { error: 'Failed to update test case' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; caseId: string }> }
) {
  try {
    const { projectId, caseId } = await params;
    
    // Verify that the test case exists and belongs to the project
    const testCaseCheck = await query(
      'SELECT case_id FROM test_cases WHERE case_id = $1 AND project_id = $2',
      [caseId, projectId]
    );
    
    if (testCaseCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Test case not found or does not belong to this project' },
        { status: 404 }
      );
    }
    
    // Delete the test case (this will cascade delete test_results due to foreign key constraint)
    const deleteResult = await query(
      'DELETE FROM test_cases WHERE case_id = $1 AND project_id = $2 RETURNING case_id, item',
      [caseId, projectId]
    );
    
    if (deleteResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Failed to delete test case' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        message: 'Test case deleted successfully', 
        deleted_case: deleteResult.rows[0] 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting test case:', error);
    return NextResponse.json(
      { error: 'Failed to delete test case' },
      { status: 500 }
    );
  }
}