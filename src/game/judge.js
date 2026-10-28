/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  2라운드 채점기. 학생 코드를 공격·정상 손님에게 진짜로 실행해 보고 판정한다.
 *  ⚠ node 로 그대로 불러다 시험한다. DOM 을 만들지 말 것.
 */
import { runMachine, shape, BLANK } from './runner.js';
import { MACHINE_CODE } from '../data/machine.js';
import { ATTACKS, NORMALS } from '../data/missions.js';

export const KINDS = ['ValueError', 'ZeroDivisionError', 'IndexError', 'KeyError', 'TypeError'];

// 정상 손님에게 원래 자판기가 하던 말 — 방어막을 둘러도 이 말은 그대로 나와야 한다
const BASELINE = Object.fromEntries(NORMALS.map((n) => [n.id, runMachine(MACHINE_CODE, n.values, { echo: false }).out]));
export const baselineOf = (id) => BASELINE[id];

function containsInOrder(got, want) {
  let i = 0;
  for (const l of got) if (i < want.length && l.trim() === want[i].trim()) i++;
  return i === want.length;
}

export function judgeAttack(code, atk) {
  const r = runMachine(code, atk.values, { echo: false });
  const verdict = { blank: 'blank', broken: 'broken', crash: 'crash', silent: 'silent', vend: 'leak' }[r.status] || 'blocked';
  return { atk, r, verdict, said: r.out.join(' / ') };
}
export function judgeNormal(code, n) {
  const r = runMachine(code, n.values, { echo: false });
  const ok = !['crash', 'broken', 'blank'].includes(r.status) && containsInOrder(r.out, BASELINE[n.id]);
  return { n, r, ok };
}
export function evaluate(code) {
  const attacks = ATTACKS.map((a) => judgeAttack(code, a));
  return {
    sh: shape(code), attacks,
    normals: NORMALS.map((n) => judgeNormal(code, n)),
    byId: Object.fromEntries(attacks.map((x) => [x.atk.id, x])),
  };
}

const idsOf = (kind) => ATTACKS.filter((a) => a.expect === kind).map((a) => a.id);
const blockedAll = (ev, ids) => ids.every((id) => ev.byId[id].verdict === 'blocked');

/** 예외 종류마다 손님에게 한 말 — 「같은 말만 반복하는가」 를 본다 */
function distinctMessages(ev) {
  const msgs = KINDS.map((k) => ev.byId[idsOf(k)[0]].said);
  return new Set(msgs).size;
}

function whyAttack(ev, ids) {
  const bad = ids.map((id) => ev.byId[id]).find((x) => x.verdict !== 'blocked');
  if (!bad) return '';
  const l = bad.atk.label;
  if (bad.verdict === 'crash') return `「${l}」 → 💥 ${bad.r.type} 로 멈췄어요.`;
  if (bad.verdict === 'silent') return `「${l}」 → 막기는 했는데 아무 말도 안 했어요 🤐`;
  return `「${l}」 → 막지 못했어요.`;
}

