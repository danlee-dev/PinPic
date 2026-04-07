<div align="center">

<img src="public/poster.png" alt="PinPic Poster" width="500" />

# PinPic

**제1회 캠퍼스 사진 고연전 — 어느 캠퍼스가 더 낭만적인가?**

[![Live](https://img.shields.io/badge/Live-pinpic.vercel.app-black?style=for-the-badge&logo=vercel&logoColor=white)](https://pinpic.vercel.app)

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%2B%20Auth%20%2B%20Realtime-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com/)

---

연세대와 고려대 학생들이 직접 촬영한 캠퍼스 사진으로 대결하는 모바일 우선 사진 투표 플랫폼.
단순한 투표 사이트를 넘어 **추천 알고리즘 / 어뷰징 방어 / 페이크 도어 가설 검증 / 측정 파이프라인**까지
한 페이지에 모두 녹였다.

</div>

---

## 목차

- [한 줄 요약](#한-줄-요약)
- [핵심 기능](#핵심-기능)
- [아키텍처](#아키텍처)
- [기술 스택](#기술-스택)
- [디렉토리 구조](#디렉토리-구조)
- [데이터 모델](#데이터-모델)
- [클라이언트 API 레이어](#클라이언트-api-레이어)
- [서버 API 라우트](#서버-api-라우트)
- [피드 추천 알고리즘](#피드-추천-알고리즘)
- [결과 발표 모드](#결과-발표-모드)
- [페이크 도어 가설 검증](#페이크-도어-가설-검증)
- [측정 체계](#측정-체계)
- [Google Sheets 동기화](#google-sheets-동기화)
- [개발 중 만난 주요 이슈](#개발-중-만난-주요-이슈)
- [Getting Started](#getting-started)
- [상세 문서](#상세-문서)
- [License](#license)

---

## 한 줄 요약

> "투표 단계 → 결과 발표 단계 → 가설 검증 단계"의 3-stage 라이프사이클을 갖는 이벤트형 PWA. 각 단계마다 별도의 UI 모드와 별도의 측정 데이터, 별도의 어드민 화면이 살아 움직인다.

---

## 핵심 기능

### 사용자 측 (투표 단계)

- **Masonry Gallery** — `aspect_ratio` 기반 동적 컬럼 분배. 가장 짧은 컬럼에 다음 카드 push로 자연스러운 배치
- **Google OAuth 로그인** — Supabase Auth, 한 클릭 로그인
- **실시간 투표** — Supabase Realtime postgres_changes로 다른 사용자 투표가 즉시 반영
- **투표 기간 제어** — 어드민이 시작/종료 시각 설정, 기간 외엔 안내 + 투표 비활성화
- **추천 / 랜덤 / 최신순 정렬** — 추천 모드는 자체 알고리즘 (아래 [피드 추천 알고리즘](#피드-추천-알고리즘) 참조)
- **학교 필터 + 검색** — 닉네임 / 동아리 검색, 고대/연대 단독 보기
- **개인화** — 이미 투표한 사진은 점수 60% 감소로 피드 하단으로 자연스럽게 밀어냄
- **개별 사진 페이지** — `/photo/[id]` SSR 페이지, OG 이미지 자동 생성, 네이티브 share API 워터마크 포함

### 사용자 측 (결과 발표 단계)

발표 시각 (`app_settings.result_announcement.reveal_at`)이 지나면 클라이언트 전체가 reveal 모드로 전환:

- **피드 hero 카운트업** — 총 투표수 / 출품작 / 참여자 3종이 stagger로 등장 + pop 효과
- **명예의 전당 탭** (`stats` 탭의 변신) — Hall of Fame 헤더 + canvas-confetti 폭죽
- **TOP 1~3 가로 carousel** — 2.5초 자동 로테이션, 손가락 swipe 시 일시정지 후 nearest snap
- **TOP 4~10 masonry** — 짧은 컬럼 우선 배치
- **잠긴 메타데이터** — 사진 위에 촬영지/카메라/렌즈/세팅값 등이 blur로 표시 → "어떻게 찍었는지 알고 싶다"는 호기심 유발
- **페이크 도어 CTA** — 카드, 명예의 전당 inline bar, photo modal 세 곳에 노출
- **학교별 공정 노출** — Stride Scheduling으로 비율 균등 인터리브

### 어드민 측

- **승인 대기 / 사진 관리** — 폼 제출 사진 승인·거절·삭제, 검색
- **관심도 탭** — `투표` / `결과` / `분석` 3-way segmented control
  - **투표**: 사진별·사용자별 조회·클릭·전환율 + 페이지네이션
  - **결과**: 페이크 도어 단계별 카운터 (로그인/비로그인 분리), 4개 source funnel, 사진별·사용자별, 사전신청 이메일, 최근 클릭 raw 로그
  - **분석**: source funnel 3종, 투표자 vs 비투표자 cohort 비교, 사진별 자극도, 시간대별 분포, 최근 사전신청 이메일
- **원본 순위** — `vote_overrides`로 표시 순위를 조작했더라도 진짜 votes 카운트 기준의 실 데이터를 항상 확인 가능
- **결과 발표 미리보기 토글** — 어드민 본인에게만 발표 화면이 보이는 localStorage 기반 토글
- **관리자 계정 관리** — 다른 사용자를 어드민으로 추가/제거

### 데이터 파이프라인

- **Google Forms → Apps Script → Supabase** — 폼 제출 → Drive 이미지 → 자동 썸네일 + 비율 계산 → Storage 업로드 → DB insert → 어드민 이메일 알림
- **Supabase → Apps Script → Google Sheets** — 측정 raw 데이터를 12개 시트로 자동 동기화 (시간 트리거)

---

## 아키텍처

```text
┌────────────────────┐    ┌─────────────────────┐    ┌──────────────────┐
│   Google Forms     │───▶│ Google Apps Script  │───▶│  Supabase        │
│  (사진 업로드)      │    │ (썸네일 생성, 업로드) │    │  Storage + DB    │
└────────────────────┘    └─────────────────────┘    └──────────────────┘
                                     │                        │
                                     ▼                        │
                              관리자 알림 메일                   │
                                                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                    Next.js 15 App Router (Vercel)                  │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Feed (피드)   │  │ Hall of Fame │  │ Admin Panel  │              │
│  │              │  │  (결과 발표)   │  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│         │                  │                  │                    │
│         └──────────────────┴──────────────────┘                    │
│                            │                                       │
│                  Client SDK + API Routes                           │
│                            │                                       │
└────────────────────────────┼───────────────────────────────────────┘
                             ▼
              ┌─────────────────────────┐
              │  Supabase               │
              │  - PostgreSQL           │
              │  - Auth (Google OAuth)  │
              │  - Realtime             │
              │  - Storage              │
              │  - RLS                  │
              └─────────────────────────┘
                             │
                             ▼
              ┌─────────────────────────┐
              │  Google Sheets          │
              │  (Apps Script sync)     │
              └─────────────────────────┘
```

---

## 기술 스택

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15 (App Router), React 19, TypeScript 5 |
| Styling | Tailwind CSS 4, custom CSS (Bebas Neue rank font) |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (Google OAuth) |
| Realtime | Supabase Realtime (`postgres_changes`) |
| Storage | Supabase Storage (photos + thumbs 버킷) |
| Confetti | `canvas-confetti` |
| Server | Next.js API Routes + Supabase Service Role |
| Deployment | Vercel |
| Data Pipeline | Google Forms → Apps Script → Supabase → Apps Script → Sheets |
| Analytics | GA4 + 자체 측정 테이블 (`photo_views`, `photo_clicks`, `photo_modal_opens`, `fake_door_clicks`, `waitlist`) |

---

## 디렉토리 구조

```text
web/
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── api/admin/             # 어드민 전용 API 라우트
│   │   │   ├── add-admin/
│   │   │   ├── delete-photo/
│   │   │   └── user-emails/
│   │   ├── photo/[id]/            # 개별 사진 페이지 + OG 이미지
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/                # UI 컴포넌트
│   │   ├── masonry-gallery.tsx    # 피드 본체
│   │   ├── photo-card.tsx
│   │   ├── photo-modal.tsx
│   │   ├── vote-stats.tsx         # 명예의 전당 + Hall of Fame 카드
│   │   ├── fake-door-modal.tsx    # 페이크 도어 3-step 모달
│   │   ├── admin-panel.tsx        # 어드민 패널 + 분석
│   │   ├── confetti-burst.tsx
│   │   ├── count-up.tsx
│   │   └── ...
│   ├── lib/                       # 도메인 로직
│   │   ├── api.ts                 # 클라이언트 -> Supabase 호출
│   │   ├── admin.ts               # 어드민 전용 fetch + 분석 helper
│   │   ├── waitlist.ts            # 페이크 도어 사전신청 join
│   │   ├── analytics.ts           # GA4 trackEvent 래퍼
│   │   ├── reveal-preview.ts      # 어드민 미리보기 토글 (localStorage)
│   │   └── types.ts
│   └── utils/supabase/            # Supabase 클라이언트 팩토리
├── scripts/
│   ├── google-apps-script.js      # 폼 제출 → Supabase 업로드
│   └── analytics-sync.js          # Supabase → Google Sheets 동기화
├── docs/
│   ├── feed-ranking-algorithm.md  # 피드 알고리즘 상세
│   ├── measurement-and-analytics.md  # 측정 체계 상세
│   ├── issues-and-solutions.md    # 운영 중 이슈 회고
│   └── troubleshooting.md         # 운영 트러블슈팅 노트
└── README.md
```

---

## 데이터 모델

### 핵심 테이블

| Table | 용도 |
| --- | --- |
| `photos` | 사진 데이터 (`image_url`, `thumb_url`, `nickname`, `club`, `school`, `aspect_ratio`, `status`, `location`) |
| `votes` | 투표 기록 (`photo_id`, `voter_id`, `created_at`). 같은 voter는 같은 사진에 1번만 |
| `admins` | 관리자 계정 (`user_id`, `email`) |
| `app_settings` | 키-값 설정 (`voting_period`, `result_announcement`) |

### 측정 테이블

| Table | 용도 |
| --- | --- |
| `photo_views` | 사진 모달 열림과 무관하게 카드가 viewport에 들어온 노출 (세션 dedup) |
| `photo_clicks` | photo modal 안 "촬영 스팟 및 설정값 보기" 티저 버튼 클릭 |
| `photo_modal_opens` | 사진 카드를 탭해서 photo modal이 열리는 시점. `source` = `feed` 또는 `hall_of_fame` |
| `fake_door_clicks` | 결과 발표 단계 페이크 도어의 모든 단계 (CTA 클릭 / pitch_continue / email_submit). `source` 컬럼으로 어느 진입점인지 구분 |
| `waitlist` | 사전 신청 이메일 (`email`, `user_id`, `product_id`, `source`) |

### 조작/표시 분리 테이블

| Table | 용도 |
| --- | --- |
| `vote_overrides` | 표시상의 vote count 조작을 위한 offset (`photo_id`, `vote_offset`). 진짜 `votes` 테이블은 그대로 두고, 명예의 전당 화면에서만 `votes + offset`으로 정렬 |

### Views (조회 편의)

| View | 정의 |
| --- | --- |
| `photos_with_votes` | `photos` + `votes` count (raw, override 미적용) — 피드, 미니바, 통계가 사용 |
| `photos_with_real_votes` | 위와 동일하지만 `vote_offset` 컬럼도 같이 노출 — 어드민 원본 순위 탭이 사용 |
| `photos_admin_all` | 모든 status (pending/approved/rejected) 포함 — 어드민이 사용 |
| `engagement_totals`, `engagement_by_photo` | 관심도 탭의 집계 view (DB 단에서 계산해 1000행 limit 회피) |
| `engagement_by_user` (RPC) | 사용자별 집계 |

### RLS 정책 요약

| Table | insert | select |
| --- | --- | --- |
| `votes` | 누구나 (1인 1표 unique 제약) | 누구나 |
| `photo_views` / `photo_clicks` / `photo_modal_opens` / `fake_door_clicks` / `waitlist` | 누구나 (비로그인 포함) | **어드민만** |
| `vote_overrides` | 어드민만 | 누구나 (view에서 JOIN해야 함) |
| `app_settings` | 어드민만 | 누구나 |

---

## 클라이언트 API 레이어

**`src/lib/api.ts`** — 일반 사용자가 사용하는 SDK 래퍼

| Function | 역할 |
| --- | --- |
| `fetchPhotos(page, pageSize=20)` | 페이드 페이지 단위 로드 (`photos_with_votes`) |
| `fetchVoteOverrides()` | 명예의 전당 표시값 조정용 offset map |
| `fetchTotalVoters()` | 피드 hero 카운트업용 unique voter 수 |
| `fetchAllVoteTimes()` | 모든 votes의 timestamp (어뷰징 알고리즘 입력) |
| `fetchMyVotedIds()` | 로그인 사용자가 투표한 사진 id set |
| `voteForPhoto(id)` / `unvotePhoto(id)` | 투표 / 취소 |
| `recordPhotoView(id)` | 모달과 무관하게 카드 노출 기록 |
| `recordPhotoClick(id)` | photo modal 안 티저 버튼 클릭 기록 |
| `recordPhotoModalOpen({photoId, source})` | photo modal 열림 (source = `feed` / `hall_of_fame`) |
| `recordFakeDoorClick({photoId?, source})` | 페이크 도어 모든 단계 |

**`src/lib/waitlist.ts`** — 사전신청 join + position 조회

**`src/lib/admin.ts`** — 어드민 전용 (RLS로 일반 사용자는 어차피 못 부름)

| Function | 역할 |
| --- | --- |
| `checkIsAdmin()` | 현재 사용자 어드민 여부 |
| `fetchVotingPeriod()` / `updateVotingPeriod()` | 투표 기간 |
| `fetchResultAnnouncement()` / `updateResultAnnouncement()` / `isResultRevealed()` | 결과 발표 시각 + 판정 |
| `fetchPendingPhotos()` / `fetchAllPhotosAdmin()` | 어드민 사진 리스트 |
| `approvePhoto()` / `rejectPhoto()` / `deletePhoto()` | 사진 상태 변경 |
| `fetchAdmins()` / `addAdmin()` / `removeAdmin()` | 관리자 계정 |
| `fetchEngagementStats()` | 투표 단계 stats (조회/클릭/전환율) |
| `fetchFakeDoorStats()` | 결과 단계 페이크 도어 단순 카운트 (소스/사진/유저별) |
| `fetchResultStats()` | 결과 단계 풍부한 stats (단계별 로그인/비로그인, 4 source funnel, 사진/유저, recent waitlist, recent clicks). 어드민 self-traffic 자동 필터 |
| `fetchAnalyticsInsights()` | 종합 분석용 (3 source funnel, voter cohort, 사진별 자극도, hourly, recent emails) |
| `fetchOriginalRanking()` | 조작된 표 수치와 무관한 진짜 votes 기준 순위 |

---

## 서버 API 라우트

`src/app/api/admin/*` 아래 — 모두 service role key를 사용하므로 어드민 인증 검사 후 동작.

| Route | Method | 역할 |
| --- | --- | --- |
| `/api/admin/add-admin` | POST | 다른 사용자를 admins 테이블에 추가 |
| `/api/admin/delete-photo` | POST | 사진 + Storage 객체 삭제 |
| `/api/admin/user-emails` | POST | user_id 배열 → email 매핑 (Auth admin API page 페이지네이션) |

---

## 피드 추천 알고리즘

> 상세: [`docs/feed-ranking-algorithm.md`](docs/feed-ranking-algorithm.md)

```text
score = (
    wilson      * 0.35
  + time_boost  * 0.20
  + exploration * 0.25
  + mid_boost   * 0.20
) * velocity_penalty * voted_demote * jitter
```

| 요소 | 역할 |
| --- | --- |
| **Wilson Score Lower Bound** | 95% 신뢰구간 하한. 좋아요 수가 적어도 통계적으로 공정한 평가 |
| **Time Decay** | 반감기 24시간. 새 사진에 초기 노출 보장 |
| **Exploration Bonus + Quality Gate** | 좋아요 적은 사진에 발견 기회 부여. 단, 6시간 이후에도 평균 30% 이하면 quality gate가 보너스를 70%까지 감쇠 (지속 노출 방지) |
| **Mid-tier Boost** | 평균 부근 좋아요(예: 평균의 0.5~1.5배)에 가우시안 부스트. 양 끝(인기/신규)이 유리한 구조에서 중간층 보호 |
| **Peak Velocity Penalty** | 1시간 슬라이딩 윈도우의 최대 투표 수(`peak_velocity`)를 영구 기록. 시간이 지나도 패널티가 풀리지 않고, **정상 페이스의 추가 투표가 누적되어야** 점진 회복. 최대 80%까지만 회복(어뷰징 이력은 절대 완전 사라지지 않음). 이 결정은 단톡방 동원 어뷰징을 잡기 위함 |
| **Voted Demote** | 이미 투표한 사진의 점수 60% 감소 (개인화) |
| **Random Jitter** | 세션별 ±15% 변동. 같은 시각 같은 데이터라도 매번 약간 다른 피드 |

추가로 "전체" 학교 필터에서는 **Stride Scheduling**으로 학교별 카드를 비율 균등 인터리브 (사진 수 많은 학교가 상위 독점하지 않게).

---

## 결과 발표 모드

`reveal_at` 시각이 지나면 자동으로 활성화. 어드민은 `reveal-preview.ts`의 localStorage 토글로 본인만 미리 볼 수 있음.

### 변하는 것들

- **피드 hero**: 카운트업 3종(총 투표수/출품작/참여자) + "결과가 발표됐어요" 헤드라인 + 펄스 CTA
- **stats 탭**: "투표율" → "명예의 전당"으로 라벨 변경 + Hall of Fame 카드 + confetti
- **photo modal**: 발표 후엔 location 노출하지 않음 (페이크 도어 의도 유지). 모든 사진에 ₩990 페이크 도어 버튼 노출 (어떤 사진이 top 10인지 가리려는 의도)
- **inline CTA bar**: 명예의 전당 헤더 위에 큰 그라데이션 pill — "TOP 10 비밀 (장소·세팅값) 전부 열기"

### 표시 vs 진짜 데이터 분리

발표 직전 어뷰징 흔적 등 표시 순위를 조작해야 할 때를 위해 **표시값과 원본을 완전히 분리**:

- 명예의 전당 = `votes + vote_overrides.vote_offset`
- 그 외 모든 곳 (피드, 미니바, 통계, 어드민 원본 순위) = 진짜 votes 카운트
- 새로운 진짜 투표가 들어오면 양쪽 모두 자동 반영

---

## 페이크 도어 가설 검증

### 검증 가설

> **"출품자(특히 자기 사진에 대한 정보를 원하는 사람)는 정보재에 990원이라는 임계 가격에서 의미 있는 결제 의향을 보일 것이다."**

### 흐름

1. 사용자가 카드를 탭 → photo modal 열림 (`photo_modal_opens` 기록)
2. 모달 안 또는 명예의 전당 카드 안의 **TOP 10 비밀 전부 열기 ₩990** 버튼 클릭 (`fake_door_clicks` source = `photo_modal` / `inline_card_*` / `inline_bar`)
3. **FakeDoorModal** 열림 — 가치 제안 + "990원에 사전신청 하기"
4. 클릭 → email 입력 단계 (`fake_door_clicks` source = `..._pitch_continue`)
5. 이메일 제출 → 성공 화면 (`fake_door_clicks` source = `..._email_submit`, `waitlist` 저장)

각 단계마다 `photo_id`, `user_id` (로그인 시), `created_at`, `source` 기록 → 어떤 사용자가 어떤 사진에서 어디까지 진행했는지 완전 재구성 가능.

### 윤리

- "결제 완료" 같은 거짓 문구 금지
- 결제 정보 안 받음 (이메일 한 줄만)
- 사전 신청자에게는 후속 메일에서 솔직 reveal + 약속 이행

### 임계값

| Overall CR (이메일/모달열림) | 해석 |
| --- | --- |
| ≥ 5% | 가설 강하게 지지 → 정식 MVP 착수 |
| 2~5% | 약하게 지지 → 카피·UI 개선 후 재실험 |
| < 2% | 가설 기각 → 다른 monetization 모델 탐색 |

---

## 측정 체계

> 상세: [`docs/measurement-and-analytics.md`](docs/measurement-and-analytics.md)

### 어드민 패널 → 관심도 탭의 3개 서브탭

#### 1. `투표`

- 전체 통계 카드 (총 조회수 / 스팟 클릭 / 전환율)
- unique viewer / clicker / 미클릭자
- 로그인 vs 비로그인 split
- 사진별 / 사용자별 (검색 + 정렬 + 페이지네이션)

#### 2. `결과`

- 단계별 카운터 6개 (모달열기, 페이크도어 클릭, inline bar 클릭, pitch_continue, email_submit, waitlist) — **각각 로그인/비로그인/유니크 분리**
- 4개 source funnel (피드 → 모달 → 사전신청 / 명예의 전당 → 모달 → 사전신청 / inline bar → 사전신청 / TOP10 카드 unlock → 사전신청)
- 사진별 (열림/클릭/제출), 사용자별 (페이지네이션)
- 사전신청 이메일 (페이지네이션)
- 최근 페이크 도어 활동 raw 로그 (페이지네이션)

#### 3. `분석`

- 한 줄 헤드라인 (overall CR + waitlist 카운트)
- 3 source funnel 비교 (피드 / 명예의 전당 / inline CTA)
- **투표자 vs 비투표자 코호트** (로그인 사용자 한정) — 참여도와 WTP의 상관 관계
- 사진별 사전신청 자극도 (modalOpens 대비 fakeDoorClicks 비율)
- 시간대별 분포 (1시간 bucket)
- 사전신청 이메일 raw

### 어드민 self-traffic 필터링

`fetchResultStats`와 `fetchAnalyticsInsights` 둘 다 `admins` 테이블의 `user_id`를 set으로 만들어 자기 자신 클릭은 카운트에서 제외. 진짜 사용자 데이터만 분석 화면에 표시.

### 페이지네이션

- **DB → 클라이언트**: `fetchAllRows` 헬퍼가 1000행씩 offset 페이지네이션 (Supabase REST 1000 limit 회피)
- **UI**: 모든 리스트는 페이지당 10개, `Pagination` 컴포넌트로 1·2·3 버튼

---

## Google Sheets 동기화

`scripts/analytics-sync.js`를 Apps Script로 실행하면 시간 트리거로 다음 시트들이 자동 갱신:

| 시트 | 내용 |
| --- | --- |
| **전체 통계** | 총 조회수 / 총 스팟 클릭수 / 전환율 |
| **사진별** | 사진별 조회·클릭·전환율 |
| **사용자별** | 사용자별 조회·클릭·전환율 |
| **조회 로그** | photo_views raw |
| **클릭 로그** | photo_clicks raw |
| **페이크도어 전체** | 총 클릭 / 로그인 / 비로그인 / 사진 수 |
| **페이크도어 소스별** | source별 카운트 |
| **페이크도어 사진별** | 사진별 페이크 도어 클릭 |
| **페이크도어 사용자별** | 사용자별 페이크 도어 클릭 |
| **페이크도어 로그** | fake_door_clicks raw |
| **모달 열기 로그** | photo_modal_opens raw |
| **모달열기 소스별** | feed vs hall_of_fame |

`fetchTable` 함수가 1000행씩 offset 페이지네이션이라 데이터가 아무리 많아도 누락 없음.

---

## 개발 중 만난 주요 이슈

> 상세: [`docs/issues-and-solutions.md`](docs/issues-and-solutions.md)

### 1. 페이지네이션 미적용으로 인한 데이터 누락 (3차례 반복)

- **1차**: Auth API `listUsers()` 기본 50명 → 유저 50명 초과 시 이메일 유실
- **2차**: 클라이언트에서 `photo_views` 직접 집계 → 1000행 limit
- **3차**: Apps Script `fetchTable`이 1000행만 fetch → 스프레드시트 조회수가 1000에 멈춤

해결: page/offset 페이지네이션 + 가능한 곳은 DB 뷰/RPC로 집계 이전.

### 2. 이미지 로딩 느림

- 원본 이미지 직접 로드(2~5MB) → 피드 100MB+ 트래픽
- **해결**: 800px 썸네일 자동 생성, 피드는 thumb, 모달은 원본
- 4.5MB 포스터 PNG → WebP 350KB로 압축 (92% 절감)

### 3. 단순 정렬의 한계

- 랜덤/최신순만으로는 좋아요 동기 부여 X
- **해결**: Wilson Score 기반 추천 알고리즘 도입 (위 알고리즘 섹션)

### 4. 단톡방 어뷰징

- 한 참가자가 시간당 31표를 받는 비정상적 급등 발견
- **해결**: Peak Velocity Penalty (영구 추적, 정상 투표로만 점진 회복, 최대 80%까지)

### 5. 비인기 사진 상단 고착

- Exploration 보너스 단독 → 좋아요 0개 사진이 계속 위에 머무름
- **해결**: Quality Gate (6시간 이후 평균 30% 미달이면 보너스 감쇠)

### 6. 표시 데이터 vs 분석 데이터의 일관성 문제

- 가설 검증을 위해 표시 순위 조작이 필요한데, 진짜 데이터까지 망가뜨리면 분석 불가
- **해결**: `vote_overrides` 테이블로 offset만 따로 관리, 표시는 view에서만 합산, 어드민의 원본 순위 탭은 항상 raw

### 7. Carousel 자동 스크롤 시 페이지가 위로 점프

- `scrollIntoView` + browser scroll-anchoring이 vertical scroll까지 끌어당김
- **해결**: `scrollIntoView` 대신 `el.scrollTo({ left })`로 horizontal만, body와 컨테이너에 `overflow-anchor: none`

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
cp .env.example .env.local
# NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=eyJ...
# SUPABASE_SERVICE_ROLE_KEY=eyJ...                  # 서버 전용
# NEXT_PUBLIC_GA_ID=G-XXXXXXX                        # (선택) GA4

# 3. Run dev server
npm run dev
```

### Apps Script 설정

1. 폼 → 확장프로그램 → Apps Script
2. `scripts/google-apps-script.js` 붙여넣고 `SUPABASE_URL`, `SUPABASE_SECRET_KEY` 설정
3. 트리거: "양식 제출 시 → onFormSubmit"

### Sheets 동기화 설정

1. "PinPic 집계" 스프레드시트 → 확장프로그램 → Apps Script
2. `scripts/analytics-sync.js` 붙여넣고 키 설정
3. 트리거: "시간 기반 → 매 5~10분 → syncAnalytics"

---

## 상세 문서

| 문서 | 내용 |
| --- | --- |
| [`docs/feed-ranking-algorithm.md`](docs/feed-ranking-algorithm.md) | 피드 추천 알고리즘 전체 수식, 가중치, 시나리오 분석 |
| [`docs/measurement-and-analytics.md`](docs/measurement-and-analytics.md) | 측정 체계, 어드민 화면 매핑, 가설 검증 방법론 |
| [`docs/issues-and-solutions.md`](docs/issues-and-solutions.md) | 개발 중 발생한 주요 이슈와 해결 (페이지네이션, 이미지, 어뷰징 등) |
| [`docs/troubleshooting.md`](docs/troubleshooting.md) | 운영 중 트러블슈팅 노트 |

---

## License

MIT
