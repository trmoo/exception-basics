/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  학생 기록 — 찾은 카드 · 미션 · 보스전 · 퀴즈 · 미션 코드. 이 브라우저(localStorage)에 수업별로 남는다.
 *  수업에 들어가 있으면 사건이 있을 때마다 서버로 짧게 보낸다(자리 · 로그인 출입증 + 기록. 학번·이름은 서버가 출입증으로 가린다).
 */
import { call, online } from '../net/gas.js';
import { retryable, wait } from '../net/retry.js';
import { cardOf } from '../data/machine.js';
import { openNext } from './hints.js';
import { logicOf, logicOpenNext } from '../data/logic.js';

const fresh = () => ({ cards: {}, missions: {}, boss: 0, stars: 0, quiz: {}, picks: {}, codes: {}, hints: {}, logic: {}, lhints: {}, notes: {}, card: 0 });

// 지금 들어가 있는 수업과 학생 — name 은 수업 이름, num 은 자리 번호, sno·stu 는 학번·이름, tok 은 로그인 출입증
export const ME = { sid: '', name: '', num: 0, pid: '', part: 'all', sno: '', stu: '', tok: '' };
export let S = fresh();
const listeners = new Set();
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

// 기록은 「수업 + 학번」 마다 따로 — 같은 컴퓨터를 같은 반 다른 학생이 써도 앞사람 기록을 이어받지 않는다
// (이 기기에 남는 것은 학번이 든 열쇠와 활동 기록뿐 — 이름은 남기지 않는다)
const keyOf = () => `exc-basics:${ME.sid || 'solo'}:${ME.sno || 0}`;
// 새로고침했을 때 「이어서 하기」 용 — 이름이 들어 있어 이 탭(sessionStorage)에만 둔다. 브라우저를 닫으면 사라진다.
const lastKey = (sid) => `exc-basics:last:${sid}`;
function load() {
  try { S = { ...fresh(), ...(JSON.parse(localStorage.getItem(keyOf())) || {}) }; } catch (e) { S = fresh(); }
}
function save() {
  try {
    localStorage.setItem(keyOf(), JSON.stringify(S));
  } catch (e) { /* 이 탭에서만 기억 */ }
  try {
    if (ME.sid && ME.sno) sessionStorage.setItem(lastKey(ME.sid), JSON.stringify({ seat: ME.num, sno: ME.sno, stu: ME.stu, tok: ME.tok }));
  } catch (e) { /* 무시 */ }
  listeners.forEach((f) => f(S));
}

export function devicePid() {
  try {
    let p = localStorage.getItem('exc-basics:pid');
    if (!p) { p = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); localStorage.setItem('exc-basics:pid', p); }
    return p;
  } catch (e) { return Math.random().toString(36).slice(2, 14); }
}

/** 수업에 들어간다 (로그인하고 자리를 고른 뒤). 서버에 남은 기록(state)이 있으면 합친다 — 다른 컴퓨터에 앉아도 이어진다. */
export function enter(session, seat, sno = '', stu = '', server = null, tok = '') {
  ME.sid = session ? session.id : '';
  ME.name = session ? session.name : '';
  ME.num = seat || 0;
  ME.sno = sno || '';
  ME.stu = stu || '';
  ME.tok = tok || '';
  ME.pid = devicePid();
  load();
  if (server) mergeServer(server);
  save();
}
export function soloStart() { enter(null, 0); }

/** 서버 기록을 이 기기 기록에 더한다 (이 기기에 없는 카드·미션만 채운다. 코드·힌트는 서버에 없어 이어지지 않는다) */
function mergeServer(st) {
  for (const id of st.cards || []) if (cardOf(id) && !S.cards[id]) S.cards[id] = { at: 0 };
  for (const id of st.missions || []) if (!S.missions[id]) S.missions[id] = true;
  if ((st.boss || 0) > (S.boss || 0)) { S.boss = st.boss; S.stars = Math.max(S.stars || 0, st.stars || 0); }
}

/** 이 탭에서 이 수업에 마지막으로 들어간 학생 — { seat, sno, stu, tok } 또는 null */
export function savedMe(sid) {
  try { const v = JSON.parse(sessionStorage.getItem(lastKey(sid))); return v && v.sno ? v : null; } catch (e) { return null; }
}

