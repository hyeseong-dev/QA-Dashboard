'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProjectList from '@/components/ProjectList';
import { useRouter } from 'next/navigation';

export default function ProjectsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const handleProjectSelect = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  const handleCreateProject = () => {
    router.push('/projects/new');
  };

  const handleUserManagement = () => {
    router.push('/users');
  };

  return (
    <ProjectList 
      onProjectSelect={handleProjectSelect}
      onCreateProject={handleCreateProject}
      onUserManagement={handleUserManagement}
    />
  );
}