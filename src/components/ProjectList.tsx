'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/types';

interface ProjectListProps {
  onProjectSelect: (projectId: string) => void;
  onCreateProject: () => void;
}

type SortField = 'project_id' | 'project_name' | 'status';
type SortDirection = 'asc' | 'desc';

export default function ProjectList({ onProjectSelect, onCreateProject }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('project_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
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
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      } else {
        setError('프로젝트 목록을 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedProjects = [...projects].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    const modifier = sortDirection === 'asc' ? 1 : -1;
    
    if (aValue < bValue) return -1 * modifier;
    if (aValue > bValue) return 1 * modifier;
    return 0;
  });

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className={`bg-white rounded-xl shadow-md text-center ${
          isMobile ? 'p-6 mx-4' : 'p-8'
        }`}>
          <div className={`animate-spin rounded-full border-b-2 border-blue-500 mx-auto mb-4 ${
            isMobile ? 'h-8 w-8' : 'h-12 w-12'
          }`}></div>
          <p className={`text-slate-600 ${
            isMobile ? 'text-sm' : ''
          }`}>프로젝트 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className={`bg-white rounded-xl shadow-md text-center max-w-md ${
          isMobile ? 'p-6 mx-4' : 'p-8'
        }`}>
          <div className={`text-red-500 mb-4 ${
            isMobile ? 'text-2xl' : 'text-4xl'
          }`}>⚠️</div>
          <h2 className={`font-bold text-slate-800 mb-2 ${
            isMobile ? 'text-lg' : 'text-xl'
          }`}>연결 오류</h2>
          <p className={`text-slate-600 mb-4 ${
            isMobile ? 'text-sm' : ''
          }`}>{error}</p>
          <button
            onClick={loadProjects}
            className={`bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors ${
              isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2'
            }`}
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className={`container mx-auto ${
        isMobile ? 'p-3' : 'p-4 md:p-8'
      }`}>
        <header className={`text-center ${
          isMobile ? 'mb-6' : 'mb-8'
        }`}>
          <h1 className={`font-bold text-slate-900 mb-2 ${
            isMobile ? 'text-2xl' : 'text-3xl md:text-4xl'
          }`}>
            QA 대시보드
          </h1>
          <p className={`text-slate-600 ${
            isMobile ? 'text-sm px-4' : ''
          }`}>
            프로젝트를 선택하여 QA 대시보드에 진입하거나 새 프로젝트를 생성하세요.
          </p>
        </header>

        <div className="max-w-7xl mx-auto">
          {projects.length === 0 ? (
            // 프로젝트가 없는 경우
            <div className={`bg-white rounded-xl shadow-md text-center ${
              isMobile ? 'p-6' : 'p-8'
            }`}>
              <div className={`text-slate-400 mb-4 ${
                isMobile ? 'text-4xl' : 'text-6xl'
              }`}>📋</div>
              <h2 className={`font-bold text-slate-800 mb-2 ${
                isMobile ? 'text-lg' : 'text-2xl'
              }`}>
                등록된 프로젝트가 없습니다
              </h2>
              <p className={`text-slate-600 ${
                isMobile ? 'text-sm mb-4' : 'mb-6'
              }`}>
                QA 작업을 시작하려면 먼저 프로젝트를 생성해주세요.
              </p>
              <button
                onClick={onCreateProject}
                className={`bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors inline-flex items-center gap-2 ${
                  isMobile ? 'px-4 py-2 text-sm' : 'px-6 py-3'
                }`}
              >
                <span>➕</span>
                새 프로젝트 생성
              </button>
            </div>
          ) : (
            // 프로젝트가 있는 경우 - 반응형 레이아웃
            <div className={isMobile ? 'space-y-4' : 'space-y-6'}>
              <div className={`${
                isMobile ? 'flex flex-col gap-3' : 'flex justify-between items-center'
              }`}>
                <h2 className={`font-bold text-slate-800 ${
                  isMobile ? 'text-lg text-center' : 'text-2xl'
                }`}>
                  프로젝트 목록 ({projects.length}개)
                </h2>
                <button
                  onClick={onCreateProject}
                  className={`bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors inline-flex items-center gap-2 ${
                    isMobile ? 'px-4 py-2 text-sm self-center' : 'px-4 py-2'
                  }`}
                >
                  <span>➕</span>
                  {isMobile ? '새 프로젝트' : '새 프로젝트'}
                </button>
              </div>

              {/* 조건부 렌더링: 모바일은 카드, 데스크톱은 테이블 */}
              {isMobile ? (
                // 모바일 카드 레이아웃
                <div className="space-y-3">
                  {sortedProjects.map((project) => (
                    <ProjectCard
                      key={project.project_id}
                      project={project}
                      onSelect={() => onProjectSelect(project.project_id)}
                    />
                  ))}
                </div>
              ) : (
                // 데스크톱 테이블 레이아웃
                <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th 
                            className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                            onClick={() => handleSort('project_id')}
                          >
                            <div className="flex items-center gap-2">
                              프로젝트 ID
                              <span className="text-slate-400">{getSortIcon('project_id')}</span>
                            </div>
                          </th>
                          <th 
                            className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                            onClick={() => handleSort('project_name')}
                          >
                            <div className="flex items-center gap-2">
                              프로젝트명
                              <span className="text-slate-400">{getSortIcon('project_name')}</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            설명
                          </th>
                          <th 
                            className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                            onClick={() => handleSort('status')}
                          >
                            <div className="flex items-center gap-2">
                              상태
                              <span className="text-slate-400">{getSortIcon('status')}</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            작업
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {sortedProjects.map((project, index) => (
                          <ProjectTableRow
                            key={project.project_id}
                            project={project}
                            onSelect={() => onProjectSelect(project.project_id)}
                            isEven={index % 2 === 0}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 프로젝트 통계 */}
              <div className={`${
                isMobile ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 md:grid-cols-3 gap-4'
              }`}>
                <div className={`bg-white rounded-lg shadow-md border border-slate-200 ${
                  isMobile ? 'p-3' : 'p-4'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`bg-blue-100 rounded-full flex items-center justify-center ${
                      isMobile ? 'w-6 h-6' : 'w-8 h-8'
                    }`}>
                      <span className={`text-blue-600 font-bold ${
                        isMobile ? 'text-xs' : 'text-sm'
                      }`}>📊</span>
                    </div>
                    <div>
                      <p className={`text-slate-500 ${
                        isMobile ? 'text-xs' : 'text-sm'
                      }`}>전체 프로젝트</p>
                      <p className={`font-bold text-slate-900 ${
                        isMobile ? 'text-lg' : 'text-xl'
                      }`}>{projects.length}</p>
                    </div>
                  </div>
                </div>
                <div className={`bg-white rounded-lg shadow-md border border-slate-200 ${
                  isMobile ? 'p-3' : 'p-4'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`bg-green-100 rounded-full flex items-center justify-center ${
                      isMobile ? 'w-6 h-6' : 'w-8 h-8'
                    }`}>
                      <span className={`text-green-600 font-bold ${
                        isMobile ? 'text-xs' : 'text-sm'
                      }`}>✅</span>
                    </div>
                    <div>
                      <p className={`text-slate-500 ${
                        isMobile ? 'text-xs' : 'text-sm'
                      }`}>활성 프로젝트</p>
                      <p className={`font-bold text-slate-900 ${
                        isMobile ? 'text-lg' : 'text-xl'
                      }`}>
                        {projects.filter(p => p.status === 'Active').length}
                      </p>
                    </div>
                  </div>
                </div>
                {!isMobile && (
                  <div className="bg-white rounded-lg shadow-md p-4 border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 text-sm font-bold">📁</span>
                      </div>
                      <div>
                        <p className="text-slate-500 text-sm">보관 프로젝트</p>
                        <p className="text-xl font-bold text-slate-900">
                          {projects.filter(p => p.status === 'Archived').length}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ProjectTableRowProps {
  project: Project;
  onSelect: () => void;
  isEven: boolean;
}

function ProjectTableRow({ project, onSelect, isEven }: ProjectTableRowProps) {
  return (
    <tr className={`hover:bg-slate-50 transition-colors ${isEven ? 'bg-white' : 'bg-slate-25'}`}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-mono text-slate-900 bg-slate-100 px-2 py-1 rounded">
          {project.project_id}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm font-semibold text-slate-900">
          {project.project_name}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-slate-600 max-w-md">
          {project.description || (
            <span className="italic text-slate-400">설명 없음</span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          project.status === 'Active'
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {project.status === 'Active' ? '🟢 활성' : '⚪ 비활성'}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <button
          onClick={onSelect}
          className="inline-flex items-center px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
        >
          <span className="mr-1">🚀</span>
          대시보드 진입
        </button>
      </td>
    </tr>
  );
}

interface ProjectCardProps {
  project: Project;
  onSelect: () => void;
}

function ProjectCard({ project, onSelect }: ProjectCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded inline-block mb-2">
            {project.project_id}
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            {project.project_name}
          </h3>
        </div>
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          project.status === 'Active'
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {project.status === 'Active' ? '🟢 활성' : '⚪ 비활성'}
        </span>
      </div>
      
      <p className="text-sm text-slate-600 mb-4 line-clamp-2">
        {project.description || (
          <span className="italic text-slate-400">설명 없음</span>
        )}
      </p>
      
      <button
        onClick={onSelect}
        className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
      >
        <span className="mr-2">🚀</span>
        대시보드 진입
      </button>
    </div>
  );
}