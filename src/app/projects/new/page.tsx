'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProjectCreate from '@/components/ProjectCreate';
import { useRouter } from 'next/navigation';

export default function NewProjectPage() {
  const { user } = useAuth();
  const router = useRouter();

  const handleBack = () => {
    router.push('/projects');
  };

  const handleProjectCreated = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  return (
    <ProjectCreate 
      onBack={handleBack}
      onProjectCreated={handleProjectCreated}
    />
  );
}