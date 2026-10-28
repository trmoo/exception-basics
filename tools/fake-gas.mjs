/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  가짜 구글 앱스 스크립트 — 진짜 Code.gs 를 node 에서 그대로 돌리려고 만들었다.
 *  시험(npm test)과 개발 서버(npm start 의 /__gas/…)가 함께 쓴다.
 *  Code.gs 가 쓰는 것만 흉내 낸다: SpreadsheetApp · PropertiesService · CacheService · LockService ·
 *  Utilities · HtmlService.
 */
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

class FakeSheet {
  constructor(name) { this.name = name; this.rows = []; }
  getName() { return this.name; }
  setFrozenRows() { return this; }
  hideSheet() { this.hidden = true; return this; }
  isSheetHidden() { return !!this.hidden; }
  getLastRow() {
    for (let r = this.rows.length - 1; r >= 0; r--) {
      if ((this.rows[r] || []).some((v) => v !== '' && v != null)) return r + 1;
    }
    return 0;
  }
  getRange(row, col, nr = 1, nc = 1) {
    const sh = this;
    const api = {
      getValues() {
        const out = [];
        for (let r = 0; r < nr; r++) {
          const line = [];
          for (let c = 0; c < nc; c++) { const v = (sh.rows[row - 1 + r] || [])[col - 1 + c]; line.push(v === undefined ? '' : v); }
          out.push(line);
        }
        return out;
      },
      setValues(vals) {
        vals.forEach((line, r) => {
          sh.rows[row - 1 + r] = sh.rows[row - 1 + r] || [];
          line.forEach((v, c) => { sh.rows[row - 1 + r][col - 1 + c] = v; });
        });
        return api;
      },
      setFontWeight() { return api; },
    };
    return api;
  }
  appendRow(vals) { this.rows[this.getLastRow()] = vals.slice(); return this; }
  deleteRows(at, n) { this.rows.splice(at - 1, n); return this; }
}

export function makeGas() {
  const sheets = new Map();
  const props = {};
  const cache = new Map(); // key → { v, until }
  let clock = Date.now;
  const ss = {
    getSheetByName: (n) => sheets.get(n) || null,
    insertSheet: (n) => { const s = new FakeSheet(n); sheets.set(n, s); return s; },
  };
  const menu = { addItem() { return menu; }, addSeparator() { return menu; }, addToUi() { return menu; } };
  const ui = {
    alerts: [], promptAnswer: '', confirm: 'YES',
    alert(...a) { ui.alerts.push(a.join(' | ')); return ui.confirm; },
    prompt() { return { getSelectedButton: () => 'OK', getResponseText: () => ui.promptAnswer }; },
    createMenu() { return menu; },
    ButtonSet: { OK_CANCEL: 'OK_CANCEL', YES_NO: 'YES_NO' },
    Button: { OK: 'OK', YES: 'YES', NO: 'NO' },
  };
  const env = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, getUi: () => ui },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (k in props ? props[k] : null),
        setProperty: (k, v) => { props[k] = String(v); },
        deleteProperty: (k) => { delete props[k]; },
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => { const e = cache.get(k); return e && e.until > clock() ? e.v : null; },
        put: (k, v, sec = 600) => { cache.set(k, { v: String(v), until: clock() + sec * 1000 }); },
        remove: (k) => { cache.delete(k); },
        removeAll: (keys) => keys.forEach((k) => cache.delete(k)),
      }),
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      Charset: { UTF_8: 'UTF_8' },
      // 진짜 앱스 스크립트처럼 -128~127 의 「부호 있는 바이트」 로 돌려준다
      computeDigest: (algo, text) => [...createHash('sha256').update(String(text), 'utf8').digest()].map((b) => (b > 127 ? b - 256 : b)),
      getUuid: () => randomUUID(),
      formatDate: (d, tz, fmt) => {
        const p = (n) => String(n).padStart(2, '0');
        return fmt.replace('MM', p(d.getMonth() + 1)).replace('dd', p(d.getDate()))
          .replace('HH', p(d.getHours())).replace('mm', p(d.getMinutes())).replace('ss', p(d.getSeconds()));
      },
    },
    HtmlService: {
      XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' },
      createHtmlOutputFromFile: (n) => {
        const o = { file: n, setTitle: () => o, addMetaTag: () => o, setXFrameOptionsMode: () => o };
        return o;
      },
    },
  };
  return { env, sheets, props, cache, ui, setClock: (f) => { clock = f; } };
}

/** Code.gs 를 가짜 환경 위에서 불러 최상위 함수들을 꺼낸다 */
export function loadServer(path = new URL('../gas/Code.gs', import.meta.url)) {
  const code = readFileSync(path, 'utf-8');
  const gas = makeGas();
  const names = [...code.matchAll(/^function\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  const consts = [...code.matchAll(/^var\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  const keys = Object.keys(gas.env);
  // eslint-disable-next-line no-new-func
  const fn = new Function(...keys, `${code}\nreturn { ${[...names, ...consts].join(', ')} };`);
  const api = fn(...keys.map((k) => gas.env[k]));
  return { api, gas };
}
