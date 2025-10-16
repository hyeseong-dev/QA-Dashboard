'use client';

import { useAuth } from '@/contexts/AuthContext';
import Dashboard from '@/components/Dashboard';
import { useRouter } from 'next/navigation';

interface ProjectDashboardClientProps {
  projectId: string;
  searchParams: { 
    category?: string; 
    status?: string; 
    tester?: string; 
    view?: string; 
  };
}

export default function ProjectDashboardClient({ 
  projectId, 
  searchParams 
}: ProjectDashboardClientProps) {
  const { user } = useAuth();
  const router = useRouter();

  const handleBackToProjects = () => {
    router.push('/projects');
  };

  return (
    <Dashboard 
      projectId={projectId}
      onBackToProjects={handleBackToProjects}
      initialFilters={searchParams}
    />
  );
}