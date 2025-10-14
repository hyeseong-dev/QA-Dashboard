import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { case_id } = await request.json();
    
    if (!case_id) {
      return NextResponse.json(
        { error: 'case_id is required' },
        { status: 400 }
      );
    }
    
    // Validate format
    if (!/^[A-Z0-9\-_]+$/.test(case_id)) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid format. Use only uppercase letters, numbers, hyphens, and underscores.'
      });
    }
    
    // Check for duplicates
    const duplicateCheck = await query(
      'SELECT case_id FROM test_cases WHERE case_id = $1 AND project_id = $2',
      [case_id, projectId]
    );
    
    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json({
        valid: false,
        error: 'Case ID already exists. Please choose a different ID.'
      });
    }
    
    return NextResponse.json({
      valid: true,
      message: 'Case ID is available'
    });
    
  } catch (error) {
    console.error('Error validating case ID:', error);
    return NextResponse.json(
      { error: 'Failed to validate case ID' },
      { status: 500 }
    );
  }
}