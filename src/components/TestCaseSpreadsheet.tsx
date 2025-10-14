'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { TestCase, TestResult, CreateTestResultRequest, ErrorType, Priority } from '@/types';
import {
  buildTreeFromFlat,
  flattenTreeForRender,
  toggleNodeExpansion,
  hasChildren,
  getIndentStyle,
  getExpandIcon,
  validateNodeMove,
  moveNodeInTree,
  getDropZone
} from '@/utils/treeUtils';

interface TestCaseSpreadsheetProps {
  testCases: TestCase[];
  projectId: string;
  onRecord: (caseId: string, status: 'pass' | 'fail' | 'pending', notes: string, bugId: string) => void;
  onDelete: () => void;
  onTestCaseUpdate?: () => void; // 테스트 케이스 업데이트 콜백 추가
  disabled: boolean;
  displayState: 'preview' | 'partial' | 'active';
  currentFilters: { category: string };
  onErrorTypeChange?: (caseId: string, errorType: ErrorType) => void;
  onFixCheckChange?: (caseId: string, fixChecked: boolean) => void;
  onCategoryChange?: (caseId: string, categoryId: number) => void;
}

type SortField = 'case_id' | 'category_name' | 'item' | 'priority' | 'error_type' | 'fix_checked' | 'latest_status' | 'latest_tester' | 'total_attempts';
type SortDirection = 'asc' | 'desc';

interface ColumnWidth {
  [key: string]: number;
}

interface SpreadsheetState {
  selectedRows: Set<string>;
  expandedRows: Set<string>; // 상세 정보 확장 상태
  expandedTreeNodes: Set<string>; // 계층 구조 확장 상태
  editingCell: { rowId: string; field: string } | null;
  sortField: SortField;
  sortDirection: SortDirection;
  columnWidths: ColumnWidth;
  draggedNodeId: string | null; // 드래그 중인 노드 ID
  dropTargetId: string | null; // 드롭 타겟 노드 ID
  dropZone: 'before' | 'after' | 'inside' | null; // 드롭 존 위치
}

const DEFAULT_COLUMN_WIDTHS: ColumnWidth = {
  checkbox: 32,
  case_id: 80,
  category_name: 80,
  item: 200,
  priority: 60,
  error_type: 80,
  fix_checked: 60,
  latest_status: 80,
  latest_tester: 140,
  total_attempts: 70,
  actions: 100
};

