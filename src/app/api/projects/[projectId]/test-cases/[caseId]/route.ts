import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

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