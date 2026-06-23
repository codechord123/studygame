import type { Problem } from '../../../types/problem'

// 몬스터 배틀 전용 풀 — 사고력이 필요한 객관식·빈칸. 법과 인권 (사회 5-1)
export const battleProblems: Problem[] = [
  { id: 'lbt-1', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 2, points: 15,
    prompt: '다음 중 법이 필요한 상황으로 가장 알맞은 것은?',
    choices: ['친구에게 인사하지 않는 상황', '차에서 안전벨트를 하지 않는 상황', '약속 시간에 늦는 상황', '방 청소를 하지 않는 상황'], answer: 1,
    explanation: '안전벨트 미착용은 도로 교통법으로 정해진 사항입니다. 나머지는 도덕·예절의 문제입니다.', tags: ['battle'] },

  { id: 'lbt-2', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 2, points: 15,
    prompt: '다음 상황 중 법으로 다루어지는 것이 아닌 것은?',
    choices: ['남의 물건을 허락 없이 가져갔다', '신호등이 빨간불일 때 길을 건넜다', '버스에서 어른께 자리를 양보하지 않았다', '다른 사람의 글을 베껴 자기 것처럼 발표했다'], answer: 2,
    explanation: '자리 양보는 도덕·예절의 문제로 지키지 않아도 처벌받지 않습니다. 나머지는 법으로 제재를 받습니다.', tags: ['battle'] },

  { id: 'lbt-3', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 3, points: 20,
    prompt: '법과 도덕에 대한 설명으로 옳지 않은 것은?',
    choices: ['법은 어겼을 때 국가의 제재를 받는다', '도덕을 어기면 양심의 가책이나 비난을 받는다', '도덕도 어기면 반드시 벌금을 내야 한다', '법은 강제성이 있고 도덕은 강제성이 약하다'], answer: 2,
    explanation: '도덕을 어겨도 국가가 벌금 같은 제재를 하지는 않습니다. 강제성이 있는 것은 법입니다.', tags: ['battle'] },

  { id: 'lbt-4', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 2, points: 15,
    prompt: '"누구나 자신이 원하는 직업을 자유롭게 선택할 수 있다." 이와 가장 관련 있는 기본권은?',
    choices: ['평등권', '자유권', '참정권', '청구권', '사회권'], answer: 1,
    explanation: '국가의 간섭 없이 자유롭게 행동하고 직업을 선택할 권리는 자유권입니다.', tags: ['battle'] },

  { id: 'lbt-5', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 2, points: 15,
    prompt: '"성별이나 종교, 장애 때문에 차별받지 않는다." 이와 관련 있는 기본권은?',
    choices: ['자유권', '평등권', '사회권', '참정권', '청구권'], answer: 1,
    explanation: '부당하게 차별받지 않고 동등하게 대우받을 권리는 평등권입니다.', tags: ['battle'] },

  { id: 'lbt-6', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 3, points: 20,
    prompt: '"만 18세 이상 국민은 선거에 참여해 투표할 수 있다." 이 권리에 해당하는 기본권은?',
    choices: ['청구권', '사회권', '참정권', '평등권', '자유권'], answer: 2,
    explanation: '나라의 정치에 참여할 수 있는 권리는 참정권입니다. 선거권이 대표적인 예입니다.', tags: ['battle'] },

  { id: 'lbt-7', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 3, points: 20,
    prompt: '"형편이 어려운 사람이 국가에 도움을 요청하여 인간다운 생활을 보장받는다." 이와 관련 있는 기본권은?',
    choices: ['자유권', '평등권', '참정권', '사회권', '청구권'], answer: 3,
    explanation: '인간답게 살 수 있도록 국가에 요구할 수 있는 권리는 사회권입니다.', tags: ['battle'] },

  { id: 'lbt-8', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 3, points: 20,
    prompt: '"피해를 입은 국민이 국가에 재판을 청구하거나 보상을 요구할 수 있다." 이 기본권은?',
    choices: ['청구권', '참정권', '사회권', '평등권'], answer: 0,
    explanation: '권리를 침해당했을 때 국가에 일정한 행위를 요구할 수 있는 권리는 청구권입니다.', tags: ['battle'] },

  { id: 'lbt-9', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 3, points: 20,
    prompt: '다음 두 사례의 기본권을 바르게 짝지은 것은?\n(가) 자신의 생각을 자유롭게 글로 써서 표현했다.\n(나) 남녀가 똑같은 기준으로 시험을 보았다.',
    choices: ['(가) 평등권 — (나) 자유권', '(가) 자유권 — (나) 평등권', '(가) 참정권 — (나) 사회권', '(가) 자유권 — (나) 청구권'], answer: 1,
    explanation: '생각을 자유롭게 표현하는 것은 자유권, 차별 없이 동등하게 대우받는 것은 평등권입니다.', tags: ['battle'] },

  { id: 'lbt-10', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'fill_blank', difficulty: 2, points: 15,
    prompt: '나라 살림에 필요한 비용을 마련하기 위해 세금을 내는 것을 {{0}}의 의무라고 합니다.',
    blanks: [['납세']],
    explanation: '세금을 내는 것은 납세의 의무입니다.', tags: ['battle'] },

  { id: 'lbt-11', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 3, points: 20,
    prompt: '"부모가 자녀에게 초등 교육을 받게 하는 것"과 관련 있는 국민의 의무는?',
    choices: ['근로의 의무', '교육의 의무', '국방의 의무', '납세의 의무'], answer: 1,
    explanation: '모든 국민은 자녀가 교육을 받도록 할 교육의 의무를 집니다.', tags: ['battle'] },

  { id: 'lbt-12', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 3, points: 20,
    prompt: '다음 중 국민의 의무와 그 예가 잘못 짝지어진 것은?',
    choices: ['국방의 의무 — 나라를 지키는 일에 참여하기', '근로의 의무 — 일을 하여 사회 발전에 참여하기', '환경 보전의 의무 — 환경을 깨끗하게 보호하기', '납세의 의무 — 투표에 빠짐없이 참여하기'], answer: 3,
    explanation: '투표 참여는 참정권(권리)이며, 납세의 의무는 세금을 내는 것입니다.', tags: ['battle'] },

  { id: 'lbt-13', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 2, points: 15,
    prompt: '"교통질서를 지키게 하여 사고를 막고 도로를 안전하게 한다." 이러한 법의 역할은?',
    choices: ['개인의 재산을 늘려 준다', '사회 질서를 유지한다', '세금을 거두어 들인다', '선거를 실시한다'], answer: 1,
    explanation: '교통질서 유지처럼 사회가 안전하게 돌아가도록 하는 것은 사회 질서 유지 역할입니다.', tags: ['battle'] },

  { id: 'lbt-14', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 3, points: 20,
    prompt: '다음 중 법의 역할이 "개인의 권리 보호"에 해당하는 것은?',
    choices: ['신호등을 설치해 교통질서를 지키게 한다', '소비자가 피해를 입었을 때 보상받도록 돕는다', '범죄자를 처벌해 사회 혼란을 막는다', '화재가 나지 않도록 안전 규칙을 정한다'], answer: 1,
    explanation: '소비자 피해 보상처럼 한 사람의 권리를 지켜 주는 것은 개인의 권리 보호 역할입니다. 나머지는 질서 유지에 가깝습니다.', tags: ['battle'] },

  { id: 'lbt-15', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 3, points: 20,
    prompt: '권리와 의무의 관계에 대한 설명으로 옳은 것은?',
    choices: ['권리만 누리고 의무는 지키지 않아도 된다', '의무는 어른만 지키고 권리는 어린이만 가진다', '권리와 의무는 조화를 이루도록 하는 것이 바람직하다', '권리가 충돌하면 항상 한쪽을 완전히 무시해야 한다'], answer: 2,
    explanation: '권리와 의무가 충돌할 때는 서로 조화를 이루는 방법을 찾는 것이 바람직합니다.', tags: ['battle'] },

  { id: 'lbt-16', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 3, points: 20,
    prompt: '한 사람은 자기 땅에 건물을 짓고 싶어 하고(권리), 그 땅은 환경 보전이 필요한 지역이다(의무). 이때 가장 바람직한 태도는?',
    choices: ['권리가 무조건 우선이므로 마음대로 짓는다', '서로의 입장을 이해하며 조화로운 방법을 찾는다', '의무만 중요하므로 권리는 생각하지 않는다', '둘 다 포기하고 아무것도 하지 않는다'], answer: 1,
    explanation: '권리와 의무가 부딪칠 때는 양쪽을 함께 고려해 조화를 이루는 것이 바람직합니다.', tags: ['battle'] },

  { id: 'lbt-17', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 2, points: 15,
    prompt: '헌법에 대한 설명으로 옳은 것은?',
    choices: ['우리나라 법 중 가장 기본이 되는 법이다', '학교에서만 적용되는 규칙이다', '대통령이 혼자 마음대로 바꾸는 법이다', '외국에만 적용되는 약속이다'], answer: 0,
    explanation: '헌법은 우리나라 모든 법의 바탕이 되는 가장 기본이 되는 법입니다.', tags: ['battle'] },

  { id: 'lbt-18', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 3, points: 20,
    prompt: '헌법에 대한 설명으로 옳지 않은 것은?',
    choices: ['국민의 권리와 의무를 담고 있다', '국가 기관을 조직하고 운영하는 기본 원칙을 정한다', '헌법을 바탕으로 다른 법들을 만든다', '헌법보다 더 높은 법을 새로 만들 수 있다'], answer: 3,
    explanation: '헌법은 우리나라 최고의 법으로, 헌법보다 위에 있는 법은 만들 수 없습니다.', tags: ['battle'] },

  { id: 'lbt-19', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 3, points: 20,
    prompt: '"어떤 법이나 국가 기관의 행동이 헌법에 맞는지 판단하는 기관"은?',
    choices: ['국회', '헌법 재판소', '경찰서', '교육청'], answer: 1,
    explanation: '헌법 재판소는 법이 헌법에 어긋나는지 판단하여 국민의 기본권을 보호하는 기관입니다.', tags: ['battle'] },

  { id: 'lbt-20', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 3, points: 20,
    prompt: '헌법 재판소가 하는 일로 가장 알맞은 것은?',
    choices: ['도로에서 교통 단속을 한다', '법률이 국민의 기본권을 침해하는지 판단한다', '학생들의 시험 점수를 매긴다', '세금을 직접 거두어들인다'], answer: 1,
    explanation: '헌법 재판소는 법률이 헌법에 어긋나 기본권을 침해하는지를 판단합니다.', tags: ['battle'] },

  { id: 'lbt-21', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'fill_blank', difficulty: 3, points: 20,
    prompt: '불이 났을 때 사람들의 생명과 재산을 지키고 화재를 예방하기 위한 법은 {{0}}입니다.',
    blanks: [['소방 기본법', '소방기본법']],
    explanation: '화재 예방·진압과 생명·재산 보호를 위한 법은 소방 기본법입니다.', tags: ['battle'] },

  { id: 'lbt-22', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'fill_blank', difficulty: 3, points: 20,
    prompt: '음악이나 글, 그림을 만든 사람의 권리를 보호하는 법을 {{0}}(이)라고 합니다.',
    blanks: [['저작권법']],
    explanation: '창작한 사람의 권리를 보호하는 법은 저작권법입니다.', tags: ['battle'] },

  { id: 'lbt-23', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 3, points: 20,
    prompt: '"자연환경을 보호하고 생태계를 지키기 위한 법"은?',
    choices: ['자연환경 보전법', '학교 급식법', '도로 교통법', '저작권법'], answer: 0,
    explanation: '자연과 생태계를 보호하는 것을 목적으로 하는 법은 자연환경 보전법입니다.', tags: ['battle'] },

  { id: 'lbt-24', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 3, points: 20,
    prompt: '다음 법과 목적이 잘못 짝지어진 것은?',
    choices: ['도로 교통법 — 도로에서 안전과 질서 지키기', '학교 급식법 — 학생들에게 안전한 급식 제공하기', '저작권법 — 창작자의 권리 보호하기', '소방 기본법 — 어린이 놀이 시설의 안전 관리하기'], answer: 3,
    explanation: '어린이 놀이 시설의 안전 관리는 어린이 놀이 시설 안전 관리법이 맡습니다. 소방 기본법은 화재 관련 법입니다.', tags: ['battle'] },

  { id: 'lbt-25', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 3, points: 20,
    prompt: '"놀이터의 미끄럼틀, 그네 등이 안전한지 점검하고 관리하도록 정한 법"은?',
    choices: ['어린이 놀이 시설 안전 관리법', '도로 교통법', '저작권법', '자연환경 보전법'], answer: 0,
    explanation: '놀이 시설을 안전하게 관리하도록 정한 법은 어린이 놀이 시설 안전 관리법입니다.', tags: ['battle'] },

  { id: 'lbt-26', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 3, points: 20,
    prompt: '"경찰관이 위험에 빠진 사람을 보호하거나 범죄를 막기 위해 할 수 있는 일을 정한 법"은?',
    choices: ['학교 급식법', '경찰관 직무 집행법', '저작권법', '소방 기본법'], answer: 1,
    explanation: '경찰관이 국민의 안전을 위해 하는 일을 정한 법은 경찰관 직무 집행법입니다.', tags: ['battle'] },

  { id: 'lbt-27', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 2, points: 15,
    prompt: '인권에 대한 설명으로 옳은 것은?',
    choices: ['어른이 된 후에야 생기는 권리이다', '시험을 잘 본 사람에게만 주어진다', '사람이라면 누구나 태어나면서부터 가지는 권리이다', '돈을 내고 사야 가질 수 있는 권리이다'], answer: 2,
    explanation: '인권은 사람이라면 누구나 태어날 때부터 당연히 가지는 권리입니다.', tags: ['battle'] },

  { id: 'lbt-28', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 3, points: 20,
    prompt: '인권에 대한 설명으로 옳지 않은 것은?',
    choices: ['어린이도 어른과 똑같이 인권을 가진다', '다른 사람이 함부로 빼앗을 수 없다', '잘못을 한 사람은 인권을 모두 잃는다', '국가는 국민의 인권을 보장해야 한다'], answer: 2,
    explanation: '인권은 누구에게나 보장되며 함부로 빼앗을 수 없습니다. 잘못을 했다고 인권 자체를 잃는 것은 아닙니다.', tags: ['battle'] },

  { id: 'lbt-29', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 3, points: 20,
    prompt: '옛날 인권 보장을 위한 노력으로 알맞은 것은?',
    choices: ['신문고를 설치해 백성의 억울함을 듣게 했다', '인터넷으로 민원을 신청하게 했다', '폐쇄 회로 텔레비전(CCTV)을 설치했다', '점자 블록을 길에 설치했다'], answer: 0,
    explanation: '신문고는 조선 시대에 백성의 억울함을 풀어 주기 위해 설치한 제도입니다. 나머지는 오늘날의 노력입니다.', tags: ['battle'] },

  { id: 'lbt-30', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 3, points: 20,
    prompt: '오늘날 인권을 보장하기 위한 노력으로 알맞지 않은 것은?',
    choices: ['장애인을 위한 점자 블록과 경사로 설치', '버스에 낮은 바닥과 휠체어 공간 마련', '나이가 어리다는 이유로 의견을 무시하기', '인권 교육과 상담 기관 운영'], answer: 2,
    explanation: '나이가 어리다고 의견을 무시하는 것은 인권을 존중하지 않는 태도입니다.', tags: ['battle'] },

  { id: 'lbt-31', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'fill_blank', difficulty: 2, points: 15,
    prompt: '조선 시대에 백성이 억울한 일을 임금에게 알릴 수 있도록 설치한 북을 {{0}}(이)라고 합니다.',
    blanks: [['신문고']],
    explanation: '신문고는 백성의 억울함을 풀어 주기 위해 설치한 옛날의 인권 보장 제도입니다.', tags: ['battle'] },

  { id: 'lbt-32', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 3, points: 20,
    prompt: '다음 사례에서 침해된 기본권으로 가장 알맞은 것은?\n"일할 능력이 있는데도 단지 장애가 있다는 이유로 채용을 거절당했다."',
    choices: ['청구권', '평등권', '국방의 의무', '환경 보전의 의무'], answer: 1,
    explanation: '장애를 이유로 차별받은 것이므로 차별받지 않을 권리인 평등권이 침해된 것입니다.', tags: ['battle'] },

  { id: 'lbt-33', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 3, points: 20,
    prompt: '다음 중 "권리"가 아니라 "의무"에 해당하는 것은?',
    choices: ['자유롭게 종교를 믿는 것', '차별받지 않고 교육받는 것', '세금을 내어 나라 살림에 보태는 것', '국가에 재판을 청구하는 것'], answer: 2,
    explanation: '세금을 내는 것은 납세의 의무입니다. 나머지는 자유권·평등권·청구권 등 권리에 해당합니다.', tags: ['battle'] },

  { id: 'lbt-34', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 3, points: 20,
    prompt: '"교육"은 국민에게 권리이면서 동시에 의무이기도 하다. 그 까닭으로 가장 알맞은 것은?',
    choices: ['교육을 받을 수 있고, 자녀가 받게 할 책임도 있기 때문', '교육은 어른만 받을 수 있기 때문', '교육은 세금과 똑같은 것이기 때문', '교육은 국방과 같은 일이기 때문'], answer: 0,
    explanation: '교육은 누구나 받을 권리이면서, 자녀가 교육받게 해야 하는 의무이기도 합니다.', tags: ['battle'] },

  { id: 'lbt-35', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 3, points: 20,
    prompt: '다음 자료를 보고 알 수 있는 법의 역할로 가장 알맞은 것은?\n"한 회사가 상한 음식을 팔아 소비자가 피해를 입자, 법에 따라 회사가 보상하도록 했다."',
    choices: ['개인의 권리를 보호한다', '세금을 거두어들인다', '선거를 치른다', '도로를 새로 만든다'], answer: 0,
    explanation: '피해를 입은 소비자가 보상받도록 한 것은 개인의 권리를 보호하는 법의 역할입니다.', tags: ['battle'] },

  { id: 'lbt-36', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'multiple_choice', difficulty: 3, points: 20,
    prompt: '다음 중 법을 어겼을 때 일어나는 일로 알맞은 것은?',
    choices: ['아무런 일도 일어나지 않는다', '국가로부터 제재(처벌)를 받을 수 있다', '친구에게만 비난을 받는다', '양심의 가책만 느끼면 된다'], answer: 1,
    explanation: '법은 강제성이 있어, 어기면 국가로부터 제재나 처벌을 받을 수 있습니다.', tags: ['battle'] },

  { id: 'lbt-37', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'fill_blank', difficulty: 2, points: 15,
    prompt: '우리나라 법 중에서 가장 기본이 되는 최고의 법을 {{0}}(이)라고 합니다.',
    blanks: [['헌법']],
    explanation: '헌법은 우리나라 모든 법의 바탕이 되는 최고의 법입니다.', tags: ['battle'] },

  { id: 'lbt-38', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'fill_blank', difficulty: 3, points: 20,
    prompt: '법이 헌법에 어긋나는지를 판단하여 국민의 기본권을 보호하는 기관을 {{0}}(이)라고 합니다.',
    blanks: [['헌법 재판소', '헌법재판소']],
    explanation: '헌법 재판소는 법이 헌법에 맞는지 판단하는 기관입니다.', tags: ['battle'] },

  { id: 'lbt-39', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'fill_blank', difficulty: 3, points: 20,
    prompt: '사람이라면 누구나 태어날 때부터 당연히 가지는 권리를 {{0}}(이)라고 합니다.',
    blanks: [['인권']],
    explanation: '인권은 누구나 태어나면서부터 가지는, 함부로 빼앗을 수 없는 권리입니다.', tags: ['battle'] },

  { id: 'lbt-40', subject: '사회', grade: '5-1', unit: '법과 인권', type: 'fill_blank', difficulty: 3, points: 20,
    prompt: '국가의 간섭을 받지 않고 자유롭게 행동할 수 있는 권리는 {{0}}, 차별받지 않고 동등하게 대우받을 권리는 {{1}}입니다.',
    blanks: [['자유권'], ['평등권']],
    explanation: '자유롭게 행동할 권리는 자유권, 차별받지 않을 권리는 평등권입니다.', tags: ['battle'] },
]
