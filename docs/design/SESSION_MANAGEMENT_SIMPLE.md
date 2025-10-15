# 세션 관리 시스템 설계서 (간소화 버전)

**문서 버전**: 1.0 Simple  
**작성일**: 2025-01-15  
**프로젝트**: QA Dashboard - Simple Session Management

---

## 1. 개요

### 목표
- 단순하고 효과적인 로그인/로그아웃 관리
- 정확한 온라인/오프라인 상태 표시
- 30분 자동 로그아웃 기능

### 핵심 원칙
- **단순함**: 최소한의 필수 기능만 구현
- **실용성**: 실제 필요한 기능에 집중
- **안정성**: 복잡도를 낮춰 버그 최소화

---

## 2. 데이터베이스 스키마

### 2.1 sessions 테이블 (심플 버전)
```sql
CREATE TABLE sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  
  -- 시간 정보
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  
  -- 상태
  is_active BOOLEAN DEFAULT true,
  
  -- 인덱스
  INDEX idx_sessions_user_id (user_id),
  INDEX idx_sessions_token (token),
  INDEX idx_sessions_active (is_active, expires_at)
);
```

### 2.2 users 테이블 수정
```sql
-- is_online을 계산 필드로 변경
ALTER TABLE users DROP COLUMN IF EXISTS is_online;

-- 온라인 상태를 세션에서 계산
CREATE OR REPLACE VIEW users_online_status AS
SELECT 
  u.*,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM sessions s 
      WHERE s.user_id = u.user_id 
        AND s.is_active = true 
        AND s.expires_at > CURRENT_TIMESTAMP
        AND s.last_activity > CURRENT_TIMESTAMP - INTERVAL '30 minutes'
    ) THEN true 
    ELSE false 
  END as is_online
FROM users u;
```

---

## 3. API 구현

### 3.1 로그인
```typescript
// POST /api/auth/login
export async function login(request: Request) {
  const { email, password } = await request.json();
  
  // 1. 사용자 인증
  const user = await validateUser(email, password);
  if (!user) return error('Invalid credentials');
  
  // 2. 기존 세션 정리 (한 사용자당 하나의 세션만 허용)
  await query(
    'UPDATE sessions SET is_active = false WHERE user_id = $1',
    [user.user_id]
  );
  
  // 3. 새 세션 생성
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24시간
  
  await query(`
    INSERT INTO sessions (user_id, token, expires_at)
    VALUES ($1, $2, $3)
  `, [user.user_id, token, expiresAt]);
  
  // 4. last_login_at 업데이트
  await query(
    'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE user_id = $1',
    [user.user_id]
  );
  
  return { success: true, token, user };
}
```

### 3.2 로그아웃
```typescript
// POST /api/auth/logout
export async function logout(request: Request) {
  const token = getTokenFromHeader(request);
  
  // 세션 비활성화
  await query(
    'UPDATE sessions SET is_active = false WHERE token = $1',
    [token]
  );
  
  return { success: true };
}
```

### 3.3 세션 검증 미들웨어
```typescript
// middleware.ts
export async function validateSession(request: Request) {
  const token = getTokenFromHeader(request);
  if (!token) return null;
  
  // 세션 확인
  const result = await query(`
    SELECT s.*, u.* 
    FROM sessions s
    JOIN users u ON s.user_id = u.user_id
    WHERE s.token = $1 
      AND s.is_active = true
      AND s.expires_at > CURRENT_TIMESTAMP
  `, [token]);
  
  if (!result.rows[0]) return null;
  
  // 활동 시간 업데이트 (5분마다)
  const lastActivity = new Date(result.rows[0].last_activity);
  if (Date.now() - lastActivity.getTime() > 5 * 60 * 1000) {
    await query(
      'UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE token = $1',
      [token]
    );
  }
  
  return result.rows[0];
}
```

---

## 4. 자동 로그아웃 구현

### 4.1 프론트엔드 - Auto Logout Hook
```typescript
// hooks/useAutoLogout.ts
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function useAutoLogout() {
  const router = useRouter();
  const { logout } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const TIMEOUT = 30 * 60 * 1000; // 30분
  const WARNING = 5 * 60 * 1000;  // 5분 전 경고
  
  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // 25분 후 경고
    setTimeout(() => {
      if (confirm('5분 후 자동 로그아웃됩니다. 계속 하시겠습니까?')) {
        resetTimer(); // 사용자가 계속하기를 선택하면 타이머 리셋
      }
    }, TIMEOUT - WARNING);
    
    // 30분 후 로그아웃
    timeoutRef.current = setTimeout(() => {
      alert('세션이 만료되어 로그아웃됩니다.');
      logout();
      router.push('/login');
    }, TIMEOUT);
  };
  
  useEffect(() => {
    // 사용자 활동 감지
    const handleActivity = () => resetTimer();
    
    // 이벤트 리스너 등록
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);
    window.addEventListener('click', handleActivity);
    
    // 초기 타이머 시작
    resetTimer();
    
    // 클린업
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, []);
}

// 사용: App 최상위에서 호출
export function AppWithAutoLogout({ children }) {
  useAutoLogout();
  return <>{children}</>;
}
```

