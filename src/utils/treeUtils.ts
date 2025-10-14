import { TestCase } from '@/types';

/**
 * 플랫 배열을 트리 구조로 변환
 * @param flatArray - 플랫 테스트 케이스 배열
 * @returns 루트 노드들의 배열
 */
export function buildTreeFromFlat(flatArray: TestCase[]): TestCase[] {
  // ID로 빠른 접근을 위한 맵 생성
  const nodeMap = new Map<string, TestCase>();
  const rootNodes: TestCase[] = [];

  // 모든 노드를 맵에 추가하고 children 배열 초기화
  flatArray.forEach(node => {
    nodeMap.set(node.case_id, {
      ...node,
      children: [],
      expanded: node.expanded ?? false
    });
  });

  // sort_order로 정렬
  const sortedNodes = Array.from(nodeMap.values()).sort((a, b) => a.sort_order - b.sort_order);

  // 부모-자식 관계 설정
  sortedNodes.forEach(node => {
    if (node.parent_id) {
      const parent = nodeMap.get(node.parent_id);
      if (parent && parent.children) {
        parent.children.push(node);
      }
    } else {
      // 부모가 없으면 루트 노드
      rootNodes.push(node);
    }
  });

  return rootNodes;
}

/**
 * 트리를 렌더링 가능한 플랫 배열로 변환 (확장 상태 고려)
 * @param treeNodes - 트리 노드 배열
 * @param expandedNodes - 확장된 노드 ID 집합
 * @returns 렌더링용 플랫 배열
 */
export function flattenTreeForRender(treeNodes: TestCase[], expandedNodes: Set<string> = new Set()): TestCase[] {
  const result: TestCase[] = [];

  function traverse(nodes: TestCase[], currentDepth: number = 1) {
    nodes.forEach(node => {
      // 현재 노드 추가
      result.push({
        ...node,
        depth: currentDepth,
        expanded: expandedNodes.has(node.case_id)
      });

      // 자식이 있고 현재 노드가 확장된 경우 자식들도 추가
      if (node.children && node.children.length > 0 && expandedNodes.has(node.case_id)) {
        traverse(node.children, currentDepth + 1);
      }
    });
  }

  traverse(treeNodes);
  return result;
}

/**
 * 노드의 확장/축소 상태 토글
 * @param expandedNodes - 현재 확장된 노드 ID 집합
 * @param nodeId - 토글할 노드 ID
 * @returns 새로운 확장 상태 집합
 */
export function toggleNodeExpansion(expandedNodes: Set<string>, nodeId: string): Set<string> {
  const newExpanded = new Set(expandedNodes);
  
  if (newExpanded.has(nodeId)) {
    newExpanded.delete(nodeId);
  } else {
    newExpanded.add(nodeId);
  }
  
  return newExpanded;
}

/**
 * 트리에서 특정 ID의 노드 찾기
 * @param treeNodes - 트리 노드 배열
 * @param nodeId - 찾을 노드 ID
 * @returns 찾은 노드 또는 null
 */
export function findNodeById(treeNodes: TestCase[], nodeId: string): TestCase | null {
  for (const node of treeNodes) {
    if (node.case_id === nodeId) {
      return node;
    }
    
    if (node.children && node.children.length > 0) {
      const found = findNodeById(node.children, nodeId);
      if (found) return found;
    }
  }
  
  return null;
}

/**
 * 트리에서 특정 노드 업데이트
 * @param treeNodes - 트리 노드 배열
 * @param nodeId - 업데이트할 노드 ID
 * @param updates - 업데이트할 속성들
 * @returns 업데이트된 트리
 */
export function updateNodeInTree(
  treeNodes: TestCase[], 
  nodeId: string, 
  updates: Partial<TestCase>
): TestCase[] {
  return treeNodes.map(node => {
    if (node.case_id === nodeId) {
      return { ...node, ...updates };
    }
    
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: updateNodeInTree(node.children, nodeId, updates)
      };
    }
    
    return node;
  });
}

/**
 * 노드가 자식을 가지고 있는지 확인
 * @param node - 확인할 노드
 * @returns 자식 노드 존재 여부
 */
