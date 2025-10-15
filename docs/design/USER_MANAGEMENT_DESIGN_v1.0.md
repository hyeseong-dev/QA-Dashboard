# QA 대시보드 - 사용자 관리 화면 설계서

**버전**: 1.0  
**작성일**: 2025-01-15  
**작성자**: QA Dashboard Team  
**상태**: 초안

---

## 📋 목차
1. [개요](#개요)
2. [화면 목적](#화면-목적)
3. [사용자 스토리](#사용자-스토리)
4. [기능 명세](#기능-명세)
5. [화면 설계](#화면-설계)
6. [구현 우선순위](#구현-우선순위)
7. [기술 요구사항](#기술-요구사항)
8. [변경 이력](#변경-이력)

---

## 개요

QA 대시보드의 사용자 관리 화면은 QA 팀의 효율적인 인력 관리와 테스트 활동 모니터링을 위한 중앙 관리 시스템입니다.

### 주요 목표
- QA 팀원 현황 실시간 파악
- 테스트 수행 성과 추적
- 효율적인 프로젝트 인력 배치
- 팀 생산성 분석 및 개선

---

## 화면 목적

1. **인력 관리**: QA 팀원의 상태, 역할, 권한 관리
2. **성과 추적**: 개인별/팀별 테스트 수행 실적 모니터링
3. **프로젝트 할당**: 효율적인 인력 배치 및 작업 분배
4. **협업 강화**: 팀원 간 소통 및 정보 공유 활성화

---

## 사용자 스토리

### 관리자 (Admin)
- **AS** QA 관리자
- **I WANT TO** 팀원들의 활동 상태와 성과를 한눈에 파악하고
- **SO THAT** 효율적인 인력 배치와 팀 관리를 할 수 있다

### 테스터 (Tester)
- **AS** QA 테스터
- **I WANT TO** 동료들의 상태와 담당 프로젝트를 확인하고
- **SO THAT** 효과적인 협업과 정보 공유를 할 수 있다

---

## 기능 명세

### 1. 사용자 목록 관리 ✅ (현재 구현됨)

#### 1.1 기본 기능
- [x] 전체 사용자 목록 조회
- [x] 역할별 필터링 (Admin/Tester)
- [x] 검색 기능 (이름, 이메일, ID)
- [x] 통계 카드 (전체/관리자/테스터 수)

#### 1.2 표시 정보
- 사용자 ID
- 이름
- 이메일
- 역할
- 가입일 (created_at 추가 예정)

### 2. 사용자 상세 정보 📋 (Phase 1)

#### 2.1 프로필 정보
- 프로필 이미지/아바타
- 연락처 정보
- 소속 팀/부서
- 입사일/경력

#### 2.2 활동 정보
- 현재 작업 중인 프로젝트
- 최근 활동 시간
- 온라인/오프라인 상태
- 마지막 로그인 시간

#### 2.3 성과 지표
- 총 테스트 수행 건수
- Pass/Fail 비율
- 발견한 버그 수
- 평균 테스트 소요 시간
- 일일/주간/월간 통계

### 3. 프로젝트 할당 관리 🏗️ (Phase 1)

#### 3.1 할당 기능
- 프로젝트별 팀원 배치
- 역할 지정 (Lead/Member)
- 권한 설정
- 할당 기간 설정

#### 3.2 할당 현황
- 담당 프로젝트 목록
- 프로젝트별 참여도
- 작업 부하 분석
- 가용 인력 파악

### 4. 권한 관리 시스템 🔐 (Phase 2)

#### 4.1 역할 관리
- Admin ↔ Tester 역할 변경
- 계정 활성화/비활성화
- 임시 권한 부여
- 권한 이력 관리

#### 4.2 접근 제어
- 프로젝트별 접근 권한
- 기능별 사용 권한
- 데이터 조회 권한
- 수정/삭제 권한

### 5. 사용자 초대 시스템 📧 (Phase 2)

#### 5.1 초대 프로세스
- 이메일 초대 발송
- 초대 링크 생성
- 임시 계정 생성
- 가입 승인 프로세스

#### 5.2 초대 관리
- 대기 중인 초대 목록
- 초대 만료 기간 설정
- 초대 재발송
- 초대 취소

### 6. 활동 로그 및 감사 📊 (Phase 2)

#### 6.1 활동 추적
- 로그인/로그아웃 기록
- 테스트 수행 이력
- 프로젝트 접근 로그
- 설정 변경 이력

#### 6.2 보고서
- 개인별 활동 보고서
- 팀별 성과 보고서
- 프로젝트별 참여 보고서
- 월간 종합 보고서

### 7. 실시간 협업 기능 💬 (Phase 3)

#### 7.1 커뮤니케이션
- 사용자 간 메시지
- 팀 공지사항
- 테스트 할당 알림
- 버그 발견 알림

#### 7.2 협업 도구
- 상태 메시지 설정
- 부재 중 설정
- 업무 인수인계
- 팀 캘린더

### 8. 성과 관리 시스템 🏆 (Phase 3)

#### 8.1 KPI 관리
- 개인별 목표 설정
- 성과 측정 지표
- 실시간 대시보드
- 성과 리뷰

#### 8.2 동기부여
- 테스터 랭킹
- 뱃지/업적 시스템
- 이달의 테스터
- 성과 보상

---

## 화면 설계

### 레이아웃 구조

```
┌─────────────────────────────────────────────────────────┐
│  Header: 네비게이션 및 액션 버튼                          │
├─────────────────────────────────────────────────────────┤
│  Statistics Cards: 주요 지표 표시                         │
├─────────────────────────────────────────────────────────┤
│  Filters & Search: 필터링 및 검색 도구                    │
├─────────────────────────────────────────────────────────┤
│  User List/Grid: 사용자 목록 (테이블/카드 뷰 전환 가능)    │
│  ┌─────────────────────────────────────────────────┐    │
│  │ User Card/Row                                    │    │
│  │  - Profile Info                                  │    │
│  │  - Status Indicators                            │    │
│  │  - Performance Metrics                          │    │
│  │  - Action Buttons                               │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 상태 표시 규칙

#### 온라인 상태
- 🟢 **온라인**: 현재 활동 중
- 🟡 **자리비움**: 15분 이상 비활동
- 🔴 **오프라인**: 로그아웃 상태
- ⚫ **비활성**: 계정 비활성화

#### 역할 뱃지
- 👔 **Admin**: 보라색 배경
- 🧪 **Tester**: 초록색 배경
- 👑 **Lead**: 금색 테두리 추가

### 반응형 디자인

#### 데스크톱 (1200px+)
- 테이블 뷰 기본
- 4열 통계 카드
- 사이드바 필터

#### 태블릿 (768px - 1199px)
- 카드 그리드 뷰
- 2열 통계 카드
- 드롭다운 필터

#### 모바일 (767px 이하)
- 카드 리스트 뷰
- 1열 통계 카드
- 접이식 필터

---

## 구현 우선순위

### Phase 1 - 핵심 기능 (2주)
**목표**: 기본적인 사용자 관리 및 모니터링 기능 구현

1. **사용자 상태 관리**
   - [ ] 온라인/오프라인 상태 표시
   - [ ] 마지막 활동 시간 추적
   - [ ] created_at, updated_at 컬럼 활용

2. **프로젝트 할당 정보**
   - [ ] 사용자별 담당 프로젝트 표시
   - [ ] project_members 테이블 연동
   - [ ] 프로젝트 참여 현황 통계

3. **테스트 수행 통계**
   - [ ] 개인별 테스트 수행량
   - [ ] Pass/Fail 비율
   - [ ] 일일/주간/월간 트렌드

4. **UI 개선**
   - [ ] 사용자 카드 디자인 개선
   - [ ] 상세 정보 모달/페이지
   - [ ] 반응형 레이아웃 최적화

### Phase 2 - 관리 기능 (3주)
**목표**: 관리자를 위한 고급 관리 기능 추가

1. **사용자 초대 시스템**
   - [ ] 이메일 초대 기능
   - [ ] 초대 링크 관리
   - [ ] 가입 승인 프로세스

2. **권한 관리**
   - [ ] 역할 변경 기능
   - [ ] 계정 활성화/비활성화
   - [ ] 프로젝트별 권한 설정

3. **활동 로그**
   - [ ] 사용자 활동 추적
   - [ ] 감사 로그 생성
   - [ ] 활동 보고서 생성

4. **데이터 내보내기**
   - [ ] Excel 내보내기
   - [ ] PDF 보고서 생성
   - [ ] CSV 다운로드

### Phase 3 - 고급 기능 (4주)
**목표**: 협업 및 성과 관리 기능 강화

1. **실시간 협업**
   - [ ] 실시간 상태 업데이트 (WebSocket)
   - [ ] 사용자 간 메시징
   - [ ] 알림 시스템

2. **성과 관리**
   - [ ] KPI 설정 및 추적
   - [ ] 테스터 랭킹 시스템
   - [ ] 뱃지/업적 시스템

3. **고급 분석**
   - [ ] 팀 생산성 분석
   - [ ] 프로젝트별 효율성 분석
   - [ ] 예측 분석 (ML)

4. **통합 기능**
   - [ ] 외부 시스템 연동 (JIRA, Slack)
   - [ ] API 제공
   - [ ] 웹훅 지원

---

## 기술 요구사항

### Frontend
- **Framework**: Next.js 15 with TypeScript
- **UI Library**: Tailwind CSS
- **State Management**: React Context API
- **Charts**: Chart.js / Recharts
- **Real-time**: Socket.io-client (Phase 3)

### Backend
- **API**: Next.js API Routes
- **Database**: PostgreSQL
- **ORM**: Prisma (추천) or raw SQL
- **Authentication**: JWT
- **Email**: Nodemailer (Phase 2)

### Database Schema Updates

```sql
-- Phase 1: 기본 필드 추가
ALTER TABLE users 
ADD COLUMN created_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN updated_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN last_login_at TIMESTAMP,
ADD COLUMN is_online BOOLEAN DEFAULT false,
ADD COLUMN profile_image VARCHAR(255),
ADD COLUMN phone VARCHAR(20),
ADD COLUMN department VARCHAR(100),
ADD COLUMN position VARCHAR(100);

-- Phase 2: 초대 시스템
CREATE TABLE user_invitations (
    invitation_id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    invited_by VARCHAR(50) REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    accepted_at TIMESTAMP
);

-- Phase 2: 활동 로그
CREATE TABLE user_activity_logs (
    log_id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id),
    action_type VARCHAR(50) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Phase 3: 성과 관리
CREATE TABLE user_performance (
    performance_id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_tests INTEGER DEFAULT 0,
    pass_count INTEGER DEFAULT 0,
    fail_count INTEGER DEFAULT 0,
    bugs_found INTEGER DEFAULT 0,
    avg_test_time INTEGER,
    performance_score DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Phase 3: 뱃지/업적
CREATE TABLE user_badges (
    badge_id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id),
    badge_type VARCHAR(50) NOT NULL,
    badge_name VARCHAR(100) NOT NULL,
    description TEXT,
    earned_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints

#### Phase 1
- `GET /api/users` - 사용자 목록 조회 ✅
- `GET /api/users/:id` - 사용자 상세 정보
- `GET /api/users/:id/projects` - 사용자 담당 프로젝트
- `GET /api/users/:id/statistics` - 사용자 통계
- `PATCH /api/users/:id/status` - 온라인 상태 업데이트

#### Phase 2
- `POST /api/users/invite` - 사용자 초대
- `GET /api/invitations` - 초대 목록
- `POST /api/invitations/:id/resend` - 초대 재발송
- `DELETE /api/invitations/:id` - 초대 취소
- `PATCH /api/users/:id/role` - 역할 변경
- `GET /api/users/:id/logs` - 활동 로그 조회

#### Phase 3
- `GET /api/users/:id/performance` - 성과 조회
- `POST /api/users/:id/badges` - 뱃지 부여
- `GET /api/rankings` - 테스터 랭킹
- `POST /api/messages` - 메시지 발송
- `GET /api/notifications` - 알림 조회

---

## 성공 지표 (KPI)

### 정량적 지표
- **사용자 관리 효율성**: 관리 작업 시간 50% 감소
- **데이터 정확도**: 실시간 상태 정확도 95% 이상
- **시스템 가용성**: 99.9% 이상 uptime
- **응답 속도**: 페이지 로딩 2초 이내

### 정성적 지표
- **사용자 만족도**: 관리자/테스터 만족도 조사
- **협업 개선**: 팀 간 소통 활성화 정도
- **업무 효율성**: 프로젝트 할당 및 관리 개선
- **데이터 활용도**: 통계 및 보고서 활용 빈도

---

## 리스크 관리

### 기술적 리스크
- **성능 이슈**: 대용량 사용자 데이터 처리
  - *대응*: 페이지네이션, 캐싱, 인덱싱 최적화
  
- **실시간 동기화**: WebSocket 연결 관리
  - *대응*: 폴링 방식 대체안 준비

### 보안 리스크
- **권한 관리**: 부적절한 권한 부여
  - *대응*: 역할 기반 접근 제어(RBAC) 구현
  
- **개인정보 보호**: 민감 정보 노출
  - *대응*: 데이터 암호화, 감사 로그

### 운영 리스크
- **사용자 저항**: 새 시스템 적응 어려움
  - *대응*: 단계적 도입, 교육 제공
  
- **데이터 마이그레이션**: 기존 데이터 이전
  - *대응*: 백업 및 롤백 계획 수립

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0 | 2025-01-15 | QA Dashboard Team | 초기 설계서 작성 |

---

## 참고 문서

- [QA 대시보드 전체 아키텍처](../architecture/SYSTEM_ARCHITECTURE.md)
- [데이터베이스 스키마](../database/SCHEMA.md)
- [API 명세서](../api/API_SPECIFICATION.md)
- [UI/UX 가이드라인](../ui/DESIGN_SYSTEM.md)

---

## 문의사항

본 문서에 대한 문의사항이나 제안사항이 있으시면 아래로 연락해주세요:

- **프로젝트 관리자**: admin@example.com
- **기술 지원**: tech@example.com
- **GitHub Issues**: [QA-Dashboard/issues](https://github.com/qa-dashboard/issues)