// User types
export interface User {
  user_id: string;
  user_name: string;
  email?: string;
  role: 'Admin' | 'Lead' | 'Tester';
}

// Category types  
export interface Category {
  category_id: number;
  project_id: string;
  category_name: string;
}

// Project types
export interface Project {
  project_id: string;
  project_name: string;
  description?: string;
  status: 'Active' | 'Archived';
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
}

// Test Case types (updated for new schema)
export interface TestCase {
  case_id: string;
  project_id: string;
  category_id: number;
  category_name?: string; // Joined from categories table
  item: string;
  steps?: string;
  expected?: string;
  priority?: 'High' | 'Mid' | 'Low';
  results?: TestResult[];
}

// Test Result types (updated for new schema)
export interface TestResult {
  result_id: number;
  case_id: string;
  user_id: string;
  user_name?: string; // Joined from users table
  status: 'pass' | 'fail' | 'blocker';
  environment?: {
    os?: string;
    device?: string;
    version?: string;
  };
  notes?: string;
  bug_id?: string;
  created_at: string;
}

export interface CreateTestResultRequest {
  case_id: string;
  user_id: string;
  status: 'pass' | 'fail' | 'blocker';
  environment?: {
    os?: string;
    device?: string;
    version?: string;
  };
  notes?: string;
  bug_id?: string;
}

// Legacy types for backward compatibility during migration
export interface LegacyTestResult {
  result_id: number;
  case_id: string;
  tester: string;
  status: 'pass' | 'fail' | 'blocker';
  environment?: {
    os?: string;
    device?: string;
    version?: string;
  };
  notes?: string;
  bug_id?: string;
  created_at: string;
}