export function hasChildren(node: TestCase): boolean {
  return node.children !== undefined && node.children.length > 0;
}

/**
 * 노드의 들여쓰기 스타일 계산
 * @param depth - 노드의 깊이
 * @param indentSize - 들여쓰기 크기 (px)
 * @returns 들여쓰기 스타일 객체
 */
export function getIndentStyle(depth: number, indentSize: number = 20): React.CSSProperties {
  return {
    marginLeft: `${(depth - 1) * indentSize}px`
  };
}

/**
 * 트리 통계 계산
 * @param treeNodes - 트리 노드 배열
 * @returns 트리 통계 정보
 */
export function getTreeStats(treeNodes: TestCase[]): {
  totalNodes: number;
  maxDepth: number;
  leafNodes: number;
} {
  let totalNodes = 0;
  let maxDepth = 0;
  let leafNodes = 0;

  function traverse(nodes: TestCase[], currentDepth: number) {
    nodes.forEach(node => {
      totalNodes++;
      maxDepth = Math.max(maxDepth, currentDepth);
      
      if (!hasChildren(node)) {
        leafNodes++;
      }
      
      if (node.children && node.children.length > 0) {
        traverse(node.children, currentDepth + 1);
      }
    });
  }

  traverse(treeNodes, 1);
  
  return { totalNodes, maxDepth, leafNodes };
}

/**
 * 모든 자손 노드의 ID 수집
 * @param node - 부모 노드
 * @returns 자손 노드 ID 배열
 */
export function getAllDescendantIds(node: TestCase): string[] {
  const ids: string[] = [];
  
  if (node.children && node.children.length > 0) {
    node.children.forEach(child => {
      ids.push(child.case_id);
      ids.push(...getAllDescendantIds(child));
    });
  }
  
  return ids;
}

/**
 * 확장/축소 버튼 아이콘 반환
 * @param node - 노드
 * @param isExpanded - 확장 상태
 * @returns 아이콘 문자열
 */
export function getExpandIcon(node: TestCase, isExpanded: boolean): string {
  if (!hasChildren(node)) {
    return ''; // 자식이 없으면 아이콘 없음
  }
  
  return isExpanded ? '▼' : '▶';
}

// ===== Phase 4B: 드래그 앤 드롭 편집 기능 =====

/**
 * 드래그 앤 드롭으로 노드 이동 시 유효성 검증
 * @param draggedNodeId - 드래그되는 노드 ID
 * @param targetNodeId - 타겟 노드 ID  
 * @param position - 드롭 위치 ('before' | 'after' | 'inside')
 * @param treeNodes - 현재 트리 구조
 * @returns 이동 가능 여부
 */
export function validateNodeMove(
  draggedNodeId: string,
  targetNodeId: string,
  position: 'before' | 'after' | 'inside',
  treeNodes: TestCase[]
): boolean {
  // 자기 자신에게는 이동할 수 없음
  if (draggedNodeId === targetNodeId) {
    return false;
  }
  
  const draggedNode = findNodeById(treeNodes, draggedNodeId);
  const targetNode = findNodeById(treeNodes, targetNodeId);
  
  if (!draggedNode || !targetNode) {
    return false;
  }
  
  // 자손 노드로는 이동할 수 없음 (순환 참조 방지)
  const draggedDescendants = getAllDescendantIds(draggedNode);
  if (draggedDescendants.includes(targetNodeId)) {
    return false;
  }
  
  return true;
}

/**
 * 드래그 앤 드롭으로 노드 이동 실행
 * @param draggedNodeId - 드래그되는 노드 ID
 * @param targetNodeId - 타겟 노드 ID
 * @param position - 드롭 위치
 * @param treeNodes - 현재 트리 구조
 * @returns 업데이트된 트리와 변경된 노드들의 정보
 */
