/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  ⭐ 심화 — 논리 오류. 1차시에 미션을 빨리 끝낸 학생이 같은 자판기에서 「멈추지 않는데 틀린 것」 을 찾는다.
 *  실행 오류(예외)는 파이썬이 알려 주지만, 논리 오류는 아무도 알려 주지 않는다 — 결과를 직접 따져 봐야 한다.
 *  ⚠ 각 오류의 try 값이 정말 그 논리 오류를 내는지(그리고 예외가 아닌지) `npm test` 가 자판기를 돌려 지킨다.
 *  ⚠ 힌트에는 답(넣을 값)을 마지막 단계에서만 쓴다.
 *  ⚠ node 로 그대로 불러다 시험한다. DOM 을 만들지 말 것.
 */

export const LOGIC = [
  {
    id: 'negIndex', icon: '🔄', color: '#0ea5e9', name: '뒤에서 파는 자판기',
    what: '메뉴 번호에 음수를 넣으면 파이썬은 「뒤에서 몇째」 로 읽어요. 0~4번만 있다고 했는데 -1번에 주스가 나와요.',
    hints: [
      '안내에는 「메뉴 번호(0~4)」 라고 적혀 있어요. 코드가 정말 0~4 만 받는지 검사하나요?',
      '파이썬 리스트에서 음수 번호는 오류가 아니에요. 가격[-1] 은 어느 자리일까요?',
      '메뉴 번호 칸에 -1 을 넣어 보세요.',
    ],
    try: { num: '-1' },
    fix: 'if 번호 < 0 or 번호 > 4:\n    print("0~4번 중에서 골라 주세요.")',
  },
  {
    id: 'negPeople', icon: '➖', color: '#8b5cf6', name: '거꾸로 돈을 주는 자판기',
    what: '사람 수에 음수를 넣어도 int( ) 는 정수로 받아들여요. 한 명당 -600원 — 돈을 내는 게 아니라 받아 가요.',
    hints: [
      'int( ) 는 「-2」 도 정수로 바꿔 줘요. 사람 수에 쓸 수 없는 정수가 있을까요?',
      '사람 수 칸에 0보다 작은 수를 넣으면 한 명당 값은 어떻게 될까요?',
      '나눠 낼 사람 수 칸에 -2 를 넣어 보세요.',
    ],
    try: { people: '-2' },
    fix: 'if 인원 < 1:\n    print("한 명 이상이어야 해요.")',
  },
  {
    id: 'zeroShare', icon: '🆓', color: '#22c55e', name: '공짜 자판기',
    what: '// 는 몫만 남겨요. 사람 수가 값보다 많으면 몫이 0 이라 한 명당 0원 — 음료가 공짜가 돼요.',
    hints: [
      '// 는 나눗셈의 몫만 남겨요. 나누는 수가 아주 크면 몫은 얼마가 될까요?',
      '사람 수를 음료 값보다 크게 하면 한 명당 값은?',
      '나눠 낼 사람 수 칸에 2000 을 넣어 보세요.',
    ],
    try: { people: '2000' },
    fix: 'if 인원 > 값:\n    print("사람이 너무 많아요.")',
  },
  {
    id: 'remainder', icon: '🪙', color: '#f59e0b', name: '돈이 모자란 자판기',
    what: '// 는 나머지를 버려요. 1200원을 7명이 171원씩 내면 1197원 — 3원이 모자라요. 아무도 알려 주지 않아요.',
    hints: [
      '「한 명당 값 × 사람 수」 가 원래 값과 같은지 직접 계산해 보세요.',
      '1200 은 2·3·4 로 나누어떨어져요. 나누어떨어지지 않는 사람 수라면?',
      '나눠 낼 사람 수 칸에 7 을 넣어 보세요.',
    ],
    try: { people: '7' },
    fix: 'if 값 % 인원 != 0:\n    print("나머지", 값 % 인원, "원은 한 사람이 더 내 주세요.")',
  },
];
export const logicOf = (id) => LOGIC.find((x) => x.id === id);

/** 아직 못 찾은 것 가운데 첫째의 힌트. seen[id] = 연 단계 수. 다 찾았으면 null */
export function logicHint(found, seen = {}) {
  const t = LOGIC.find((x) => !found[x.id]);
  if (!t) return null;
  const level = Math.min(seen[t.id] || 0, t.hints.length);
  const n = LOGIC.length - LOGIC.filter((x) => !found[x.id]).length;
  return { target: t.id, found: n, level, total: t.hints.length, text: level ? t.hints[level - 1] : '', more: level < t.hints.length };
}
export function logicOpenNext(found, seen = {}) {
  const t = LOGIC.find((x) => !found[x.id]);
  if (!t) return seen;
  return { ...seen, [t.id]: Math.min((seen[t.id] || 0) + 1, t.hints.length) };
}

// 실행 오류와 논리 오류 비교표 (소개 카드)
export const COMPARE = [
  ['프로그램은', '그 자리에서 멈춘다', '끝까지 돈다'],
  ['파이썬은', '오류 이름과 줄 번호를 알려 준다', '아무 말도 하지 않는다'],
  ['결과는', '나오지 않는다', '나오지만 틀렸다'],
  ['찾는 법', '실행하면 바로 보인다', '결과를 직접 따져 봐야 보인다'],
  ['막는 법', 'try – except', 'if 로 값을 미리 검사'],
];
// 소개 카드에서 나란히 돌려 볼 두 손님 — 같은 자판기, 사람 수만 다르다
export const PAIR = [
  { kind: 'runtime', label: '💥 실행 오류', values: { num: '0', coupon: '', people: '0' }, say: '사람 수 0' },
  { kind: 'logic', label: '🤔 논리 오류', values: { num: '0', coupon: '', people: '7' }, say: '사람 수 7' },
];
