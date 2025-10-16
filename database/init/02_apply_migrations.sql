-- ===================================================================
-- 02_apply_migrations.sql  
-- Docker 초기화 시 모든 마이그레이션 자동 적용
-- ===================================================================

-- 타임존 설정 (Asia/Seoul)
SET timezone = 'Asia/Seoul';

-- 마이그레이션 히스토리 테이블 생성
CREATE TABLE IF NOT EXISTS migration_history (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

DO $$
BEGIN
    RAISE NOTICE '==================================================';
    RAISE NOTICE '🐳 Docker 초기화: QA Dashboard 마이그레이션 적용';
    RAISE NOTICE '==================================================';
END $$;

-- 1. 사용자 테이블 업데이트 (password_hash 등)
DO $$
BEGIN
    RAISE NOTICE '📝 1/4: 사용자 테이블 스키마 업데이트...';
    
    -- password_hash 컬럼 추가 (없는 경우에만)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
        RAISE NOTICE '   ✅ password_hash 컬럼 추가됨';
    ELSE
        RAISE NOTICE '   ⏭️  password_hash 컬럼 이미 존재';
    END IF;
    
    -- 사용자 상세 정보 컬럼들 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'department'
    ) THEN
        ALTER TABLE users ADD COLUMN department VARCHAR(100);
        ALTER TABLE users ADD COLUMN position VARCHAR(100);
        ALTER TABLE users ADD COLUMN phone VARCHAR(20);
        ALTER TABLE users ADD COLUMN profile_image TEXT;
        ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '   ✅ 사용자 상세 정보 컬럼들 추가됨';
    ELSE
        RAISE NOTICE '   ⏭️  사용자 상세 정보 컬럼들 이미 존재';
    END IF;
END $$;

-- 2. 세션 관리 테이블 생성
DO $$
BEGIN
    RAISE NOTICE '📝 2/4: 세션 관리 테이블 생성...';
    
    CREATE TABLE IF NOT EXISTS sessions (
        session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(50) NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        ip_address INET,
        user_agent TEXT,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    );
    
    -- 인덱스 생성
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_active_expires ON sessions(is_active, expires_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions(user_id, is_active, expires_at) 
    WHERE is_active = true;
    
    RAISE NOTICE '   ✅ sessions 테이블 및 인덱스 생성됨';
END $$;

-- 3. 사용자 온라인 상태 뷰 (실시간 기능 제거됨)
DO $$
BEGIN
    RAISE NOTICE '📝 3/4: 사용자 온라인 상태 뷰 설정...';
END $$;

-- 사용자 온라인 상태 뷰 (단순화된 버전)
CREATE OR REPLACE VIEW users_online_status AS
SELECT 
    u.user_id,
    u.user_name,
    u.email,
    u.role,
    u.department,
    u.position,
    u.phone,
    u.profile_image,
    u.last_login_at,
    u.created_at,
    u.updated_at,
    CASE 
        WHEN s.user_id IS NOT NULL THEN true 
        ELSE false 
    END as is_online
FROM users u
LEFT JOIN (
    SELECT DISTINCT user_id
    FROM sessions 
    WHERE is_active = true 
    AND expires_at > CURRENT_TIMESTAMP
) s ON u.user_id = s.user_id;

-- 실시간 알림 기능 제거됨 (PostgreSQL LISTEN/NOTIFY 미사용)

-- 유틸리티 함수들
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions 
    WHERE expires_at < CURRENT_TIMESTAMP 
    OR (is_active = false AND created_at < CURRENT_TIMESTAMP - INTERVAL '7 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_session_activity(session_token VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
    update_count INTEGER;
BEGIN
    UPDATE sessions 
    SET last_activity = CURRENT_TIMESTAMP
    WHERE token = session_token 
    AND is_active = true 
    AND expires_at > CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS update_count = ROW_COUNT;
    RETURN update_count > 0;
END;
$$ LANGUAGE plpgsql;

-- 4. 테스트 케이스 트리 구조 컬럼 추가
DO $$
BEGIN
    RAISE NOTICE '📝 4/5: 테스트 케이스 트리 구조 업데이트...';
    
    -- parent_id 컬럼 추가 (없는 경우에만)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'test_cases' AND column_name = 'parent_id'
    ) THEN
        ALTER TABLE test_cases ADD COLUMN parent_id VARCHAR(50);
        RAISE NOTICE '   ✅ parent_id 컬럼 추가됨';
    ELSE
        RAISE NOTICE '   ⏭️  parent_id 컬럼 이미 존재';
    END IF;
    
    -- depth 컬럼 추가 (없는 경우에만)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'test_cases' AND column_name = 'depth'
    ) THEN
        ALTER TABLE test_cases ADD COLUMN depth INTEGER DEFAULT 1;
        RAISE NOTICE '   ✅ depth 컬럼 추가됨';
    ELSE
        RAISE NOTICE '   ⏭️  depth 컬럼 이미 존재';
    END IF;
    
    -- sort_order 컬럼 추가 (없는 경우에만)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'test_cases' AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE test_cases ADD COLUMN sort_order INTEGER DEFAULT 1;
        RAISE NOTICE '   ✅ sort_order 컬럼 추가됨';
    ELSE
        RAISE NOTICE '   ⏭️  sort_order 컬럼 이미 존재';
    END IF;
    
    -- parent_id 외래키 제약조건 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_test_cases_parent' AND table_name = 'test_cases'
    ) THEN
        ALTER TABLE test_cases 
        ADD CONSTRAINT fk_test_cases_parent 
        FOREIGN KEY (parent_id) REFERENCES test_cases(case_id) ON DELETE CASCADE;
        RAISE NOTICE '   ✅ parent_id 외래키 제약조건 추가됨';
    ELSE
        RAISE NOTICE '   ⏭️  parent_id 외래키 제약조건 이미 존재';
    END IF;
    
    -- 인덱스 추가
    CREATE INDEX IF NOT EXISTS idx_test_cases_parent_id ON test_cases(parent_id);
    CREATE INDEX IF NOT EXISTS idx_test_cases_sort_order ON test_cases(sort_order);
    
    -- 기존 레코드의 sort_order 값 업데이트 (CTE를 사용하여 윈도우 함수 문제 해결)
    WITH numbered_cases AS (
        SELECT case_id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY case_id) as new_sort_order
        FROM test_cases
        WHERE sort_order IS NULL OR sort_order = 1
    )
    UPDATE test_cases 
    SET sort_order = numbered_cases.new_sort_order
    FROM numbered_cases
    WHERE test_cases.case_id = numbered_cases.case_id;
    
    RAISE NOTICE '   ✅ 테스트 케이스 트리 구조 업데이트 완료';
