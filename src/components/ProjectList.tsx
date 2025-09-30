'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/types';

interface ProjectListProps {
  onProjectSelect: (projectId: string) => void;
  onCreateProject: () => void;
}

export default function ProjectList({ onProjectSelect, onCreateProject }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">프로젝트 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">연결 오류</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={loadProjects}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            QA 대시보드
          </h1>
          <p className="text-slate-600">
            프로젝트를 선택하여 QA 대시보드에 진입하거나 새 프로젝트를 생성하세요.
          </p>
        </header>

        <div className="max-w-4xl mx-auto">
          {projects.length === 0 ? (
            // 프로젝트가 없는 경우
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <div className="text-slate-400 text-6xl mb-4">📋</div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                등록된 프로젝트가 없습니다
              </h2>
              <p className="text-slate-600 mb-6">
                QA 작업을 시작하려면 먼저 프로젝트를 생성해주세요.
              </p>
              <button
                onClick={onCreateProject}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors inline-flex items-center gap-2"
              >
                <span>➕</span>
                새 프로젝트 생성
              </button>
            </div>
          ) : (
            // 프로젝트가 있는 경우
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">
                  프로젝트 목록
                </h2>
                <button
                  onClick={onCreateProject}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors inline-flex items-center gap-2"
                >
                  <span>➕</span>
                  새 프로젝트
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.project_id}
                    project={project}
                    onSelect={() => onProjectSelect(project.project_id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ProjectCardProps {
  project: Project;
  onSelect: () => void;
}

function ProjectCard({ project, onSelect }: ProjectCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              {project.project_name}
            </h3>
            <span className={`inline-block px-2 py-1 text-xs rounded-full font-semibold ${
              project.status === 'Active' 
                ? 'bg-green-100 text-green-600' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {project.status === 'Active' ? '활성' : '비활성'}
            </span>
          </div>
        </div>

        {project.description && (
          <p className="text-slate-600 text-sm mb-4 line-clamp-2">
            {project.description}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onSelect}
            className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            대시보드 진입
          </button>
        </div>
      </div>
    </div>
  );
}