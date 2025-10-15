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

-- 3. 실시간 업데이트 기능 (트리거 및 함수)
DO $$
BEGIN
    RAISE NOTICE '📝 3/4: 실시간 업데이트 시스템 설정...';
END $$;

-- 사용자 온라인 상태 뷰
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

-- 세션 변경 알림 트리거 함수
CREATE OR REPLACE FUNCTION notify_session_change()
RETURNS trigger AS $$
DECLARE
    notification json;
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        notification = json_build_object(
            'type', 'session_change',
            'user_id', NEW.user_id,
            'session_id', NEW.session_id,
            'is_active', NEW.is_active,
            'last_activity', NEW.last_activity,
            'operation', TG_OP,
            'timestamp', CURRENT_TIMESTAMP
        );
        PERFORM pg_notify('session_updates', notification::text);
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        notification = json_build_object(
            'type', 'session_change',
            'user_id', OLD.user_id,
            'session_id', OLD.session_id,
            'is_active', false,
            'operation', TG_OP,
            'timestamp', CURRENT_TIMESTAMP
        );
        PERFORM pg_notify('session_updates', notification::text);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 사용자 온라인 상태 알림 트리거 함수
CREATE OR REPLACE FUNCTION notify_user_status_change()
RETURNS trigger AS $$
DECLARE
    notification json;
    user_online_status boolean;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM sessions 
        WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
        AND is_active = true 
        AND expires_at > CURRENT_TIMESTAMP
    ) INTO user_online_status;
    
    notification = json_build_object(
        'type', 'user_status_change',
        'user_id', COALESCE(NEW.user_id, OLD.user_id),
        'is_online', user_online_status,
        'operation', TG_OP,
        'timestamp', CURRENT_TIMESTAMP
    );
    
    PERFORM pg_notify('user_status_updates', notification::text);
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 테스트 알림 함수
CREATE OR REPLACE FUNCTION test_notification()
RETURNS void AS $$
BEGIN
    PERFORM pg_notify('test_channel', json_build_object(
        'type', 'test',
        'message', 'Hello from PostgreSQL!',
        'timestamp', CURRENT_TIMESTAMP
    )::text);
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS session_change_trigger ON sessions;
CREATE TRIGGER session_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION notify_session_change();

DROP TRIGGER IF EXISTS user_status_change_trigger ON users;
CREATE TRIGGER user_status_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION notify_user_status_change();

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

-- 4. 사용자 계정 및 비밀번호 설정
DO $$
BEGIN
    RAISE NOTICE '📝 4/4: 사용자 계정 설정...';
    
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
    RAISE NOTICE '   ✅ 실시간 사용자 상태 업데이트';
    RAISE NOTICE '   ✅ PostgreSQL LISTEN/NOTIFY';
    RAISE NOTICE '   ✅ 사용자 온라인 상태 추적';
    RAISE NOTICE '==================================================';
    RAISE NOTICE '🔑 기본 로그인 계정:';
    RAISE NOTICE '   👔 관리자: admin@example.com / password123';
    RAISE NOTICE '   🧪 테스터: user-t001@example.com / password123';
    RAISE NOTICE '==================================================';
    RAISE NOTICE '🚀 서비스 준비 완료! Next.js 앱을 시작하세요.';
    RAISE NOTICE '   npm run dev';
    RAISE NOTICE '==================================================';
END $$;