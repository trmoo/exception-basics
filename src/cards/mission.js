/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  🛡️ 2라운드 미션 카드 — 왼쪽은 내 코드, 오른쪽은 목표와 채점 결과.
 *  채점은 학생 코드를 공격·정상 손님에게 진짜로 실행해 판정한다.
 */
import { h, fill, modal, toast, onCleanup, screenTimeout } from '../ui/dom.js';
import { createVending } from '../ui/vending.js';
import { codeView, consoleView, codeEditor } from '../ui/code.js';
import { MACHINE_CODE, cardOf, FIELDS } from '../data/machine.js';
import { MISSIONS, ATTACKS, NORMALS, missionOf } from '../data/missions.js';
import { runMachine } from '../game/runner.js';
import { checkMission, KINDS } from '../game/judge.js';
import { S, saveCode, passMission, reportFail, setBoss } from '../game/store.js';

const VERDICT = {
  blocked: { icon: '🛡️', cls: 'good', text: '막음' },
  crash: { icon: '💥', cls: 'bad', text: '뚫림' },
  silent: { icon: '🤐', cls: 'warn', text: '말 없음' },
  leak: { icon: '🍹', cls: 'bad', text: '팔아 버림' },
  broken: { icon: '⛔', cls: 'bad', text: '코드 오류' },
  blank: { icon: '✏️', cls: 'warn', text: '빈칸' },
};

/** 보스전은 「내가 만든 방어막」 으로 시작 — 통과한 미션 가운데 가장 뒤의 내 코드, 없으면 맨손 */
function bossStart() {
  for (const id of ['m3', 'm2', 'm1']) if (S.missions[id] && S.codes[id]) return S.codes[id];
  return MACHINE_CODE;
}

/** 공격 하나를 내 코드로 다시 돌려 자판기와 콘솔로 보여 준다 */
function showRun(code, item) {
  const vm = createVending({ small: true });
  const r = runMachine(code, item.values);
  vm.show(r, item.values);
  modal(item.label, h('div', { class: 'run-detail' }, vm.el,
    h('div', {}, h('p', { class: 'muted' }, FIELDS.map((f) => `${f.icon} ${item.values[f.key] || '(빈칸)'}`).join('  ')), consoleView(r.console))), { ok: '닫기', wide: true });
}