export default function TestCaseSpreadsheet({
  testCases,
  projectId,
  onRecord,
  onDelete,
  onTestCaseUpdate,
  disabled,
  displayState,
  currentFilters,
  onErrorTypeChange,
  onFixCheckChange,
  onCategoryChange
}: TestCaseSpreadsheetProps) {
  const [state, setState] = useState<SpreadsheetState>({
    selectedRows: new Set(),
    expandedRows: new Set(),
    expandedTreeNodes: new Set(),
    editingCell: null,
    sortField: 'priority',
    sortDirection: 'desc',
    columnWidths: { ...DEFAULT_COLUMN_WIDTHS },
    draggedNodeId: null,
    dropTargetId: null,
    dropZone: null
  });

  const [bulkStatus, setBulkStatus] = useState<'pass' | 'fail' | 'pending' | ''>('');
  const [categories, setCategories] = useState<{ category_id: number; category_name: string }[]>([]);
  const [localTestCases, setLocalTestCases] = useState<TestCase[]>([]);
  
  const [resizing, setResizing] = useState<{ column: string; startX: number; startWidth: number } | null>(null);

  // props로 받은 testCases를 localTestCases로 동기화
  useEffect(() => {
    setLocalTestCases(testCases);
  }, [testCases]);

  // 필터링된 테스트 케이스 (로컬 상태 기반)
  const filteredTestCases = useMemo(() => {
    return localTestCases.filter(testCase => 
      currentFilters.category === 'all' || testCase.category_name === currentFilters.category
    );
  }, [localTestCases, currentFilters]);

  // 트리 구조로 변환된 테스트 케이스
  const treeStructure = useMemo(() => {
    return buildTreeFromFlat(filteredTestCases);
  }, [filteredTestCases]);

  // 렌더링용 플랫 배열 (계층 구조와 확장 상태 반영)
  const renderableTestCases = useMemo(() => {
    const flattened = flattenTreeForRender(treeStructure, state.expandedTreeNodes);
    
    // 정렬 적용 (트리 구조 내에서 형제 노드들만 정렬)
    return flattened.sort((a, b) => {
      // 같은 깊이와 부모를 가진 노드들만 정렬
      if (a.depth !== b.depth || a.parent_id !== b.parent_id) {
        return a.sort_order - b.sort_order;
      }

      let aValue: string | number = a[state.sortField] as string | number;
      let bValue: string | number = b[state.sortField] as string | number;

      // 특별한 정렬 로직
      if (state.sortField === 'latest_status') {
        aValue = a.results?.[0]?.status || 'none';
        bValue = b.results?.[0]?.status || 'none';
      } else if (state.sortField === 'latest_tester') {
        aValue = a.results?.[0]?.user_name || '';
        bValue = b.results?.[0]?.user_name || '';
      } else if (state.sortField === 'total_attempts') {
        aValue = a.results?.length || 0;
        bValue = b.results?.length || 0;
      } else if (state.sortField === 'priority') {
        const priorityOrder = { 'High': 3, 'Mid': 2, 'Low': 1 };
        aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      }

      const modifier = state.sortDirection === 'asc' ? 1 : -1;
      
      if (aValue < bValue) return -1 * modifier;
      if (aValue > bValue) return 1 * modifier;
      return a.sort_order - b.sort_order; // 기본적으로 sort_order 순서 유지
    });
  }, [treeStructure, state.expandedTreeNodes, state.sortField, state.sortDirection]);

  // 카테고리 로딩
  useEffect(() => {
    const loadCategories = async () => {
      if (!projectId) return;
      try {
        const response = await fetch(`/api/projects/${projectId}/categories`);
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };

    loadCategories();
  }, [projectId]);

  // 정렬 핸들러
  const handleSort = useCallback((field: SortField) => {
    setState(prev => ({
      ...prev,
      sortField: field,
      sortDirection: prev.sortField === field && prev.sortDirection === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  // 행 선택 핸들러
  const handleRowSelect = useCallback((caseId: string, selected: boolean) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedRows);
      if (selected) {
        newSelected.add(caseId);
      } else {
        newSelected.delete(caseId);
      }
      return { ...prev, selectedRows: newSelected };
    });
  }, []);

  // 전체 선택/해제
  const handleSelectAll = useCallback((selected: boolean) => {
    setState(prev => ({
      ...prev,
      selectedRows: selected ? new Set(renderableTestCases.map(tc => tc.case_id)) : new Set()
    }));
  }, [renderableTestCases]);

  // 계층 구조 노드 확장/축소
  const handleTreeNodeToggle = useCallback((nodeId: string) => {
    setState(prev => ({
      ...prev,
      expandedTreeNodes: toggleNodeExpansion(prev.expandedTreeNodes, nodeId)
    }));
  }, []);

  // 드래그 앤 드롭 핸들러들
  const handleDragStart = useCallback((e: React.DragEvent, caseId: string) => {
    e.dataTransfer.setData('text/plain', caseId);
    e.dataTransfer.effectAllowed = 'move';
    setState(prev => ({ ...prev, draggedNodeId: caseId }));
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setState(prev => ({ 
      ...prev, 
      draggedNodeId: null,
      dropTargetId: null,
      dropZone: null
    }));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!state.draggedNodeId || state.draggedNodeId === targetId) {
      return;
    }
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const dropZone = getDropZone(e.clientY, rect);
    
    // 유효성 검증
    const isValid = validateNodeMove(
      state.draggedNodeId,
      targetId,
      dropZone,
      treeStructure
    );
    
    if (isValid) {
      setState(prev => ({
        ...prev,
        dropTargetId: targetId,
        dropZone
      }));
    }
  }, [state.draggedNodeId, treeStructure]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // 부모 요소로 이동하는 경우가 아닐 때만 상태 초기화
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setState(prev => ({
        ...prev,
        dropTargetId: null,
        dropZone: null
      }));
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    
    if (!state.draggedNodeId || !state.dropZone) {
      return;
    }
    
    // 트리 구조 업데이트
    const moveResult = moveNodeInTree(
      state.draggedNodeId,
      targetId,
      state.dropZone,
      treeStructure
    );
    
    if (moveResult.changedNodes.length === 0) {
      return;
    }
    
    try {
      // 서버에 변경사항 전송
      const response = await fetch(`/api/projects/${projectId}/test-cases/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changedNodes: moveResult.changedNodes })
      });
      
      if (response.ok) {
        // 성공 시 테스트 케이스 새로고침
        if (onTestCaseUpdate) {
          onTestCaseUpdate();
        }
      } else {
        const error = await response.json();
        alert(`Failed to reorder: ${error.error}`);
      }
    } catch (error) {
      console.error('Error reordering test cases:', error);
      alert('Failed to reorder test cases');
    }
    
    // 상태 초기화
    setState(prev => ({
      ...prev,
      draggedNodeId: null,
      dropTargetId: null,
      dropZone: null
    }));
  }, [state.draggedNodeId, state.dropZone, treeStructure, projectId, onTestCaseUpdate]);

  // 행 확장/축소
  const toggleRowExpansion = useCallback((caseId: string) => {
    setState(prev => {
      const newExpanded = new Set(prev.expandedRows);
      if (newExpanded.has(caseId)) {
        newExpanded.delete(caseId);
      } else {
        newExpanded.add(caseId);
      }
      return { ...prev, expandedRows: newExpanded };
    });
  }, []);

  // 컬럼 크기 조절 시작
  const handleResizeStart = useCallback((column: string, event: React.MouseEvent) => {
    event.preventDefault();
    setResizing({
      column,
      startX: event.clientX,
      startWidth: state.columnWidths[column]
    });
  }, [state.columnWidths]);

  // 컬럼 크기 조절 중
  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (event: MouseEvent) => {
      const deltaX = event.clientX - resizing.startX;
      // 체크박스 컬럼의 경우 더 작은 최소값 적용
      const minWidth = resizing.column === 'checkbox' ? 24 : 20;
      const newWidth = Math.max(minWidth, resizing.startWidth + deltaX);
      
      setState(prev => ({
        ...prev,
        columnWidths: {
          ...prev.columnWidths,
          [resizing.column]: newWidth
        }
      }));
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  // 일괄 상태 변경
  const handleBulkStatusChange = useCallback(() => {
    if (!bulkStatus || state.selectedRows.size === 0) return;

    state.selectedRows.forEach(caseId => {
      onRecord(caseId, bulkStatus, '', '');
    });

    setBulkStatus('');
    setState(prev => ({ ...prev, selectedRows: new Set() }));
  }, [bulkStatus, state.selectedRows, onRecord]);
  
  // 일괄 삭제 핸들러
  const handleBulkDelete = useCallback(async () => {
    if (state.selectedRows.size === 0) return;
    
    const confirmMessage = `선택한 ${state.selectedRows.size}개의 테스트 케이스를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`;
    if (!window.confirm(confirmMessage)) return;
    
    try {
      const deletePromises = Array.from(state.selectedRows).map(caseId => 
        fetch(`/api/projects/${projectId}/test-cases/${caseId}`, {
          method: 'DELETE'
        })
      );
      
      const results = await Promise.allSettled(deletePromises);
      const failedCount = results.filter(result => result.status === 'rejected').length;
      
      if (failedCount > 0) {
        alert(`${failedCount}개 항목 삭제에 실패했습니다.`);
      }
      
      setState(prev => ({ ...prev, selectedRows: new Set() }));
      onTestCaseUpdate?.(); // 데이터 새로고침
    } catch (error) {
      console.error('Error during bulk delete:', error);
      alert('일괄 삭제 중 오류가 발생했습니다.');
    }
  }, [state.selectedRows, projectId, onTestCaseUpdate]);
  
  // 일괄 이동 핸들러
  const handleBulkMove = useCallback(async (moveType: string) => {
    if (state.selectedRows.size === 0) return;
    
    try {
      const selectedCases = renderableTestCases.filter(tc => state.selectedRows.has(tc.case_id));
      
      for (const testCase of selectedCases) {
        let targetPosition: { targetId?: string; position: 'before' | 'after' | 'inside' } | null = null;
        
        switch (moveType) {
          case 'top':
            // 맨 첫 번째 노드 앞으로 이동
            const firstNode = renderableTestCases[0];
            if (firstNode && firstNode.case_id !== testCase.case_id) {
              targetPosition = { targetId: firstNode.case_id, position: 'before' };
            }
            break;
            
          case 'bottom':
            // 맨 마지막 노드 뒤로 이동
            const lastNode = renderableTestCases[renderableTestCases.length - 1];
            if (lastNode && lastNode.case_id !== testCase.case_id) {
              targetPosition = { targetId: lastNode.case_id, position: 'after' };
            }
            break;
            
          case 'group':
            // 선택된 첫 번째 노드의 하위로 나머지 이동
            if (selectedCases.length > 1 && selectedCases[0].case_id !== testCase.case_id) {
              targetPosition = { targetId: selectedCases[0].case_id, position: 'inside' };
            }
            break;
        }
        
        if (targetPosition && targetPosition.targetId) {
          // 이동 유효성 검증
          if (validateNodeMove(testCase.case_id, targetPosition.targetId, targetPosition.position, treeStructure)) {
            const moveResult = moveNodeInTree(
              testCase.case_id,
              targetPosition.targetId,
              targetPosition.position,
              treeStructure
            );
            
            // 서버에 업데이트 전송
            const response = await fetch(`/api/projects/${projectId}/test-cases/reorder`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                changedNodes: moveResult.changedNodes
              })
            });
            
            if (!response.ok) {
              throw new Error(`Failed to move ${testCase.case_id}`);
            }
          }
        }
      }
      
      setState(prev => ({ ...prev, selectedRows: new Set() }));
      onTestCaseUpdate?.(); // 데이터 새로고침
    } catch (error) {
      console.error('Error during bulk move:', error);
      alert('일괄 이동 중 오류가 발생했습니다.');
    }
  }, [state.selectedRows, renderableTestCases, treeStructure, projectId, onTestCaseUpdate]);

  // 단일 상태 변경
  const handleStatusChange = useCallback((caseId: string, status: 'pass' | 'fail' | 'pending') => {
    onRecord(caseId, status, '', '');
  }, [onRecord]);

  // 카테고리 변경 핸들러
  const handleCategoryChange = useCallback(async (caseId: string, categoryId: number) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/test-cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: categoryId })
      });
      
      if (response.ok) {
        onTestCaseUpdate?.(); // 데이터 새로고침
      } else {
        alert('카테고리 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error changing category:', error);
      alert('카테고리 변경 중 오류가 발생했습니다.');
    }
  }, [projectId, onTestCaseUpdate]);

  // CASE ID 변경 핸들러
  const handleCaseIdChange = useCallback(async (currentCaseId: string, newCaseId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/test-cases/${currentCaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: newCaseId })
      });
      
      if (response.ok) {
        onTestCaseUpdate?.(); // 데이터 새로고침
      } else if (response.status === 409) {
        alert('이미 존재하는 CASE ID입니다. 다른 ID를 사용해주세요.');
      } else {
        alert('CASE ID 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error changing case ID:', error);
      alert('CASE ID 변경 중 오류가 발생했습니다.');
    }
  }, [projectId, onTestCaseUpdate]);

  // Error Type 변경
  const handleErrorTypeChange = useCallback(async (caseId: string, errorType: ErrorType) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/test-cases/${caseId}/error-type`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error_type: errorType || null })
      });

      if (response.ok) {
        // 성공적으로 업데이트된 경우 테스트 케이스 목록 새로고침
        onTestCaseUpdate?.();
        console.log('Error type updated successfully');
      } else {
        const errorData = await response.json();
        console.error('Error updating error type:', errorData.error);
      }
    } catch (error) {
      console.error('Error updating error type:', error);
    }
  }, [projectId, onTestCaseUpdate]);

  // Fix Check 변경 (최적화: 낙관적 업데이트)
  const handleFixCheckChange = useCallback(async (caseId: string, fixChecked: boolean) => {
    // 로컬 상태에서 즉시 업데이트 (낙관적 업데이트)
    setLocalTestCases(prev => 
      prev.map(testCase => 
        testCase.case_id === caseId 
          ? { ...testCase, fix_checked: fixChecked }
          : testCase
      )
    );

    try {
      const response = await fetch(`/api/projects/${projectId}/test-cases/${caseId}/fix-check`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fix_checked: fixChecked })
      });

      if (response.ok) {
        console.log('Fix check updated successfully');
        // 서버 업데이트 성공 - 낙관적 업데이트가 정확했음
      } else {
        const errorData = await response.json();
        console.error('Error updating fix check:', errorData.error);
        
        // 실패시 원래 상태로 롤백
        setLocalTestCases(prev => 
          prev.map(testCase => 
            testCase.case_id === caseId 
              ? { ...testCase, fix_checked: !fixChecked }
              : testCase
          )
        );
        alert('수정체크 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error updating fix check:', error);
      
      // 네트워크 오류시 원래 상태로 롤백
      setLocalTestCases(prev => 
        prev.map(testCase => 
          testCase.case_id === caseId 
            ? { ...testCase, fix_checked: !fixChecked }
            : testCase
        )
      );
      alert('네트워크 오류가 발생했습니다.');
    }
  }, [projectId]);

  // 인라인 편집 관련 핸들러
  const handleStartEdit = useCallback((caseId: string, field: string) => {
    setState(prev => ({
      ...prev,
      editingCell: { rowId: caseId, field }
    }));
  }, []);

  const handleCancelEdit = useCallback(() => {
    setState(prev => ({
      ...prev,
      editingCell: null
    }));
  }, []);

  const handleSaveEdit = useCallback(async (caseId: string, field: string, value: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/test-cases/${caseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          [field]: value
        })
      });

      if (response.ok) {
        setState(prev => ({
          ...prev,
          editingCell: null
        }));
        onTestCaseUpdate?.(); // 데이터 새로고침
      } else {
        const error = await response.json();
        alert(error.error || '저장 실패');
      }
    } catch (error) {
      console.error('Error updating test case:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  }, [projectId, onTestCaseUpdate]);

  // 정렬 아이콘 가져오기
  const getSortIcon = (field: SortField) => {
    if (state.sortField !== field) return '↕️';
    return state.sortDirection === 'asc' ? '↑' : '↓';
  };

  // 상태별 색상 클래스
  const getStatusClass = (status?: string) => {
    switch (status) {
      case 'pass': return 'bg-green-100 text-green-800';
      case 'fail': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 우선순위별 색상 클래스
  const getPriorityClass = (priority?: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 오류 유형별 색상 클래스
  const getErrorTypeClass = (errorType?: string) => {
    switch (errorType) {
      case '기능오류': return 'bg-red-100 text-red-800';
      case '신규개발(개선)': return 'bg-blue-100 text-blue-800';
      case 'UI/UX오류': return 'bg-purple-100 text-purple-800';
      case '시스템연동오류': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  // 인라인 편집은 항상 허용, 테스트 실행만 제한
  const canInteract = displayState !== 'preview';  // preview 상태가 아니면 편집 가능
  const canExecuteTests = displayState === 'active';  // 테스트 실행은 모든 설정 완료 후
  const allSelected = renderableTestCases.length > 0 && state.selectedRows.size === renderableTestCases.length;
  const someSelected = state.selectedRows.size > 0 && state.selectedRows.size < renderableTestCases.length;

  // 키보드 단축키 핸들링
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+A - 모두 선택
      if (e.ctrlKey && e.key === 'a' && canInteract) {
        e.preventDefault();
        handleSelectAll(true);
      }
      // Delete 키 - 선택된 항목 삭제
      else if (e.key === 'Delete' && state.selectedRows.size > 0 && canInteract) {
        e.preventDefault();
        handleBulkDelete();
      }
      // Escape 키 - 선택 해제
      else if (e.key === 'Escape' && state.selectedRows.size > 0) {
        setState(prev => ({ ...prev, selectedRows: new Set() }));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canInteract, state.selectedRows.size, handleSelectAll, handleBulkDelete]);

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
      {/* 일괄 작업 툴바 */}
      {state.selectedRows.size > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-blue-800">
              {state.selectedRows.size}개 항목 선택됨
            </span>
            <div className="flex items-center gap-2">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as 'pass' | 'fail' | 'pending')}
                className="px-3 py-1 border border-blue-300 rounded text-sm text-black"
                disabled={!canInteract}
              >
                <option value="">상태 선택</option>
                <option value="pass">✅ Pass</option>
                <option value="fail">❌ Fail</option>
                <option value="pending">⏳ Pending</option>
              </select>
              <button
                onClick={handleBulkStatusChange}
                disabled={!bulkStatus || !canInteract}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                일괄 적용
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={!canInteract}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="선택된 항목 삭제 (Delete 키)"
              >
                일괄 삭제
              </button>
              <select
                value=""
                onChange={(e) => e.target.value && handleBulkMove(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm text-black"
                disabled={!canInteract || state.selectedRows.size === 0}
              >
                <option value="">위치 이동...</option>
                <option value="top">🔝 최상단으로</option>
                <option value="bottom">🔻 최하단으로</option>
                <option value="group">📁 하위 그룹으로</option>
              </select>
            </div>
            <div className="text-xs text-blue-600 mt-1">
              💡 단축키: Ctrl+A (모두선택), Delete (삭제), Esc (선택해제)
            </div>
          </div>
        </div>
      )}

      {/* 스프레드시트 테이블 */}
      <div className="overflow-auto" style={{ maxHeight: '70vh' }}>
        <table className="w-full border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
            <tr>
              {/* 체크박스 컬럼 */}
              <th 
                className="px-1 py-2 text-center border-r border-slate-200 bg-slate-50 relative group"
                style={{ width: state.columnWidths.checkbox }}
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  disabled={!canInteract}
                  className="rounded"
                />
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100"
                  onMouseDown={(e) => handleResizeStart('checkbox', e)}
                />
              </th>

              {/* Case ID */}
              <th 
                className="px-2 py-2 text-center border-r border-slate-200 bg-slate-50 relative group cursor-pointer hover:bg-slate-100"
                style={{ width: state.columnWidths.case_id }}
                onClick={() => handleSort('case_id')}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Case ID</span>
                  <span className="text-slate-400">{getSortIcon('case_id')}</span>
                </div>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100"
                  onMouseDown={(e) => handleResizeStart('case_id', e)}
                />
              </th>

              {/* 카테고리 */}
              <th 
                className="px-2 py-2 text-center border-r border-slate-200 bg-slate-50 relative group cursor-pointer hover:bg-slate-100"
                style={{ width: state.columnWidths.category_name }}
                onClick={() => handleSort('category_name')}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">카테고리</span>
                  <span className="text-slate-400">{getSortIcon('category_name')}</span>
                </div>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100"
                  onMouseDown={(e) => handleResizeStart('category_name', e)}
                />
              </th>

              {/* 테스트 항목 */}
              <th 
                className="px-2 py-2 text-center border-r border-slate-200 bg-slate-50 relative group cursor-pointer hover:bg-slate-100"
                style={{ width: state.columnWidths.item }}
                onClick={() => handleSort('item')}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">테스트 항목</span>
                  <span className="text-slate-400">{getSortIcon('item')}</span>
                </div>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100"
                  onMouseDown={(e) => handleResizeStart('item', e)}
                />
              </th>

              {/* 우선순위 */}
              <th 
                className="px-2 py-2 text-center border-r border-slate-200 bg-slate-50 relative group cursor-pointer hover:bg-slate-100"
                style={{ width: state.columnWidths.priority }}
                onClick={() => handleSort('priority')}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">우선순위</span>
                  <span className="text-slate-400">{getSortIcon('priority')}</span>
                </div>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100"
                  onMouseDown={(e) => handleResizeStart('priority', e)}
                />
              </th>

              {/* 오류 유형 */}
              <th 
                className="px-2 py-2 text-center border-r border-slate-200 bg-slate-50 relative group cursor-pointer hover:bg-slate-100"
                style={{ width: state.columnWidths.error_type }}
                onClick={() => handleSort('error_type')}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider leading-tight">
                    오류<br/>유형
                  </span>
                  <span className="text-slate-400">{getSortIcon('error_type')}</span>
                </div>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100"
                  onMouseDown={(e) => handleResizeStart('error_type', e)}
                />
              </th>

              {/* 수정체크 */}
              <th 
                className="px-2 py-2 text-center border-r border-slate-200 bg-slate-50 relative group cursor-pointer hover:bg-slate-100"
                style={{ width: state.columnWidths.fix_checked }}
                onClick={() => handleSort('fix_checked')}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider leading-tight">
                    수정<br/>체크
                  </span>
                  <span className="text-slate-400">{getSortIcon('fix_checked')}</span>
                </div>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100"
                  onMouseDown={(e) => handleResizeStart('fix_checked', e)}
                />
              </th>

              {/* 최근 상태 */}
              <th 
                className="px-2 py-2 text-center border-r border-slate-200 bg-slate-50 relative group cursor-pointer hover:bg-slate-100"
                style={{ width: state.columnWidths.latest_status }}
                onClick={() => handleSort('latest_status')}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider leading-tight">
                    최근<br/>상태
                  </span>
                  <span className="text-slate-400">{getSortIcon('latest_status')}</span>
                </div>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100"
                  onMouseDown={(e) => handleResizeStart('latest_status', e)}
                />
              </th>

              {/* 최근 테스터 */}
              <th 
                className="px-2 py-2 text-center border-r border-slate-200 bg-slate-50 relative group cursor-pointer hover:bg-slate-100"
                style={{ width: state.columnWidths.latest_tester }}
                onClick={() => handleSort('latest_tester')}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider leading-tight">
                    최근<br/>실행
                  </span>
                  <span className="text-slate-400">{getSortIcon('latest_tester')}</span>
                </div>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100"
                  onMouseDown={(e) => handleResizeStart('latest_tester', e)}
                />
              </th>

              {/* 시도 수 */}
              <th 
                className="px-2 py-2 text-center border-r border-slate-200 bg-slate-50 relative group cursor-pointer hover:bg-slate-100"
                style={{ width: state.columnWidths.total_attempts }}
                onClick={() => handleSort('total_attempts')}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider leading-tight">
                    테스트<br/>횟수
                  </span>
                  <span className="text-slate-400">{getSortIcon('total_attempts')}</span>
                </div>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100"
                  onMouseDown={(e) => handleResizeStart('total_attempts', e)}
                />
              </th>

              {/* 작업 */}
              <th 
                className="px-2 py-2 text-center bg-slate-50"
                style={{ width: state.columnWidths.actions }}
              >
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">작업</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {renderableTestCases.map((testCase, index) => (
              <TestCaseRow
                key={testCase.case_id}
                testCase={testCase}
                projectId={projectId}
                isSelected={state.selectedRows.has(testCase.case_id)}
                isExpanded={state.expandedRows.has(testCase.case_id)}
                isTreeExpanded={state.expandedTreeNodes.has(testCase.case_id)}
                onSelect={handleRowSelect}
                onToggleExpand={toggleRowExpansion}
                onTreeToggleExpand={handleTreeNodeToggle}
                onStatusChange={handleStatusChange}
                onErrorTypeChange={handleErrorTypeChange}
                onFixCheckChange={handleFixCheckChange}
                onCategoryChange={handleCategoryChange}
                onCaseIdChange={handleCaseIdChange}
                onDelete={onDelete}
                canInteract={canInteract}
                canExecuteTests={canExecuteTests}
                isEven={index % 2 === 0}
                columnWidths={state.columnWidths}
                categories={categories}
                isDragging={state.draggedNodeId === testCase.case_id}
                isDropTarget={state.dropTargetId === testCase.case_id}
                dropZone={state.dropTargetId === testCase.case_id ? state.dropZone : null}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                // 인라인 편집 props
                editingCell={state.editingCell}
                onStartEdit={handleStartEdit}
                onCancelEdit={handleCancelEdit}
                onSaveEdit={handleSaveEdit}
              />
            ))}
          </tbody>
        </table>
      </div>

      {renderableTestCases.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <div className="text-4xl mb-4">📋</div>
          <p>표시할 테스트 케이스가 없습니다.</p>
        </div>
      )}
    </div>
  );
}

