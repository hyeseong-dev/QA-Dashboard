import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    
    // Get project info
    const projectResult = await query(
      'SELECT project_id, project_name, description, status FROM projects WHERE project_id = $1',
      [projectId]
    );
    
    if (projectResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Get categories
    const categoriesResult = await query(
      'SELECT category_id, category_name FROM categories WHERE project_id = $1 ORDER BY category_name',
      [projectId]
    );
    
    // Get test cases with results
    const casesResult = await query(
      `SELECT tc.case_id, tc.category_id, c.category_name, tc.item, tc.steps, tc.expected, tc.priority,
              tr.result_id, tr.user_id, u.user_name, tr.status, tr.environment, tr.notes, tr.bug_id, tr.created_at
       FROM test_cases tc
       LEFT JOIN categories c ON tc.category_id = c.category_id
       LEFT JOIN test_results tr ON tc.case_id = tr.case_id
       LEFT JOIN users u ON tr.user_id = u.user_id
       WHERE tc.project_id = $1
       ORDER BY c.category_name, tc.priority DESC, tc.item, tr.created_at DESC`,
      [projectId]
    );
    
    // Structure the data
    const project = projectResult.rows[0];
    const categories = categoriesResult.rows;
    
    // Group test cases and results
    const testCasesMap = new Map();
    casesResult.rows.forEach(row => {
      const caseId = row.case_id;
      
      if (!testCasesMap.has(caseId)) {
        testCasesMap.set(caseId, {
          case_id: row.case_id,
          category_id: row.category_id,
          category_name: row.category_name,
          item: row.item,
          steps: row.steps,
          expected: row.expected,
          priority: row.priority,
          results: []
        });
      }
      
      if (row.result_id) {
        testCasesMap.get(caseId).results.push({
          result_id: row.result_id,
          user_id: row.user_id,
          user_name: row.user_name,
          status: row.status,
          environment: row.environment,
          notes: row.notes,
          bug_id: row.bug_id,
          created_at: row.created_at
        });
      }
    });
    
    const testCases = Array.from(testCasesMap.values());
    
    const exportData = {
      export_info: {
        exported_at: new Date().toISOString(),
        exported_by: 'QA Dashboard System',
        version: '1.0'
      },
      project,
      categories,
      test_cases: testCases,
      summary: {
        total_categories: categories.length,
        total_test_cases: testCases.length,
        total_results: testCases.reduce((sum, tc) => sum + tc.results.length, 0)
      }
    };
    
    return NextResponse.json(exportData);
  } catch (error) {
    console.error('Error exporting project data:', error);
    return NextResponse.json(
      { error: 'Failed to export project data' },
      { status: 500 }
    );
  }
}