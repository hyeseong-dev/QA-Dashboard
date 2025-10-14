import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface ReorderRequest {
  changedNodes: Array<{
    case_id: string;
    parent_id: string | null;
    depth: number;
    sort_order: number;
  }>;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { changedNodes }: ReorderRequest = await request.json();
    
    // 입력 검증
    if (!changedNodes || !Array.isArray(changedNodes) || changedNodes.length === 0) {
      return NextResponse.json(
        { error: 'changedNodes array is required' },
        { status: 400 }
      );
    }
    
    // 모든 노드가 해당 프로젝트에 속하는지 확인
    const caseIds = changedNodes.map(node => node.case_id);
    const verificationResult = await query(
      `SELECT case_id FROM test_cases 
       WHERE case_id = ANY($1) AND project_id = $2`,
      [caseIds, projectId]
    );
    
    if (verificationResult.rows.length !== caseIds.length) {
      return NextResponse.json(
        { error: 'Some test cases do not belong to this project' },
        { status: 404 }
      );
    }
    
    // 트랜잭션으로 일괄 업데이트
    const client = await query.pool?.connect();
    if (!client) {
      throw new Error('Database connection failed');
    }
    
    try {
      await client.query('BEGIN');
      
      // 각 노드의 정보 업데이트
      for (const node of changedNodes) {
        await client.query(
          `UPDATE test_cases 
           SET parent_id = $1, depth = $2, sort_order = $3
           WHERE case_id = $4 AND project_id = $5`,
          [node.parent_id, node.depth, node.sort_order, node.case_id, projectId]
        );
      }
      
      await client.query('COMMIT');
      
      return NextResponse.json({ 
        message: 'Test cases reordered successfully',
        updatedCount: changedNodes.length 
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error reordering test cases:', error);
    return NextResponse.json(
      { error: 'Failed to reorder test cases' },
      { status: 500 }
    );
  }
}