export function missionCard(id) {
  return (body) => {
    const m = missionOf(id);
    const start = S.codes[id] || (m.boss ? bossStart() : m.starter);
    let saveT = null;
    const ed = codeEditor(start, {
      onChange: (v) => { clearTimeout(saveT); saveT = setTimeout(() => saveCode(id, v), 400); },
      onRun: () => grade(),
    });
    onCleanup(() => { clearTimeout(saveT); saveCode(id, ed.value); });

    const result = h('div', { class: 'ms-result' });
    let hintLv = 0;
    const hintBox = h('div', { class: 'ms-hint' });
    const paintHint = () => fill(hintBox,
      ...m.hints.slice(0, hintLv).map((t) => h('div', { class: 'hint' }, `💡 ${t}`)),
      hintLv < m.hints.length ? h('button', { class: 'btn small', onClick: () => { hintLv++; paintHint(); } }, `💡 힌트 ${hintLv + 1}`) : null);
    paintHint();

    function grade() {
      saveCode(id, ed.value);
      const c = checkMission(m, ed.value);
      if (c.blank) { ed.mark({ [c.blank]: 'crash' }); ed.focusLine(c.blank); }
      else if (c.broken && c.broken.line) ed.mark({ [c.broken.line]: 'crash' });
      else ed.mark({});
      if (c.pass) { if (passMission(id)) toast(`🎉 ${m.boss ? '보스전' : `미션 ${m.no}`} 통과!`, 'gold'); }
      else reportFail(id, c.fails);
      if (m.boss && c.ev) {
        const n = c.ev.attacks.filter((x) => x.verdict === 'blocked').length;
        setBoss(n, c.stars ? c.stars.count : 0);
        return paintBoss(c);
      }
      paintResult(c);
    }

    // 미션 1~3 — 예외 5종 칩 + 확인 목록
    function paintResult(c) {
      const chips = c.ev ? h('div', { class: 'kind-row' }, ...KINDS.map((k) => {
        const x = c.ev.attacks.find((a) => a.atk.expect === k && a.verdict !== 'blocked') || c.ev.attacks.find((a) => a.atk.expect === k);
        const v = VERDICT[x.verdict];
        return h('button', { class: `kind ${v.cls}`, title: x.atk.label, onClick: () => showRun(ed.value, x.atk) },
          h('span', { class: 'k-icon' }, v.icon), h('span', { class: 'k-name' }, cardOf(k).icon + ' ' + k.replace('Error', '')));
      })) : null;
      fill(result,
        h('div', { class: 'ms-head ' + (c.pass ? 'pass' : 'fail') }, c.pass ? '✅ 통과!' : '🔧 조금만 더'),
        chips,
        h('ul', { class: 'checklist' }, ...c.items.map((it) => h('li', { class: it.ok ? 'ok' : 'no' }, it.ok ? '✅ ' : '⬜ ', it.text,
          !it.ok && it.why ? h('div', { class: 'why' }, it.why) : null))),
        ...(c.notes || []).map((n) => h('div', { class: 'note' }, `${n.icon} ${n.text}`)));
    }

    // 보스전 — 자판기가 공격 하나하나에 반응한다
    const vm = m.boss ? createVending({ small: true }) : null;
    function paintBoss(c) {
      if (!c.ev) { paintResult(c); return; }
      const rows = [...c.ev.attacks.map((x) => ({ x, atk: true })), ...c.ev.normals.map((x) => ({ x, atk: false }))];
      const tiles = h('div', { class: 'boss-tiles' });
      const score = h('div', { class: 'boss-score' });
      fill(result, h('div', { class: 'boss' }, h('div', { class: 'boss-vm' }, vm.el), h('div', {}, score, tiles)));
      let k = 0, nb = 0, ns = 0;
      const step = () => {
        if (k >= rows.length) {
          const st = c.stars || { count: 0 };
          fill(score, h('div', { class: 'stars' }, ...[0, 1, 2].map((s) => h('span', { class: s < st.count ? 'on' : '' }, '⭐'))),
            h('div', {}, `🛡️ ${nb}/${ATTACKS.length} · 🧑 ${ns}/${NORMALS.length}`),
            h('div', { class: 'muted small' }, `${st.all ? '⭐' : '☆'} 모두 막기  ${st.distinct ? '⭐' : '☆'} 고장마다 다른 말  ${st.noCatchAll ? '⭐' : '☆'} except: 안 쓰기`),
            ...(c.notes || []).map((n) => h('div', { class: 'note small' }, `${n.icon} ${n.text}`)));
          return;
        }
        const { x, atk } = rows[k++];
        const item = atk ? x.atk : x.n;
        const v = atk ? VERDICT[x.verdict] : (x.ok ? { icon: '🙂', cls: 'good' } : { icon: '😟', cls: 'bad' });
        if (atk && x.verdict === 'blocked') nb++;
        if (!atk && x.ok) ns++;
        vm.show(x.r, item.values);
        tiles.appendChild(h('button', { class: `tile ${v.cls} enter`, onClick: () => showRun(ed.value, item) }, h('span', {}, v.icon), h('small', {}, item.label)));
        fill(score, h('div', {}, `🛡️ ${nb}/${ATTACKS.length} · 🧑 ${ns}/${NORMALS.length}`));
        screenTimeout(step, 380);
      };
      step();
    }

    const prev = MISSIONS[MISSIONS.indexOf(m) - 1];
    const prevCode = prev && S.codes[prev.id];
    const tools = h('div', { class: 'ms-tools' },
      h('button', { class: 'btn primary', onClick: grade }, m.boss ? '👾 공격 시작!' : '🛡️ 채점하기'),
      h('button', { class: 'btn small', onClick: () => { const v = m.boss ? m.answer : m.starter; ed.value = v; saveCode(id, v); } }, m.boss ? '↺ 모범 방어막' : '↺ 처음 코드'),
      prevCode && !m.boss && id !== 'm2' ? h('button', { class: 'btn small', onClick: () => { ed.value = prevCode; saveCode(id, prevCode); toast(`미션 ${prev.no} 의 내 코드를 가져왔어요`); } }, `⬅ 미션 ${prev.no} 내 코드`) : null,
      m.boss ? h('button', { class: 'btn small', onClick: () => { ed.value = MACHINE_CODE; saveCode(id, MACHINE_CODE); } }, '🔥 맨손으로') : null);

    fill(body, h('div', { class: 'mission' },
      h('div', { class: 'ms-left' }, h('div', { class: 'ms-label' }, '✏️ 내 자판기 코드 ', h('span', { class: 'muted' }, '(Tab 들여쓰기 · Ctrl+Enter 채점)')), ed.el),
      h('div', { class: 'ms-right' },
        h('div', { class: 'ms-goal' }, h('span', { class: 'concept' }, m.concept), ' ', m.goal),
        m.syntax ? h('div', { class: 'ms-syntax' }, codeView(m.syntax)) : null,
        tools, hintBox, result)));
    if (m.boss) { fill(result, h('div', { class: 'boss' }, h('div', { class: 'boss-vm' }, vm.el), h('p', { class: 'muted' }, '[👾 공격 시작!] 을 누르면 공격 10가지와 정상 손님 3명이 차례로 들어와요.'))); vm.show(null); }
    else fill(result, h('p', { class: 'muted' }, '빈칸을 채우고 [🛡️ 채점하기] — 1라운드의 공격이 그대로 다시 들어와요.'));
  };
}
