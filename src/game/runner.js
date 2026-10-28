/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  자판기 코드를 돌리고 「무슨 일이 일어났는지」 가른다.
 *  ⚠ node 로 그대로 불러다 시험한다. DOM 을 만들지 말 것.
 */
import { runPython, parse } from '../lib/pymini.js';
import { makeInputFn, PRODUCTS, COUPONS } from '../data/machine.js';

export const BLANK = '____';
const SYNTAXY = new Set(['SyntaxError', 'IndentationError', '지원하지 않는 문법']);

/**
 * 코드 한 번 돌리기.
 *   status: crash(잡히지 않은 예외로 멈춤) · broken(코드가 돌지 못함) · blank(빈칸이 남음)
 *           vend(음료가 나옴) · calm(예외를 잡고 말해 줌) · silent(잡았지만 아무 말 없음)
 */
export function runMachine(code, values, { echo = true } = {}) {
  if (code.includes(BLANK)) {
    const line = code.split('\n').findIndex((l) => l.includes(BLANK)) + 1;
    return { status: 'blank', line, out: [], console: '', caught: [], ran: [] };
  }
  const opts = (e) => ({ inputFn: makeInputFn(values), echo: e, file: '자판기.py', maxSteps: 200000 });
  const shown = runPython(code, opts(echo));
  const quiet = echo ? runPython(code, opts(false)) : shown; // 판정은 print 한 것만 본다
  const out = quiet.lines.filter((l) => l.trim() !== '');
  const base = {
    out,
    console: shown.output + (shown.ok ? '' : (shown.output ? '\n' : '') + (shown.traceback || shown.error)),
    caught: shown.caught || [],
    ran: shown.ran || [],
  };
  if (!shown.ok) {
    const kind = shown.fatal || SYNTAXY.has(shown.errorType) ? 'broken' : 'crash';
    return { ...base, status: kind, type: shown.errorType, line: shown.errorLine, msg: shown.errorMsg, hint: shown.errorHint };
  }
  const vendLine = out.find((l) => /나왔습니다/.test(l));
  if (vendLine) return { ...base, status: 'vend', product: PRODUCTS.find((p) => vendLine.includes(p.name)) || null };
  return { ...base, status: out.length ? 'calm' : 'silent' };
}

/** 문법 나무를 훑어 try 문의 모양을 알아낸다 */
export function shape(code) {
  let ast;
  try { ast = parse(code.split(BLANK).join('x')); } catch (e) { return null; }
  const out = { tries: 0, handlers: [], hasElse: false, hasFinally: false, catchAll: false, silentHandler: false };
  const walk = (body) => {
    for (const st of body || []) {
      if (st.type === 'Try') {
        out.tries++;
        if (st.orelse.length) out.hasElse = true;
        if (st.finalbody.length) out.hasFinally = true;
        for (const h of st.handlers) {
          const names = !h.typeExpr ? ['*'] : h.typeExpr.type === 'Name' ? [h.typeExpr.id]
            : h.typeExpr.type === 'ListLit' ? h.typeExpr.items.map((x) => x.id || '?') : ['?'];
          out.handlers.push({ names, line: h.line });
          if (names.includes('*') || names.includes('Exception') || names.includes('BaseException')) out.catchAll = true;
          if (h.body.every((x) => x.type === 'Pass')) out.silentHandler = true;
          walk(h.body);
        }
        walk(st.body); walk(st.orelse); walk(st.finalbody);
      } else if (st.type === 'If') { walk(st.body); walk(st.orelse); }
      else if (st.type === 'While' || st.type === 'For' || st.type === 'FuncDef') walk(st.body);
    }
  };
  walk(ast.body);
  return out;
}

/**
 * 논리 오류 알아보기 — 예외 없이 팔았는데 결과가 틀린 경우.
 *   음수 메뉴 번호 : 파이썬은 -1 을 「맨 뒤」 로 읽어 주스를 판다 (0~4번만 있는데)
 *   음수 사람 수   : 한 명당 값이 음수가 된다
 *   값보다 많은 사람 : // 가 몫만 남겨 한 명당 0원 — 음료가 공짜
 *   나누어떨어지지 않음 : // 가 나머지를 버려 모두 낸 돈이 값보다 모자란다 (1200원을 7명 → 171원씩, 3원 모자람)
 * 예외가 아니라서 try–except 로는 못 잡는다는 것을 보여 주려고 1라운드에서만 쓴다. 도감 카드는 아니다.
 * 반환: { kind(src/data/logic.js 의 id), field, text } 또는 null
 */
export function logicSlip(values, res) {
  if (!res || res.status !== 'vend') return null;
  const asInt = (v) => (/^\s*-?\d+\s*$/.test(String(v ?? '')) ? Number(v) : null);
  const num = asInt(values.num);
  if (num !== null && num < 0) {
    const name = res.product ? res.product.name : '음료';
    return { kind: 'negIndex', field: 'num', text: `0~4번만 있는데 ${num}번에 ${name}가 나왔어요. 파이썬은 음수 번호를 「뒤에서 몇째」로 읽거든요(-1 → 맨 뒤).` };
  }
  const people = asInt(values.people);
  if (people !== null && people < 0) {
    const each = res.out.find((l) => l.startsWith('한 명당')) || '';
    return { kind: 'negPeople', field: 'people', text: `${people}명이 나눠 낸다니요? ${each ? `「${each}」 이 되었어요.` : ''}` };
  }
  // 나눗셈(//) 에서 생기는 것 — 이 자판기 코드와 똑같이 값을 셈한다
  const price = priceOf(num, values.coupon);
  if (people !== null && people > 0 && price !== null && price > 0) {
    const share = Math.floor(price / people);
    if (share === 0) {
      return { kind: 'zeroShare', field: 'people', text: `${price}원을 ${people}명이 나눠 내면 한 명당 0원이에요. 음료가 공짜가 되었어요! // 는 몫만 남기거든요.` };
    }
    const short = price - share * people;
    if (short > 0) {
      return { kind: 'remainder', field: 'people', text: `${price}원을 ${people}명이 ${share}원씩 내면 모두 ${share * people}원 — ${short}원이 모자라요. // 는 나머지를 버리거든요.` };
    }
  }
  return null;
}

/** 자판기가 받을 값 (메뉴 값 − 쿠폰). 셈할 수 없으면 null */
function priceOf(num, coupon) {
  if (num === null) return null;
  const p = PRODUCTS.at(num);
  if (!p) return null;
  const code = String(coupon ?? '');
  if (code === '') return p.price;
  const off = COUPONS[code];
  return typeof off === 'number' ? p.price - off : null;
}
