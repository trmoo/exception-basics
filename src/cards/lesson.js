/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  교재 예제 카드 — 값을 골라 실행하면 실행된 줄·멈춘 줄·잡은 줄이 칠해진다.
 */
import { h, fill } from '../ui/dom.js';
import { codeView, consoleView } from '../ui/code.js';
import { runPython } from '../lib/pymini.js';
import { LESSONS, MISUSE } from '../data/lessons.js';

// 카드마다 오른쪽에 둘 짧은 설명 (교재 문장을 줄여 옮김)
const NOTES = {
  l1: ['문법은 맞지만 실행할 수 없는 상황에서 생기는 오류가 예외입니다.', '글자를 넣는 순간 그 자리에서 멈춥니다. 뒤에 코드가 아무리 많아도 실행되지 않아요.'],
  l2: ['try 안에서 예외가 나면 남은 줄은 건너뛰고 except 로 갑니다.', '오류가 나도 멈추지 않고, 안내 문구를 보여 준 뒤 계속 진행합니다.'],
  l3: ['except 를 여러 개 두면 예외마다 다르게 대응할 수 있어요.', '위에서부터 보며 종류가 맞는 하나만 실행됩니다.'],
  l4: ['else — 예외가 나지 않았을 때만', 'finally — 예외가 나든 안 나든 반드시 (마무리 인사 같은 뒷정리)'],
};

/** 실행해 보기 한 덩어리 */
function runner(lesson) {
  // 처음에는 아무 값도 고르지 않은 상태 — 학생이 칩을 고르거나 직접 쓴다
  const vals = lesson.fields.map(() => '');
  const codeHost = h('div', { class: 'ls-code' });
  const outHost = h('div', { class: 'ls-out' });
  // 값을 바꾸면 결과를 지우고 기다린다 — 실행은 언제나 [▶ 실행] 을 눌러야 한다
  function ready() {
    fill(codeHost, codeView(lesson.code));
    fill(outHost, consoleView('값을 고르고 [▶ 실행] 을 눌러 보세요.'));
  }
  const inputs = lesson.fields.map((f, k) => {
    const inp = h('input', { type: 'text', value: '', placeholder: '골라 보세요', 'aria-label': f.label, spellcheck: 'false' });
    const chips = f.chips.map((c) => h('button', { class: 'chip', onClick: () => { inp.value = c; pick(); } }, c));
    // 칸의 값과 같은 칩에 불을 켠다
    function pick() {
      vals[k] = inp.value;
      chips.forEach((b) => b.classList.toggle('on', b.textContent === inp.value));
      ready();
    }
    inp.addEventListener('input', pick);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
    return h('label', { class: 'ls-field' }, h('span', {}, f.label), inp, h('span', { class: 'chips' }, ...chips));
  });
  function run() {
    const r = runPython(lesson.code, { inputs: vals.slice(), echo: true, file: '예제.py' });
    fill(codeHost, codeView(lesson.code, { ran: r.ran, crash: r.ok ? null : r.errorLine, crashType: r.errorType, caught: r.caught }));
    fill(outHost, consoleView(r.ok ? r.output : `${r.output}\n${r.traceback}`.trim(),
      { title: r.ok ? (r.caught.length ? '실행 결과 — 🛡️ 예외를 잡았어요' : '실행 결과') : '실행 결과 — 💥 멈췄어요' }));
  }
  ready();
  const controls = h('div', { class: 'ls-controls' }, ...inputs, h('button', { class: 'btn primary', onClick: run }, '▶ 실행'));
  return { codeHost, outHost, controls, run };
}

export function lessonCard(id) {
  return (body) => {
    const notes = h('ul', { class: 'ls-notes' }, ...(NOTES[id] || []).map((t) => h('li', {}, t)));
    // 3절은 교재 예제 두 개를 고른다
    const variants = id === 'l3'
      ? [{ label: '나누기 예제', make: () => runner(LESSONS.l3a) }, { label: '과일 번호 예제', make: () => runner(LESSONS.l3b) }]
      : [{ label: '', make: () => runner(LESSONS[id]) }];
    const left = h('div', { class: 'ls-left' });
    const right = h('div', { class: 'ls-right' });
    const pills = h('div', { class: 'pills' });
    let cur = 0;
    function show(k) {
      cur = k;
      const v = variants[k];
      const r = v.make();
      fill(left, r.codeHost);
      fill(right, variants.length > 1 ? pills : null, r.controls, r.outHost, notes);
      fill(pills, ...variants.map((x, j) => h('button', { class: 'pill' + (j === cur ? ' on' : ''), onClick: () => show(j) }, x.label)));
    }
    fill(body, h('div', { class: 'lesson' }, left, right));
    show(0);
  };
}

/** 교재 [참고] — except: 만 쓰면 무엇이 잘못됐는지 알 수 없다 */
export function misuseCard(body) {
  const one = (title, code, tone) => {
    const out = h('div', {});
    const box = h('div', { class: `mis-box ${tone}` },
      h('div', { class: 'mis-title' }, title), codeView(code), out);
    const r = runPython(code, { inputs: [MISUSE.input], echo: true, file: '자판기.py' });
    fill(out, consoleView(r.ok ? r.output : `${r.output}\n${r.traceback}`.trim(), { title: `번호 ${MISUSE.input} (정상 손님) 을 넣으면` }));
    return box;
  };
  fill(body, h('div', { class: 'misuse' },
    h('p', { class: 'lead' }, '둘 다 4번째 줄에 ', h('b', {}, '변수 이름 오타'), '(번호 → 번오)가 있어요. 정상 손님이 1번을 골랐을 때:'),
    h('div', { class: 'mis-pair' },
      one('😥 except: 만 쓴 방어막', MISUSE.bad, 'bad'),
      one('😊 예외 이름을 적은 방어막', MISUSE.good, 'good')),
    h('p', { class: 'mis-why' }, '왼쪽은 무엇이든 「문제가 생겼어요」 로 덮어서 ', h('b', {}, '오타를 영영 찾을 수 없어요.'),
      ' 오른쪽은 예상하지 못한 NameError 가 그대로 드러나 바로 고칠 수 있어요. → ', h('b', {}, '예상되는 예외의 이름을 정해 처리합니다.'))));
}