export function moveNodeInTree(
  draggedNodeId: string,
  targetNodeId: string,
  position: 'before' | 'after' | 'inside',
  treeNodes: TestCase[]
): {
  updatedTree: TestCase[];
  changedNodes: Array<{
    case_id: string;
    parent_id: string | null;
    depth: number;
    sort_order: number;
  }>;
} {
  const changedNodes: Array<{
    case_id: string;
    parent_id: string | null;
    depth: number;
    sort_order: number;
  }> = [];
  
  // 1. 드래그된 노드를 기존 위치에서 제거
  const withRemovedNode = removeNodeFromTree(treeNodes, draggedNodeId);
  const draggedNode = findNodeById(treeNodes, draggedNodeId);
  
  if (!draggedNode) {
    return { updatedTree: treeNodes, changedNodes: [] };
  }
  
  // 2. 타겟 위치 찾기
  const targetNode = findNodeById(withRemovedNode.updatedTree, targetNodeId);
  if (!targetNode) {
    return { updatedTree: treeNodes, changedNodes: [] };
  }
  
  // 3. 새 위치에 노드 삽입
  const insertResult = insertNodeAtPosition(
    withRemovedNode.updatedTree,
    draggedNode,
    targetNodeId,
    position
  );
  
  // 4. 변경된 노드들의 정보 수집
  const collectChangedNodes = (nodes: TestCase[], parentId: string | null = null, startDepth: number = 1) => {
    nodes.forEach((node, index) => {
      changedNodes.push({
        case_id: node.case_id,
        parent_id: parentId,
        depth: startDepth,
        sort_order: index + 1
      });
      
      if (node.children && node.children.length > 0) {
        collectChangedNodes(node.children, node.case_id, startDepth + 1);
      }
    });
  };
  
  collectChangedNodes(insertResult);
  
  return {
    updatedTree: insertResult,
    changedNodes
  };
}

/**
 * 트리에서 노드 제거
 * @param treeNodes - 트리 노드 배열
 * @param nodeId - 제거할 노드 ID
 * @returns 업데이트된 트리와 제거된 노드
 */
function removeNodeFromTree(treeNodes: TestCase[], nodeId: string): {
  updatedTree: TestCase[];
  removedNode: TestCase | null;
} {
  let removedNode: TestCase | null = null;
  
  const removeRecursive = (nodes: TestCase[]): TestCase[] => {
    return nodes.filter(node => {
      if (node.case_id === nodeId) {
        removedNode = node;
        return false;
      }
      
      if (node.children && node.children.length > 0) {
        node.children = removeRecursive(node.children);
      }
      
      return true;
    });
  };
  
  const updatedTree = removeRecursive([...treeNodes]);
  return { updatedTree, removedNode };
}

/**
 * 지정된 위치에 노드 삽입
 * @param treeNodes - 트리 노드 배열
 * @param nodeToInsert - 삽입할 노드
 * @param targetNodeId - 타겟 노드 ID
 * @param position - 삽입 위치
 * @returns 업데이트된 트리
 */
function insertNodeAtPosition(
  treeNodes: TestCase[],
  nodeToInsert: TestCase,
  targetNodeId: string,
  position: 'before' | 'after' | 'inside'
): TestCase[] {
  const insertRecursive = (nodes: TestCase[]): TestCase[] => {
    const result: TestCase[] = [];
    
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      
      if (node.case_id === targetNodeId) {
        if (position === 'before') {
          result.push(nodeToInsert);
          result.push(node);
        } else if (position === 'after') {
          result.push(node);
          result.push(nodeToInsert);
        } else if (position === 'inside') {
          const updatedNode = {
            ...node,
            children: [...(node.children || []), nodeToInsert]
          };
          result.push(updatedNode);
        }
      } else {
        if (node.children && node.children.length > 0) {
          const updatedNode = {
            ...node,
            children: insertRecursive(node.children)
          };
          result.push(updatedNode);
        } else {
          result.push(node);
        }
      }
    }
    
    return result;
  };
  
  return insertRecursive(treeNodes);
}

/**
 * 드롭 존 타입 결정
 * @param mouseY - 마우스 Y 좌표
 * @param targetRect - 타겟 요소의 DOMRect
 * @returns 드롭 존 타입
 */
export function getDropZone(mouseY: number, targetRect: DOMRect): 'before' | 'after' | 'inside' {
  const relativeY = mouseY - targetRect.top;
  const height = targetRect.height;
  
  if (relativeY < height * 0.25) {
    return 'before';
  } else if (relativeY > height * 0.75) {
    return 'after';
  } else {
    return 'inside';
  }
}