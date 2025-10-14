import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface CreateTestCaseRequest {
  category_id: number;
  item: string;
  steps?: string;
  expected?: string;
  priority?: 'High' | 'Mid' | 'Low';
  parent_id?: string;
  custom_case_id?: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { category_id, item, steps, expected, priority = 'Mid', parent_id, custom_case_id }: CreateTestCaseRequest = await request.json();
    
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
    
    // Validate parent_id if provided
    let depth = 1;
    let sort_order = 1;
    
    if (parent_id) {
      const parentCheck = await query(
        'SELECT case_id, depth FROM test_cases WHERE case_id = $1 AND project_id = $2',
        [parent_id, projectId]
      );
      
      if (parentCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Parent test case not found or does not belong to this project' },
          { status: 404 }
        );
      }
      
      depth = parentCheck.rows[0].depth + 1;
      
      // Get the max sort_order for children of this parent
      const sortResult = await query(
        'SELECT MAX(sort_order) as max_sort FROM test_cases WHERE parent_id = $1',
        [parent_id]
      );
      
      sort_order = (sortResult.rows[0].max_sort || 0) + 1;
    } else {
      // Get the max sort_order for top-level items (where parent_id is null)
      const sortResult = await query(
        'SELECT MAX(sort_order) as max_sort FROM test_cases WHERE parent_id IS NULL AND project_id = $1',
        [projectId]
      );
      
      sort_order = (sortResult.rows[0].max_sort || 0) + 1;
    }
    
    // Generate or validate case_id
    let case_id: string;
    
    if (custom_case_id) {
      // Validate custom case_id format
      if (!/^[A-Z0-9\-_]+$/.test(custom_case_id)) {
        return NextResponse.json(
          { error: 'Invalid case ID format. Use only uppercase letters, numbers, hyphens, and underscores.' },
          { status: 400 }
        );
      }
      
      // Check for duplicate custom case_id
      const duplicateCheck = await query(
        'SELECT case_id FROM test_cases WHERE case_id = $1 AND project_id = $2',
        [custom_case_id, projectId]
      );
      
      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'Case ID already exists. Please choose a different ID.' },
          { status: 409 }
        );
      }
      
      case_id = custom_case_id;
    } else {
      // Auto-generate case_id
      const caseIdPrefix = projectId.toUpperCase().substring(0, 3);
      const countResult = await query(
        'SELECT COUNT(*) as count FROM test_cases WHERE project_id = $1',
        [projectId]
      );
      const caseNumber = String(parseInt(countResult.rows[0].count) + 1).padStart(3, '0');
      case_id = `${caseIdPrefix}-${caseNumber}`;
    }
    
    const result = await query(
      `INSERT INTO test_cases (case_id, project_id, category_id, item, steps, expected, priority, parent_id, depth, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING case_id, project_id, category_id, item, steps, expected, priority, parent_id, depth, sort_order`,
      [case_id, projectId, category_id, item, steps, expected, priority, parent_id || null, depth, sort_order]
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