END $$;

-- 5. 오류 추적 및 수정 상태 컬럼 추가
DO $$
BEGIN
    RAISE NOTICE '📝 5/6: 오류 추적 컬럼 추가...';
    
    -- error_type 컬럼 추가 (없는 경우에만)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'test_cases' AND column_name = 'error_type'
    ) THEN
        ALTER TABLE test_cases ADD COLUMN error_type VARCHAR(50);
        RAISE NOTICE '   ✅ error_type 컬럼 추가됨';
    ELSE
        RAISE NOTICE '   ⏭️  error_type 컬럼 이미 존재';
    END IF;
    
    -- fix_checked 컬럼 추가 (없는 경우에만)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'test_cases' AND column_name = 'fix_checked'
    ) THEN
        ALTER TABLE test_cases ADD COLUMN fix_checked BOOLEAN DEFAULT false;
        RAISE NOTICE '   ✅ fix_checked 컬럼 추가됨';
    ELSE
        RAISE NOTICE '   ⏭️  fix_checked 컬럼 이미 존재';
    END IF;
    
    -- 인덱스 추가
    CREATE INDEX IF NOT EXISTS idx_test_cases_error_type ON test_cases(error_type);
    
    RAISE NOTICE '   ✅ 오류 추적 컬럼 업데이트 완료';
END $$;

-- 6. 사용자 계정 및 비밀번호 설정
DO $$
BEGIN
    RAISE NOTICE '📝 6/6: 사용자 계정 설정...';
    
    -- 관리자 계정 (user-a006) - bcrypt hash for 'password123'
    INSERT INTO users (user_id, user_name, email, role, password_hash, created_at, updated_at) 
    VALUES (
        'user-a006', 
        '관리자', 
        'admin@example.com', 
        'Admin', 
        '$2b$10$rL8PbZwjjNl8H5FUZ6M4m.VZR8YxJ4yKjVx1ZOe2.5L3dO8K1HXCq',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) ON CONFLICT (user_id) DO UPDATE SET
        user_name = EXCLUDED.user_name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        password_hash = EXCLUDED.password_hash,
        updated_at = CURRENT_TIMESTAMP;
    
    -- 테스터 계정 (user-t001)
    INSERT INTO users (user_id, user_name, email, role, password_hash, created_at, updated_at) 
    VALUES (
        'user-t001', 
        '테스터1', 
        'user-t001@example.com', 
        'Tester', 
        '$2b$10$rL8PbZwjjNl8H5FUZ6M4m.VZR8YxJ4yKjVx1ZOe2.5L3dO8K1HXCq',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) ON CONFLICT (user_id) DO UPDATE SET
        user_name = EXCLUDED.user_name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        password_hash = EXCLUDED.password_hash,
        updated_at = CURRENT_TIMESTAMP;
    
    -- 기존 사용자들 비밀번호 업데이트
    UPDATE users SET 
        password_hash = '$2b$10$rL8PbZwjjNl8H5FUZ6M4m.VZR8YxJ4yKjVx1ZOe2.5L3dO8K1HXCq',
        updated_at = CURRENT_TIMESTAMP
    WHERE password_hash IS NULL;
    
    RAISE NOTICE '   ✅ 사용자 계정 설정 완료';
END $$;

-- 마이그레이션 완료 기록
INSERT INTO migration_history (migration_name, success) 
VALUES ('docker_init_migrations', true)
ON CONFLICT (migration_name) DO UPDATE SET
    executed_at = CURRENT_TIMESTAMP,
    success = true;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '==================================================';
    RAISE NOTICE '🎉 QA Dashboard 마이그레이션 완료!';
    RAISE NOTICE '==================================================';
    RAISE NOTICE '📋 설치된 기능:';
    RAISE NOTICE '   ✅ 세션 관리 시스템';
    RAISE NOTICE '   ✅ 사용자 온라인 상태 추적';
    RAISE NOTICE '   ⚠️ 실시간 기능 제거됨 (LISTEN/NOTIFY 미사용)';
    RAISE NOTICE '   ✅ 테스트 케이스 계층 구조 지원';
    RAISE NOTICE '==================================================';
    RAISE NOTICE '🔑 기본 로그인 계정:';
    RAISE NOTICE '   👔 관리자: admin@example.com / password123';
    RAISE NOTICE '   🧪 테스터: user-t001@example.com / password123';
    RAISE NOTICE '==================================================';
    RAISE NOTICE '🚀 서비스 준비 완료! Next.js 앱을 시작하세요.';
    RAISE NOTICE '   npm run dev';
    RAISE NOTICE '==================================================';
END $$;