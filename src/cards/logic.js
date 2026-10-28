/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  ⭐ 심화 — 논리 오류 (1차시에 미션을 빨리 끝낸 학생용)
 *    errorsCard  실행 오류 ↔ 논리 오류 비교 + 같은 자판기에서 두 손님을 나란히 돌려 보기
 *    logicCard   🔍 논리 오류 사냥 — 같은 자판기에서 「멈추지 않는데 틀린 것」 4가지를 찾는다
 */
import { h, fill, modal, screenTimeout } from '../ui/dom.js';
import { createVending } from '../ui/vending.js';
import { codeView, consoleView, inputForm } from '../ui/code.js';
import { MACHINE_CODE, FIELDS } from '../data/machine.js';
import { LOGIC, logicOf, logicHint, COMPARE, PAIR } from '../data/logic.js';
import { runMachine, logicSlip } from '../game/runner.js';
import { S, addLogic, openLogicHint } from '../game/store.js';

/* ── 실행 오류 ↔ 논리 오류 ─────────────────────────────────────────── */
export function errorsCard(body) {
  const table = h('table', { class: 'cmp' },
    h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', { class: 'rt' }, '💥 실행 오류 (예외)'), h('th', { class: 'lg' }, '🤔 논리 오류'))),
    h('tbody', {}, ...COMPARE.map(([k, a, b]) => h('tr', {}, h('th', {}, k), h('td', { class: 'rt' }, a), h('td', { class: 'lg' }, b)))));
  const runs = PAIR.map((p) => {
    const out = h('div', { class: 'pair-out' });
    const note = h('p', { class: 'pair-note' });
    const go = () => {
      const r = runMachine(MACHINE_CODE, p.values);
      fill(out, consoleView(r.console, { title: `자판기 — ${p.say}` }));
      if (r.status === 'crash') fill(note, h('b', {}, '멈췄어요.'), ` 파이썬이 ${r.type} 라고 알려 줬어요. → 실행 오류`);
      else {
        const s = logicSlip(p.values, r);
        fill(note, h('b', {}, '멈추지 않았어요.'), ' 그런데… ', s ? s.text : '', ' → 논리 오류');
      }
    };
    fill(out, consoleView('[▶ 돌려 보기] 를 눌러 보세요.', { title: `자판기 — ${p.say}` }));
    return h('div', { class: 'pair ' + p.kind },
      h('div', { class: 'pair-head' }, h('b', {}, p.label), h('button', { class: 'btn small', onClick: go }, `▶ ${p.say} 로 돌려 보기`)),
      out, note);
  });
  fill(body, h('div', { class: 'errs' },
    h('div', { class: 'errs-left' },
      h('p', { class: 'lead' }, '지금까지 잡은 것은 ', h('b', {}, '실행 오류(예외)'), '였어요. 그런데 ', h('b', {}, '멈추지도 않고 아무 말도 없는데 틀린'), ' 오류도 있어요.'),
      table,
      h('p', { class: 'muted small-note' }, '📝 문법 오류(콜론·괄호 빠짐 등)는 실행하기 전에 걸려요. 오늘은 실행한 뒤에 생기는 두 가지를 견줘 봐요.')),
    h('div', { class: 'errs-right' }, ...runs)));
}

/* ── 🔍 논리 오류 사냥 ──────────────────────────────────────────────── */
function logicSlots(onOpen) {
  const n = LOGIC.filter((x) => S.logic && S.logic[x.id]).length;
  return h('div', { class: 'got-box' },
    h('div', { class: 'got-title' }, h('b', {}, `🔍 논리 오류 도감 ${n}/${LOGIC.length}`), ' — 멈추지 않는데 틀린 것'),
    h('div', { class: 'lg-row' }, ...LOGIC.map((x) => {
      const got = !!(S.logic && S.logic[x.id]);
      return h('button', { class: 'lg-slot' + (got ? ' on' : ''), style: { '--c': x.color }, disabled: !got, onClick: () => onOpen(x) },
        got ? `${x.icon} ${x.name}` : '❔ ???');
    })));
}

