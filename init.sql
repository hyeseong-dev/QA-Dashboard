-- 멀티 프로젝트 QA Sheet 시스템 데이터베이스 스키마 (정규화 버전 - 사용자 및 상세 데이터 추가)

-- 0. 사용자 마스터 테이블 (users)
-- 시스템에 등록된 모든 사용자의 정보를 관리합니다.
CREATE TABLE users (
    user_id VARCHAR(50) PRIMARY KEY, -- 사용자 고유 ID (인증 시스템 ID 등)
    user_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    role VARCHAR(20) DEFAULT 'Tester' -- Admin, Lead, Tester 등
);

-- 1. 프로젝트 마스터 테이블 (projects)
-- QA 웹사이트에서 관리할 프로젝트 목록
CREATE TABLE projects (
    project_id VARCHAR(50) PRIMARY KEY,
    project_name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'Active' -- Active, Archived
);

-- 2. 프로젝트별 카테고리 테이블 (categories)
-- 각 프로젝트에 속한 카테고리를 관리하여 test_cases 테이블을 정규화
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    category_name VARCHAR(100) NOT NULL, -- 사용자에게 표시될 카테고리 이름
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);

-- 3. 프로젝트 멤버 테이블 (project_members)
-- 어떤 사용자가 어떤 프로젝트에 속해 있는지 정의하는 중간 테이블 (다대다 관계)
CREATE TABLE project_members (
    project_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    PRIMARY KEY (project_id, user_id),
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 4. 테스트 항목 마스터 테이블 (test_cases)
-- 테스트 항목은 project_id와 category_id를 통해 프로젝트 및 카테고리에 연결됨
CREATE TABLE test_cases (
    case_id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    category_id INTEGER NOT NULL, -- 카테고리 테이블 참조 (FK)
    item TEXT NOT NULL,           -- 테스트 항목 명칭
    steps TEXT,                   -- 테스트 절차
    expected TEXT,                -- 예상 결과
    priority VARCHAR(10),         -- High, Mid, Low
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT
);

-- 5. 테스트 기록 테이블 (test_results)
-- 개별 테스터의 모든 시도 이력 (tester 필드가 user_id로 대체됨)
CREATE TABLE test_results (
    result_id SERIAL PRIMARY KEY,
    case_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL, -- 테스트를 기록한 사용자 ID (FK)
    status VARCHAR(10) NOT NULL, -- pass, fail, blocker
    environment JSONB,           -- 모바일 환경 정보 (OS, Device, Version)
    notes TEXT,
    bug_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES test_cases(case_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT
);


-- 인덱스 생성 (조회 성능 최적화)
CREATE INDEX idx_test_cases_project_id ON test_cases(project_id);
CREATE INDEX idx_test_cases_category_id ON test_cases(category_id);
CREATE INDEX idx_test_results_case_id ON test_results(case_id);
CREATE INDEX idx_test_results_user_id ON test_results(user_id);
CREATE INDEX idx_test_results_created_at ON test_results(created_at);


-- =================================================================
-- 샘플 데이터 삽입 (새로운 기능 기반)
-- =================================================================

-- 0. users 샘플 데이터 (2명 추가)
INSERT INTO users (user_id, user_name, email, role) VALUES
('user-1', '김철수', 'chulsu@gemini.com', 'Admin'),
('user-2', '이영희', 'younghee@gemini.com', 'Tester'),
('user-3', '박민지', 'minji@gemini.com', 'Tester'),
('user-4', '최지은', 'jieun@gemini.com', 'Tester'), -- New
('user-5', '정호진', 'hojin@gemini.com', 'Tester'); -- New


-- 1. projects 샘플 데이터 (기존 유지)
INSERT INTO projects (project_id, project_name, description, status) VALUES
('app-v1', '모바일 앱 (Version 1.0)', '첫 번째 출시 모바일 앱 QA', 'Active'),
('app-v2', '모바일 앱 (Version 2.0)', '신규 기능 추가 앱 QA', 'Active'),
('web-portal', '웹 포털 시스템', '관리자 및 사용자 웹 포털 QA', 'Active');


-- 2. categories 샘플 데이터 (새로운 기능 카테고리 추가)
-- 기존 카테고리 (1-8) 유지 및 신규 카테고리 추가 (9부터 시작 가정)
INSERT INTO categories (project_id, category_name) VALUES
-- app-v1 (1-3)
('app-v1', '인증 및 회원 관리'), 
('app-v1', '홈 화면'),           
('app-v1', '결제'),
-- app-v2 (4-6)
('app-v2', '인증 및 회원 관리'), 
('app-v2', '프로필 편집'),       
('app-v2', '푸시 알림'),
-- web-portal (7-8)
('web-portal', '페이지 로드'),    
('web-portal', '데이터 관리');    

-- 신규 카테고리 (app-v2에 추가)
INSERT INTO categories (project_id, category_name) VALUES
('app-v2', '지도/검색'),          -- category_id 9 (추정)
('app-v2', 'AI 추천'),            -- category_id 10
('app-v2', '커뮤니티'),           -- category_id 11
('app-v2', '내 정보');            -- category_id 12

-- **주의: 실제 DB에서는 SERIAL 타입이 자동으로 ID를 부여하며, 위 category_id는 설명의 편의를 위한 주석입니다.**


-- 3. project_members 샘플 데이터 (신규 유저를 app-v2에 추가)
INSERT INTO project_members (project_id, user_id) VALUES
('app-v1', 'user-1'), ('app-v1', 'user-2'), 
('app-v2', 'user-2'), ('app-v2', 'user-3'), 
('app-v2', 'user-4'), ('app-v2', 'user-5'), -- 신규 유저 추가
('web-portal', 'user-1'), ('web-portal', 'user-3'); 


-- 4. test_cases 샘플 데이터 (기존 케이스 유지 + 신규 케이스 추가)
-- NOTE: category_id는 DB 생성 시점에 따라 다를 수 있으나, 여기서는 구조적 연결을 위해 임시 ID를 사용합니다.
-- DB 조회 시 category_name을 기준으로 필터링하는 것이 좋습니다.

-- 기존 케이스 (app-v1, app-v2, web-portal)는 생략하고 신규 케이스만 추가 (Category ID는 9, 10, 11, 12를 사용한다고 가정)

-- 4.1. 회원가입/로그인/회원탈퇴 (Category: 인증 및 회원 관리 - 4)
INSERT INTO test_cases (case_id, project_id, category_id, item, steps, expected, priority) VALUES
('AUTH-006', 'app-v2', 4, '카카오 소셜 로그인', '1. 카카오 로그인 버튼 클릭\n2. 계정 선택/로그인', '메인 화면으로 이동', 'High'),
('AUTH-007', 'app-v2', 4, '회원 탈퇴 기능', '1. 내정보 > 회원 탈퇴 선택\n2. 최종 확인', '계정 삭제 및 로그인 화면으로 이동', 'High');

-- 4.2. 홈화면: 지도 탐색, 검색, 시설 상세 (Category: 지도/검색 - 9)
INSERT INTO test_cases (case_id, project_id, category_id, item, steps, expected, priority) VALUES
('MAP-001', 'app-v2', 9, '지도 핀 위치 정확성', '1. 지도 이동 및 확대/축소\n2. 시설 핀이 정확한 위치에 표시됨', '핀과 실제 위치 일치', 'High'),
('SEARCH-002', 'app-v2', 9, '시설 상세 페이지 표기', '1. 지도 핀 클릭 또는 검색 결과 선택\n2. 시설 상세 정보(전화번호, 주소, 이미지) 표기 확인', '모든 정보 정상 표기', 'High'),
('SEARCH-003', 'app-v2', 9, '관심 시설 추가/해제', '1. 상세 페이지에서 하트 버튼 클릭', '관심 목록에 추가/해제', 'Mid');

-- 4.3. AI 추천 (Category: AI 추천 - 10)
INSERT INTO test_cases (case_id, project_id, category_id, item, steps, expected, priority) VALUES
('AI-001', 'app-v2', 10, '챗봇 응답의 적절성', '1. 챗봇에 질문 (예: "근처 식당 추천")\n2. 응답이 질문 의도에 맞는지 확인', '질문에 부합하는 답변 수신', 'High'),
('AI-002', 'app-v2', 10, 'AI 최종 답변 API 정상 호출', '1. AI 추천 기능 사용\n2. 개발자 도구에서 API 200 OK 확인', 'API 호출 성공 및 데이터 수신', 'High');

-- 4.4. 커뮤니티 (Category: 커뮤니티 - 11)
INSERT INTO test_cases (case_id, project_id, category_id, item, steps, expected, priority) VALUES
('COMM-001', 'app-v2', 11, '게시글 작성 및 첨부 기능', '1. 글쓰기\n2. 사진, 시설, 해시태그 첨부 후 저장', '게시글이 정상 등록되고 첨부 파일 확인', 'High'),
('COMM-002', 'app-v2', 11, '댓글/답글 작성 및 푸시 알림', '1. 게시글에 댓글 작성 (다른 유저로 로그인)\n2. 원작성자에게 푸시 알림 수신 확인', '알림 수신 성공', 'High'),
('COMM-003', 'app-v2', 11, '좋아요 기능 및 푸시 알림', '1. 게시글에 좋아요 클릭 (다른 유저로 로그인)\n2. 원작성자에게 푸시 알림 수신 확인', '알림 수신 성공', 'Mid');

-- 4.5. 내정보 (Category: 내 정보 - 12)
INSERT INTO test_cases (case_id, project_id, category_id, item, steps, expected, priority) VALUES
('MY-001', 'app-v2', 12, '프로필 이미지 수정', '1. 내 정보 > 프로필 편집 > 이미지 변경 후 저장', '새 이미지가 정상 반영됨', 'Mid'),
('MY-002', 'app-v2', 12, '레벨 상승에 따른 보상 확인', '1. 관리자 툴로 특정 점수 부여\n2. 앱 내에서 레벨 상승 애니메이션 및 보상 뱃지 확인', '레벨 및 보상 정상 표기', 'High');


-- 5. test_results 샘플 데이터 (새로운 항목에 대한 기록 추가)
INSERT INTO test_results (case_id, user_id, status, environment, notes, bug_id, created_at) VALUES
-- AI 추천 기능 테스트 (user-4: 최지은)
('AI-001', 'user-4', 'pass', '{"os": "iOS", "device": "iPhone 15", "version": "18.0"}', '응답이 매우 자연스러움', NULL, CURRENT_TIMESTAMP - INTERVAL '1 hour'),
('AI-002', 'user-4', 'fail', '{"os": "iOS", "device": "iPhone 15", "version": "18.0"}', 'API 응답 시간 초과로 504 에러 발생', 'BUG-101', CURRENT_TIMESTAMP - INTERVAL '50 minutes'),

-- 커뮤니티 글쓰기 테스트 (user-5: 정호진)
('COMM-001', 'user-5', 'pass', '{"os": "Android", "device": "Galaxy Fold 5", "version": "14"}', '모든 첨부 기능 정상', NULL, CURRENT_TIMESTAMP - INTERVAL '30 minutes'),

-- 내정보 레벨 보상 테스트 (user-1: 김철수)
('MY-002', 'user-1', 'blocker', '{"os": "Android", "device": "Pixel 8", "version": "15"}', '레벨업 뱃지 이미지가 깨져서 표시됨', 'BUG-102', CURRENT_TIMESTAMP - INTERVAL '10 minutes');
