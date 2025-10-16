import Dashboard from '@/components/Dashboard';
import ProjectDashboardClient from './ProjectDashboardClient';

interface PageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ 
    category?: string;
    status?: string;
    tester?: string;
    view?: string;
  }>;
}

export default async function ProjectDashboard({ 
  params, 
  searchParams 
}: PageProps) {
  const { projectId } = await params;
  const query = await searchParams;
  
  return <ProjectDashboardClient projectId={projectId} searchParams={query} />;
}