interface TestCaseRowProps {
  testCase: TestCase;
  projectId: string;
  isSelected: boolean;
  isExpanded: boolean;
  isTreeExpanded: boolean;
  onSelect: (caseId: string, selected: boolean) => void;
  onToggleExpand: (caseId: string) => void;
  onTreeToggleExpand: (caseId: string) => void;
  onStatusChange: (caseId: string, status: 'pass' | 'fail' | 'pending') => void;
  onErrorTypeChange?: (caseId: string, errorType: ErrorType) => void;
  onFixCheckChange?: (caseId: string, fixChecked: boolean) => void;
  onCategoryChange?: (caseId: string, categoryId: number) => void;
  onCaseIdChange?: (currentCaseId: string, newCaseId: string) => void;
  onDelete: () => void;
  canInteract: boolean;
  canExecuteTests: boolean;
  isEven: boolean;
  columnWidths: ColumnWidth;
  categories: { category_id: number; category_name: string }[];
  // 드래그 앤 드롭 관련 props
  isDragging?: boolean;
  isDropTarget?: boolean;
  dropZone?: 'before' | 'after' | 'inside' | null;
  onDragStart?: (e: React.DragEvent, caseId: string) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent, caseId: string) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, caseId: string) => void;
  // 인라인 편집 관련 props
  editingCell?: { rowId: string; field: string } | null;
  onStartEdit?: (caseId: string, field: string) => void;
  onCancelEdit?: () => void;
  onSaveEdit?: (caseId: string, field: string, value: string) => void;
}

