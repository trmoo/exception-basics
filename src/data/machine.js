/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  자판기 코드 · 입력 칸 · 예외 도감 카드.
 *  교재 12장 A 「예외 처리」 의 범위(try–except, 여러 except, else·finally)만 쓴다.
 *  ⚠ 학생들이 아직 파일 입출력을 배우기 전이라 open( ) · FileNotFoundError 는 뺐다(2026-10-24 사용자 지시).
 *    교재 표의 6종 가운데 5종만 다룬다.
 *  ⚠ 이 파일은 node 로 그대로 불러다 시험한다. DOM 을 만들지 말 것.
 */

// ── 1라운드 자판기 코드 ─────────────────────────────────────────────
// 방어막이 하나도 없는 자판기. 도감의 예외 5종을 모두 낼 수 있다.
//   int( )         → ValueError (숫자가 아닌 번호·사람 수)
//   가격[번호]      → IndexError (0~4 밖의 번호)
//   쿠폰[코드]      → KeyError (없는 쿠폰)
//   값 - 쿠폰[코드] → TypeError ("공짜" 는 글자)
//   값 // 인원      → ZeroDivisionError (0명) — 팔기 전에 셈한다(셈하다 멈추면 음료도 안 나온다)
export const MACHINE_CODE = `메뉴 = ["콜라", "사이다", "우유", "커피", "주스"]
가격 = [1200, 1000, 800, 1500, 1300]
쿠폰 = {"HAPPY": 200, "LUCKY": 500, "FREE": "공짜"}

번호 = int(input("메뉴 번호(0~4): "))
값 = 가격[번호]
코드 = input("쿠폰 코드: ")
if 코드 != "":
    값 = 값 - 쿠폰[코드]
인원 = int(input("나눠 낼 사람 수: "))
한명몫 = 값 // 인원
print(메뉴[번호], "나왔습니다!")
print("한 명당", 한명몫, "원")
`;

export const PRODUCTS = [
  { name: '콜라', price: 1200, icon: '🥤' },
  { name: '사이다', price: 1000, icon: '🫧' },
  { name: '우유', price: 800, icon: '🥛' },
  { name: '커피', price: 1500, icon: '☕' },
  { name: '주스', price: 1300, icon: '🧃' },
];
export const COUPONS = { HAPPY: 200, LUCKY: 500, FREE: '공짜' };

// ── 입력 칸 ─────────────────────────────────────────────────────────
// input( ) 의 질문 문구에 match 가 들어 있으면 그 칸의 값을 넣어 준다.
// (학생이 input 의 차례를 바꿔 써도 채점이 흔들리지 않게)
export const FIELDS = [
  { key: 'num', label: '메뉴 번호', icon: '🔢', match: /번호/, def: '0', ph: '0~4' },
  { key: 'coupon', label: '쿠폰 코드', icon: '🎟️', match: /쿠폰/, def: '', ph: '없으면 비움' },
  { key: 'people', label: '나눠 낼 사람 수', icon: '👥', match: /사람|인원/, def: '1', ph: '예) 1' },
];

/** 질문 문구 → 넣을 값. 맞는 칸이 없으면 차례대로 준다. */
export function makeInputFn(values) {
  return (prompt, i) => {
    const f = FIELDS.find((x) => x.match.test(prompt)) || FIELDS[i];
    if (!f) return null;
    const v = values[f.key];
    return v === undefined || v === null ? '' : String(v);
  };
}

// ── 예외 도감 — 교재 표의 5종 (FileNotFoundError 는 파일 입출력을 배운 뒤에) ──
export const CARDS = [
  {
    id: 'ValueError', icon: '🔤', color: '#f59e0b', nick: '값의 모양이 틀려요',
    what: '값의 모양이 맞지 않을 때 납니다. int( ) 는 "3" 은 정수형으로 바꾸지만 "셋" 이나 "2.5" 는 정수형으로 바꾸지 못합니다.',
    like: '숫자 칸에 글자를 써낸 시험지',
  },
  {
    id: 'ZeroDivisionError', icon: '➗', color: '#ef4444', nick: '0으로는 못 나눠요',
    what: '어떤 수를 0 으로 나눌 때 납니다.',
    like: '과자 한 봉지를 0명에게 똑같이 나누기',
  },
  {
    id: 'IndexError', icon: '📦', color: '#3b82f6', nick: '그런 자리는 없어요',
    what: '리스트·문자열의 범위를 벗어난 위치를 쓸 때 납니다. 메뉴가 5개면 번호는 0~4 뿐입니다.',
    like: '5칸짜리 진열대의 7번 칸',
  },
  {
    id: 'KeyError', icon: '🗝️', color: '#8b5cf6', nick: '그런 열쇠는 없어요',
    what: '딕셔너리에 없는 키를 쓸 때 납니다. 대소문자까지 똑같아야 합니다.',
    like: '명단에 없는 이름으로 사물함 열기',
  },
  {
    id: 'TypeError', icon: '🧩', color: '#ec4899', nick: '자료형이 안 맞아요',
    what: '자료형이 맞지 않는 연산을 할 때 납니다. 숫자 − 글자는 계산할 수 없습니다.',
    like: '사과 3개 빼기 「바나나」',
  },
];
export const cardOf = (id) => CARDS.find((c) => c.id === id);
