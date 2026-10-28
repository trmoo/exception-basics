/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  교사 대시보드 — 웹 앱 주소에 ?page=teacher 를 붙여 연다. 교실 TV 에 띄우는 1280×720 한 화면.
 *    📺 발표 화면   — 우리 반이 찾은 예외 · 개인 순위 · 방금 소식 (학생과 함께 본다)
 *    🔍 선생님 화면 — 학생별 진행 · 미션별 통과 수 · 가장 많이 막힌 곳 · 확인 문제 정답률
 *    ✍️ 정리       — 학생이 결과 카드에서 제출한 「오늘 배운 것」 을 물음별로 읽는다 (2026-10-28 사용자 지시)
 *                    이 화면을 볼 때만 글을 불러온다(apiNotes). TV 에 띄울 때는 [🙈 이름 가리기].
 *  ⚠ 몇 초마다 서버를 묻는 것은 이 화면 하나뿐이다(학생 기기는 사건이 있을 때만 보낸다).
 */
import { h, fill, toast, modal } from '../ui/dom.js';
import { call, MODE } from '../net/gas.js';
import { CARDS, cardOf } from '../data/machine.js';
import { MISSIONS } from '../data/missions.js';
import { QUIZ } from '../data/lessons.js';
import { scoreOf, stuckText, MISSION_LABEL } from './score.js';
import { PARTS, partOf } from '../data/parts.js';
import { maskName } from '../data/who.js';
import { wrapupFor } from '../data/wrapup.js';

const POLL_MS = 5000;

