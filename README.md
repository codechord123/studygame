# 📚 스터디 게임 (Study Game)

문제를 **디지털로 변환 → 풀이 → 즉시 채점 → 오답노트**까지 이어지는 학습 프로그램.
단순한 문제 풀이가 아니라 **게임 요소**(포인트·레벨·뱃지·콤보·펫·랭킹)를 결합해
초등학생이 재미있게 반복 학습하도록 만드는 것이 목표.

> 첫 예제 단원: **수학 5-1 / 5단원 분수의 덧셈과 뺄셈 (심화)**
> 단, 시스템은 수학에 한정되지 않고 어떤 과목·문제 유형도 담을 수 있게 설계됨.

---

## 지금 동작하는 것 (MVP)

웹앱(React + Vite + TypeScript)으로 핵심 학습 루프가 실제로 돕니다.

- **두 가지 학습 방식** — 📖 **학습 모드**(타이머 없이, 제출하면 정답·풀이를 확인하고 직접 넘김) / ⚡ **도전 모드**(가변 타이머·콤보·속도 보너스)
- **문제 풀이 화면** — 객관식 / 주관식 / 빈칸채우기 / OX 4가지 유형 지원 (국어·수학·사회 등 과목 무관)
- **즉시 채점 + 친절한 피드백** — 틀리면 **정답을 함께 표시**하고 풀이를 보여줌. 분수는 유리수로 비교해 `13/10`·`1과 3/10`·`1와 3/10` 을 같은 답으로 인정, 약분이 안 된 정답엔 기약분수 안내
- **분수 입력 안내** — 수학 문제는 "분자/분모, 대분수는 1과 3/10" 형식 가이드 표시
- **적응형 출제** — 학습 모드는 이전에 틀린 문제를 먼저, 도전 모드는 셔플
- **게임 요소**
  - 포인트(XP) + 레벨 + 경험치 바
  - 연속 정답 **콤보 배수**(최대 x3)와 **타이머 속도 보너스**
  - **뱃지** 획득(첫 정답, 5콤보, 올백, 레벨5, 문제 사냥꾼…)
  - **펫 성장**(레벨에 따라 🥚→🐣→…→🐉)
  - 코인 재화(추후 펫 꾸미기용)
- **오답노트** — 틀린 문제 자동 적립, 해설 표시, "다시 풀기"로 재도전 → 맞히면 해결 처리
- **AI 문제 만들기** — 학습지/시험지 **사진 업로드 → Claude 비전이 문제로 자동 변환** → 미리보기 → 바로 학습
- **게임 확장**
  - **펫 상점** — 코인으로 꾸미기(리본·왕관·마법사모자…) 구매·착용, HUD 펫에 반영
  - **일일 미션** — "오늘 10문제", "5콤보" 등 진행도 추적 + 코인 보상(매일 0시 초기화)
  - **랭킹 보드** — 최고 점수 기준 순위(현재 로컬 모의 데이터)
- **저장** — 진행도/오답노트/코인/꾸미기를 브라우저에 영속화 (localStorage)

### 실행

```bash
npm install
npm run dev      # 프런트엔드 개발 서버 (Vite)
npm run build    # 타입체크 + 프로덕션 빌드

# AI 변환을 쓰려면 별도 터미널에서 변환 서버도 실행:
ANTHROPIC_API_KEY=sk-ant-... npm run server   # http://localhost:8787
```

> `.env.example` 참고. API 키는 **서버에서만** 읽고 브라우저로 내려보내지 않습니다.

---

## 구조

```
src/
  types/problem.ts        # 문제 데이터 스키마 (모든 과목/유형 공통)
  data/sampleQuiz.ts      # 워크시트를 변환한 예시 문제 세트
  lib/
    grading.ts            # 채점 로직 (분수 = 유리수 비교)
    storage.ts            # 영속성 추상화 (지금 localStorage, 나중에 Firebase)
    ai/convert.ts         # 이미지 → 문제 JSON 자동 변환 모듈
  game/gamification.ts    # 포인트·레벨·콤보·뱃지·펫 규칙
  components/QuestionCard.tsx
  App.tsx                 # 화면(홈/퀴즈/결과/오답노트) 오케스트레이션
```

