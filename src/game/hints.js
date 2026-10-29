/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  1라운드 힌트 — 학생이 이미 찾은 예외(종류·개수)를 보고 「다음에 노려 볼 예외」 와 그 힌트를 고른다.
 *  힌트는 학생이 단추를 누를 때만, 한 번에 하나씩 연다(예외마다 3단계 — 방향 → 자리 → 거의 답).
 *  ⚠ 힌트에는 아직 못 찾은 예외의 이름을 쓰지 않는다(찾는 재미가 사라진다).
 *  ⚠ 마지막 단계의 값(try)이 정말 그 예외를 내는지 `npm test` 가 자판기를 돌려 지킨다.
 *  ⚠ node 로 그대로 불러다 시험한다. DOM 을 만들지 말 것.
 */

// 쉬운 것부터
export const ORDER = ['ValueError', 'IndexError', 'KeyError', 'ZeroDivisionError', 'TypeError'];

export const STEPS = {
  ValueError: {
    steps: [
      'int( ) 는 정수형으로 바꾸는 함수예요. 정수형으로 바꿀 수 없는 것을 주면 어떻게 될까요?',
      '메뉴 번호 칸에 숫자 대신 글자(한글이나 영어)를 넣어 보세요.',
      '메뉴 번호 칸에 「칠」 을 넣고 [▶ 넣기]!',
    ],
    try: { num: '칠' },
  },
  IndexError: {
    steps: [
      '메뉴는 몇 개인가요? 파이썬은 번호를 0 부터 셉니다.',
      '가격 리스트에는 0~4번 자리만 있어요. 그 밖의 번호를 고르면?',
      '메뉴 번호 칸에 7 을 넣어 보세요.',
    ],
    try: { num: '7' },
  },
  KeyError: {
    steps: [
      '쿠폰 딕셔너리를 보세요. 딕셔너리에 없는 키를 찾으면 어떻게 될까요?',
      '쿠폰은 HAPPY · LUCKY · FREE 세 가지뿐이에요. 파이썬은 대문자·소문자도 따져요.',
      '쿠폰 코드 칸에 happy (소문자)를 넣어 보세요.',
    ],
    try: { coupon: 'happy' },
  },
  ZeroDivisionError: {
    steps: [
      '자판기 코드에서 // 로 나누는 줄을 찾아보세요.',
      '값을 「나눠 낼 사람 수」 로 나눠요. 나눠 낼 사람이 아무도 없다면?',
      '나눠 낼 사람 수 칸에 0 을 넣어 보세요.',
    ],
    try: { people: '0' },
  },
  TypeError: {
    steps: [
      '쿠폰 딕셔너리의 값을 하나씩 보세요. 모두 숫자인가요?',
      '"공짜" 는 글자예요. 숫자 − 글자는 계산할 수 있을까요?',
      '쿠폰 코드 칸에 FREE 를 넣어 보세요.',
    ],
    try: { coupon: 'FREE' },
  },
};

// 이미 찾은 예외가 다음 예외의 디딤돌이 될 때 — 찾은 것에 이어서 말해 준다
const BRIDGE = [
  { need: 'KeyError', target: 'TypeError', intro: '없는 쿠폰을 넣어 고장 내 봤죠? 이번엔 있는 쿠폰 가운데 수상한 것이 하나 있어요.' },
  { need: 'ValueError', target: 'IndexError', intro: '번호 칸에 글자를 넣어 봤죠? 이번엔 숫자이긴 한데 이상한 번호라면?' },
  { need: 'ValueError', target: 'ZeroDivisionError', intro: '글자 말고 숫자로도 자판기를 멈출 수 있어요. 사람 수 칸을 보세요.' },
];

/** 다음에 노려 볼 예외와 그 앞에 붙일 말. 다 찾았으면 null. */
export function pickTarget(found) {
  const has = (id) => !!found[id];
  const missing = ORDER.filter((id) => !has(id));
  if (!missing.length) return null;
  const n = ORDER.length - missing.length;
  const bridge = BRIDGE.find((b) => has(b.need) && !has(b.target));
  const target = bridge ? bridge.target : missing[0];
  let intro;
  if (missing.length === 1) intro = `${n}가지를 찾았어요. 마지막 하나만 남았어요!`;
  else if (bridge) intro = bridge.intro;
  else if (n === 0) intro = '아직 하나도 못 찾았어요. 가장 쉬운 것부터 해 봐요.';
  else intro = `${n}가지를 찾았어요. 남은 ${missing.length}가지 가운데 하나를 노려 봐요.`;
  return { target, intro, found: n, left: missing.length };
}

/**
 * 지금 보여 줄 힌트. seen[target] 은 그 예외에 대해 이미 연 단계 수(0~3).
 * 반환: { target, intro, level(1~3, 0이면 아직 안 엶), total, text, more(더 열 수 있나) } · 다 찾았으면 null
 */
export function currentHint(found, seen = {}) {
  const t = pickTarget(found);
  if (!t) return null;
  const steps = STEPS[t.target].steps;
  const level = Math.min(seen[t.target] || 0, steps.length);
  return { ...t, level, total: steps.length, text: level ? steps[level - 1] : '', more: level < steps.length };
}

/** 힌트 한 단계를 더 연다 — seen 을 고친 새 객체를 돌려준다 */
export function openNext(found, seen = {}) {
  const t = pickTarget(found);
  if (!t) return seen;
  const now = seen[t.target] || 0;
  return { ...seen, [t.target]: Math.min(now + 1, STEPS[t.target].steps.length) };
}

/** 힌트 비밀코드 — 선생님이 알려 주기 전에는 1라운드 힌트를 쓸 수 없다.
 *  ⚠ 화면 코드 안에 들어 있으니 「부정행위 방지」가 아니라 처음부터 힌트에 기대지 않게 하는 학습 장치다. */
export const HINT_CODE = '1029';
export function hintCodeOk(v) { return String(v ?? '').replace(/\s+/g, '') === HINT_CODE; }
