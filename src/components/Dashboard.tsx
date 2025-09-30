'use client';

import { useState, useEffect } from 'react';
import { Project, TestCase, TestResult, CreateTestResultRequest, User } from '@/types';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import SetupProgressIndicator from './SetupProgressIndicator';
import CategoryManager from './CategoryManager';
import TestCaseCreator from './TestCaseCreator';
import ImportExportManager from './ImportExportManager';
import DeleteConfirmDialog from './DeleteConfirmDialog';

ChartJS.register(ArcElement, Tooltip, Legend);

interface CurrentState {
  userId: string;
  userName: string;
  env: {
    os: string;
    device: string;
    version: string;
  };
}

interface DashboardProps {
  projectId: string;
  onBackToProjects: () => void;
}

export default function Dashboard({ projectId, onBackToProjects }: DashboardProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentState, setCurrentState] = useState<CurrentState>({
    userId: '',
    userName: '',
    env: { os: '', device: '', version: '' }
  });
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [currentFilters, setCurrentFilters] = useState({ category: 'all' });

  useEffect(() => {
    if (projectId) {
      loadProject();
      loadTestCases(projectId);
      loadUsers();
    }
  }, [projectId]);

  const loadProject = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        const foundProject = data.find((p: Project) => p.project_id === projectId);
        setProject(foundProject || null);
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error('Error loading project:', error);
      setConnectionStatus('error');
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadTestCases = async (projectId: string) => {
    if (!projectId) return;
    
    try {
      const response = await fetch(`/api/projects/${projectId}/cases`);
      if (response.ok) {
        const data = await response.json();
        setTestCases(data);
      }
    } catch (error) {
      console.error('Error loading test cases:', error);
    }
  };

  const postNewResult = async (resultData: CreateTestResultRequest) => {
    try {
      const response = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultData)
      });
      
      if (response.ok) {
        // Reload test cases to show new result
        loadTestCases(projectId);
      }
    } catch (error) {
      console.error('Error posting result:', error);
    }
  };

  const handleRecordClick = (caseId: string, status: 'pass' | 'fail' | 'blocker', notes: string, bugId: string) => {
    const resultData: CreateTestResultRequest = {
      case_id: caseId,
      user_id: currentState.userId,
      status,
      environment: currentState.env,
      notes: notes || undefined,
      bug_id: bugId || undefined
    };
    postNewResult(resultData);
  };

  const handleUserChange = (userId: string) => {
    const selectedUser = users.find(u => u.user_id === userId);
    setCurrentState(prev => ({ 
      ...prev, 
      userId, 
      userName: selectedUser?.user_name || '' 
    }));
  };

  // Three-state display system
  enum DisplayState {
    PREVIEW = 'preview',   // Show content but disabled
    PARTIAL = 'partial',   // Some interactions enabled
    ACTIVE = 'active'      // Full functionality
  }

  const getDisplayState = (): DisplayState => {
    const requirements = [projectId, currentState.userId, currentState.env.os];
    const completedCount = requirements.filter(Boolean).length;
    
    if (completedCount === 0) return DisplayState.PREVIEW;
    if (completedCount < 3) return DisplayState.PARTIAL;
    return DisplayState.ACTIVE;
  };

  const displayState = getDisplayState();
  const isListEnabled = displayState === DisplayState.ACTIVE;

  const getStatusCounts = () => {
    const totalCases = testCases.length;
    let passCount = 0;
    let failCount = 0;
    let totalAttempts = 0;

    testCases.forEach(testCase => {
      if (testCase.results && testCase.results.length > 0) {
        totalAttempts += testCase.results.length;
        testCase.results.forEach(result => {
          if (result.status === 'pass') passCount++;
          else if (result.status === 'fail' || result.status === 'blocker') failCount++;
        });
      }
    });

    const untestedCount = totalCases - testCases.filter(tc => tc.results && tc.results.length > 0).length;

    return { totalCases, totalAttempts, passCount, failCount, untestedCount };
  };

  const filteredTestCases = testCases.filter(testCase => 
    currentFilters.category === 'all' || testCase.category_name === currentFilters.category
  );

  const categories = ['all', ...new Set(testCases.map(tc => tc.category_name).filter(Boolean))];
  const statusCounts = getStatusCounts();

  const chartData = {
    labels: ['Pass', 'Fail', 'Pending'],
    datasets: [{
      data: [statusCounts.passCount, statusCounts.failCount, statusCounts.untestedCount],
      backgroundColor: ['#22c55e', '#ef4444', '#a1a1aa'],
      borderColor: '#ffffff',
      borderWidth: 4
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom' as const
      }
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 bg-slate-100 min-h-screen">
      <div className="mb-6">
        <button
          onClick={onBackToProjects}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors mb-4"
        >
          <span>←</span>
          프로젝트 목록으로 돌아가기
        </button>
      </div>

      <header className="text-center mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
          {project ? project.project_name : 'QA 대시보드'}
        </h1>
        <p className="text-slate-600 mt-2">
          {project?.description || 'Next.js 풀스택 구현으로 실시간 결과를 공유합니다.'}
        </p>
      </header>

      {/* Setup Progress Indicator */}
      <SetupProgressIndicator
        projectId={projectId}
        userId={currentState.userId}
        os={currentState.env.os}
        device={currentState.env.device}
      />

      {/* QA 환경 설정 */}
      <div className="mb-6 p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              프로젝트: {project?.project_name || '로딩 중...'}
            </h3>
            <span className={`inline-block px-3 py-1 text-sm rounded-full font-semibold ${
              project?.status === 'Active' 
                ? 'bg-green-100 text-green-600' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {project?.status === 'Active' ? '활성' : '비활성'}
            </span>
          </div>
          <div className="flex items-center justify-center p-2 rounded-lg text-sm font-semibold h-full bg-slate-100">
            <span className={`w-3 h-3 rounded-full mr-2 ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
            }`}></span>
            <span>
              {connectionStatus === 'connected' ? '연결됨' : 
               connectionStatus === 'error' ? '연결 오류' : '연결 중...'}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">QA 환경 설정 (필수)</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <select 
              className="p-2 border border-slate-300 rounded-lg text-sm text-black"
              value={currentState.userId}
              onChange={(e) => handleUserChange(e.target.value)}
            >
              <option value="">테스터 선택</option>
              {users.map(user => (
                <option key={user.user_id} value={user.user_id}>
                  {user.user_name} ({user.role})
                </option>
              ))}
            </select>
            <select 
              className="p-2 border border-slate-300 rounded-lg text-sm text-black"
              value={currentState.env.os}
              onChange={(e) => setCurrentState(prev => ({ ...prev, env: { ...prev.env, os: e.target.value } }))}
            >
              <option value="">OS 선택</option>
              <option value="iOS">iOS</option>
              <option value="Android">Android</option>
              <option value="Web">Web</option>
            </select>
            <input 
              type="text" 
              placeholder="기기명 (예: iPhone 15)" 
              className="p-2 border border-slate-300 rounded-lg text-sm text-black"
              value={currentState.env.device}
              onChange={(e) => setCurrentState(prev => ({ ...prev, env: { ...prev.env, device: e.target.value } }))}
            />
            <input 
              type="text" 
              placeholder="OS 버전 (예: 18.0)" 
              className="p-2 border border-slate-300 rounded-lg text-sm text-black"
              value={currentState.env.version}
              onChange={(e) => setCurrentState(prev => ({ ...prev, env: { ...prev.env, version: e.target.value } }))}
            />
          </div>
        </div>
      </div>

      <main>
        {/* 통계 요약 섹션 */}
        <section className="mb-8 p-6 bg-white rounded-xl shadow-md">
          <h2 className="text-2xl font-bold mb-4 text-center text-slate-800">프로젝트 통계 요약</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-1">
              <div className="relative w-full max-w-[300px] mx-auto h-[300px]">
                <Doughnut data={chartData} options={chartOptions} />
              </div>
            </div>
            <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-slate-100 p-4 rounded-lg">
                <p className="text-sm font-semibold text-slate-500">총 항목</p>
                <p className="text-3xl font-bold text-slate-900">{statusCounts.totalCases}</p>
              </div>
              <div className="bg-blue-100 p-4 rounded-lg">
                <p className="text-sm font-semibold text-blue-600">총 시도</p>
                <p className="text-3xl font-bold text-blue-700">{statusCounts.totalAttempts}</p>
              </div>
              <div className="bg-green-100 p-4 rounded-lg">
                <p className="text-sm font-semibold text-green-600">성공</p>
                <p className="text-3xl font-bold text-green-700">{statusCounts.passCount}</p>
              </div>
              <div className="bg-red-100 p-4 rounded-lg">
                <p className="text-sm font-semibold text-red-600">실패</p>
                <p className="text-3xl font-bold text-red-700">{statusCounts.failCount}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Management Tools Section */}
        <section className="mb-8 space-y-4">
          <CategoryManager 
            projectId={projectId} 
            onCategoryCreated={() => loadTestCases(projectId)}
          />
          
          <TestCaseCreator 
            projectId={projectId} 
            onTestCaseCreated={() => loadTestCases(projectId)}
          />
          
          <ImportExportManager 
            projectId={projectId} 
            projectName={project?.project_name || 'Unknown Project'}
            onDataImported={() => loadTestCases(projectId)}
          />
        </section>

        {/* 테스트 항목 및 이력 섹션 */}
        <section className={`bg-white p-6 rounded-xl shadow-md relative min-h-[300px] transition-all duration-300 ${
          displayState === DisplayState.PREVIEW ? 'opacity-60' : 
          displayState === DisplayState.PARTIAL ? 'opacity-80' : 'opacity-100'
        }`}>
          {/* Status Banner */}
          {displayState !== DisplayState.ACTIVE && (
            <div className="mb-4 p-3 rounded-lg border-l-4 border-blue-400 bg-blue-50">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-blue-400">ℹ️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-800">
                    {displayState === DisplayState.PREVIEW && 
                      "테스트 케이스 미리보기 - 설정을 완료하면 테스트를 시작할 수 있습니다"}
                    {displayState === DisplayState.PARTIAL && 
                      "일부 기능 활성화됨 - 모든 설정을 완료하면 테스트 실행이 가능합니다"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <h2 className="text-2xl font-bold mb-4 text-slate-800">테스트 항목 및 이력</h2>
          
          {/* 카테고리 필터 */}
          <div className="mb-6">
            <p className="font-semibold mb-2 text-slate-600">카테고리 필터</p>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  className={`px-4 py-2 text-sm rounded-full font-semibold transition ${
                    currentFilters.category === category
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-200'
                  }`}
                  onClick={() => setCurrentFilters({ category })}
                >
                  {category === 'all' ? '전체' : category}
                </button>
              ))}
            </div>
          </div>

          {/* 테스트 케이스 목록 */}
          <div className="space-y-4">
            {filteredTestCases.map(testCase => (
              <TestCaseCard
                key={testCase.case_id}
                testCase={testCase}
                projectId={projectId}
                onRecord={handleRecordClick}
                onDelete={() => loadTestCases(projectId)}
                disabled={!isListEnabled}
                displayState={displayState}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

interface TestCaseCardProps {
  testCase: TestCase;
  projectId: string;
  onRecord: (caseId: string, status: 'pass' | 'fail' | 'blocker', notes: string, bugId: string) => void;
  onDelete: () => void;
  disabled: boolean;
  displayState: 'preview' | 'partial' | 'active';
}

function TestCaseCard({ testCase, projectId, onRecord, onDelete, disabled, displayState }: TestCaseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [bugId, setBugId] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Determine what features are available based on display state
  const canExpand = displayState !== 'preview';
  const canInteract = displayState === 'active';

  const getLatestStatus = () => {
    if (!testCase.results || testCase.results.length === 0) return null;
    return testCase.results[0]; // Results are ordered by created_at DESC
  };

  const latestStatus = getLatestStatus();

  const handleRecord = (status: 'pass' | 'fail' | 'blocker') => {
    if (!canInteract) return;
    onRecord(testCase.case_id, status, notes, bugId);
    setNotes('');
    setBugId('');
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/test-cases/${testCase.case_id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setShowDeleteDialog(false);
        onDelete(); // Trigger refresh of test cases list
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

  return (
    <div className={`border border-slate-200 rounded-lg p-4 transition-all ${isExpanded ? 'bg-slate-50' : 'bg-white'}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded">{testCase.category_name}</span>
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">{testCase.priority}</span>
            {latestStatus && (
              <span className={`text-xs px-2 py-1 rounded ${
                latestStatus.status === 'pass' ? 'bg-green-100 text-green-600' :
                latestStatus.status === 'fail' ? 'bg-red-100 text-red-600' :
                'bg-yellow-100 text-yellow-600'
              }`}>
                최근: {latestStatus.status} ({latestStatus.user_name})
              </span>
            )}
          </div>
          <h3 className="font-semibold text-slate-800">{testCase.item}</h3>
        </div>
        <div className="flex items-center gap-2">
          {canExpand ? (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-slate-500 hover:text-slate-700 text-sm"
            >
              {isExpanded ? '▲' : '▼'}
            </button>
          ) : (
            <span className="text-slate-400 text-sm">미리보기</span>
          )}
          
          {canInteract && (
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50"
              title="테스트 케이스 삭제"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {testCase.steps && (
            <div>
              <h4 className="font-semibold text-sm text-slate-600 mb-1">테스트 절차</h4>
              <p className="text-sm text-slate-700 whitespace-pre-line">{testCase.steps}</p>
            </div>
          )}
          
          {testCase.expected && (
            <div>
              <h4 className="font-semibold text-sm text-slate-600 mb-1">예상 결과</h4>
              <p className="text-sm text-slate-700">{testCase.expected}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">비고</label>
              <textarea
                className="w-full p-2 border border-slate-300 rounded text-sm text-black"
                rows={2}
                placeholder="이슈나 추가 정보를 입력하세요"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={disabled}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">버그 ID</label>
              <input
                type="text"
                className="w-full p-2 border border-slate-300 rounded text-sm mb-3 text-black"
                placeholder="버그 트래킹 ID"
                value={bugId}
                onChange={(e) => setBugId(e.target.value)}
                disabled={disabled}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleRecord('pass')}
                  disabled={!canInteract}
                  className="flex-1 py-2 bg-green-500 text-white rounded font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Pass
                </button>
                <button
                  onClick={() => handleRecord('fail')}
                  disabled={!canInteract}
                  className="flex-1 py-2 bg-red-500 text-white rounded font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Fail
                </button>
                <button
                  onClick={() => handleRecord('blocker')}
                  disabled={!canInteract}
                  className="flex-1 py-2 bg-yellow-500 text-white rounded font-semibold hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Blocker
                </button>
              </div>
              {!canInteract && (
                <p className="text-xs text-amber-600 mt-2 text-center">
                  ⚠️ 테스트 실행을 위해 환경 설정을 완료해주세요
                </p>
              )}
            </div>
          </div>

          {testCase.results && testCase.results.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-slate-600 mb-2">테스트 이력</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {testCase.results.map(result => (
                  <div key={result.result_id} className="text-xs bg-white p-2 rounded border">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-semibold ${
                        result.status === 'pass' ? 'text-green-600' :
                        result.status === 'fail' ? 'text-red-600' :
                        'text-yellow-600'
                      }`}>
                        {result.status.toUpperCase()}
                      </span>
                      <span className="text-slate-500">
                        {new Date(result.created_at).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    <div className="text-slate-600">
                      <span>테스터: {result.user_name}</span>
                      {result.environment && (
                        <span className="ml-2">
                          환경: {result.environment.os} {result.environment.device} {result.environment.version}
                        </span>
                      )}
                    </div>
                    {result.notes && (
                      <div className="text-slate-700 mt-1">{result.notes}</div>
                    )}
                    {result.bug_id && (
                      <div className="text-blue-600 mt-1">버그 ID: {result.bug_id}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        title="테스트 케이스 삭제"
        message="이 테스트 케이스를 정말로 삭제하시겠습니까?"
        itemName={testCase.item}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}