핵심 설계 원칙: **데이터(문제 스키마)와 화면을 분리**해서, AI가 만들어낸 문제든
손으로 입력한 문제든 같은 형식이면 그대로 동작하게 함.

---

## 다음 단계 로드맵

### ✅ AI 자동 변환 (완료)
- 사진 업로드 → Claude 비전(`claude-opus-4-8`)이 문제 스키마 JSON 으로 변환.
- API 키는 서버에서만 사용: 로컬은 `server/index.mjs`, 배포는 `api/convert.ts`(Vercel).
- 변환 결과는 `validateProblems()` 로 검증.
- 배포 시: `api/convert.ts` 를 Vercel 에 올리고, 프런트 `VITE_CONVERT_ENDPOINT` 를 그 주소로.

### ✅ 게임 확장 (완료)
- 펫 상점, 일일 미션, 랭킹 보드. (`src/game/progression.ts`)

### ✅ Firebase 연동 (완료 — 설정만 하면 켜짐)
`VITE_FIREBASE_*` 환경변수를 채우면 진행도·오답노트·랭킹이 자동으로 Firestore 동기화됩니다.
비워두면 그대로 localStorage 로 동작합니다. **화면 코드 변경 없음** — `store` 가 자동 전환.

- **Auth**: 익명 로그인(`signInAnonymously`)으로 계정 없이 동기화 시작
- **Firestore**: `users/{uid}`(프로필), `users/{uid}/wrongNotes`(오답노트), `leaderboard/{uid}`(랭킹)
- **랭킹**: 실제 점수가 Firestore 에 쌓이고 상위 20명을 실시간 표시 (닉네임 설정 가능)
- **Functions**: `functions/index.js` 가 AI 변환 엔드포인트(키는 Secret Manager 보관)
- **Storage**: 업로드 이미지용 보안 규칙(`storage.rules`) 포함
- 보안 규칙(`firestore.rules`): 본인 데이터만 읽기/쓰기, 랭킹은 공개 읽기 + 형식 검증

```bash
# 1) Firebase 프로젝트 만들고 웹앱 등록 → 콘솔의 설정값을 .env 에 복사
# 2) 변환 함수의 API 키 등록
firebase functions:secrets:set ANTHROPIC_API_KEY
# 3) 배포
npm run build
firebase deploy        # hosting + functions + firestore/storage rules
```

코드 구조:
- `src/lib/firebase/config.ts` — 환경변수만 검사(SDK 미포함, 번들 경량 유지)
- `src/lib/firebase/firebaseStore.ts` — Firestore 구현(활성화 시에만 **동적 로드**)
- `src/lib/storage.ts` — `firebaseEnabled` 면 Firestore, 아니면 localStorage 로 위임

### 게임 요소 (진행 현황)
- [x] 캐릭터/펫 꾸미기 상점(코인 사용)
- [x] 데일리 미션
- [x] 랭킹 보드 (로컬) — [ ] 친구와 실시간 점수 배틀 (Firebase 필요)
- [ ] 출석 보상
- [ ] 단원·과목 선택 화면, 문제 은행

### 콘텐츠
- [ ] 수학 5-1 전 단원, 이후 타 과목으로 확장
- [ ] 난이도 적응형 출제(오답 많은 유형 우선)

---

## 데이터 모델 예시

```ts
// 객관식
{ id, subject:"수학", grade:"5-1", unit:"5. 분수의 덧셈과 뺄셈",
  type:"multiple_choice", prompt:"...", choices:[...], answer:4,
  difficulty:2, points:15, explanation:"..." }

// 주관식 (분수 채점)
{ ..., type:"short_answer", answers:["17/20"], numericAnswer:true }
```