export function renderDashboard(stage) {
  let token = '';
  try { token = sessionStorage.getItem('exc-basics:tok') || ''; } catch (e) { /* 무시 */ }
  let view = 'show';
  let sid = '';
  let data = null;
  let timer = null;
  let lastFeed = '';
  // ✍️ 정리 — 제출한 글(notes)과 보고 있는 차시·물음·이름 가리기
  let notes = null;
  const nv = { part: '', q: '', mask: false };
  let notesDrawn = '';

  const head = h('header', { class: 'card-head dash-head' });
  const body = h('main', { class: 'card-body' });
  fill(stage, head, body);

  if (MODE === 'solo') {
    fill(body, h('div', { class: 'center-msg' }, h('h2', {}, '교사 대시보드'), h('p', {}, '대시보드는 앱스 스크립트 웹 앱 주소로 열어야 해요. (지금은 서버 없이 파일로 열었어요)')));
    return;
  }
  if (!token) login(); else start();

  function login() {
    clearInterval(timer);
    const pw = h('input', { type: 'password', class: 'pw', placeholder: '교사 암호', 'aria-label': '교사 암호' });
    const go = () => call('apiLogin', pw.value).then((r) => {
      if (!r.ok) { toast(r.msg, 'bad'); return; }
      token = r.token;
      try { sessionStorage.setItem('exc-basics:tok', token); } catch (e) { /* 무시 */ }
      start();
    }).catch((e) => toast(e.message, 'bad'));
    pw.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    fill(head, h('h1', {}, '🥤 부숴봐! 자판기 — 교사 대시보드'));
    fill(body, h('div', { class: 'center-msg' }, h('h2', {}, '🔒 교사 암호'), pw, h('button', { class: 'btn primary big', onClick: go }, '들어가기'),
      h('p', { class: 'muted' }, '암호는 시트 메뉴 「🥤 부숴봐! 자판기 → ② 교사 암호 정하기」 에서 정해요.')));
    pw.focus();
  }

  function start() {
    poll();
    clearInterval(timer);
    timer = setInterval(poll, POLL_MS);
  }
  function poll() {
    call('apiDashboard', token, sid).then((d) => {
      data = d;
      if (d.session && !sid) sid = d.session.id;
      // ✍️ 정리 화면을 볼 때만 글을 함께 읽는다 (글이 길어 대시보드 캐시에 넣지 않는다)
      if (view !== 'notes' || !d.session) return null;
      return call('apiNotes', token, d.session.id).then((n) => { notes = n; if (!nv.part) nv.part = d.session.part; });
    }).then(() => paint()).catch((e) => {
      if (/로그인/.test(e.message)) { token = ''; try { sessionStorage.removeItem('exc-basics:tok'); } catch (x) { /* 무시 */ } login(); }
      else paintHead('⚠ 서버에 닿지 않아요 — 다시 시도하는 중');
    });
  }

  async function newSession() {
    const inp = h('input', { type: 'text', class: 'pw', placeholder: '예) 2-3 반', maxlength: '30' });
    let part = 'p1';
    const pick = h('div', { class: 'part-pick' });
    const drawPick = () => fill(pick, ...PARTS.map((p) => h('button', { type: 'button', class: 'btn part-btn' + (p.id === part ? ' primary' : ''), onClick: () => { part = p.id; drawPick(); } },
      h('b', {}, p.label), h('small', {}, p.note))));
    drawPick();
    const box = h('div', {},
      h('p', {}, '반 이름을 정하면 그때부터의 기록만 모아 보여 줘요. 학생들은 시작 카드에서 이 수업으로 들어옵니다.'), inp,
      h('p', { class: 'part-q' }, '이번 시간에 열 카드'), pick,
      h('p', { class: 'muted small-note' }, '💡 같은 반의 2차시는 새 수업을 만들지 말고 「📚 수업」 에서 그 반을 골라 「이어서 하기」 → 범위를 2차시로 바꾸세요. 그래야 학생 기록이 이어져요.'));
    setTimeout(() => inp.focus(), 50);
    if (!(await modal('🆕 새 수업 시작', box, { ok: '시작', cancel: '그만두기', wide: true }))) return;
    call('apiStartSession', token, inp.value, part).then((s) => { sid = s.id; forgetNotes(); toast(`「${s.name}」 수업을 ${partOf(s.part).label} 범위로 시작했어요. 학생들에게 웹 앱 주소를 알려 주세요.`, 'gold'); poll(); })
      .catch((e) => toast(e.message, 'bad'));
  }
  // 🗂 범위 — 이번 시간에 학생 화면에 열 카드. 보고 있는 수업이 지난 수업이면 「이어서 하기」 도 여기서
  async function partMenu() {
    const s = data && data.session;
    if (!s) return;
    const close = () => document.querySelector('.overlay')?.remove();
    const setPart = (p) => call('apiSetPart', token, s.id, p).then(() => { close(); toast(`범위를 「${partOf(p).label}」 로 바꿨어요. 학생 화면은 카드를 넘길 때 바뀌어요(15초 안팎).`, 'gold'); poll(); })
      .catch((e) => toast(e.message, 'bad'));
    const resume = () => call('apiResumeSession', token, s.id).then(() => { close(); toast(`「${s.name}」 수업을 이어서 해요. 학생들이 들어오면 이 수업으로 와요.`, 'gold'); poll(); })
      .catch((e) => toast(e.message, 'bad'));
    modal(`🗂 「${s.name}」 의 범위`, h('div', {},
      s.current ? null : h('div', { class: 'resume-box' },
        h('p', {}, '⚠ 지금 학생들이 들어오는 수업이 아니에요.'),
        h('button', { class: 'btn primary', onClick: resume }, '▶ 이 수업 이어서 하기')),
      h('p', { class: 'part-q' }, '학생 화면에 열 카드'),
      h('div', { class: 'part-pick' }, ...PARTS.map((p) => h('button', { class: 'btn part-btn' + (p.id === s.part ? ' primary' : ''), onClick: () => setPart(p.id) },
        h('b', {}, p.label), h('small', {}, p.note)))),
      h('p', { class: 'muted small-note' }, '범위 밖 카드는 학생 화면에서 사라져요. 학생 기록(카드·미션)은 그대로 남아요.')), { ok: '닫기', wide: true });
  }
  async function pickSession() {
    const list = await call('apiSessions', token).catch(() => []);
    if (!list.length) { toast('아직 수업이 없어요'); return; }
    const box = h('div', { class: 'sess-list' }, ...list.map((s) => h('button', { class: 'btn' + (s.id === sid ? ' primary' : ''), onClick: () => { sid = s.id; forgetNotes(); document.querySelector('.overlay')?.remove(); poll(); } },
      s.name, h('small', {}, ` · ${partOf(s.part).label}`), s.current ? h('small', {}, ' (진행 중)') : null)));
    modal('📚 수업 고르기', box, { ok: '닫기' });
  }

  // 다른 수업으로 옮기면 앞 수업의 글을 버린다
  function forgetNotes() { notes = null; nv.part = ''; nv.q = ''; notesDrawn = ''; }
  function setView(v) {
    view = v;
    notesDrawn = '';
    paint();
    if (v === 'notes') poll();
  }
  // 한 학생이 낸 글 모두 — 🔍 선생님 화면의 학생 칸이나 ✍️ 정리의 이름을 누르면
  async function openStudent(s) {
    const r = await call('apiNotes', token, sid).catch((e) => { toast(e.message, 'bad'); return null; });
    if (!r) return;
    const mine = r.rows.filter((x) => x.sno === s.sno);
    const name = view === 'notes' && nv.mask ? maskName(s.name) : `${s.name} (${s.sno})`;
    modal(`✍️ ${name} — 오늘 배운 것`, mine.length ? h('div', { class: 'nv-stu' }, ...mine.map((row) => h('div', {},
      h('p', { class: 'part-q' }, `${partOf(row.part).label} · ${hhmm(row.at)} 제출`, row.count > 1 ? h('small', {}, ` (고쳐서 ${row.count}번 냄)`) : null),
      ...wrapupFor(row.part).map((w) => h('div', { class: 'nv-qa' }, h('b', {}, w.q),
        h('p', {}, row.notes[w.id] || h('span', { class: 'muted' }, '(비움)')))))))
      : '아직 제출하지 않았어요.', { ok: '닫기', wide: true });
  }

  function paintHead(note) {
    const s = data && data.session;
    const n = data && data.students ? data.students.length : 0;
    const on = data && data.students ? data.students.filter((x) => x.online).length : 0;
    fill(head,
      h('h1', {}, s ? `📚 ${s.name}` : '수업을 시작해 주세요'),
      h('span', { class: 'muted' }, s ? `참여 ${n}명 · 지금 접속 ${on}명` : ''),
      note ? h('span', { class: 'warn-text' }, note) : null,
      h('div', { class: 'dash-tools' },
        h('button', { class: 'btn small' + (view === 'show' ? ' primary' : ''), onClick: () => setView('show') }, '📺 발표'),
        h('button', { class: 'btn small' + (view === 'teach' ? ' primary' : ''), onClick: () => setView('teach') }, '🔍 선생님'),
        h('button', { class: 'btn small' + (view === 'notes' ? ' primary' : ''), onClick: () => setView('notes') }, '✍️ 정리'),
        s ? h('button', { class: 'btn small' + (s.current ? '' : ' warn'), onClick: partMenu }, s.current ? `🗂 ${partOf(s.part).label}` : '🗂 지난 수업') : null,
        h('button', { class: 'btn small', onClick: pickSession }, '📚 수업'),
        h('button', { class: 'btn small', onClick: newSession }, '🆕 새 수업')));
  }

  function paint() {
    paintHead();
    if (!data || !data.session) {
      fill(body, h('div', { class: 'center-msg' }, h('h2', {}, '진행 중인 수업이 없어요'), h('button', { class: 'btn primary big', onClick: newSession }, '🆕 새 수업 시작')));
      return;
    }
    // 새 「첫 발견」 이 있으면 크게 한 번 알린다
    const top = data.feed[0];
    const key = top ? `${top.sno}:${top.kind}:${top.x}` : '';
    if (lastFeed && key && key !== lastFeed && top.kind === 'found' && data.first[top.x] && data.first[top.x].sno === top.sno) {
      const c = cardOf(top.x);
      toast(`🎉 우리 반 첫 발견! ${maskName(top.name)} — ${c ? c.icon : ''} ${top.x}`, 'gold big');
    }
    lastFeed = key;
    if (view === 'notes') { paintNotes(); return; }
    fill(body, view === 'show' ? showView(data) : teachView(data, { openStudent, openNotes: () => setView('notes') }));
  }

  // ✍️ 정리 — 5초마다 새로 읽지만, 글이 그대로면 다시 그리지 않는다(읽던 자리가 튀지 않게)
  function paintNotes() {
    if (!notes || !notes.session || notes.session.id !== data.session.id) {
      if (!body.querySelector('.nv-wait')) fill(body, h('div', { class: 'center-msg nv-wait' }, h('p', {}, '✍️ 제출한 글을 불러오는 중…')));
      return;
    }
    const sig = JSON.stringify([notes.rows, data.students.map((x) => [x.sno, x.name]), nv]);
    if (sig === notesDrawn && body.querySelector('.dash-notes')) return;
    const old = body.querySelector('.nv-list');
    const keep = old && old.dataset.q === nv.q ? old.scrollTop : 0;
    notesDrawn = sig;
    fill(body, notesView(data, notes, nv, {
      setPart: (p) => { nv.part = p; nv.q = ''; paintNotes(); },
      setQ: (q) => { nv.q = q; paintNotes(); },
      toggleMask: () => { nv.mask = !nv.mask; paintNotes(); },
      openStudent,
    }));
    const list = body.querySelector('.nv-list');
    if (list) list.scrollTop = keep;
  }
}

