-- PostgreSQL LISTEN/NOTIFY 트리거 생성 (DISABLED - 실시간 기능 제거됨)
-- 세션 상태 변경 시 실시간 알림을 위한 트리거 함수

-- DISABLED: 실시간 추적 기능이 제거되어 이 마이그레이션은 비활성화됩니다.
-- 파일은 참고용으로만 보관됩니다.

/*
이 파일의 내용은 모두 비활성화되었습니다.
실시간 기능이 필요하지 않으므로 PostgreSQL LISTEN/NOTIFY를 사용하지 않습니다.

원래 기능:
- 세션 변경 시 실시간 알림
- 사용자 상태 변경 알림  
- SSE 연결을 통한 브라우저 업데이트

대체 방안:
- 30초 주기적 폴링을 통한 온라인 상태 업데이트
- 사용자 목록 새로고침 버튼
- 필요 시 수동 새로고침
*/

-- 성공 기록 (실제로는 아무 작업 안 함)
INSERT INTO migration_history (migration_name, success) 
VALUES ('002_add_session_triggers', true)
ON CONFLICT (migration_name) DO UPDATE SET
    executed_at = CURRENT_TIMESTAMP,
    success = true;