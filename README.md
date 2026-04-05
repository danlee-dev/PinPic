<div align="center">

<img src="public/poster.png" alt="PinPic Poster" width="500" />

# PinPic

**제1회 캠퍼스 사진 고연전 -- 어느 캠퍼스가 더 낭만적인가?**

[![Live](https://img.shields.io/badge/Live-pinpic.vercel.app-black?style=for-the-badge&logo=vercel&logoColor=white)](https://pinpic.vercel.app)

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%2B%20Auth%20%2B%20Realtime-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com/)

---

연세대와 고려대, 양교 학생들이 직접 촬영한 캠퍼스 사진으로 대결하는 온라인 사진 투표 플랫폼

</div>

## Features

- **Masonry Gallery** - aspect ratio 기반 동적 컬럼 분배, seeded Fisher-Yates 랜덤 셔플
- **Real-time Voting** - Google OAuth 로그인 후 투표, Supabase Realtime으로 실시간 반영
- **Voting Period** - 관리자가 설정한 기간에만 투표 가능, 기간 외 안내 표시
- **Photo Sharing** - 개별 사진 페이지 (/photo/[id]) + 네이티브 공유
- **Vote Stats** - 학교별 투표 현황, 애니메이션 게이지 바
- **Search & Filter** - 닉네임/동아리 검색, 학교별 필터, 정렬
- **Admin Panel** - 사진 승인/거절/삭제, 투표 기간 설정, 관리자 계정 관리
- **Photo Approval** - 구글 폼 제출 시 대기 상태로 등록, 관리자 승인 후 공개
- **Admin Notifications** - 새 사진 제출 시 관리자 이메일 알림
- **Thumbnail Optimization** - Google Apps Script로 자동 썸네일 생성 + 실제 비율 계산

## Architecture

```
Google Forms --> Google Apps Script --> Supabase Storage (photos + thumbs)
                                   --> Supabase DB (photos, status: pending)
                                   --> Email notification to admins

User --> Next.js (Vercel) --> Supabase Auth (Google OAuth)
                          --> Supabase DB (votes, photos, admins, app_settings)
                          --> Supabase Realtime (live vote updates)
                          --> Supabase Storage (images)

Admin --> Admin Panel --> Approve/Reject/Delete photos
                     --> Set voting period
                     --> Manage admin accounts
```

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Database | Supabase (PostgreSQL) |
| Realtime | Supabase Realtime (postgres_changes) |
| Storage | Supabase Storage |
| Auth | Supabase Auth (Google OAuth) |
| Admin API | Next.js API Routes + Supabase Service Role |
| Deployment | Vercel |
| Data Pipeline | Google Forms + Apps Script |

## Getting Started

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_key
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Run dev server
npm run dev
```

## Database Schema

| Table | Description |
| ----- | ---------- |
| photos | 사진 데이터 (image_url, thumb_url, nickname, school, aspect_ratio, status) |
| votes | 투표 기록 (photo_id, voter_id) |
| admins | 관리자 계정 (user_id, email) |
| app_settings | 앱 설정 (voting_period 등) |

**Views:** `photos_with_votes` (approved only), `photos_admin_all` (all statuses)

## License

MIT
