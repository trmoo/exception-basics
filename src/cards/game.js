/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  🎰 1라운드 「부숴봐!」 와 📖 예외 도감.
 */
import { h, fill, modal, screenTimeout } from '../ui/dom.js';
import { createVending } from '../ui/vending.js';
import { codeView, consoleView, inputForm } from '../ui/code.js';
import { MACHINE_CODE, CARDS, cardOf, FIELDS } from '../data/machine.js';
import { runMachine, logicSlip } from '../game/runner.js';
import { S, addCard, openHint } from '../game/store.js';
import { currentHint } from '../game/hints.js';
import { koreanOf } from '../data/translate.js';

/** 이 예외를 낸 입력 칸 — 도감 설명 창에서 그 칸에 「💥 여기서」 를 붙인다 */
function culprit(id, v) {
  const isInt = (x) => /^\s*[-+]?\d+\s*$/.test(String(x ?? ''));
  if (id === 'ValueError') return !isInt(v.num) ? 'num' : 'people';
  if (id === 'IndexError') return 'num';
  if (id === 'KeyError' || id === 'TypeError') return 'coupon';
  if (id === 'ZeroDivisionError') return 'people';
  return '';
}

/** 모은 카드 칩 줄 — 위에 「도감」 이 무엇인지 적는다 */
function chipRow() {
  const n = Object.keys(S.cards).length;
  return h('div', { class: 'got-box' },
    h('div', { class: 'got-title' }, h('b', {}, `📖 내 도감 ${n}/${CARDS.length}`), ' — 찾아낸 예외를 모으는 카드 모음'),
    h('div', { class: 'got-row' }, ...CARDS.map((c) => {
      const got = !!S.cards[c.id];
      return h('span', { class: 'got' + (got ? ' on' : ''), style: { '--c': c.color } }, got ? `${c.icon} ${c.id}` : '❔ ???');
    })));
}

/** 💡 힌트 상자 — 학생이 누를 때만, 한 번에 하나씩. 찾은 예외에 따라 노릴 곳이 바뀐다. */
function hintBox() {
  const el = h('div', { class: 'hint-box' });
  function draw() {
    const t = currentHint(S.cards, S.hints || {});
    if (!t) { fill(el, h('p', { class: 'hint-done' }, `🎉 ${CARDS.length}가지를 모두 찾았어요!`)); return; }
    const btn = t.more
      ? h('button', { class: 'btn hint-btn', onClick: () => { openHint(); draw(); } }, t.level ? `💡 다음 힌트 (${t.level + 1}/${t.total})` : '💡 힌트 보기')
      : null;
    if (!t.level) { fill(el, h('p', { class: 'hint-wait' }, '막히면 힌트를 하나씩 열어 보세요.'), btn); return; }
    fill(el,
      h('p', { class: 'hint-intro' }, t.intro),
      h('p', { class: 'hint-text' }, h('b', {}, `힌트 ${t.level}/${t.total}`), ' ', t.text),
      btn || h('p', { class: 'hint-wait' }, '마지막 힌트예요. 직접 넣어 보세요!'));
  }
  draw();
  return { el, draw };
}

