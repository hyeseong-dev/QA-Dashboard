# QA Dashboard - 웹 화면별 PATH PARAMETER 정의

**작성일**: 2025-10-16  
**프로젝트**: Multi-Project QA Dashboard System

---

## 📱 **현재 화면 구조 (SPA 방식)**

QA Dashboard는 **Single Page Application(SPA)** 방식으로 구현되어 있으며, 실제 URL 라우팅보다는 **컴포넌트 상태 기반 화면 전환**을 사용합니다.

### 🎯 **메인 진입점**
| Path | Component | 설명 |
|------|-----------|------|
| `/` | `App.tsx` | 메인 애플리케이션 (모든 화면의 컨테이너) |
| `/users` | `UsersPage.tsx` | 관리자 전용 사용자 관리 화면 |

---

## 🖥️ **화면별 Path Parameter 정의**

### **1. 메인 대시보드 (/) - SPA 내부 화면들**

#### **1.1 프로젝트 목록 화면**
```typescript
// 현재: 컴포넌트 상태로 관리
currentView: 'project-list'

// 제안하는 URL PATH 구조:
Path: /projects
Parameters: 없음
Query Parameters: 
- page?: number (페이지네이션)
- search?: string (프로젝트 검색)
- status?: 'Active' | 'Archived' (프로젝트 상태 필터)

예시:
/projects
/projects?page=2
/projects?search=test&status=Active
```

#### **1.2 프로젝트 생성 화면**
```typescript
// 현재: 컴포넌트 상태로 관리
currentView: 'project-create'

// 제안하는 URL PATH 구조:
Path: /projects/new
Parameters: 없음
Query Parameters: 없음

예시:
/projects/new
```

#### **1.3 QA 대시보드 화면 (테스트 실행)**
```typescript
// 현재: 컴포넌트 상태로 관리
currentView: 'dashboard'
selectedProjectId: string

// 제안하는 URL PATH 구조:
Path: /projects/{projectId}/dashboard
Parameters:
- projectId: string (프로젝트 고유 ID)
Query Parameters:
- category?: number (카테고리 필터)
- status?: 'pass' | 'fail' | 'pending' (테스트 상태 필터)
- tester?: string (테스터 필터)
- view?: 'list' | 'spreadsheet' (보기 모드)

예시:
/projects/proj-001/dashboard
/projects/proj-001/dashboard?category=1&status=fail
/projects/proj-001/dashboard?view=spreadsheet&tester=user-t001
```

#### **1.4 사용자 관리 화면**
```typescript
// 현재: 컴포넌트 상태로 관리
currentView: 'user-management'

// 현재 URL PATH 구조:
Path: /users
Parameters: 없음
Query Parameters:
- search?: string (사용자 검색)
- role?: 'Admin' | 'Tester' | 'all' (역할 필터)
- page?: number (페이지네이션)

예시:
/users
/users?search=관리자&role=Admin
/users?page=2
```

---

## 🔗 **API 엔드포인트 Path Parameters**

### **2.1 인증 관련**
```typescript
POST /api/auth/login
POST /api/auth/signup  
POST /api/auth/logout
GET  /api/auth/me
```

### **2.2 프로젝트 관리**
```typescript
GET    /api/projects
POST   /api/projects
GET    /api/projects/{projectId}
PUT    /api/projects/{projectId}
DELETE /api/projects/{projectId}

Parameters:
- projectId: string (프로젝트 고유 ID, 예: "proj-001")
```

### **2.3 테스트 케이스 관리**
```typescript
GET    /api/projects/{projectId}/test-cases
POST   /api/projects/{projectId}/test-cases
GET    /api/projects/{projectId}/test-cases/{caseId}
PUT    /api/projects/{projectId}/test-cases/{caseId}
DELETE /api/projects/{projectId}/test-cases/{caseId}

Parameters:
- projectId: string (프로젝트 고유 ID)
- caseId: string (테스트 케이스 고유 ID, 예: "TC-001")

특수 엔드포인트:
POST /api/projects/{projectId}/test-cases/validate-case-id
POST /api/projects/{projectId}/test-cases/reorder
PUT  /api/projects/{projectId}/test-cases/{caseId}/fix-check
PUT  /api/projects/{projectId}/test-cases/{caseId}/error-type
```

### **2.4 카테고리 관리**
```typescript
GET    /api/projects/{projectId}/categories
POST   /api/projects/{projectId}/categories
PUT    /api/projects/{projectId}/categories/{categoryId}
DELETE /api/projects/{projectId}/categories/{categoryId}

Parameters:
- projectId: string (프로젝트 고유 ID)
- categoryId: number (카테고리 ID)
```

### **2.5 테스트 결과**
```typescript
POST /api/results
GET  /api/projects/{projectId}/cases (테스트 케이스 + 결과)

Parameters:
- projectId: string (프로젝트 고유 ID)
```

### **2.6 사용자 관리**
```typescript
GET  /api/users
GET  /api/users/{userId}
PUT  /api/users/{userId}
GET  /api/users/{userId}/projects
GET  /api/users/{userId}/statistics

Parameters:
- userId: string (사용자 고유 ID, 예: "user-a006")
```

### **2.7 Import/Export**
```typescript
POST /api/projects/{projectId}/import
GET  /api/projects/{projectId}/export

Parameters:
- projectId: string (프로젝트 고유 ID)
```

