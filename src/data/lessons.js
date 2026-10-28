/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  교재 12장 A 의 예제(값을 바꿔 실행해 보기)와 확인 문제.
 *  ⚠ 확인 문제의 정답은 `npm test` 가 코드를 진짜로 돌려 대조한다.
 *  ⚠ node 로 그대로 불러다 시험한다. DOM 을 만들지 말 것.
 */

// 교재 예제 — fields 는 input( ) 에 차례로 넣을 값
export const LESSONS = {
  l1: {
    code: `num = int(input("숫자를 입력하세요: "))
print("입력한 값은", num, "입니다.")
print("프로그램을 마칩니다.")`,
    fields: [{ label: '숫자', def: 'hello', chips: ['7', 'hello', '3.5'] }],
  },
  l2: {
    code: `try:
    num = int(input("숫자를 입력하세요: "))
    print("입력한 값은", num, "입니다.")
except ValueError:
    print("정수를 입력해야 합니다.")
print("프로그램을 마칩니다.")`,
    fields: [{ label: '숫자', def: 'hello', chips: ['7', 'hello', '3.5'] }],
  },
  l3a: {
    code: `try:
    a = int(input("숫자1: "))
    b = int(input("숫자2: "))
    print(a / b)
except ValueError:
    print("숫자를 정확히 입력하세요.")
except ZeroDivisionError:
    print("0으로 나눌 수 없습니다.")`,
    fields: [{ label: '숫자1', def: '5', chips: ['5', '다섯'] }, { label: '숫자2', def: '0', chips: ['2', '0'] }],
  },
  l3b: {
    code: `data = ["사과", "바나나", "포도", "딸기", "수박"]
try:
    index = int(input("과일 번호를 입력하세요 (0~4): "))
    print("선택한 과일:", data[index])
except ValueError:
    print("정수를 입력해야 합니다.")
except IndexError:
    print("유효하지 않은 인덱스입니다.")`,
    fields: [{ label: '과일 번호', def: '10', chips: ['2', '10', '둘'] }],
  },
  l4: {
    // 교재 예제는 파일 열기(open)였지만, 파일 입출력을 배우기 전이라 같은 모양을 숫자 입력으로 보인다
    code: `try:
    num = int(input("숫자를 입력하세요: "))
except ValueError:
    print("정수를 입력해야 합니다.")
else:
    print("입력한 값은", num, "입니다.")
finally:
    print("프로그램을 종료합니다.")`,
    fields: [{ label: '숫자', def: 'hello', chips: ['7', 'hello'] }],
  },
};

// 교재 [참고] 「예외 처리를 남용하지 말자」 — 같은 실수(변수 이름 오타)를 두 방어막이 어떻게 다루나
export const MISUSE = {
  bad: `메뉴 = ["콜라", "사이다", "우유"]
try:
    번호 = int(input("번호: "))
    print(메뉴[번오], "나왔습니다!")
except:
    print("문제가 생겼어요.")`,
  good: `메뉴 = ["콜라", "사이다", "우유"]
try:
    번호 = int(input("번호: "))
    print(메뉴[번오], "나왔습니다!")
except ValueError:
    print("숫자를 입력하세요.")
except IndexError:
    print("0~2번만 있어요.")`,
  input: '1',
};

// 확인 문제 — choices 의 \n 은 줄바꿈. type 'output' 은 코드를 돌린 출력이 answer 와 같아야 한다.
export const QUIZ = [
  {
    q: '「abc」 를 입력했을 때 실행 결과는?', type: 'output', inputs: ['abc'],
    code: `try:
    n = int(input("번호: "))
    print("번호는", n)
except ValueError:
    print("숫자로 입력하세요.")
print("끝")`,
    choices: ['번호는 abc\n끝', '숫자로 입력하세요.\n끝', '숫자로 입력하세요.', 'ValueError 로 멈춘다'],
    answer: '숫자로 입력하세요.\n끝',
    why: 'int("abc") 에서 예외가 나면 아래 print 는 건너뛰고 except 로 갑니다. 잡았으니 프로그램은 계속 「끝」 까지 갑니다.',
  },
  {
    q: '9 와 0 을 차례로 입력했을 때 실행 결과는?', type: 'output', inputs: ['9', '0'],
    code: `try:
    a = int(input("a: "))
    b = int(input("b: "))
    print(a // b)
except ValueError:
    print("숫자를 넣어요.")
except ZeroDivisionError:
    print("0으로 나눌 수 없어요.")`,
    choices: ['0', '숫자를 넣어요.', '0으로 나눌 수 없어요.', '숫자를 넣어요.\n0으로 나눌 수 없어요.'],
    answer: '0으로 나눌 수 없어요.',
    why: 'except 는 위에서부터 보며 종류가 맞는 하나만 실행됩니다.',
  },
  {
    q: '빈칸 ㉠, ㉡ 에 알맞은 예외 이름은?', type: 'pick',
    code: `메뉴 = ["콜라", "사이다"]
try:
    i = int(input("번호: "))
    print(메뉴[i])
except ㉠:
    print("숫자를 넣어요.")
except ㉡:
    print("없는 번호예요.")`,
    choices: ['㉠ ValueError  ㉡ IndexError', '㉠ IndexError  ㉡ ValueError', '㉠ ValueError  ㉡ KeyError', '㉠ TypeError  ㉡ IndexError'],
    answer: '㉠ ValueError  ㉡ IndexError',
    why: '숫자가 아닌 글자는 ValueError, 리스트에 없는 자리는 IndexError 입니다. KeyError 는 딕셔너리에서 납니다.',
    // 시험용 — 정답을 넣으면 이 입력들에 대해 각 문구가 나와야 한다
    check: { fill: ['ValueError', 'IndexError'], cases: [['둘', '숫자를 넣어요.'], ['5', '없는 번호예요.']] },
  },
  {
    q: '「5」 를 입력했을 때 실행 결과는?', type: 'output', inputs: ['5'],
    code: `try:
    n = int(input("숫자: "))
except ValueError:
    print("A")
else:
    print("B")
finally:
    print("C")`,
    choices: ['A\nC', 'B\nC', 'B', 'A\nB\nC'],
    answer: 'B\nC',
    why: '예외가 안 났으니 else(B)가 실행되고, finally(C)는 언제나 실행됩니다.',
  },
];