export function breakCard(body) {
  const vm = createVending();
  const codeHost = h('div', { class: 'bk-code' });
  const outHost = h('div', { class: 'bk-out' });
  const banner = h('div', { class: 'banner' }, '값을 바꿔 넣고 [▶ 넣기]! 목표는 자판기를 멈추게 하는 것.');
  const rowHost = h('div', {});
  const hint = hintBox();
  const form = inputForm({}, { onRun: run, runLabel: '▶ 넣기', compact: true });

  function run(values) {
    const res = runMachine(MACHINE_CODE, values);
    vm.show(res, values);
    fill(codeHost, codeView(MACHINE_CODE, { ran: res.ran, crash: res.status === 'crash' ? res.line : null, crashType: res.type }));
    fill(outHost, consoleView(res.console));
    if (res.status === 'crash') {
      const c = cardOf(res.type);
      const isNew = c ? addCard(res.type, { values, msg: res.msg }) : false;
      banner.className = 'banner crash';
      fill(banner, h('b', {}, `💥 고장! ${res.type}`), ` — ${res.line}번째 줄에서 멈췄어요. `, isNew ? h('span', { class: 'b-new' }, '🎉 새 카드!') : null);
      fill(rowHost, chipRow());
      if (isNew) hint.draw();
      if (isNew) screenTimeout(() => pop(c), 1300);
    } else if (logicSlip(values, res)) {
      // 예외는 아니지만 결과가 틀렸다 — 논리 오류를 짚고 넘어간다
      banner.className = 'banner logic';
      fill(banner, h('b', {}, '🤔 논리 오류!'), ' 멈추지는 않았지만 결과가 틀렸어요. ', logicSlip(values, res).text,
        h('br'), h('small', {}, '예외가 아니라서 try–except 로는 못 잡아요. if 로 값을 직접 검사해야 해요.'));
    } else {
      banner.className = 'banner ok';
      fill(banner, h('b', {}, '✅ 정상 판매'), ' — 멀쩡하네요. 다른 값으로 고장 내 보세요!');
    }
  }
  function pop(c) {
    modal(`${c.icon} 도감에 새 카드!`, h('div', { class: 'pop-card' },
      h('div', { class: 'card big', style: { '--c': c.color } }, h('div', { class: 'card-icon' }, c.icon), h('div', { class: 'card-name' }, c.id), h('div', { class: 'card-nick' }, c.nick)),
      h('p', {}, c.what)), { ok: '도감에 넣기' });
  }

  fill(codeHost, codeView(MACHINE_CODE));
  fill(outHost, consoleView('여기에 자판기가 한 일이 찍혀요.'));
  fill(rowHost, chipRow());
  fill(body, h('div', { class: 'break' },
    // 왼쪽부터 코드 → 자판기(+ 도감·힌트) → 입력 칸(+ 결과 안내)
    h('div', { class: 'bk-right' }, codeHost, outHost),
    h('div', { class: 'bk-machine' }, vm.el, rowHost, hint.el),
    h('div', { class: 'bk-mid' }, form.el, banner)));
  vm.show(null);
}

export function dexCard(body) {
  const open = (c) => {
    const got = S.cards[c.id];
    const v = got && got.values;
    const bad = v ? culprit(c.id, v) : '';
    const ko = got && got.msg ? koreanOf(`${c.id}: ${got.msg}`) : '';
    modal(`${c.icon} ${c.id}`, h('div', { class: 'dex-detail', style: { '--c': c.color } },
      h('div', { class: 'dd-head' }, h('span', { class: 'dd-nick' }, c.nick)),
      h('section', { class: 'dd-sec' }, h('h4', {}, '📌 언제 나나요?'), h('p', {}, c.what)),
      h('section', { class: 'dd-sec' }, h('h4', {}, '💭 비유하면'), h('p', {}, c.like)),
      v ? h('section', { class: 'dd-sec' }, h('h4', {}, '🎰 내가 넣은 값'),
        h('div', { class: 'dd-vals' }, ...FIELDS.map((f) => {
          const val = v[f.key] === '' || v[f.key] == null ? '' : String(v[f.key]);
          return h('span', { class: 'dd-val' + (f.key === bad ? ' bad' : '') + (val ? '' : ' empty') },
            h('small', {}, `${f.icon} ${f.label}`), h('b', {}, val || '(빈칸)'), f.key === bad ? h('em', {}, '💥 여기서') : null);
        }))) : null,
      got && got.msg ? h('section', { class: 'dd-sec' }, h('h4', {}, '🐍 파이썬이 남긴 말'),
        h('div', { class: 'dd-py' }, h('code', {}, `${c.id}: ${got.msg}`)),
        ko ? h('p', { class: 'dd-ko' }, `💬 ${ko}`) : null) : null), { ok: '닫기' });
  };
  const n = Object.keys(S.cards).length;
  fill(body, h('div', { class: 'dex' },
    h('p', { class: 'lead' }, `예외 ${CARDS.length}종 가운데 `, h('b', {}, `${n}가지`), '를 찾았어요. ', n < CARDS.length ? '막히면 💡 힌트를 열고, 앞 카드로 돌아가 마저 찾아보세요.' : '모두 찾았어요! 이제 막을 차례예요.'),
    h('div', { class: 'dex-grid' }, ...CARDS.map((c) => {
      const got = !!S.cards[c.id];
      return h('button', { class: 'card' + (got ? '' : ' locked'), style: { '--c': c.color }, onClick: () => (got ? open(c) : null), disabled: !got },
        h('div', { class: 'card-icon' }, got ? c.icon : '❔'),
        h('div', { class: 'card-name' }, got ? c.id : '???'),
        h('div', { class: 'card-nick' }, got ? c.nick : '아직 못 찾았어요'));
    }), h('div', { class: 'card dex-hint' }, hintBox().el))));
}
