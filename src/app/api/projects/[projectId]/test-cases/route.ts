import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface CreateTestCaseRequest {
  category_id: number;
  item: string;
  steps?: string;
  expected?: string;
  priority?: 'High' | 'Mid' | 'Low';
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { category_id, item, steps, expected, priority = 'Mid' }: CreateTestCaseRequest = await request.json();
    
    // Validate required fields
    if (!category_id || !item) {
      return NextResponse.json(
        { error: 'category_id and item are required' },
        { status: 400 }
      );
    }
    
    // Validate category belongs to project
    const categoryCheck = await query(
      'SELECT category_id FROM categories WHERE category_id = $1 AND project_id = $2',
      [category_id, projectId]
    );
    
    if (categoryCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Category not found or does not belong to this project' },
        { status: 404 }
      );
    }
    
    // Generate case_id
    const caseIdPrefix = projectId.toUpperCase().substring(0, 3);
    const countResult = await query(
      'SELECT COUNT(*) as count FROM test_cases WHERE project_id = $1',
      [projectId]
    );
    const caseNumber = String(parseInt(countResult.rows[0].count) + 1).padStart(3, '0');
    const case_id = `${caseIdPrefix}-${caseNumber}`;
    
    const result = await query(
      `INSERT INTO test_cases (case_id, project_id, category_id, item, steps, expected, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING case_id, project_id, category_id, item, steps, expected, priority`,
      [case_id, projectId, category_id, item, steps, expected, priority]
    );
    
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating test case:', error);
    return NextResponse.json(
      { error: 'Failed to create test case' },
      { status: 500 }
    );
  }
}