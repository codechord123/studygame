import type { Problem } from '../../../types/problem'

// 분류 대소동 전용 풀 — '기본권의 종류' 3바구니 분류. 법과 인권 (사회 5-1)
// 모든 문제가 동일한 보기 묶음['자유권','평등권','사회권']을 같은 순서로 공유해야
// SortGame 이 안정적인 3개 바구니 축으로 인식한다. (보기/순서를 바꾸지 말 것)
const CHOICES = ['자유권', '평등권', '사회권']

export const sortProblems: Problem[] = [
  // ── 자유권: 자유롭게 생각·표현·행동할 권리 (answer 0) ──
  { id: 'lso-1', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 1, points: 10,
    prompt: '내가 믿고 싶은 종교를 자유롭게 믿는다.',
    choices: CHOICES, answer: 0,
    explanation: '종교를 스스로 선택할 자유는 자유권에 해당합니다.', tags: ['sort'] },
  { id: 'lso-2', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 1, points: 10,
    prompt: '살고 싶은 곳으로 자유롭게 이사한다.',
    choices: CHOICES, answer: 0,
    explanation: '거주·이전의 자유는 자유권입니다.', tags: ['sort'] },
  { id: 'lso-3', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 2, points: 15,
    prompt: '내 생각을 자유롭게 말하고 글로 표현한다.',
    choices: CHOICES, answer: 0,
    explanation: '표현(언론·출판)의 자유는 자유권입니다.', tags: ['sort'] },
  { id: 'lso-4', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 1, points: 10,
    prompt: '원하는 직업을 스스로 골라 일한다.',
    choices: CHOICES, answer: 0,
    explanation: '직업 선택의 자유는 자유권입니다.', tags: ['sort'] },

  // ── 평등권: 차별받지 않을 권리 (answer 1) ──
  { id: 'lso-5', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 1, points: 10,
    prompt: '남자와 여자가 똑같이 대우받는다.',
    choices: CHOICES, answer: 1,
    explanation: '성별로 차별받지 않는 것은 평등권입니다.', tags: ['sort'] },
  { id: 'lso-6', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 2, points: 15,
    prompt: '장애가 있어도 차별 없이 똑같은 기회를 얻는다.',
    choices: CHOICES, answer: 1,
    explanation: '장애를 이유로 차별받지 않는 것은 평등권입니다.', tags: ['sort'] },
  { id: 'lso-7', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 2, points: 15,
    prompt: '피부색이나 출신 나라가 달라도 차별받지 않는다.',
    choices: CHOICES, answer: 1,
    explanation: '인종·출신에 따른 차별을 받지 않는 것은 평등권입니다.', tags: ['sort'] },
  { id: 'lso-8', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 1, points: 10,
    prompt: '가정 형편과 상관없이 똑같이 존중받는다.',
    choices: CHOICES, answer: 1,
    explanation: '재산·신분에 따른 차별을 받지 않는 것은 평등권입니다.', tags: ['sort'] },

  // ── 사회권: 인간다운 생활을 보장받을 권리 (answer 2) ──
  { id: 'lso-9', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 1, points: 10,
    prompt: '누구나 무료로 의무 교육을 받는다.',
    choices: CHOICES, answer: 2,
    explanation: '교육을 받을 권리는 사회권입니다.', tags: ['sort'] },
  { id: 'lso-10', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 2, points: 15,
    prompt: '아플 때 건강 보험으로 치료를 받는다.',
    choices: CHOICES, answer: 2,
    explanation: '건강하게 살 권리(보건)는 사회권입니다.', tags: ['sort'] },
  { id: 'lso-11', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 2, points: 15,
    prompt: '깨끗하고 쾌적한 환경에서 살아간다.',
    choices: CHOICES, answer: 2,
    explanation: '쾌적한 환경에서 살 권리(환경권)는 사회권입니다.', tags: ['sort'] },
  { id: 'lso-12', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 2, points: 15,
    prompt: '형편이 어려우면 나라의 도움(복지)을 받는다.',
    choices: CHOICES, answer: 2,
    explanation: '인간다운 생활을 위해 나라의 도움을 받을 권리는 사회권입니다.', tags: ['sort'] },
]
