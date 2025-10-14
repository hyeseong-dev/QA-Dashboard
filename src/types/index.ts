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

// Error Type enum
export type ErrorType = '기능오류' | '신규개발(개선)' | 'UI/UX오류' | '시스템연동오류';

// Priority enum
export type Priority = 'High' | 'Medium' | 'Low';

// Test Case types (updated for new schema)
export interface TestCase {
  case_id: string;
  project_id: string;
  category_id: number;
  category_name?: string; // Joined from categories table
  
  // 계층 구조 필드
  parent_id?: string;
  depth: number;
  sort_order: number;
  
  item: string;
  steps?: string;
  expected?: string;
  priority?: Priority;
  
  // 새로운 기능 필드
  error_type?: ErrorType;
  fix_checked: boolean;
  
  results?: TestResult[];
  
  // UI 상태 (클라이언트 전용)
  expanded?: boolean;
  children?: TestCase[];
}

// Test Result types (updated for new schema)
export interface TestResult {
  result_id: number;
  case_id: string;
  user_id: string;
  user_name?: string; // Joined from users table
  status: 'pass' | 'fail' | 'pending';
  environment?: {
    os?: string;
    device?: string;
    version?: string;
  };
  notes?: string;
  bug_id?: string;
  created_at: string;
}

export interface CreateTestCaseRequest {
  project_id: string;
  category_id: number;
  parent_id?: string;
  item: string;
  steps?: string;
  expected?: string;
  priority?: Priority;
  error_type?: ErrorType;
  fix_checked?: boolean;
}

export interface CreateTestResultRequest {
  case_id: string;
  user_id: string;
  status: 'pass' | 'fail' | 'pending';
  environment?: {
    os?: string;
    device?: string;
    version?: string;
  };
  notes?: string;
  bug_id?: string;
  error_type?: ErrorType;
  fix_checked?: boolean;
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