### **2.8 시스템 관리**
```typescript
GET  /api/projects/{projectId}/status
POST /api/admin/update-schema

Parameters:
- projectId: string (프로젝트 고유 ID)
```

---

## 🛠️ **제안하는 URL 구조 개선**

### **3.1 현재 문제점**
1. **SPA 내부 라우팅**: URL 변경 없이 컴포넌트 상태로만 화면 전환
2. **직접 링크 불가**: 특정 프로젝트 대시보드 직접 접근 불가
3. **북마크 불가**: 브라우저 뒤로가기/앞으로가기 지원 안됨
4. **URL 공유 불가**: 팀원과 특정 화면 URL 공유 불가

### **3.2 개선 제안**
```typescript
// 제안하는 완전한 URL 구조

1. 홈/로그인
   GET /                           # 로그인 화면 또는 프로젝트 목록

2. 프로젝트 관리
   GET /projects                   # 프로젝트 목록
   GET /projects/new               # 프로젝트 생성
   GET /projects/{projectId}       # 프로젝트 상세 (대시보드)
   GET /projects/{projectId}/edit  # 프로젝트 수정

3. 테스트 관리
   GET /projects/{projectId}/test-cases          # 테스트 케이스 목록
   GET /projects/{projectId}/test-cases/new      # 테스트 케이스 생성
   GET /projects/{projectId}/test-cases/{caseId} # 테스트 케이스 상세

4. 사용자 관리 (관리자 전용)
   GET /users                      # 사용자 목록 (현재 구현됨)
   GET /users/{userId}             # 사용자 상세
   GET /users/{userId}/edit        # 사용자 수정

5. 설정
   GET /settings                   # 시스템 설정
   GET /profile                    # 개인 프로필
```

### **3.3 구현 우선순위**
1. **높음**: 프로젝트별 대시보드 직접 링크 (`/projects/{projectId}`)
2. **중간**: 테스트 케이스 상세 페이지 (`/projects/{projectId}/test-cases/{caseId}`)
3. **낮음**: 사용자 상세 페이지 (`/users/{userId}`)

---

## 📋 **Parameter 형식 및 제약조건**

### **4.1 ID 형식**
```typescript
// 프로젝트 ID
projectId: string
- 형식: "proj-" + 3자리 숫자 또는 UUID
- 예시: "proj-001", "proj-abc123", "uuid-v4"
- 제약: 영숫자, 하이픈(-), 언더스코어(_)만 허용

// 사용자 ID  
userId: string
- 형식: "user-" + 역할코드 + 3자리 숫자
- 예시: "user-a006" (관리자), "user-t001" (테스터)
- 제약: 50자 이내, 영숫자와 하이픈만 허용

// 테스트 케이스 ID
caseId: string
- 형식: "TC-" + 3자리 숫자 또는 프로젝트별 순번
- 예시: "TC-001", "proj-001-001"
- 제약: 50자 이내, 영숫자와 하이픈만 허용
```

### **4.2 Query Parameter 제약조건**
```typescript
// 페이지네이션
page: number = 1         // 최소 1, 기본값 1
limit: number = 20       // 최소 1, 최대 100, 기본값 20

// 검색
search: string          // 최대 100자, URL 인코딩 필요

// 필터
status: 'Active' | 'Archived' | 'pass' | 'fail' | 'pending'
role: 'Admin' | 'Tester' | 'all'
category: number        // 양의 정수만

// 정렬
sort: string           // 예: "created_at", "-updated_at" (내림차순)
order: 'asc' | 'desc'  // 정렬 방향
```

---

## 🎯 **Next.js 라우팅 구현 가이드**

### **5.1 필요한 페이지 파일들**
```
src/app/
├── page.tsx                              # / (홈)
├── projects/
│   ├── page.tsx                          # /projects
│   ├── new/
│   │   └── page.tsx                      # /projects/new
│   └── [projectId]/
│       ├── page.tsx                      # /projects/[projectId]
│       ├── edit/
│       │   └── page.tsx                  # /projects/[projectId]/edit
│       └── test-cases/
│           ├── page.tsx                  # /projects/[projectId]/test-cases
│           ├── new/
│           │   └── page.tsx              # /projects/[projectId]/test-cases/new
│           └── [caseId]/
│               └── page.tsx              # /projects/[projectId]/test-cases/[caseId]
├── users/
│   ├── page.tsx                          # /users (기존)
│   └── [userId]/
│       ├── page.tsx                      # /users/[userId]
│       └── edit/
│           └── page.tsx                  # /users/[userId]/edit
└── settings/
    └── page.tsx                          # /settings
```

### **5.2 동적 라우팅 예시**
```typescript
// app/projects/[projectId]/page.tsx
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
  
  // 프로젝트 대시보드 구현
  return <Dashboard projectId={projectId} filters={query} />;
}
```

---

## 📈 **마이그레이션 계획**

### **6.1 단계별 이행**
1. **1단계**: 기존 SPA 구조 유지하면서 URL 동기화 추가
2. **2단계**: 주요 화면들을 Next.js 페이지로 분리
3. **3단계**: 완전한 URL 기반 라우팅으로 전환

### **6.2 호환성 고려사항**
- 기존 API 엔드포인트는 그대로 유지
- 컴포넌트 재사용성 최대화
- SEO 및 접근성 개선
- 브라우저 히스토리 지원

---

**문서 버전**: 1.0  
**다음 업데이트**: URL 라우팅 구현 후