/* ── 📺 발표 화면 ─────────────────────────────────────────────────── */
function feedText(e) {
  // 발표 화면(반 전체가 본다)이라 이름을 가린다
  const who = maskName(e.name) || `${e.num}번 자리`;
  if (e.kind === 'found') { const c = cardOf(e.x); return `${who} — ${c ? c.icon : ''} ${e.x} 발견!`; }
  if (e.kind === 'mission') return `${who} — 🛡️ ${MISSION_LABEL[e.x] || e.x} 통과!`;
  if (e.kind === 'boss') return `${who} — 👾 보스전 ${e.x}가지 막음!`;
  return who;
}

function showView(d) {
  const rank = d.students.slice().sort((a, b) => scoreOf(b) - scoreOf(a) || (a.sno < b.sno ? -1 : 1)).slice(0, 8);
  return h('div', { class: 'dash-show' },
    h('div', { class: 'ds-cards' }, ...CARDS.map((c) => {
      const got = d.classFound.includes(c.id);
      const f = d.first[c.id];
      return h('div', { class: 'ds-card' + (got ? ' got' : ''), style: { '--c': c.color } },
        h('div', { class: 'tc-icon' }, got ? c.icon : '❔'),
        h('div', { class: 'tc-name' }, got ? c.id : '???'),
        h('div', { class: 'tc-first' }, f ? `첫 발견 ${maskName(f.name)}` : ''));
    })),
    h('div', { class: 'ds-body' },
      h('div', { class: 'ds-rank' }, h('h3', {}, '🏆 순위'),
        ...(rank.length ? rank.map((s, i) => h('div', { class: 'rk' },
          h('span', { class: 'rk-n' }, i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}`),
          h('span', { class: 'rk-who' }, maskName(s.name)),
          h('span', { class: 'rk-icons' }, ...CARDS.map((c) => h('span', { class: s.cards.includes(c.id) ? 'on' : '' }, c.icon))),
          h('span', { class: 'rk-ms' }, ...MISSIONS.map((m) => h('span', { class: s.missions.includes(m.id) ? 'on' : '' }, m.boss ? '👾' : '🛡️'))),
          h('span', { class: 'rk-score' }, `${scoreOf(s)}점`))) : [h('p', { class: 'muted' }, '학생들이 들어오기를 기다리는 중…')])),
      h('div', { class: 'ds-feed' }, h('h3', {}, '📣 방금'),
        h('ul', { class: 'feed' }, ...(d.feed.length ? d.feed.slice(0, 8).map((e) => h('li', {}, feedText(e))) : [h('li', { class: 'muted' }, '아직 소식이 없어요')])))));
}

const hhmm = (t) => (t ? new Date(t).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '');
// 이 수업의 지금 차시에 「오늘 배운 것」 을 냈나 (범위가 전체면 어느 차시든)
const notedNow = (s, part) => (s.noted || []).some((p) => part === 'all' || p === part);

/* ── 🔍 선생님 화면 ───────────────────────────────────────────────── */
function teachView(d, act) {
  const total = d.students.length || 1;
  const part = d.session.part;
  const nNoted = d.students.filter((s) => notedNow(s, part)).length;
  return h('div', { class: 'dash-teach' },
    h('div', { class: 'dt-grid' }, ...(d.students.length ? d.students.map((s) => h('div', {
      class: 'stu' + (s.online ? ' on' : '') + ((s.noted || []).length ? ' noted' : ''),
      title: (s.noted || []).length ? '눌러서 「오늘 배운 것」 읽기' : null,
      onClick: (s.noted || []).length ? () => act.openStudent(s) : null },
      h('div', { class: 'stu-num' }, h('span', {}, s.name, h('small', {}, ` ${s.sno}`)), h('span', { class: 'stu-seat' }, `🪑${s.num}`), h('span', { class: 'dot' })),
      h('div', { class: 'stu-cards' }, ...CARDS.map((c) => h('span', { class: s.cards.includes(c.id) ? 'on' : '', style: { '--c': c.color } }))),
      h('div', { class: 'stu-ms' }, ...MISSIONS.map((m) => h('span', { class: s.missions.includes(m.id) ? 'on' : '' }, m.boss ? 'B' : String(m.no)))),
      h('div', { class: 'stu-q' }, s.quizN ? `✅ ${s.quiz}/${QUIZ.length}` : '', notedNow(s, part) ? h('span', { class: 'stu-noted' }, '✍️ 제출') : null))) : [h('p', { class: 'muted' }, '아직 들어온 학생이 없어요.')])),
    h('div', { class: 'dt-side' },
      h('h3', {}, '🛡️ 미션별 통과'),
      ...MISSIONS.map((m) => {
        const n = d.missionPass[m.id] || 0;
        return h('div', { class: 'bar-row' }, h('span', { class: 'bar-label' }, MISSION_LABEL[m.id]),
          h('span', { class: 'bar' }, h('span', { class: 'bar-fill', style: { width: `${(n / total) * 100}%` } })), h('span', { class: 'bar-n' }, `${n}명`));
      }),
      h('h3', {}, '🧗 가장 많이 막힌 곳'),
      d.stuck.length ? h('ol', { class: 'stuck' }, ...d.stuck.slice(0, 5).map((s) => h('li', {}, stuckText(s.what), h('b', {}, ` ${s.n}회`)))) : h('p', { class: 'muted' }, '아직 없어요'),
      h('h3', {}, '✅ 확인 문제'),
      h('p', {}, d.quiz.total ? `정답률 ${Math.round((d.quiz.right / d.quiz.total) * 100)}% (${d.quiz.right}/${d.quiz.total})` : '아직 푼 학생이 없어요'),
      h('h3', {}, '✍️ 오늘 배운 것'),
      h('div', { class: 'dt-notes' }, h('span', {}, `제출 ${nNoted} / ${d.students.length}명`), h('button', { class: 'btn small', onClick: act.openNotes }, '읽어 보기 →'))));
}

/* ── ✍️ 정리 — 학생이 제출한 「오늘 배운 것」 을 물음별로 ─────────────────── */
function notesView(d, n, nv, act) {
  const rows = n.rows || [];
  // 차시 — 지금 수업의 범위가 기본, 다른 차시에 낸 글이 있으면 그 단추도 보인다
  const parts = PARTS.filter((p) => p.id === nv.part || p.id === d.session.part || rows.some((r) => r.part === p.id));
  const mine = rows.filter((r) => r.part === nv.part);
  const qs = wrapupFor(nv.part);
  const q = qs.find((w) => w.id === nv.q) || qs[0];
  const who = (r) => (nv.mask ? maskName(r.name) : r.name);
  const sent = new Set(mine.map((r) => r.sno));
  const notYet = d.students.filter((x) => !sent.has(x.sno));
  const answers = mine.filter((r) => r.notes[q.id]);
  const blank = mine.length - answers.length;
  return h('div', { class: 'dash-notes' },
    h('div', { class: 'nv-side' },
      parts.length > 1 ? h('div', { class: 'nv-parts' }, ...parts.map((p) => h('button', { class: 'btn small' + (p.id === nv.part ? ' primary' : ''), onClick: () => act.setPart(p.id) }, p.label))) : null,
      h('p', { class: 'nv-count' }, h('b', {}, `제출 ${mine.length}명`), ` / 참여 ${d.students.length}명`),
      ...qs.map((w) => h('button', { class: 'nv-q' + (w.id === q.id ? ' on' : ''), onClick: () => act.setQ(w.id) },
        h('span', {}, w.q), h('b', {}, String(mine.filter((r) => r.notes[w.id]).length)))),
      h('button', { class: 'btn small nv-mask', onClick: act.toggleMask }, nv.mask ? '🙂 이름 보이기' : '🙈 이름 가리기 (TV 에 띄울 때)')),
    h('div', { class: 'nv-main' },
      h('h3', { class: 'nv-title' }, q.q),
      h('div', { class: 'nv-list', 'data-q': nv.q }, ...(answers.length ? answers.map((r) => h('div', { class: 'nv-ans' },
        h('button', { class: 'nv-who', title: '이 학생이 적은 것 모두 보기', onClick: () => act.openStudent(r) }, who(r)),
        h('p', {}, r.notes[q.id])))
        : [h('p', { class: 'muted' }, mine.length ? '이 물음에 적은 학생이 아직 없어요.' : '아직 제출한 학생이 없어요. 학생이 결과 카드에서 [📤 제출하기] 를 누르면 여기에 모여요.')])),
      h('p', { class: 'nv-foot muted' }, blank ? `이 물음을 비우고 낸 학생 ${blank}명 · ` : '',
        notYet.length ? `아직 제출하지 않은 학생 ${notYet.length}명 — ${notYet.map(who).join(', ')}` : (d.students.length ? '모두 제출했어요 🎉' : ''))));
}
