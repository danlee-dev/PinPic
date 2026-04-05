<div align="center">

<img src="public/poster.png" alt="PinPic Poster" width="500" />

# PinPic

**제1회 캠퍼스 사진 고연전 -- 어느 캠퍼스가 더 낭만적인가?**

[![Live](https://img.shields.io/badge/Live-pinpic.vercel.app-black?style=for-the-badge&logo=vercel&logoColor=white)](https://pinpic.vercel.app)

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%2B%20Storage-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com/)

---

연세대와 고려대, 양교 학생들이 직접 촬영한 캠퍼스 사진으로 대결하는 온라인 사진 투표 플랫폼

</div>

## Features

- **Masonry Gallery** - aspect ratio 기반 동적 컬럼 분배
- **Real-time Voting** - Google OAuth 로그인 후 투표, 실시간 집계
- **Photo Sharing** - 개별 사진 페이지 (/photo/[id]) + 네이티브 공유
- **Vote Stats** - 학교별 투표 현황, 인기 순위 대시보드
- **Search & Filter** - 닉네임/동아리 검색, 학교별 필터
- **Thumbnail Optimization** - Google Apps Script로 자동 썸네일 생성

## Architecture

```
Google Forms --> Google Apps Script --> Supabase Storage (photos)
                                   --> Supabase DB (photos table)

User --> Next.js (Vercel) --> Supabase Auth (Google OAuth)
                          --> Supabase DB (votes table)
                          --> Supabase Storage (images)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage |
| Auth | Supabase Auth (Google OAuth) |
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

# Run dev server
npm run dev
```

## License

MIT
