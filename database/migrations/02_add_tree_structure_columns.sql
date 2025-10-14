-- 계층 구조 및 드래그 앤 드롭 지원을 위한 컬럼 추가

-- test_cases 테이블에 트리 구조 컬럼 추가
ALTER TABLE test_cases 
ADD COLUMN parent_id VARCHAR(50) NULL,
ADD COLUMN depth INTEGER DEFAULT 1,
ADD COLUMN sort_order INTEGER DEFAULT 0;

-- parent_id는 자기 자신 테이블 참조 (self-referencing foreign key)
ALTER TABLE test_cases 
ADD CONSTRAINT fk_test_cases_parent 
FOREIGN KEY (parent_id) REFERENCES test_cases(case_id) ON DELETE SET NULL;

-- 인덱스 추가 (트리 구조 조회 성능 최적화)
CREATE INDEX idx_test_cases_parent_id ON test_cases(parent_id);
CREATE INDEX idx_test_cases_sort_order ON test_cases(sort_order);

-- 기존 데이터에 대한 초기값 설정
UPDATE test_cases SET 
    parent_id = NULL,  -- 모든 기존 항목은 루트 레벨
    depth = 1,         -- 1레벨 (루트)
    sort_order = CASE 
        WHEN case_id LIKE 'AUTH-%' THEN 100
        WHEN case_id LIKE 'MAP-%' THEN 200  
        WHEN case_id LIKE 'SEARCH-%' THEN 300
        WHEN case_id LIKE 'AI-%' THEN 400
        WHEN case_id LIKE 'COMM-%' THEN 500
        WHEN case_id LIKE 'MY-%' THEN 600
        ELSE 999
    END + CAST(SUBSTRING(case_id FROM '\d+$') AS INTEGER);

-- 코멘트 추가
COMMENT ON COLUMN test_cases.parent_id IS '부모 테스트 케이스 ID (계층 구조)';
COMMENT ON COLUMN test_cases.depth IS '트리 구조에서의 깊이 (1=루트)';
COMMENT ON COLUMN test_cases.sort_order IS '같은 레벨 내에서의 정렬 순서';