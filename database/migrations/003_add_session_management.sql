-- ===================================================================
-- 003_add_session_management.sql
-- 세션 관리 및 실시간 업데이트 기능 마이그레이션
-- ===================================================================

-- 1. 사용자 테이블에 필요한 컬럼 추가 (없는 경우에만)
DO $$
BEGIN
    -- password_hash 컬럼 추가 (이미 있을 수 있음)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
    END IF;
    
    -- 사용자 상세 정보 컬럼들 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'department'
    ) THEN
        ALTER TABLE users ADD COLUMN department VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'position'
    ) THEN
        ALTER TABLE users ADD COLUMN position VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'phone'
    ) THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'profile_image'
    ) THEN
        ALTER TABLE users ADD COLUMN profile_image TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_login_at'
    ) THEN
        ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- 2. 세션 관리 테이블 생성
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

-- 3. 세션 테이블 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_active_expires ON sessions(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions(user_id, is_active, expires_at) 
WHERE is_active = true;

-- 4. 사용자 온라인 상태 뷰 생성 (제거됨 - SSE 관련)

-- 5. 세션 변경 알림 트리거 함수 (제거됨 - SSE 관련)

-- 6. 사용자 온라인 상태 알림 트리거 함수 (제거됨 - SSE 관련)

-- 7. 테스트 알림 함수 (제거됨 - SSE 관련)

-- 8. 트리거 생성 (제거됨 - SSE 관련)

-- 9. 세션 정리 함수 (선택사항)
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

-- 10. 세션 활동 업데이트 함수
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

-- 11. 관리자 계정 비밀번호 해시 업데이트 (bcrypt로 'password123' 해시)
UPDATE users 
SET password_hash = '$2b$10$rL8PbZwjjNl8H5FUZ6M4m.VZR8YxJ4yKjVx1ZOe2.5L3dO8K1HXCq'
WHERE user_id IN ('user-1') AND password_hash IS NULL;

-- 12. 샘플 사용자들 비밀번호 설정 및 이메일 업데이트
UPDATE users SET 
    email = 'admin@example.com',
    password_hash = '$2b$10$rL8PbZwjjNl8H5FUZ6M4m.VZR8YxJ4yKjVx1ZOe2.5L3dO8K1HXCq'
WHERE user_id = 'user-1';

UPDATE users SET 
    email = 'user-t001@example.com',
    password_hash = '$2b$10$rL8PbZwjjNl8H5FUZ6M4m.VZR8YxJ4yKjVx1ZOe2.5L3dO8K1HXCq'
WHERE user_id = 'user-2';

UPDATE users SET 
    email = 'user-t002@example.com',
    password_hash = '$2b$10$rL8PbZwjjNl8H5FUZ6M4m.VZR8YxJ4yKjVx1ZOe2.5L3dO8K1HXCq'
WHERE user_id = 'user-3';

-- 관리자 계정 생성 (user-a006)
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

-- 테스트 사용자 계정 생성
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

-- 알림: 마이그레이션 완료
DO $$
BEGIN
    RAISE NOTICE '==================================================';
    RAISE NOTICE '✅ 세션 관리 마이그레이션 완료';
    RAISE NOTICE '==================================================';
    RAISE NOTICE '📋 추가된 기능:';
    RAISE NOTICE '   - sessions 테이블 (세션 관리)';
    RAISE NOTICE '   - 세션 정리 및 활동 추적 함수';
    RAISE NOTICE '==================================================';
    RAISE NOTICE '🔑 기본 계정 정보:';
    RAISE NOTICE '   관리자: admin@example.com / password123';
    RAISE NOTICE '   테스터: user-t001@example.com / password123';
    RAISE NOTICE '==================================================';
END $$;