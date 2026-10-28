/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  2라운드 「방어막」 미션 — 교재 12장 A 의 절 순서를 그대로 따른다.
 *    미션 1  try–except            (교재 2절)
 *    미션 2  여러 예외 처리하기      (교재 3절)
 *    미션 3  else 와 finally        (교재 4절)
 *    보스전  모든 공격 다시 넣기 + 「except: 남용하지 말자」(교재 [참고])
 *  ⚠ 모범 답안이 정말로 채점을 통과하는지 `npm test` 가 지킨다.
 *  ⚠ node 로 그대로 불러다 시험한다. DOM 을 만들지 말 것.
 */

const HEAD = `메뉴 = ["콜라", "사이다", "우유", "커피", "주스"]
가격 = [1200, 1000, 800, 1500, 1300]
쿠폰 = {"HAPPY": 200, "LUCKY": 500, "FREE": "공짜"}
`;
const IN = (s) => s.split('\n').map((l) => (l ? '    ' + l : l)).join('\n');

const GET = `번호 = int(input("메뉴 번호(0~4): "))
값 = 가격[번호]
코드 = input("쿠폰 코드: ")
if 코드 != "":
    값 = 값 - 쿠폰[코드]
인원 = int(input("나눠 낼 사람 수: "))
한명몫 = 값 // 인원`;
const SELL = `print(메뉴[번호], "나왔습니다!")
print("한 명당", 한명몫, "원")`;

const H_ALL = `except ValueError:
    print("숫자를 정확히 입력하세요.")
except IndexError:
    print("0~4번 중에서 골라 주세요.")
except KeyError:
    print("없는 쿠폰이에요.")
except TypeError:
    print("이 쿠폰은 지금 쓸 수 없어요.")
except ZeroDivisionError:
    print("0명은 나눠 낼 수 없어요.")`;

const M1_ANSWER = `${HEAD}
try:
${IN(GET)}
${IN(SELL)}
except ValueError:
    print("숫자를 정확히 입력하세요.")
`;
const M1_STARTER = `${HEAD}
____:
${IN(GET)}
${IN(SELL)}
____ ValueError:
    print("숫자를 정확히 입력하세요.")
`;

const M2_ANSWER = `${HEAD}
try:
${IN(GET)}
${IN(SELL)}
${H_ALL}
`;
const M2_STARTER = M2_ANSWER
  .replace('except IndexError:', 'except ____:')
  .replace('except KeyError:', 'except ____:')
  .replace('except ZeroDivisionError:', 'except ____:')
  .replace('except TypeError:', '____ TypeError:');

const M3_ANSWER = `${HEAD}
try:
${IN(GET)}
${H_ALL}
else:
${IN(SELL)}
finally:
    print("이용해 주셔서 감사합니다.")
`;
const M3_STARTER = M3_ANSWER.replace('\nelse:\n', '\n____:\n').replace('\nfinally:\n', '\n____:\n');

export const MISSIONS = [
  {
    id: 'm1', no: 1, title: '첫 방어막', concept: 'try – except',
    goal: '숫자가 아닌 값을 넣어도 멈추지 않고 「숫자를 정확히 입력하세요.」 라고 말하게 하세요.',
    syntax: 'try:\n    오류가 날 수도 있는 코드\nexcept 예외이름:\n    오류가 났을 때 할 일',
    starter: M1_STARTER, answer: M1_ANSWER,
    hints: ['빈칸은 두 개예요. 위는 「시도하다」, 아래는 「~을 제외하고」 라는 뜻의 낱말이에요. (예외 exception 과 뿌리가 같아요)', '첫째 빈칸 try, 둘째 빈칸 except'],
  },
  {
    id: 'm2', no: 2, title: '종류별 방어막', concept: '여러 except',
    goal: '도감의 예외 5종을 모두 막고, 고장마다 다른 말로 알려 주세요.',
    syntax: 'except ValueError:\n    …\nexcept IndexError:\n    …',
    starter: M2_STARTER, answer: M2_ANSWER,
    hints: ['안내 문구를 읽고 어떤 예외에 대한 말인지 도감과 맞춰 보세요.', '도감에 모은 예외 이름: KeyError · ZeroDivisionError · ValueError · TypeError · IndexError'],
  },
  {
    id: 'm3', no: 3, title: '성공하면, 언제나', concept: 'else · finally',
    goal: '음료는 예외가 없을 때만(else) 내주고, 「이용해 주셔서 감사합니다.」 는 언제나(finally) 마지막에 말하게 하세요.',
    syntax: 'else:\n    예외가 나지 않았을 때만\nfinally:\n    예외가 나든 안 나든 반드시',
    starter: M3_STARTER, answer: M3_ANSWER,
    hints: ['빈칸 두 개 — 하나는 if 문에서도 쓰던 낱말이에요.', '판매 위의 빈칸은 else, 감사 인사 위의 빈칸은 finally'],
  },
  {
    id: 'boss', no: 4, title: '보스전', concept: '모든 공격', boss: true,
    goal: '공격 10가지를 한꺼번에 넣습니다. 모두 막으면서, 정상 손님 3명에게는 원래대로 팔아야 해요.',
    syntax: '',
    starter: M3_ANSWER, answer: M3_ANSWER,
    hints: ['뚫린 공격(💥)을 눌러 무슨 예외인지 확인하세요.', '정상 손님이 실패하면 판매 문구를 바꾸지 않았는지 보세요.'],
  },
];
export const missionOf = (id) => MISSIONS.find((m) => m.id === id);

/* ── 공격과 정상 손님 ──────────────────────────────────────────────── */
const V = (o) => ({ num: '0', coupon: '', people: '1', ...o });
export const ATTACKS = [
  { id: 'a1', values: V({ num: '칠' }), expect: 'ValueError', label: '번호에 「칠」' },
  { id: 'a2', values: V({ num: '2.5' }), expect: 'ValueError', label: '번호에 「2.5」' },
  { id: 'a3', values: V({ people: '둘' }), expect: 'ValueError', label: '사람 수에 「둘」' },
  { id: 'a4', values: V({ num: '7' }), expect: 'IndexError', label: '번호 7' },
  { id: 'a5', values: V({ num: '100' }), expect: 'IndexError', label: '번호 100' },
  { id: 'a6', values: V({ coupon: 'happy' }), expect: 'KeyError', label: '쿠폰 「happy」' },
  { id: 'a7', values: V({ coupon: 'BONUS' }), expect: 'KeyError', label: '쿠폰 「BONUS」' },
  { id: 'a8', values: V({ coupon: 'FREE' }), expect: 'TypeError', label: '쿠폰 「FREE」' },
  { id: 'a9', values: V({ people: '0' }), expect: 'ZeroDivisionError', label: '사람 수 0' },
  { id: 'a10', values: V({ num: '' }), expect: 'ValueError', label: '번호 칸을 비움' },
];
export const NORMALS = [
  { id: 'n1', values: V({}), label: '콜라 사기' },
  { id: 'n2', values: V({ num: '2', coupon: 'HAPPY' }), label: '우유 + HAPPY 쿠폰' },
  { id: 'n3', values: V({ num: '3', coupon: 'LUCKY', people: '2' }), label: '커피를 둘이 나눠 내기' },
];
