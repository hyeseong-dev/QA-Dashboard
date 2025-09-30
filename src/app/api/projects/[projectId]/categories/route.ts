import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Category } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    
    const result = await query(
      'SELECT category_id, project_id, category_name FROM categories WHERE project_id = $1 ORDER BY category_name',
      [projectId]
    );
    
    const categories: Category[] = result.rows;
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { category_name } = await request.json();
    
    if (!category_name) {
      return NextResponse.json(
        { error: 'category_name is required' },
        { status: 400 }
      );
    }
    
    // Check if category already exists
    const existingResult = await query(
      'SELECT category_id FROM categories WHERE project_id = $1 AND category_name = $2',
      [projectId, category_name]
    );
    
    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Category already exists' },
        { status: 409 }
      );
    }
    
    const result = await query(
      'INSERT INTO categories (project_id, category_name) VALUES ($1, $2) RETURNING category_id, project_id, category_name',
      [projectId, category_name]
    );
    
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}