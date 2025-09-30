'use client';

import { useState } from 'react';
import ProjectList from './ProjectList';
import ProjectCreate from './ProjectCreate';
import Dashboard from './Dashboard';

type AppView = 'project-list' | 'project-create' | 'dashboard';

export default function App() {
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
    
    default:
      return (
        <ProjectList 
          onProjectSelect={handleProjectSelect}
          onCreateProject={handleCreateProject}
        />
      );
  }
}