/** 미션 채점 — { pass, items:[{ok,text,why}], ev, notes, stars, fails:[이유 꼬리표] } */
export function checkMission(mission, code) {
  if (code.includes(BLANK)) {
    const line = code.split('\n').findIndex((l) => l.includes(BLANK)) + 1;
    return { pass: false, blank: line, items: [{ ok: false, text: '빈칸(____) 모두 채우기', why: `${line}번째 줄에 아직 빈칸이 있어요.` }], notes: [], fails: ['빈칸'] };
  }
  const ev = evaluate(code);
  const broken = [...ev.attacks, ...ev.normals].find((x) => x.r.status === 'broken');
  if (broken) {
    const r = broken.r;
    return { pass: false, broken: r, ev, items: [{ ok: false, text: '코드가 실행되기', why: `${r.line || '?'}번째 줄 — ${r.type}: ${r.msg}` }], notes: [], fails: ['코드 오류'] };
  }
  const sh = ev.sh;
  const items = [];
  switch (mission.id) {
    case 'm1':
      items.push({ ok: sh.handlers.some((h) => h.names.includes('ValueError')), text: 'except ValueError: 쓰기' });
      items.push({ ok: blockedAll(ev, idsOf('ValueError')), text: '숫자가 아닌 값 공격 막기', why: whyAttack(ev, idsOf('ValueError')), kind: 'ValueError' });
      break;
    case 'm2':
      for (const k of KINDS) items.push({ ok: blockedAll(ev, idsOf(k)), text: `${k} 막기`, why: whyAttack(ev, idsOf(k)), kind: k });
      {
        const n = distinctMessages(ev);
        items.push({ ok: n === KINDS.length, text: '고장마다 다른 말로 알려 주기', why: n === KINDS.length ? '' : `여섯 가지 고장에 서로 다른 말이 ${n}가지뿐이에요.` });
      }
      break;
    case 'm3': {
      items.push({ ok: sh.hasElse, text: 'else: 쓰기' });
      items.push({ ok: sh.hasFinally, text: 'finally: 쓰기' });
      const lasts = [...ev.normals.map((x) => x.r.out), ...ev.attacks.map((x) => x.r.out)].map((o) => o[o.length - 1] || '');
      const same = lasts.every((l) => l && l === lasts[0]);
      items.push({ ok: same && /감사/.test(lasts[0]), text: '어떤 경우든 마지막 말은 「이용해 주셔서 감사합니다.」', why: same ? '' : '어떤 손님에게는 감사 인사가 마지막에 나오지 않아요.' });
      items.push({ ok: blockedAll(ev, ATTACKS.map((a) => a.id)), text: '예외 5종 계속 막기', why: whyAttack(ev, ATTACKS.map((a) => a.id)) });
      break;
    }
    case 'boss': {
      const n = ev.attacks.filter((x) => x.verdict === 'blocked').length;
      items.push({ ok: n === ATTACKS.length, text: `공격 ${ATTACKS.length}가지 모두 막기 (지금 ${n}가지)`, why: whyAttack(ev, ATTACKS.map((a) => a.id)) });
      break;
    }
    default: break;
  }
  const normalsOk = ev.normals.every((x) => x.ok);
  items.push({ ok: normalsOk, text: '정상 손님에게 원래대로 팔기', why: normalsOk ? '' : `「${(ev.normals.find((x) => !x.ok) || {}).n?.label}」 손님이 원래와 다른 결과를 받았어요.` });
  const pass = items.every((x) => x.ok);
  // 선생님 대시보드에 보낼 「어디서 막혔나」 꼬리표 (짧게)
  const fails = pass ? [] : uncaughtKinds(ev).map((k) => `${k} 못 막음`).concat(normalsOk ? [] : ['정상 손님 실패']).slice(0, 3);
  return { pass, items, ev, notes: advice(ev), stars: mission.boss ? stars(ev) : null, fails };
}

/** 잡히지 않은 예외의 종류 (중복 없이) */
export function uncaughtKinds(ev) {
  return [...new Set(ev.attacks.filter((x) => x.verdict === 'crash').map((x) => x.r.type))];
}

/** 교재 [참고] 「예외 처리를 남용하지 말자」 */
export function advice(ev) {
  const notes = [];
  if (!ev.sh) return notes;
  if (ev.sh.catchAll) notes.push({ icon: '⚠️', text: 'except: 만 쓰면 모든 예외를 잡지만, 무엇이 잘못됐는지 알 수 없게 되어 오히려 위험합니다. 예상되는 예외의 이름을 적어 주세요.' });
  if (ev.sh.silentHandler) notes.push({ icon: '🤐', text: 'except 아래에 pass 만 있으면 손님은 왜 안 되는지 모른 채 떠납니다.' });
  if (uncaughtKinds(ev).includes('NameError')) notes.push({ icon: '🪤', text: 'NameError 가 났어요. 예외를 잡은 뒤에도 프로그램은 다음 줄로 계속 갑니다. 그 변수에는 값이 못 들어갔어요.' });
  return notes;
}

export function stars(ev) {
  const all = ev.attacks.every((x) => x.verdict === 'blocked') && ev.normals.every((x) => x.ok);
  const distinct = distinctMessages(ev) === KINDS.length && ev.attacks.every((x) => x.verdict === 'blocked');
  const noCatchAll = !!ev.sh && !ev.sh.catchAll;
  return { all, distinct, noCatchAll, count: [all, distinct, noCatchAll].filter(Boolean).length };
}
