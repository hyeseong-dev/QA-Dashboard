import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { TestCase } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    
    // Get test cases for the project with category information
    const casesResult = await query(
      `SELECT tc.case_id, tc.project_id, tc.category_id, c.category_name, 
              tc.item, tc.steps, tc.expected, tc.priority,
              tc.parent_id, tc.depth, tc.sort_order, tc.error_type, tc.fix_checked 
       FROM test_cases tc
       JOIN categories c ON tc.category_id = c.category_id
       WHERE tc.project_id = $1 
       ORDER BY tc.sort_order, tc.depth, tc.case_id`,
      [projectId]
    );
    
    // Get all test results for these cases with user information
    const resultsResult = await query(
      `SELECT tr.result_id, tr.case_id, tr.user_id, u.user_name, tr.status, 
              tr.environment, tr.notes, tr.bug_id, tr.created_at
       FROM test_results tr
       JOIN test_cases tc ON tr.case_id = tc.case_id
       JOIN users u ON tr.user_id = u.user_id
       WHERE tc.project_id = $1
       ORDER BY tr.created_at DESC`,
      [projectId]
    );
    
    // Group results by case_id
    const resultsByCase: { [key: string]: any[] } = {};
    resultsResult.rows.forEach(result => {
      if (!resultsByCase[result.case_id]) {
        resultsByCase[result.case_id] = [];
      }
      resultsByCase[result.case_id].push(result);
    });
    
    // Combine cases with their results
    const testCases: TestCase[] = casesResult.rows.map(testCase => ({
      ...testCase,
      results: resultsByCase[testCase.case_id] || []
    }));
    
    return NextResponse.json(testCases);
  } catch (error) {
    console.error('Error fetching test cases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test cases' },
      { status: 500 }
    );
  }
}