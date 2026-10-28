/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  파이썬 오류 마지막 줄(「IndexError: list index out of range」)을 한국어로 풀어 준다.
 *  실행 결과 창에서 오류 줄 아래 말풍선으로 보인다. 영어 원문은 그대로 두고 옆에 덧붙이기만 한다.
 *  ⚠ node 로 그대로 불러다 시험한다. DOM 을 만들지 말 것.
 */

// [예외 이름, 원문 꼴, 번역] — 위에서부터 맞는 것 하나를 쓴다. 원문 꼴의 괄호 묶음은 번역의 $1·$2 로 들어간다.
const RULES = [
  ['ValueError', /^invalid literal for int\(\) with base 10: (.*)$/, '정수형으로 바꿀 수 없는 값이에요: $1'],
  ['ValueError', /^could not convert string to float: (.*)$/, '실수형으로 바꿀 수 없는 값이에요: $1'],
  ['IndexError', /^list index out of range$/, '리스트의 범위를 벗어난 위치(인덱스)예요.'],
  ['IndexError', /^string index out of range$/, '문자열의 범위를 벗어난 위치(인덱스)예요.'],
  ['IndexError', /^tuple index out of range$/, '튜플의 범위를 벗어난 위치(인덱스)예요.'],
  ['KeyError', /^(.*)$/, '딕셔너리에 없는 키예요: $1'],
  ['ZeroDivisionError', /^(?:integer )?division(?: or modulo)? by zero$|^integer modulo by zero$|^float division by zero$/, '0 으로 나눌 수 없어요.'],
  ['TypeError', /^unsupported operand type\(s\) for (.+): '(\w+)' and '(\w+)'$/, '자료형이 맞지 않아 계산할 수 없어요: $2 $1 $3'],
  ['TypeError', /^can only concatenate str \(not "(\w+)"\) to str$/, '문자열에는 문자열만 + 로 이어 붙일 수 있어요. (지금 붙인 것: $1)'],
  ['TypeError', /^list indices must be integers or slices, not (\w+)$/, '리스트의 위치(인덱스)는 정수여야 해요. (지금 쓴 것: $1)'],
  ['TypeError', /^.*$/, '자료형이 맞지 않는 연산이에요.'],
  ['NameError', /^name '(.+)' is not defined/, "없는 이름(변수)이에요: '$1' — 철자를 확인해 보세요."],
  ['FileNotFoundError', /^.*$/, '그런 파일이 없어요.'],
  ['SyntaxError', /^.*$/, '파이썬 문법에 맞지 않아요. 괄호·따옴표·콜론(:)을 확인해 보세요.'],
  ['IndentationError', /^.*$/, '들여쓰기가 맞지 않아요. 줄 앞의 빈칸을 확인해 보세요.'],
];

// 자료형 이름 — 영어 그대로 두면 학생이 또 막힌다
const TYPE_KO = { int: 'int(정수)', str: 'str(문자열)', float: 'float(실수)', list: 'list(리스트)', dict: 'dict(딕셔너리)', NoneType: 'None' };

/** 오류 줄 한 줄 → 한국어 풀이. 모르는 꼴이면 '' */
export function koreanOf(line) {
  const m = /^([A-Za-z_]+(?:Error|Exception)):?\s*(.*)$/.exec(String(line || '').trim());
  if (!m) return '';
  const [, kind, msg] = m;
  for (const [k, re, ko] of RULES) {
    if (k !== kind) continue;
    const g = re.exec(msg);
    if (!g) continue;
    return ko.replace(/\$(\d)/g, (_, i) => {
      const v = g[Number(i)] ?? '';
      return TYPE_KO[v] || v;
    });
  }
  return '';
}
