-- ===================================================================
-- 000_run_migrations.sql
-- 마이그레이션 실행 순서 관리 및 중복 실행 방지
-- ===================================================================

-- 마이그레이션 히스토리 테이블 생성
CREATE TABLE IF NOT EXISTS migration_history (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

-- 마이그레이션 실행 함수
CREATE OR REPLACE FUNCTION run_migration(migration_name VARCHAR(255), migration_sql TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    already_executed BOOLEAN := false;
BEGIN
    -- 이미 실행된 마이그레이션인지 확인
    SELECT EXISTS(
        SELECT 1 FROM migration_history 
        WHERE migration_history.migration_name = run_migration.migration_name 
        AND success = true
    ) INTO already_executed;
    
    IF already_executed THEN
        RAISE NOTICE '⏭️  마이그레이션 "%"은(는) 이미 실행되었습니다.', migration_name;
        RETURN true;
    END IF;
    
    -- 마이그레이션 실행
    BEGIN
        RAISE NOTICE '🚀 마이그레이션 "%" 실행 중...', migration_name;
        EXECUTE migration_sql;
        
        -- 성공 기록
        INSERT INTO migration_history (migration_name, success) 
        VALUES (migration_name, true);
        
        RAISE NOTICE '✅ 마이그레이션 "%" 완료', migration_name;
        RETURN true;
        
    EXCEPTION WHEN OTHERS THEN
        -- 실패 기록
        INSERT INTO migration_history (migration_name, success, error_message) 
        VALUES (migration_name, false, SQLERRM);
        
        RAISE NOTICE '❌ 마이그레이션 "%" 실패: %', migration_name, SQLERRM;
        RETURN false;
    END;
END;
$$ LANGUAGE plpgsql;

-- 알림: 마이그레이션 시스템 준비 완료
DO $$
BEGIN
    RAISE NOTICE '==================================================';
    RAISE NOTICE '📋 QA Dashboard 마이그레이션 시스템 초기화 완료';
    RAISE NOTICE '==================================================';
    RAISE NOTICE '📂 마이그레이션 파일 실행 순서:';
    RAISE NOTICE '   1. 000_run_migrations.sql (현재 파일)';
    RAISE NOTICE '   2. 001_create_sessions_table.sql';
    RAISE NOTICE '   3. 002_add_session_triggers.sql'; 
    RAISE NOTICE '   4. 003_add_session_management.sql';
    RAISE NOTICE '==================================================';
    RAISE NOTICE '💡 Docker 컨테이너 재시작 시 자동 실행됩니다.';
    RAISE NOTICE '   명령어: docker-compose down && docker-compose up -d';
    RAISE NOTICE '==================================================';
END $$;