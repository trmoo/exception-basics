/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  진짜 파이썬과 견줄 코드 조각들. `python tools/golden.py` 가 진짜 파이썬으로 돌려 test/golden.json 을 만든다.
 *  ⚠ 조각·자판기·미션·교재 예제를 고치면 golden.py 를 다시 돌릴 것.
 */
import { MACHINE_CODE, FIELDS } from '../src/data/machine.js';
import { MISSIONS, ATTACKS, NORMALS } from '../src/data/missions.js';
import { LESSONS, MISUSE, QUIZ } from '../src/data/lessons.js';

const SNIPPETS = [
  ['파일 읽기', `f = open("공지.txt", "r")\nprint(f.read())\nf.close()`],
  ['없는 파일', `open("없는.txt", "r")`],
  ['빈 파일 이름', `open("", "r")`],
  ['FileNotFoundError 잡기', `try:\n    open("x.txt")\nexcept FileNotFoundError:\n    print("없음")\nelse:\n    print("있음")\nfinally:\n    print("끝")`],
  ['readline · readlines', `f = open("여러줄.txt")\nprint(f.readline(), end="")\nprint(f.readlines())`],
  ['except 순서', `try:\n    [1][3]\nexcept ValueError:\n    print("V")\nexcept IndexError:\n    print("I")\nprint("계속")`],
  ['잡히지 않는 종류', `try:\n    {"a": 1}["b"]\nexcept IndexError:\n    print("I")`],
  ['int 여러 꼴', `for t in ["7", " 8 ", "칠", "2.5", ""]:\n    try:\n        print(int(t))\n    except ValueError:\n        print("X")`],
  ['나누기', `print(7 // 2, 7 / 2)\nprint(1 // 0)`],
];

// 앱은 파일 입출력을 쓰지 않지만(학생들이 아직 안 배움), 해석기의 open( ) 이 진짜 파이썬과 같은지는 계속 본다
export const EXTRA_FILES = { '공지.txt': '📢 오늘도 맛있게 드세요!', '여러줄.txt': '첫째\n둘째\n셋째\n' };

export function cases() {
  const order = FIELDS.map((f) => f.key);
  const ins = (v) => order.map((k) => v[k]);
  const out = SNIPPETS.map(([name, code]) => ({ name, code, files: EXTRA_FILES }));
  for (const a of [...ATTACKS, ...NORMALS]) out.push({ name: `자판기 · ${a.label}`, code: MACHINE_CODE, inputs: ins(a.values), files: {} });
  for (const m of MISSIONS) for (const a of [...ATTACKS, ...NORMALS]) out.push({ name: `${m.id} 답 · ${a.label}`, code: m.answer, inputs: ins(a.values), files: {} });
  for (const [id, l] of Object.entries(LESSONS)) {
    // 칩 값을 하나씩 (나머지 칸은 기본값)
    l.fields.forEach((f, k) => f.chips.forEach((ch) => {
      const v = l.fields.map((x, j) => (j === k ? ch : x.def));
      out.push({ name: `교재 ${id} · ${f.label}=${ch}`, code: l.code, inputs: v, files: {} });
    }));
  }
  out.push({ name: '남용 · except:', code: MISUSE.bad, inputs: [MISUSE.input], files: {} });
  out.push({ name: '남용 · 이름 적기', code: MISUSE.good, inputs: [MISUSE.input], files: {} });
  QUIZ.forEach((q, i) => { if (q.type === 'output') out.push({ name: `확인 문제 ${i + 1}`, code: q.code, inputs: q.inputs || [], files: {} }); });
  return out;
}
