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
import { useQAEnvironment } from '@/contexts/QAEnvironmentContext';
import { useAuth } from '@/contexts/AuthContext';
import SetupProgressIndicator from './SetupProgressIndicator';
import CategoryManager from './CategoryManager';
import TestCaseCreator from './TestCaseCreator';
import ImportExportManager from './ImportExportManager';
import TestCaseSpreadsheet from './TestCaseSpreadsheet';

ChartJS.register(ArcElement, Tooltip, Legend);


interface DashboardProps {
  projectId: string;
  onBackToProjects: () => void;
  initialFilters?: {
    category?: string;
    status?: string;
    tester?: string;
    view?: string;
  };
}

export default function Dashboard({ projectId, onBackToProjects, initialFilters }: DashboardProps) {
  const { qaEnvironment, clearQAEnvironment } = useQAEnvironment();
  const { logout } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [currentFilters, setCurrentFilters] = useState({ 
    category: initialFilters?.category || 'all' 
  });
  const [categoryRefreshKey, setCategoryRefreshKey] = useState(0);
  
  // 모바일 화면 감지 (768px 이하)
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  useEffect(() => {
    if (projectId) {
      loadProject();
      loadTestCases(projectId);
    }
  }, [projectId]);

  const loadProject = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      
      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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


  const loadTestCases = async (projectId: string) => {
    if (!projectId) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      
      const response = await fetch(`/api/projects/${projectId}/cases`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      
      const response = await fetch('/api/results', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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

  const handleRecordClick = (caseId: string, status: 'pass' | 'fail' | 'pending', notes: string, bugId: string) => {
    if (!qaEnvironment) return;
    
    const resultData: CreateTestResultRequest = {
      case_id: caseId,
      user_id: qaEnvironment.userId,
      status,
      environment: qaEnvironment.env,
      notes: notes || undefined,
      bug_id: bugId || undefined
    };
    postNewResult(resultData);
  };


  // Three-state display system
  enum DisplayState {
    PREVIEW = 'preview',   // Show content but disabled
    PARTIAL = 'partial',   // Some interactions enabled
    ACTIVE = 'active'      // Full functionality
  }

  const getDisplayState = (): DisplayState => {
    // QA 환경이 설정되어 있고 프로젝트가 있으면 항상 ACTIVE
    if (projectId && qaEnvironment) {
      return DisplayState.ACTIVE;
    }
    return DisplayState.PREVIEW;
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
          else if (result.status === 'fail' || result.status === 'pending') failCount++;
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
    labels: ['Pass', 'Fail/Pending', 'Untested'],
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
    <div className={`mx-auto bg-slate-100 min-h-screen ${isMobile ? 'px-3 py-3' : 'px-2 py-4'}`}>
      <div className="mb-4">
        <button
          onClick={onBackToProjects}
          className={`inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors mb-4 ${
            isMobile ? 'text-sm' : ''
          }`}
        >
          <span>←</span>
          {isMobile ? '목록으로' : '프로젝트 목록으로 돌아가기'}
        </button>
      </div>

      <header className={`text-center ${isMobile ? 'mb-4' : 'mb-6'}`}>
        <h1 className={`font-bold text-slate-900 ${
          isMobile ? 'text-xl' : 'text-3xl md:text-4xl'
        }`}>
          {project ? project.project_name : 'QA 대시보드'}
        </h1>
        <p className={`text-slate-600 mt-2 ${
          isMobile ? 'text-sm px-2' : ''
        }`}>
          {project?.description || 'Next.js 풀스택 구현으로 실시간 결과를 공유합니다.'}
        </p>
      </header>

      {/* 프로젝트 및 QA 환경 정보 */}
      <div className={`bg-white border border-slate-200 rounded-xl shadow-sm ${
        isMobile ? 'mb-4 p-3' : 'mb-6 p-4'
      }`}>
        <div className={`${
          isMobile ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-3 gap-4 items-center'
        }`}>
          {/* 프로젝트 정보 */}
          <div className={isMobile ? 'text-center' : ''}>
            <h3 className={`font-semibold text-slate-800 mb-1 ${
              isMobile ? 'text-base' : 'text-lg'
            }`}>
              {project?.project_name || '로딩 중...'}
            </h3>
            <span className={`inline-block px-3 py-1 rounded-full font-semibold ${
              isMobile ? 'text-xs' : 'text-sm'
            } ${
              project?.status === 'Active' 
                ? 'bg-green-100 text-green-600' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {project?.status === 'Active' ? '활성' : '비활성'}
            </span>
          </div>

          {/* QA 환경 정보 */}
          <div className={isMobile ? 'text-center' : ''}>
            <p className={`text-slate-600 mb-1 ${
              isMobile ? 'text-xs font-semibold' : 'text-sm'
            }`}>QA 환경</p>
            <div className="space-y-1">
              <p className={`font-medium text-slate-800 ${
                isMobile ? 'text-sm' : 'text-sm'
              }`}>
                👤 {qaEnvironment?.userName}
              </p>
              <p className={`text-slate-600 ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>
                📱 {qaEnvironment?.env.os} {qaEnvironment?.env.device && `• ${qaEnvironment.env.device}`} {qaEnvironment?.env.version && `• ${qaEnvironment.env.version}`}
              </p>
            </div>
          </div>

          {/* 연결 상태 */}
          <div className={`flex items-center p-2 rounded-lg font-semibold bg-slate-100 ${
            isMobile ? 'justify-center text-xs' : 'justify-center text-sm h-full'
          }`}>
            <span className={`w-3 h-3 rounded-full mr-2 ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
            }`}></span>
            <span>
              {connectionStatus === 'connected' ? '연결됨' : 
               connectionStatus === 'error' ? '연결 오류' : '연결 중...'}
            </span>
            <button
              onClick={clearQAEnvironment}
              className={`ml-3 text-blue-600 hover:text-blue-800 underline ${
                isMobile ? 'text-xs' : 'text-xs'
              }`}
            >
              {isMobile ? '변경' : '환경 변경'}
            </button>
          </div>
        </div>
      </div>

      <main>
        {/* 통계 요약 섹션 */}
        <section className={`bg-white rounded-xl shadow-md ${
          isMobile ? 'mb-4 p-3' : 'mb-6 p-4'
        }`}>
          <h2 className={`font-bold text-center text-slate-800 ${
            isMobile ? 'text-lg mb-3' : 'text-2xl mb-4'
          }`}>프로젝트 통계 요약</h2>
          
          {isMobile ? (
            // 모바일 레이아웃: 세로 스택
            <div className="space-y-4">
              <div className="relative w-full max-w-[250px] mx-auto h-[250px]">
                <Doughnut data={chartData} options={chartOptions} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-slate-100 p-3 rounded-lg">
                  <p className="text-xs font-semibold text-slate-500">총 항목</p>
                  <p className="text-2xl font-bold text-slate-900">{statusCounts.totalCases}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <p className="text-xs font-semibold text-blue-600">총 시도</p>
                  <p className="text-2xl font-bold text-blue-700">{statusCounts.totalAttempts}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <p className="text-xs font-semibold text-green-600">성공</p>
                  <p className="text-2xl font-bold text-green-700">{statusCounts.passCount}</p>
                </div>
                <div className="bg-red-100 p-3 rounded-lg">
                  <p className="text-xs font-semibold text-red-600">실패</p>
                  <p className="text-2xl font-bold text-red-700">{statusCounts.failCount}</p>
                </div>
              </div>
            </div>
          ) : (
            // 데스크톱 레이아웃: 기존 그리드
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
          )}
        </section>

        {/* Management Tools Section */}
        <section className={`space-y-4 ${isMobile ? 'mb-4' : 'mb-8'}`}>
          <CategoryManager 
            projectId={projectId} 
            onCategoryCreated={() => {
              loadTestCases(projectId);
              setCategoryRefreshKey(prev => prev + 1);
            }}
          />
          
          <TestCaseCreator 
            projectId={projectId} 
            onTestCaseCreated={() => loadTestCases(projectId)}
            refreshKey={categoryRefreshKey}
          />
          
          <ImportExportManager 
            projectId={projectId} 
            projectName={project?.project_name || 'Unknown Project'}
            onDataImported={() => loadTestCases(projectId)}
          />
        </section>

        {/* 테스트 항목 및 이력 섹션 */}
        <section className={`bg-white rounded-xl shadow-md relative min-h-[300px] transition-all duration-300 ${
          isMobile ? 'p-3' : 'p-3'
        } ${
          displayState === DisplayState.PREVIEW ? 'opacity-60' : 
          displayState === DisplayState.PARTIAL ? 'opacity-80' : 'opacity-100'
        }`}>
          {/* Status Banner */}
          {displayState !== DisplayState.ACTIVE && (
            <div className={`rounded-lg border-l-4 border-blue-400 bg-blue-50 ${
              isMobile ? 'mb-3 p-2' : 'mb-4 p-3'
            }`}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-blue-400">ℹ️</span>
                </div>
                <div className="ml-3">
                  <p className={`text-blue-800 ${
                    isMobile ? 'text-xs' : 'text-sm'
                  }`}>
                    {displayState === DisplayState.PREVIEW && 
                      "테스트 케이스 미리보기 - 설정을 완료하면 테스트를 시작할 수 있습니다"}
                    {displayState === DisplayState.PARTIAL && 
                      "일부 기능 활성화됨 - 모든 설정을 완료하면 테스트 실행이 가능합니다"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <h2 className={`font-bold text-slate-800 ${
            isMobile ? 'text-lg mb-3' : 'text-2xl mb-4'
          }`}>테스트 항목 및 이력</h2>
          
          {/* 카테고리 필터 */}
          <div className={isMobile ? 'mb-4' : 'mb-6'}>
            <p className={`font-semibold text-slate-600 ${
              isMobile ? 'text-sm mb-2' : 'mb-2'
            }`}>카테고리 필터</p>
            <div className={`flex flex-wrap ${isMobile ? 'gap-1' : 'gap-2'}`}>
              {categories.map(category => (
                <button
                  key={category}
                  className={`rounded-full font-semibold transition ${
                    isMobile ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm'
                  } ${
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

          {/* 테스트 케이스 스프레드시트 */}
          <TestCaseSpreadsheet
            testCases={testCases}
            projectId={projectId}
            onRecord={handleRecordClick}
            onDelete={() => loadTestCases(projectId)}
            onTestCaseUpdate={() => loadTestCases(projectId)}
            disabled={!isListEnabled}
            displayState={displayState}
            currentFilters={currentFilters}
          />
        </section>
      </main>
    </div>
  );
}