### 4.2 백엔드 - 세션 정리 (5분마다 실행)
```typescript
// api/cron/cleanup.ts
export async function cleanupSessions() {
  // 30분 이상 비활성 세션 정리
  await query(`
    UPDATE sessions 
    SET is_active = false
    WHERE is_active = true
      AND last_activity < CURRENT_TIMESTAMP - INTERVAL '30 minutes'
  `);
  
  // 만료된 세션 정리
  await query(`
    UPDATE sessions 
    SET is_active = false
    WHERE is_active = true
      AND expires_at < CURRENT_TIMESTAMP
  `);
  
  // 30일 이상 오래된 세션 삭제
  await query(`
    DELETE FROM sessions 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
  `);
}

// 5분마다 실행
setInterval(cleanupSessions, 5 * 60 * 1000);
```

---

## 5. 사용자 목록 API 수정

```typescript
// GET /api/users
export async function getUsers() {
  const users = await query(`
    SELECT 
      u.user_id,
      u.user_name,
      u.email,
      u.role,
      u.created_at,
      u.last_login_at,
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM sessions s 
          WHERE s.user_id = u.user_id 
            AND s.is_active = true 
            AND s.last_activity > CURRENT_TIMESTAMP - INTERVAL '30 minutes'
        ) THEN true 
        ELSE false 
      END as is_online
    FROM users u
    ORDER BY u.user_name
  `);
  
  return users.rows;
}
```

---

## 6. 구현 단계

### Step 1: 데이터베이스 (30분)
```sql
-- 1. sessions 테이블 생성
CREATE TABLE sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_active ON sessions(is_active, expires_at);
```

### Step 2: 로그인/로그아웃 API 수정 (1시간)
- `/api/auth/login` 수정: 세션 생성 추가
- `/api/auth/logout` 생성: 세션 비활성화
- 미들웨어 수정: 세션 검증

### Step 3: 프론트엔드 자동 로그아웃 (1시간)
- `useAutoLogout` Hook 생성
- AuthContext에 통합
- 경고 메시지 UI 추가

### Step 4: 백엔드 세션 정리 (30분)
- Cleanup 함수 작성
- 서버 시작 시 interval 설정

### Step 5: 사용자 목록 수정 (30분)
- `/api/users` API 수정
- 온라인 상태 표시 로직 추가

---

## 7. 테스트 체크리스트

### 기본 기능
- [ ] 로그인 시 세션 생성 확인
- [ ] 로그아웃 시 세션 비활성화 확인
- [ ] 30분 비활성 후 자동 로그아웃
- [ ] 25분에 경고 메시지 표시
- [ ] 사용자 활동 시 타이머 리셋

### 온라인 상태
- [ ] 로그인한 사용자 온라인 표시
- [ ] 로그아웃한 사용자 오프라인 표시
- [ ] 30분 비활성 사용자 오프라인 표시

### 보안
- [ ] 만료된 토큰으로 접근 불가
- [ ] 다른 사용자 세션 접근 불가
- [ ] 중복 로그인 시 이전 세션 종료

---

## 8. 주의사항

### 단순화된 부분
1. **단일 세션**: 한 사용자당 하나의 활성 세션만 허용
2. **디바이스 무시**: 디바이스별 관리 없음
3. **최소 로깅**: 필수 정보만 기록
4. **간단한 토큰**: JWT 대신 단순 랜덤 토큰 사용 가능

### 확장 가능한 부분
- Remember Me 기능 (expires_at 연장)
- 세션 히스토리 (별도 테이블)
- 실시간 상태 (WebSocket)

---

## 9. 예상 코드량

- **Backend**: ~200줄
  - 로그인/로그아웃 API: 50줄
  - 세션 검증: 30줄
  - 세션 정리: 30줄
  - 사용자 목록: 30줄

- **Frontend**: ~100줄
  - Auto Logout Hook: 50줄
  - AuthContext 수정: 30줄
  - UI 수정: 20줄

- **Database**: ~30줄
  - 테이블 생성: 20줄
  - 인덱스: 10줄

**총 예상 코드**: ~330줄 (간단하고 관리하기 쉬움)

---

**결론**: 이 간소화된 버전은 필수 기능만 포함하여 구현이 쉽고, 유지보수가 간단하며, 버그 발생 가능성이 낮습니다.