/* ── 서버로 보내기 ── */
export const NET = { status: 'off', pending: 0 };
function snapshot() {
  const q = Object.values(S.quiz);
  return {
    cards: Object.keys(S.cards),
    missions: Object.keys(S.missions).filter((k) => S.missions[k]),
    boss: S.boss, stars: S.stars,
    quiz: q.filter(Boolean).length, quizN: q.length,
  };
}
// 보낼 사건 줄(outbox) — 한 번에 하나씩 차례로 보낸다. 접속이 몰려 실패하면 버리지 않고 조금 뒤 다시 보낸다.
// 기록(state)은 줄에 넣을 때가 아니라 「보내는 순간」 의 것을 붙인다 — 늦게 보낸 옛 기록이 새 기록을 덮어쓰지 않게.
const outbox = [];
let sending = false;
let lastFail = { x: '', at: 0 };
const OUTBOX_MAX = 50;
function send(kind, x) {
  if (!online || !ME.sid || !ME.num || !ME.tok) return;
  x = String(x || '');
  // 같은 곳에서 30초 안에 또 막히면 보내지 않는다 — 코드를 고쳐 가며 [확인] 을 여러 번 누르는 학생이 서버를 붙잡지 않게
  if (kind === 'fail') {
    if (lastFail.x === x && Date.now() - lastFail.at < 30000) return;
    lastFail = { x, at: Date.now() };
  }
  if (outbox.length >= OUTBOX_MAX) outbox.shift();   // 너무 오래 끊겨 쌓이면 가장 옛 것부터 버린다(기록은 마지막 것에 다 들어 있다)
  outbox.push({ kind, x, sid: ME.sid, num: ME.num, tok: ME.tok, pid: ME.pid });
  pump();
}
async function pump() {
  if (sending) return;
  sending = true;
  let tries = 0;
  while (outbox.length) {
    const ev = outbox[0];
    NET.pending = outbox.length;
    listeners.forEach((f) => f(S));
    // 다른 학생으로 바뀌었으면 앞사람 것은 보내지 않는다
    if (ev.sid !== ME.sid || ev.tok !== ME.tok) { outbox.shift(); continue; }
    try {
      await call('apiEvent', { sid: ev.sid, pid: ev.pid, seat: ev.num, token: ev.tok, kind: ev.kind, x: ev.x, state: snapshot() });
      outbox.shift(); tries = 0; NET.status = 'ok';
    } catch (e) {
      if (!retryable(e)) { outbox.shift(); NET.status = 'err'; continue; }   // 다시 보내도 같은 실패(출입증이 지남 등)
      NET.status = 'retry';
      tries++;
      await wait(Math.min(30000, 2000 * 2 ** Math.min(tries, 4)) * (0.5 + Math.random()));
    }
  }
  NET.pending = 0;
  sending = false;
  listeners.forEach((f) => f(S));
}

/* ── 기록 ── */
/** ⭐ 심화 — 논리 오류를 찾았다 (이 기기에만 남긴다, 서버로는 안 보낸다). 새로 찾았으면 true */
export function addLogic(id, values) {
  if (!logicOf(id)) return false;
  S.logic = S.logic || {};
  if (S.logic[id]) return false;
  S.logic[id] = { at: Date.now(), values };
  save();
  return true;
}
export function openLogicHint() {
  S.lhints = logicOpenNext(S.logic || {}, S.lhints || {});
  save();
}
/** 1라운드 힌트를 한 단계 더 연다 (서버로는 보내지 않는다) */
export function openHint() {
  S.hints = openNext(S.cards, S.hints || {});
  save();
}

export function addCard(id, detail = {}) {
  if (!cardOf(id) || S.cards[id]) return false;
  S.cards[id] = { at: Date.now(), ...detail };
  save(); send('found', id);
  return true;
}
export function passMission(id) {
  if (S.missions[id]) return false;
  S.missions[id] = Date.now();
  save(); send('mission', id);
  return true;
}
/** 채점에서 막힌 곳 — 선생님 대시보드의 「가장 많이 막힌 곳」 */
export function reportFail(missionId, tags) {
  if (!tags || !tags.length) return;
  send('fail', `${missionId}:${tags[0]}`);
}
export function setBoss(blocked, stars) {
  if (blocked < S.boss || (blocked === S.boss && stars <= S.stars)) return false;
  S.boss = blocked; S.stars = Math.max(S.stars, stars);
  save(); send('boss', `${blocked}`);
  return true;
}
export function answerQuiz(i, ok, picked) {
  if (i in S.quiz) return;
  S.quiz[i] = ok;
  S.picks[i] = picked;
  save(); send('quiz', `${i + 1}:${ok ? 'O' : 'X'}`);
}
export function saveCode(id, code) { S.codes[id] = code; save(); }
/** 🏁 오늘 배운 것 — 학생이 직접 적은 정리 (이 기기에만, 서버로는 안 보낸다) */
export function setNote(id, text) { S.notes = S.notes || {}; S.notes[id] = String(text).slice(0, 300); try { localStorage.setItem(keyOf(), JSON.stringify(S)); } catch (e) { /* 무시 */ } }
// 보던 카드는 id 로 남긴다 — 차시마다 카드 목록이 달라 차례 번호로는 엉뚱한 카드로 돌아간다
export function setCard(id) { S.card = id; try { localStorage.setItem(keyOf(), JSON.stringify(S)); } catch (e) { /* 무시 */ } }

/** 이 기기에 남은 활동 기록을 수업·번호 가리지 않고 모두 지운다 (기기 번호 pid 만 남긴다).
 *  선생님 시트로 이미 보낸 기록은 지우지 않는다 — 학생 기기에서 남의 기록까지 지우면 안 되므로. */
export function resetDevice() {
  try {
    const keys = [];
    for (let k = 0; k < localStorage.length; k++) {
      const key = localStorage.key(k);
      if (key && key.startsWith('exc-basics:') && key !== 'exc-basics:pid') keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
    const tab = [];
    for (let k = 0; k < sessionStorage.length; k++) { const key = sessionStorage.key(k); if (key && key.startsWith('exc-basics:last:')) tab.push(key); }
    tab.forEach((key) => sessionStorage.removeItem(key));
  } catch (e) { /* 저장소를 못 쓰는 브라우저 — 지금 기록만 비운다 */ }
  ME.sid = ''; ME.name = ''; ME.num = 0; ME.pid = ''; ME.part = 'all'; ME.sno = ''; ME.stu = ''; ME.tok = '';
  S = fresh();
  listeners.forEach((f) => f(S));
}
