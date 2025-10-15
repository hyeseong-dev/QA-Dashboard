-- ===================================================================
-- 004_remove_sessions_table.sql
-- Remove sessions table and related objects for JWT-only authentication
-- ===================================================================

-- 1. Drop session-related functions
DROP FUNCTION IF EXISTS cleanup_expired_sessions() CASCADE;
DROP FUNCTION IF EXISTS update_session_activity(VARCHAR) CASCADE;

-- 2. Drop sessions table (CASCADE will drop related indexes and constraints)
DROP TABLE IF EXISTS sessions CASCADE;

-- 3. Success notification
DO $$
BEGIN
    RAISE NOTICE '==================================================';
    RAISE NOTICE '✅ Sessions table removal completed';
    RAISE NOTICE '==================================================';
    RAISE NOTICE '📋 Removed objects:';
    RAISE NOTICE '   - sessions table';
    RAISE NOTICE '   - cleanup_expired_sessions() function';
    RAISE NOTICE '   - update_session_activity() function';
    RAISE NOTICE '   - All related indexes and constraints';
    RAISE NOTICE '==================================================';
    RAISE NOTICE '🔑 Authentication is now JWT-only (stateless)';
    RAISE NOTICE '==================================================';
END $$;