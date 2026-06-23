import type { Unit } from './types'
import { lawProblems } from './law'

// 사회 단원 모음. 새 단원은 아래 배열에 객체를 추가하세요.
const G = '5-1'
const S = '사회'
const U = '법과 인권'

export const socialUnits: Unit[] = [
  {
    id: 'so-law-rights',
    subject: S,
    grade: G,
    unit: U,
    problems: [
      {
        id: 'law-1', subject: S, grade: G, unit: U, type: 'multiple_choice', difficulty: 1, points: 10,
        prompt: '다음 규칙을 지켜야 할 장소로 알맞은 것은?  "관람 중에 휴대 전화를 사용하지 않습니다."',
        choices: ['시장', '공원', '식당', '영화관', '피시방'], answer: 3,
        explanation: '영화관에서는 관람 중 휴대 전화 사용을 자제하는 규칙이 있습니다.',
      },
      {
        id: 'law-2', subject: S, grade: G, unit: U, type: 'short_answer', difficulty: 1, points: 10,
        prompt: '법은 강제성이 있어 사회 구성원은 반드시 지켜야 합니다. 법을 지키지 않으면 국가로부터 ○○을/를 받습니다. ○○은?',
        answers: ['제재', '처벌'],
        explanation: '법을 지키지 않으면 국가로부터 제재(처벌)를 받습니다.',
      },
      {
        id: 'law-3a', subject: S, grade: G, unit: U, type: 'ox', difficulty: 1, points: 10,
        prompt: '사회의 혼란을 막고 질서를 유지하기 위해 법이 생겨났다.',
        answer: true,
        explanation: '맞습니다. 법은 사회 질서를 유지하기 위해 생겨났습니다.',
      },
      {
        id: 'law-3b', subject: S, grade: G, unit: U, type: 'ox', difficulty: 1, points: 10,
        prompt: '상점에서 물건값을 내지 않고 가져가는 상황은 법이 필요하지 않은 상황이다.',
        answer: false,
        explanation: '물건값을 내지 않고 가져가는 것은 절도로, 법이 필요한 상황입니다.',
      },
      {
        id: 'law-4', subject: S, grade: G, unit: U, type: 'multiple_choice', difficulty: 2, points: 15,
        prompt: '다음 중 법이 필요한 상황으로 볼 수 있는 것은?',
        choices: [
          '형제끼리 말다툼하는 상황',
          '이웃 어른께 인사하지 않는 상황',
          '차에서 안전벨트를 하지 않는 상황',
          '길에 떨어진 쓰레기를 줍지 않는 상황',
          '지하철에서 노약자에게 자리를 양보하지 않는 상황',
        ], answer: 2,
        explanation: '안전벨트 미착용은 법(도로교통법)으로 정해진 사항입니다. 나머지는 도덕·예절의 문제입니다.',
      },
      {
        id: 'law-5', subject: S, grade: G, unit: U, type: 'short_answer', difficulty: 1, points: 10,
        prompt: '「초·중등 교육법」이 우리 생활에 주는 영향을 바르게 말한 친구는? (아름: 학교에서 공부할 수 있어. / 수민: 안전하게 등교할 수 있어.)',
        answers: ['아름'],
        explanation: '초·중등 교육법은 학교에서 교육받을 수 있게 하는 법입니다. → 아름',
      },
      {
        id: 'law-6', subject: S, grade: G, unit: U, type: 'multiple_choice', difficulty: 2, points: 15,
        prompt: '「학교 급식법」, 「어린이 놀이 시설 안전 관리법」을 만든 까닭으로 알맞은 것은?',
        choices: [
          '튼튼하고 안전한 건물에서 생활할 수 있도록 하기 위해서',
          '학교에서 건강하고 안전하게 생활할 수 있도록 하기 위해서',
        ], answer: 1,
        explanation: '두 법은 학교에서 건강하고 안전하게 생활하도록 만든 법입니다.',
      },
      {
        id: 'law-7', subject: S, grade: G, unit: U, type: 'multiple_choice', difficulty: 1, points: 10,
        prompt: '"다른 사람의 창작물을 이용할 때는 정당한 비용을 내야 해."  이 그림과 관련 있는 법은?',
        choices: ['건축법', '의료법', '저작권법', '도로 교통법', '식품 안전 기본법'], answer: 2,
        explanation: '창작물(저작물)에 대한 권리를 보호하는 법은 저작권법입니다.',
      },
      {
        id: 'law-8', subject: S, grade: G, unit: U, type: 'short_answer', difficulty: 3, points: 20,
        prompt: '"경찰관이 「경찰관 직무 집행법」에 따라 순찰을 나갑니다." 이 법이 우리 생활에 주는 영향을 쓰세요.',
        answers: ['사회 질서가 유지된다', '안전하게 생활할 수 있다', '범죄를 예방한다'],
        explanation: '경찰의 순찰로 범죄를 예방하고, 안전하고 질서 있는 생활을 할 수 있습니다. (서술형 — 비슷하게 쓰면 정답)',
      },
      {
        id: 'law-9', subject: S, grade: G, unit: U, type: 'multiple_choice', difficulty: 1, points: 10,
        prompt: '㉠에 들어갈 알맞은 말은? "㉠은 생태계와 자연환경을 보호하고 국민이 건강한 생활을 하도록 정하고 있습니다."',
        choices: ['소비자 기본법', '자연환경 보전법'], answer: 1,
        explanation: '생태계·자연환경 보호 → 자연환경 보전법.',
      },
      {
        id: 'law-10', subject: S, grade: G, unit: U, type: 'multiple_choice', difficulty: 2, points: 15,
        prompt: '「소방 기본법」을 정해 놓은 까닭으로 알맞은 것은?',
        choices: [
          '안전한 식생활을 보장하기 위해서이다.',
          '도로에서 일어나는 교통상의 위험과 장애를 방지하고 제거하기 위해서이다.',
          '화재를 예방하고 위급한 상황에서 국민의 생명과 재산을 보호하기 위해서이다.',
        ], answer: 2,
        explanation: '소방 기본법은 화재 예방과 국민의 생명·재산 보호를 위한 법입니다.',
      },
      {
        id: 'law-11', subject: S, grade: G, unit: U, type: 'multiple_choice', difficulty: 1, points: 10,
        prompt: '빈칸에 알맞은 말은? "법은 사람들 사이의 갈등이나 다툼을 해결하는 ( )이/가 됩니다."',
        choices: ['기준', '권리'], answer: 0,
        explanation: '법은 갈등·다툼을 해결하는 기준이 됩니다.',
      },
      {
        id: 'law-12', subject: S, grade: G, unit: U, type: 'multiple_choice', difficulty: 1, points: 10,
        prompt: '빈칸에 들어갈 말로 알맞은 것은? "개인 사이에 다툼이 생겼을 때 ○○에 따라 재판하여 해결합니다."',
        choices: ['힘', '법', '양심', '생명', '합의'], answer: 1,
        explanation: '다툼은 법에 따라 재판하여 해결합니다.',
      },
      {
        id: 'law-13', subject: S, grade: G, unit: U, type: 'multiple_choice', difficulty: 2, points: 15,
        prompt: '법의 역할 중 개인의 권리 보호와 관련된 것은?',
        choices: ['범죄나 사고를 예방한다.', '사고로부터 개인의 생명을 보호한다.'], answer: 1,
        explanation: '개인의 생명 보호가 개인의 권리 보호와 관련됩니다. (범죄 예방은 사회 질서 유지)',
      },
      {
        id: 'law-14', subject: S, grade: G, unit: U, type: 'short_answer', difficulty: 2, points: 15,
        prompt: '법의 역할로 알맞은 것을 모두 고르세요(기호로). ㉠ 개인의 재산을 보호한다. ㉡ 공정한 경제 질서를 유지한다. ㉢ 교통사고가 자주 발생하게 한다.',
        answers: ['㉠, ㉡', '㉠㉡', 'ㄱ,ㄴ', 'ㄱ, ㄴ'],
        explanation: '법은 개인의 재산을 보호하고(㉠) 공정한 경제 질서를 유지합니다(㉡). ㉢은 틀립니다.',
      },
      {
        id: 'law-15', subject: S, grade: G, unit: U, type: 'multiple_choice', difficulty: 1, points: 10,
        prompt: '빈칸에 알맞은 말은? "법은 깨끗하고 쾌적한 환경을 보호하는 것과 같이 ( )을/를 유지하는 역할을 합니다."',
        choices: ['사회 질서', '사회 혼란'], answer: 0,
        explanation: '법은 사회 질서를 유지하는 역할을 합니다.',
      },
      {
        id: 'law-16', subject: S, grade: G, unit: U, type: 'short_answer', difficulty: 2, points: 15,
        prompt: '인권의 특징으로 알맞은 것을 두 가지 고르세요(번호로). ① 나라에서 허락한 권리 ② 어른에게만 주어지는 권리 ③ 재산이 많은 사람이 누리는 권리 ④ 누구나 태어날 때부터 가지는 권리 ⑤ 힘이나 권력으로 함부로 빼앗을 수 없는 권리',
        answers: ['④, ⑤', '④⑤', '45', '4, 5', '4,5'],
        explanation: '인권은 태어날 때부터 누구나 가지며(④), 함부로 빼앗을 수 없는 권리입니다(⑤).',
      },
      {
        id: 'law-17', subject: S, grade: G, unit: U, type: 'multiple_choice', difficulty: 2, points: 15,
        prompt: '"국가의 정치 의사 형성 과정에 참여할 수 있습니다."  이와 관련된 인권 보장 모습으로 알맞은 것은?',
        choices: [
          '선거권을 가지고 투표한다.',
          '자신이 원하는 직업을 선택한다.',
          '법관으로부터 법에 따른 재판을 받는다.',
          '자신이 원하는 곳으로 자유롭게 이동한다.',
          '직원 채용에서 성별, 나이 등으로 차별받지 않는다.',
        ], answer: 0,
        explanation: '정치 참여 → 선거권을 가지고 투표하는 모습입니다.',
      },
      {
        id: 'law-18', subject: S, grade: G, unit: U, type: 'multiple_choice', difficulty: 2, points: 15,
        prompt: '"건강하고 쾌적한 환경에서 생활합니다."  이 설명에서 알 수 있는 인권 보장의 모습으로 옳은 것은?',
        choices: [
          '선거에 후보로 출마한다.',
          '모든 국민이 차별받지 않고 동등하게 대우받는다.',
          '더 나은 삶을 살 수 있도록 국가에 요구할 수 있다.',
          '권리가 침해되었을 때 국가에 일정한 행위를 요구할 수 있다.',
          '국가의 간섭을 받지 않고 자유롭게 생각하고 행동할 수 있다.',
        ], answer: 2,
        explanation: '건강하고 쾌적한 환경에서 생활하는 것은 더 나은 삶을 국가에 요구하는 사회권의 모습입니다.',
      },
      {
        id: 'law-19', subject: S, grade: G, unit: U, type: 'fill_blank', difficulty: 2, points: 15,
        prompt: '알맞은 말을 채우세요. 국민은 {{0}}에 따라 {{1}}하게 교육을 받을 수 있습니다. (능력/재산, 균등/차등)',
        blanks: [['능력'], ['균등']],
        explanation: '국민은 능력에 따라 균등하게 교육받을 권리가 있습니다.',
      },
      {
        id: 'law-20', subject: S, grade: G, unit: U, type: 'short_answer', difficulty: 3, points: 20,
        prompt: '다른 사람의 창작물을 베껴 올리며 "내가 작성했는지 모를 거야."라고 하는 상황. 법을 지키려면 어떻게 행동해야 하는지 쓰세요.',
        answers: ['다른 사람의 창작물을 함부로 사용하지 않는다', '저작권을 지킨다', '출처를 밝히고 허락을 받는다', '베끼지 않는다'],
        explanation: '다른 사람의 창작물(저작물)을 함부로 베끼지 않고, 허락을 받거나 출처를 밝히고 정당한 비용을 내야 합니다. (서술형)',
      },
      // ── 미니게임별 맞춤 문제 풀 (스피드·배틀·OX·짝꿍·빈칸) ──
      ...lawProblems,
    ],
  },
  {
    id: 'so-basic',
    subject: '사회',
    grade: '초',
    unit: '우리나라와 생활',
    problems: [
      {
        id: 'so-1',
        subject: '사회',
        grade: '초',
        unit: '우리나라와 생활',
        type: 'multiple_choice',
        difficulty: 1,
        points: 10,
        prompt: '우리나라의 수도는 어디일까요?',
        choices: ['부산', '서울', '대전', '광주'],
        answer: 1,
        explanation: '대한민국의 수도는 서울입니다.',
      },
      {
        id: 'so-2',
        subject: '사회',
        grade: '초',
        unit: '우리나라와 생활',
        type: 'short_answer',
        difficulty: 2,
        points: 15,
        prompt: '해가 떠오르는 방향은 어느 쪽일까요?',
        answers: ['동쪽', '동'],
        explanation: '해는 동쪽에서 떠서 서쪽으로 집니다.',
      },
      {
        id: 'so-3',
        subject: '사회',
        grade: '초',
        unit: '우리나라와 생활',
        type: 'multiple_choice',
        difficulty: 1,
        points: 10,
        prompt: '불을 끄고 사람을 구조하는 곳은 어디일까요?',
        choices: ['우체국', '소방서', '도서관', '은행'],
        answer: 1,
        explanation: '소방서는 화재 진압과 구조·구급을 담당합니다.',
      },
      {
        id: 'so-4',
        subject: '사회',
        grade: '초',
        unit: '우리나라와 생활',
        type: 'ox',
        difficulty: 1,
        points: 10,
        prompt: '우리나라는 봄·여름·가을·겨울 네 계절이 있습니다.',
        answer: true,
        explanation: '우리나라는 사계절이 뚜렷합니다.',
      },
    ],
  },
]
