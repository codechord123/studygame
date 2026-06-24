import type { Problem } from '../../../types/problem'

// 순서대로 줄줄이 전용 풀 — 법·인권의 '과정/절차' 지식. 법과 인권 (사회 5-1)
// steps 는 올바른 순서. 게임에서 섞어서 출제하고 다시 순서대로 배열하게 한다.
export const sequenceProblems: Problem[] = [
  {
    id: 'lsq-1', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'sequence',
    difficulty: 2, points: 15,
    prompt: '법이 만들어지는 과정을 순서대로 놓아 보세요.',
    steps: ['법안을 제안', '국회에서 심의', '국회에서 의결', '대통령이 공포'],
    explanation: '법은 제안 → 국회 심의 → 의결(표결) → 공포의 순서로 만들어집니다.',
    tags: ['seq'],
  },
  {
    id: 'lsq-2', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'sequence',
    difficulty: 2, points: 15,
    prompt: '재판이 이루어지는 과정을 순서대로 놓아 보세요.',
    steps: ['재판을 청구', '주장 펼치기', '증거 살피기', '판결 내리기'],
    explanation: '재판은 청구 → 양측 주장 → 증거 확인 → 판결의 순서로 진행됩니다.',
    tags: ['seq'],
  },
  {
    id: 'lsq-3', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'sequence',
    difficulty: 2, points: 15,
    prompt: '인권을 침해당했을 때 해결하는 과정이에요. 순서대로 놓아 보세요.',
    steps: ['인권 침해 발생', '국가인권위에 진정', '조사 진행', '구제와 시정'],
    explanation: '침해 발생 → 진정(도움 요청) → 조사 → 구제·시정의 순서로 해결합니다.',
    tags: ['seq'],
  },
  {
    id: 'lsq-4', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'sequence',
    difficulty: 1, points: 10,
    prompt: '옛날에 신문고로 억울함을 알리던 과정이에요. 순서대로 놓아 보세요.',
    steps: ['억울한 일 발생', '신문고를 친다', '임금이 듣는다', '사정을 해결'],
    explanation: '억울한 일 → 신문고를 침 → 임금이 들음 → 해결의 순서입니다.',
    tags: ['seq'],
  },
  {
    id: 'lsq-5', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'sequence',
    difficulty: 3, points: 20,
    prompt: '헌법 재판소가 기본권을 지켜 주는 과정이에요. 순서대로 놓아 보세요.',
    steps: ['기본권 침해', '헌법 소원 청구', '재판관 심리', '결정 선고'],
    explanation: '기본권 침해 → 헌법소원 청구 → 재판관 심리 → 결정 선고의 순서입니다.',
    tags: ['seq'],
  },
  {
    id: 'lsq-6', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'sequence',
    difficulty: 2, points: 15,
    prompt: '학급 규칙을 민주적으로 정하는 과정이에요. 순서대로 놓아 보세요.',
    steps: ['문제 상황 파악', '의견 나누기', '다수결로 결정', '규칙 지키기'],
    explanation: '문제 파악 → 의견 나누기 → 다수결 결정 → 실천(지키기)의 순서입니다.',
    tags: ['seq'],
  },
  {
    id: 'lsq-7', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'sequence',
    difficulty: 2, points: 15,
    prompt: '국민이 투표로 정치에 참여하는 과정이에요. 순서대로 놓아 보세요.',
    steps: ['후보자 등록', '선거 운동', '투표하기', '개표와 당선'],
    explanation: '후보 등록 → 선거 운동 → 투표 → 개표·당선의 순서로 진행됩니다.',
    tags: ['seq'],
  },
]