function logicHintBox() {
  const el = h('div', { class: 'hint-box' });
  function draw() {
    const t = logicHint(S.logic || {}, S.lhints || {});
    if (!t) { fill(el, h('p', { class: 'hint-done' }, `🎉 ${LOGIC.length}가지를 모두 찾았어요! 카드를 눌러 막는 법을 보세요.`)); return; }
    const btn = t.more ? h('button', { class: 'btn hint-btn', onClick: () => { openLogicHint(); draw(); } }, t.level ? `💡 다음 힌트 (${t.level + 1}/${t.total})` : '💡 힌트 보기') : null;
    if (!t.level) { fill(el, h('p', { class: 'hint-wait' }, `${t.found}가지 찾음. 막히면 힌트를 하나씩 열어 보세요.`), btn); return; }
    fill(el, h('p', { class: 'hint-text' }, h('b', {}, `힌트 ${t.level}/${t.total}`), ' ', t.text),
      btn || h('p', { class: 'hint-wait' }, '마지막 힌트예요. 직접 넣어 보세요!'));
  }
  draw();
  return { el, draw };
}

/** 찾은 논리 오류 자세히 — 무엇이 틀렸나 · 내가 넣은 값 · if 로 막는 법 */
function openLogic(x) {
  const got = S.logic && S.logic[x.id];
  const v = got && got.values;
  modal(`${x.icon} ${x.name}`, h('div', { class: 'dex-detail', style: { '--c': x.color } },
    h('div', { class: 'dd-head' }, h('span', { class: 'dd-nick' }, '논리 오류 — 멈추지 않는데 틀린 것')),
    h('section', { class: 'dd-sec' }, h('h4', {}, '📌 무엇이 틀렸나요?'), h('p', {}, x.what)),
    v ? h('section', { class: 'dd-sec' }, h('h4', {}, '🎰 내가 넣은 값'),
      h('div', { class: 'dd-vals' }, ...FIELDS.map((f) => {
        const val = v[f.key] === '' || v[f.key] == null ? '' : String(v[f.key]);
        return h('span', { class: 'dd-val' + (val ? '' : ' empty') }, h('small', {}, `${f.icon} ${f.label}`), h('b', {}, val || '(빈칸)'));
      }))) : null,
    h('section', { class: 'dd-sec' }, h('h4', {}, '🛠 이렇게 막아요 — try–except 가 아니라 if 로 값을 먼저 검사'),
      codeView(x.fix)),
  ), { ok: '닫기', wide: true });
}

export function logicCard(body) {
  const vm = createVending();
  const codeHost = h('div', { class: 'bk-code' });
  const outHost = h('div', { class: 'bk-out' });
  const banner = h('div', { class: 'banner' }, '값을 넣어 [▶ 넣기]! 이번 목표는 멈추게 하는 것이 아니라 ', h('b', {}, '멈추지 않는데 틀리게'), ' 만드는 것.');
  const slotHost = h('div', {});
  const hint = logicHintBox();
  const form = inputForm({}, { onRun: run, runLabel: '▶ 넣기', compact: true });

  function run(values) {
    const res = runMachine(MACHINE_CODE, values);
    vm.show(res, values);
    fill(codeHost, codeView(MACHINE_CODE, { ran: res.ran, crash: res.status === 'crash' ? res.line : null, crashType: res.type }));
    fill(outHost, consoleView(res.console));
    if (res.status === 'crash') {
      banner.className = 'banner crash';
      fill(banner, h('b', {}, `💥 이건 실행 오류 — ${res.type}`), ' 파이썬이 멈추고 알려 줬죠? 지금 찾는 건 ', h('b', {}, '멈추지 않는데 틀린 것'), '이에요.');
      return;
    }
    const slip = logicSlip(values, res);
    if (!slip) {
      banner.className = 'banner ok';
      fill(banner, h('b', {}, '✅ 멈추지 않았어요.'), ' 그런데 결과도 맞나요? 「한 명당 × 사람 수 = 값」 인지, 고른 음료가 맞는지 따져 보세요.');
      return;
    }
    const x = logicOf(slip.kind);
    const isNew = addLogic(slip.kind, values);
    banner.className = 'banner logic';
    fill(banner, h('b', {}, `🤔 논리 오류! ${x.icon} ${x.name}`), ' ', slip.text, isNew ? h('span', { class: 'b-new' }, ' 🎉 새로 찾음!') : null);
    fill(slotHost, logicSlots(openLogic));
    if (isNew) { hint.draw(); screenTimeout(() => openLogic(x), 1300); }
  }

  fill(codeHost, codeView(MACHINE_CODE));
  fill(outHost, consoleView('여기에 자판기가 한 일이 찍혀요.'));
  fill(slotHost, logicSlots(openLogic));
  fill(body, h('div', { class: 'break' },
    h('div', { class: 'bk-right' }, codeHost, outHost),
    h('div', { class: 'bk-machine' }, vm.el, slotHost, hint.el),
    h('div', { class: 'bk-mid' }, form.el, banner)));
  vm.show(null);
}
