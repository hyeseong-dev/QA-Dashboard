-- PostgreSQL LISTEN/NOTIFY 트리거 생성 (DISABLED - SSE 기능 제거됨)
-- 세션 상태 변경 시 실시간 알림을 위한 트리거 함수

-- DISABLED: SSE 실시간 추적 기능이 제거되어 이 마이그레이션은 비활성화됩니다.
-- 파일은 참고용으로만 보관됩니다.

/*

-- 세션 변경 알림 함수
CREATE OR REPLACE FUNCTION notify_session_change()
RETURNS trigger AS $$
DECLARE
    notification json;
BEGIN
    -- INSERT 또는 UPDATE 처리
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
        
        -- 채널에 알림 전송
        PERFORM pg_notify('session_updates', notification::text);
        RETURN NEW;
    END IF;
    
    -- DELETE 처리
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

-- 세션 테이블에 트리거 연결
DROP TRIGGER IF EXISTS session_change_trigger ON sessions;
CREATE TRIGGER session_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION notify_session_change();

-- 사용자 온라인 상태 알림 함수 (users 테이블 변경 시)
CREATE OR REPLACE FUNCTION notify_user_status_change()
RETURNS trigger AS $$
DECLARE
    notification json;
    user_online_status boolean;
BEGIN
    -- 사용자 온라인 상태 확인
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

-- 사용자 테이블에 트리거 연결 (필요시)
DROP TRIGGER IF EXISTS user_status_change_trigger ON users;
CREATE TRIGGER user_status_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION notify_user_status_change();

-- 테스트를 위한 알림 함수
CREATE OR REPLACE FUNCTION test_notification()
RETURNS void AS $$
BEGIN
    PERFORM pg_notify('test_channel', 'Hello from PostgreSQL!');
END;
$$ LANGUAGE plpgsql;

-- 인덱스 최적화 (알림 성능 향상)
CREATE INDEX IF NOT EXISTS idx_sessions_user_active 
ON sessions(user_id, is_active, expires_at) 
WHERE is_active = true;

-- 성공 메시지
DO $$
BEGIN
    RAISE NOTICE 'PostgreSQL LISTEN/NOTIFY 트리거가 성공적으로 생성되었습니다.';
    RAISE NOTICE '채널: session_updates, user_status_updates';
    RAISE NOTICE '테스트: SELECT test_notification();';
END $$;

*/