function TestCaseRow({
  testCase,
  projectId,
  isSelected,
  isExpanded,
  isTreeExpanded,
  onSelect,
  onToggleExpand,
  onTreeToggleExpand,
  onStatusChange,
  onErrorTypeChange,
  onFixCheckChange,
  onCategoryChange,
  onCaseIdChange,
  onDelete,
  canInteract,
  canExecuteTests,
  isEven,
  columnWidths,
  categories,
  isDragging = false,
  isDropTarget = false,
  dropZone = null,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  editingCell,
  onStartEdit,
  onCancelEdit,
  onSaveEdit
}: TestCaseRowProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [editValue, setEditValue] = useState('');

  const latestResult = testCase.results?.[0];
  const totalAttempts = testCase.results?.length || 0;

  // EditableCell 컴포넌트 정의
  interface EditableCellProps {
    value: string;
    isEditing: boolean;
    onStartEdit: () => void;
    onSave: (value: string) => void;
    onCancel?: () => void;
    canEdit: boolean;
    className?: string;
    placeholder?: string;
    multiline?: boolean;
  }

  function EditableCell({
    value,
    isEditing,
    onStartEdit,
    onSave,
    onCancel,
    canEdit,
    className = '',
    placeholder = '',
    multiline = false
  }: EditableCellProps) {
    const [editValue, setEditValue] = useState(value);

    useEffect(() => {
      setEditValue(value);
    }, [value]);

    const handleSave = () => {
      onSave(editValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        setEditValue(value);
        onCancel?.();
      }
    };

    if (isEditing) {
      if (multiline) {
        return (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={`w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:border-blue-500 resize-none ${className}`}
            placeholder={placeholder}
            autoFocus
            rows={3}
          />
        );
      } else {
        return (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={`w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:border-blue-500 ${className}`}
            placeholder={placeholder}
            autoFocus
          />
        );
      }
    }

    return (
      <div
        onClick={canEdit ? onStartEdit : undefined}
        className={`cursor-pointer hover:bg-blue-50 px-2 py-1 min-h-[32px] flex items-center ${
          className.includes('text-right') ? 'justify-end' : ''
        } ${className} ${
          canEdit ? 'hover:bg-blue-50' : ''
        }`}
        title={canEdit ? "클릭하여 편집" : ""}
      >
        {value || (
          <span className="text-gray-400 italic">{placeholder}</span>
        )}
      </div>
    );
  }

  // EditableSelect 컴포넌트 정의
  interface EditableSelectProps {
    value: string;
    options: { value: string; label: string; className?: string }[];
    isEditing: boolean;
    onStartEdit: () => void;
    onSave: (value: string) => void;
    onCancel?: () => void;
    canEdit: boolean;
    className?: string;
    placeholder?: string;
  }

  function EditableSelect({
    value,
    options,
    isEditing,
    onStartEdit,
    onSave,
    onCancel,
    canEdit,
    className = '',
    placeholder = '선택하세요'
  }: EditableSelectProps) {
    const [editValue, setEditValue] = useState(value);

    useEffect(() => {
      setEditValue(value);
    }, [value]);

    const handleSave = () => {
      onSave(editValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        setEditValue(value);
        onCancel?.();
      }
    };

    if (isEditing) {
      return (
        <select
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={`w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:border-blue-500 ${className}`}
          autoFocus
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    const currentOption = options.find(opt => opt.value === value);
    
    return (
      <div
        onClick={canEdit ? onStartEdit : undefined}
        className={`cursor-pointer hover:bg-blue-50 px-2 py-1 min-h-[32px] flex items-center ${className} ${
          canEdit ? 'hover:bg-blue-50' : ''
        }`}
        title={canEdit ? "클릭하여 편집" : ""}
      >
        {currentOption ? (
          <span className={currentOption.className}>{currentOption.label}</span>
        ) : (
          <span className="text-gray-400 italic">{placeholder}</span>
        )}
      </div>
    );
  }

  // 오류 유형별 색상 클래스
  const getErrorTypeClass = (errorType?: string) => {
    switch (errorType) {
      case '기능오류': return 'bg-red-100 text-red-800';
      case '신규개발(개선)': return 'bg-blue-100 text-blue-800';
      case 'UI/UX오류': return 'bg-purple-100 text-purple-800';
      case '시스템연동오류': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('이 테스트 케이스를 삭제하시겠습니까?')) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/test-cases/${testCase.case_id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        onDelete();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete test case');
      }
    } catch (error) {
      console.error('Error deleting test case:', error);
      alert('Failed to delete test case');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusClass = (status?: string) => {
    switch (status) {
      case 'pass': return 'bg-green-100 text-green-800';
      case 'fail': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityClass = (priority?: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Mid': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 드래그 앤 드롭 스타일 계산
  const getDragDropClasses = () => {
    let classes = `hover:bg-slate-50 transition-colors cursor-move ${isSelected ? 'bg-blue-50' : isEven ? 'bg-white' : 'bg-slate-25'}`;
    
    if (isDragging) {
      classes += ' opacity-50 shadow-lg border-2 border-blue-300';
    }
    
    if (isDropTarget) {
      if (dropZone === 'before') {
        classes += ' border-t-4 border-t-green-400';
      } else if (dropZone === 'after') {
        classes += ' border-b-4 border-b-green-400';
      } else if (dropZone === 'inside') {
        classes += ' bg-green-50 border-2 border-green-300';
      }
    }
    
    return classes;
  };

  return (
    <>
      <tr 
        className={getDragDropClasses()}
        draggable={canInteract}
        onDragStart={(e) => onDragStart?.(e, testCase.case_id)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => onDragOver?.(e, testCase.case_id)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop?.(e, testCase.case_id)}
      >
        {/* 체크박스 */}
        <td className="px-1 py-3 border-r border-slate-200" style={{ width: columnWidths.checkbox }}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(testCase.case_id, e.target.checked)}
            disabled={!canInteract}
            className="rounded"
          />
        </td>

        {/* Case ID */}
        <td className="px-3 py-3 border-r border-slate-200" style={{ width: columnWidths.case_id }}>
          <div className="text-sm font-mono text-slate-900 bg-slate-100 px-2 py-1 rounded cursor-not-allowed">
            {testCase.case_id}
          </div>
        </td>

        {/* 카테고리 */}
        <td className="px-3 py-3 border-r border-slate-200" style={{ width: columnWidths.category_name }}>
          <select
            value={testCase.category_id || ''}
            onChange={(e) => onCategoryChange?.(testCase.case_id, Number(e.target.value))}
            disabled={!canInteract}
            className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded border-0 cursor-pointer w-full"
          >
            <option value="">카테고리 선택</option>
            {categories.map(category => (
              <option key={category.category_id} value={category.category_id}>
                {category.category_name}
              </option>
            ))}
          </select>
        </td>

        {/* 테스트 항목 */}
        <td className="px-3 py-3 border-r border-slate-200" style={{ width: columnWidths.item }}>
          <div className="flex items-center gap-2" style={getIndentStyle(testCase.depth || 1)}>
            {/* 드래그 핸들 */}
            {canInteract && (
              <span 
                className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing text-sm flex-shrink-0"
                title="드래그하여 순서 변경"
              >
                ⋮⋮
              </span>
            )}
            
            {/* 계층 구조 확장/축소 버튼 */}
            <button
              onClick={() => onTreeToggleExpand(testCase.case_id)}
              className="text-slate-500 hover:text-slate-700 text-sm w-4 flex-shrink-0"
              disabled={!canInteract}
              style={{ visibility: hasChildren(testCase) ? 'visible' : 'hidden' }}
            >
              {getExpandIcon(testCase, isTreeExpanded)}
            </button>
            
            <EditableCell
              value={testCase.item}
              isEditing={editingCell?.rowId === testCase.case_id && editingCell?.field === 'item'}
              onStartEdit={() => onStartEdit?.(testCase.case_id, 'item')}
              onSave={(value) => onSaveEdit?.(testCase.case_id, 'item', value)}
              onCancel={onCancelEdit}
              canEdit={canInteract}
              className="text-sm font-semibold text-slate-900 truncate flex-1 text-right"
              placeholder="테스트 항목을 입력하세요"
            />
            
            {/* 상세 정보 확장/축소 버튼 */}
            <button
              onClick={() => onToggleExpand(testCase.case_id)}
              className="text-slate-400 hover:text-slate-600 text-xs ml-1 flex-shrink-0"
              disabled={!canInteract}
              title={isExpanded ? '상세 정보 숨기기' : '상세 정보 보기'}
            >
              {isExpanded ? '📄' : '📋'}
            </button>
          </div>
        </td>

        {/* 우선순위 */}
        <td className="px-3 py-3 border-r border-slate-200" style={{ width: columnWidths.priority }}>
          <EditableSelect
            value={testCase.priority || ''}
            options={[
              { value: '', label: '선택' },
              { value: 'High', label: 'High' },
              { value: 'Medium', label: 'Medium' },
              { value: 'Low', label: 'Low' }
            ]}
            isEditing={editingCell?.rowId === testCase.case_id && editingCell?.field === 'priority'}
            onStartEdit={() => onStartEdit?.(testCase.case_id, 'priority')}
            onSave={(value) => onSaveEdit?.(testCase.case_id, 'priority', value)}
            onCancel={onCancelEdit}
            canEdit={canInteract}
            className={`text-xs px-2 py-1 rounded font-semibold ${getPriorityClass(testCase.priority)}`}
            displayValue={testCase.priority || '선택'}
          />
        </td>

        {/* 오류 유형 */}
        <td className="px-3 py-3 border-r border-slate-200" style={{ width: columnWidths.error_type }}>
          <select
            value={testCase.error_type || ''}
            onChange={(e) => onErrorTypeChange(testCase.case_id, e.target.value as ErrorType)}
            disabled={!canInteract}
            className={`text-xs px-2 py-1 rounded font-semibold border-0 cursor-pointer ${getErrorTypeClass(testCase.error_type)}`}
          >
            <option value="">선택</option>
            <option value="기능오류">기능오류</option>
            <option value="신규개발(개선)">신규개발(개선)</option>
            <option value="UI/UX오류">UI/UX오류</option>
            <option value="시스템연동오류">시스템연동오류</option>
          </select>
        </td>

        {/* 수정체크 */}
        <td className="px-3 py-3 border-r border-slate-200 text-center" style={{ width: columnWidths.fix_checked }}>
          <input
            type="checkbox"
            checked={testCase.fix_checked || false}
            onChange={(e) => onFixCheckChange(testCase.case_id, e.target.checked)}
            disabled={!canInteract}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
        </td>

        {/* 최근 상태 */}
        <td className="px-3 py-3 border-r border-slate-200" style={{ width: columnWidths.latest_status }}>
          <select
            value={latestResult?.status || ''}
            onChange={(e) => onStatusChange(testCase.case_id, e.target.value as 'pass' | 'fail' | 'pending')}
            disabled={!canInteract}
            className={`text-xs px-2 py-1 rounded font-semibold border-0 cursor-pointer ${getStatusClass(latestResult?.status)}`}
          >
            <option value="">선택</option>
            <option value="pass">✅ Pass</option>
            <option value="fail">❌ Fail</option>
            <option value="pending">⏳ Pending</option>
          </select>
        </td>

        {/* 최근 테스터 */}
        <td className="px-2 py-3 border-r border-slate-200" style={{ width: columnWidths.latest_tester }}>
          {latestResult ? (
            <div className="space-y-1">
              <div className="text-sm font-medium text-slate-700">
                {latestResult.user_name}
              </div>
              <div className="text-xs text-slate-500">
                {latestResult.environment?.os && (
                  <span className="inline-block bg-slate-100 px-1.5 py-0.5 rounded text-xs mr-1">
                    {latestResult.environment.os}
                  </span>
                )}
                {latestResult.environment?.device && (
                  <span className="inline-block bg-slate-100 px-1.5 py-0.5 rounded text-xs">
                    {latestResult.environment.device}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400">
                {new Date(latestResult.created_at).toLocaleDateString('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          ) : (
            <span className="text-sm text-slate-400">-</span>
          )}
        </td>

        {/* 시도 수 */}
        <td className="px-3 py-3 border-r border-slate-200" style={{ width: columnWidths.total_attempts }}>
          <span className="text-sm font-semibold text-slate-900">
            {totalAttempts}
          </span>
        </td>

        {/* 작업 */}
        <td className="px-3 py-3 text-center" style={{ width: columnWidths.actions }}>
          <button
            onClick={handleDelete}
            disabled={!canInteract || isDeleting}
            className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50"
            title="테스트 케이스 삭제"
          >
            {isDeleting ? '🔄' : '🗑️'}
          </button>
        </td>
      </tr>

      {/* 확장된 상세 정보 */}
      {isExpanded && (
        <tr className="bg-slate-50">
          <td colSpan={9} className="px-6 py-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-slate-600 mb-2">테스트 절차</h4>
                <div className="bg-white p-3 rounded border">
                  <EditableCell
                    value={testCase.steps || ''}
                    isEditing={editingCell?.rowId === testCase.case_id && editingCell?.field === 'steps'}
                    onStartEdit={() => onStartEdit?.(testCase.case_id, 'steps')}
                    onSave={(value) => onSaveEdit?.(testCase.case_id, 'steps', value)}
                    onCancel={onCancelEdit}
                    canEdit={canInteract}
                    className="text-sm text-slate-700 whitespace-pre-line min-h-16"
                    placeholder="테스트 절차를 입력하세요"
                    multiline={true}
                  />
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-sm text-slate-600 mb-2">예상 결과</h4>
                <div className="bg-white p-3 rounded border">
                  <EditableCell
                    value={testCase.expected || ''}
                    isEditing={editingCell?.rowId === testCase.case_id && editingCell?.field === 'expected'}
                    onStartEdit={() => onStartEdit?.(testCase.case_id, 'expected')}
                    onSave={(value) => onSaveEdit?.(testCase.case_id, 'expected', value)}
                    onCancel={onCancelEdit}
                    canEdit={canInteract}
                    className="text-sm text-slate-700 min-h-16"
                    placeholder="예상 결과를 입력하세요"
                    multiline={true}
                  />
                </div>
              </div>

              {testCase.results && testCase.results.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-slate-600 mb-2">테스트 이력 ({testCase.results.length}개)</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {testCase.results.map(result => (
                      <div key={result.result_id} className="text-xs bg-white p-3 rounded border">
                        <div className="flex justify-between items-center mb-2">
                          <span className={`font-semibold px-2 py-1 rounded ${getStatusClass(result.status)}`}>
                            {result.status.toUpperCase()}
                          </span>
                          <span className="text-slate-500">
                            {new Date(result.created_at).toLocaleString('ko-KR')}
                          </span>
                        </div>
                        <div className="text-slate-600 grid grid-cols-2 gap-2">
                          <span>테스터: {result.user_name}</span>
                          {result.environment && (
                            <span>
                              환경: {result.environment.os} {result.environment.device} {result.environment.version}
                            </span>
                          )}
                        </div>
                        {result.notes && (
                          <div className="text-slate-700 mt-2 p-2 bg-slate-50 rounded">{result.notes}</div>
                        )}
                        {result.bug_id && (
                          <div className="text-blue-600 mt-2">버그 ID: {result.bug_id}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}