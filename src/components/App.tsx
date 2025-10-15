'use client';

import { useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { QAEnvironmentProvider, useQAEnvironment } from '@/contexts/QAEnvironmentContext';
import ProtectedRoute from './ProtectedRoute';
import AuthHeader from './AuthHeader';
import ProjectList from './ProjectList';
import ProjectCreate from './ProjectCreate';
import Dashboard from './Dashboard';
import QAEnvironmentSetup from './QAEnvironmentSetup';
import UserManagement from './UserManagement';

type AppView = 'project-list' | 'project-create' | 'dashboard' | 'user-management';

function AppContent() {
  const { isQAEnvironmentConfigured } = useQAEnvironment();
  const [currentView, setCurrentView] = useState<AppView>('project-list');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentView('dashboard');
  };

  const handleCreateProject = () => {
    setCurrentView('project-create');
  };

  const handleBackToList = () => {
    setCurrentView('project-list');
    setSelectedProjectId('');
  };

  const handleProjectCreated = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentView('dashboard');
  };

  const handleBackToProjectList = () => {
    setCurrentView('project-list');
    setSelectedProjectId('');
  };

  const handleUserManagement = () => {
    setCurrentView('user-management');
  };

  const handleQAEnvironmentSetupComplete = () => {
    // QA 환경 설정 완료 후 프로젝트 목록으로 이동
  };

  // QA 환경이 설정되지 않은 경우 설정 화면 표시
  if (!isQAEnvironmentConfigured) {
    return <QAEnvironmentSetup onSetupComplete={handleQAEnvironmentSetupComplete} />;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <AuthHeader />
      <div className="pt-0">
        {(() => {
          switch (currentView) {
            case 'project-create':
              return (
                <ProjectCreate 
                  onBack={handleBackToList}
                  onProjectCreated={handleProjectCreated}
                />
              );
            
            case 'dashboard':
              return (
                <Dashboard 
                  projectId={selectedProjectId}
                  onBackToProjects={handleBackToProjectList}
                />
              );
            
            case 'user-management':
              return (
                <UserManagement 
                  onBackToProjects={handleBackToProjectList}
                />
              );
            
            default:
              return (
                <ProjectList 
                  onProjectSelect={handleProjectSelect}
                  onCreateProject={handleCreateProject}
                  onUserManagement={handleUserManagement}
                />
              );
          }
        })()}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <QAEnvironmentProvider>
        <ProtectedRoute>
          <AppContent />
        </ProtectedRoute>
      </QAEnvironmentProvider>
    </AuthProvider>
  );
}