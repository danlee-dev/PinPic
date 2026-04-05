# Troubleshooting Log

## React Error #310 - 로그인 시 페이지 크래시

### 증상
- 배포 환경(Vercel)에서 구글 로그인하는 순간 "This page couldn't load" 표시
- 콘솔에 `Minified React error #310` 출력
- 로컬 dev 환경에서는 발생하지 않음

### 원인
`UserButton` 컴포넌트에서 React hook이 조건부 early return **이후에** 선언되어 있었음.

```tsx
// 문제 코드
export function UserButton() {
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  if (!user) return <로그인 버튼/>;  // early return

  // 이 hook들은 user가 있을 때만 실행됨
  const btnRef = useRef(null);           // hook 2
  const [menuPos, setMenuPos] = useState({});  // hook 3
  useEffect(() => { ... }, []);          // hook 4
}
```

- 로그인 전: hook 1개 (useState)
- 로그인 후: hook 4개 (useState + useRef + useState + useEffect)
- React는 hook을 호출 순서로 식별하는데, 렌더링마다 hook 개수가 달라지면 내부 상태 매핑이 깨짐

### 왜 로컬에서는 발생하지 않았는가
- React dev 모드: hook 규칙 위반을 경고로 처리하고 실행 계속
- React production 모드 (minified): hook 순서 불일치 시 즉시 크래시 (error #310)

### 해결
모든 hook을 컴포넌트 최상단, early return 이전으로 이동.

```tsx
// 수정 코드
export function UserButton() {
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const btnRef = useRef(null);           // early return 전에 선언
  const [menuPos, setMenuPos] = useState({});
  useEffect(() => { ... }, []);

  if (!user) return <로그인 버튼/>;  // hook 이후에 early return
  // ...
}
```

### 교훈
- React hook은 항상 동일한 순서, 동일한 횟수로 호출되어야 함
- 조건부 return 전에 모든 hook을 선언할 것
- production 배포 전에 `eslint-plugin-react-hooks`의 `rules-of-hooks` 규칙을 활성화할 것

---

## Supabase GoTrue 충돌 - Multiple GoTrueClient instances

### 증상
- 콘솔에 "Multiple GoTrueClient instances detected in the same browser context" 경고
- WebSocket 연결 실패 경고

### 원인
Supabase Realtime용으로 별도의 `createClient`를 호출하면 GoTrue(인증) 클라이언트가 추가로 생성됨. 두 GoTrue 인스턴스가 같은 localStorage 키(`sb-xxx-auth-token`)를 두고 경쟁.

### 해결
- 기존 Supabase 클라이언트를 publishable 키에서 **anon 키로 전환**
- 하나의 클라이언트로 Auth + DB + Realtime을 모두 처리
- 별도 Realtime 클라이언트 불필요

```
// .env.local
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  // anon key (JWT 기반, Realtime 지원)
```

### 참고
- `sb_publishable_` 키: Supabase의 새로운 형식, Realtime WebSocket 미지원
- `anon` 키 (JWT): 기존 형식, Auth + DB + Realtime 모두 지원

---

## Supabase admins 테이블 406 에러

### 증상
- 관리자가 아닌 유저가 로그인하면 콘솔에 406 에러
- `GET /rest/v1/admins?select=id&user_id=eq.xxx` 요청 실패

### 원인
`checkIsAdmin()` 함수에서 `.single()` 사용. 결과가 0개일 때 `.single()`은 에러를 throw함.

### 해결
`.single()` -> `.maybeSingle()` 변경. 결과 없으면 에러 대신 `null` 반환.

```tsx
// before
const { data } = await supabase.from("admins").select("id").eq("user_id", user.id).single();

// after
const { data } = await supabase.from("admins").select("id").eq("user_id", user.id).maybeSingle();
```

---

## Google Apps Script - 썸네일 생성 실패

### 증상
- `DriveApp.createFile` 권한 에러
- 메일 알림 미발송

### 원인
1. Apps Script에서 Drive API 권한 미승인
2. `SUPABASE_SECRET_KEY`가 publishable 키로 설정되어 있어 admins 테이블 조회(RLS) 불가

### 해결
1. Apps Script 편집기에서 `onFormSubmit` 함수 수동 실행 -> 권한 승인 팝업에서 승인
2. `SUPABASE_SECRET_KEY`를 service role 키로 변경 (RLS 우회 가능)
