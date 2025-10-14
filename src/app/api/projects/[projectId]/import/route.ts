import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const importData = await request.json();
    
    // Validate import data structure
    if (!importData.categories || !importData.test_cases) {
      return NextResponse.json(
        { error: 'Invalid import data: categories and test_cases are required' },
        { status: 400 }
      );
    }
    
    // Check if project exists
    const projectCheck = await query(
      'SELECT project_id FROM projects WHERE project_id = $1',
      [projectId]
    );
    
    if (projectCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    const results = {
      categories_imported: 0,
      categories_skipped: 0,
      test_cases_imported: 0,
      test_cases_skipped: 0,
      errors: []
    };
    
    // Import categories
    const categoryMap = new Map(); // old_id -> new_id
    
    for (const category of importData.categories) {
      try {
        // Check if category already exists
        const existingCategory = await query(
          'SELECT category_id FROM categories WHERE project_id = $1 AND category_name = $2',
          [projectId, category.category_name]
        );
        
        if (existingCategory.rows.length > 0) {
          categoryMap.set(category.category_id, existingCategory.rows[0].category_id);
          results.categories_skipped++;
        } else {
          const newCategory = await query(
            'INSERT INTO categories (project_id, category_name) VALUES ($1, $2) RETURNING category_id',
            [projectId, category.category_name]
          );
          categoryMap.set(category.category_id, newCategory.rows[0].category_id);
          results.categories_imported++;
        }
      } catch (error) {
        results.errors.push(`Category "${category.category_name}": ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Import test cases
    for (const testCase of importData.test_cases) {
      try {
        const newCategoryId = categoryMap.get(testCase.category_id);
        if (!newCategoryId) {
          results.errors.push(`Test case "${testCase.item}": Category not found`);
          continue;
        }
        
        // Generate new case_id
        const caseIdPrefix = projectId.toUpperCase().substring(0, 3);
        const countResult = await query(
          'SELECT COUNT(*) as count FROM test_cases WHERE project_id = $1',
          [projectId]
        );
        const caseNumber = String(parseInt(countResult.rows[0].count) + 1).padStart(3, '0');
        const newCaseId = `${caseIdPrefix}-${caseNumber}`;
        
        // Check if test case with same item already exists in category
        const existingCase = await query(
          'SELECT case_id FROM test_cases WHERE project_id = $1 AND category_id = $2 AND item = $3',
          [projectId, newCategoryId, testCase.item]
        );
        
        if (existingCase.rows.length > 0) {
          results.test_cases_skipped++;
        } else {
          await query(
            `INSERT INTO test_cases (case_id, project_id, category_id, item, steps, expected, priority)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              newCaseId,
              projectId,
              newCategoryId,
              testCase.item,
              testCase.steps,
              testCase.expected,
              testCase.priority || 'Mid'
            ]
          );
          results.test_cases_imported++;
        }
      } catch (error) {
        results.errors.push(`Test case "${testCase.item}": ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('Error importing project data:', error);
    return NextResponse.json(
      { error: 'Failed to import project data' },
      { status: 500 }
    );
  }
}