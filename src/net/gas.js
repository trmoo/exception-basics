/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  서버(앱스 스크립트) 부르기. 같은 앱이 세 가지로 열린다.
 *    gas  — 앱스 스크립트 웹 앱 주소로 열었을 때. google.script.run 으로 Code.gs 를 부른다.
 *    dev  — npm start 개발 서버. /__gas/함수이름 으로 가짜 시트 위의 진짜 Code.gs 를 부른다.
 *    solo — dist/index.html 을 더블클릭했을 때. 서버 없이 혼자 한다(기록은 이 브라우저에만).
 */
/* global google */
const hasGas = typeof google !== 'undefined' && google.script && google.script.run;
export const MODE = hasGas ? 'gas' : (import.meta.env.DEV ? 'dev' : 'solo');
export const online = MODE !== 'solo';

/** Code.gs 의 함수 하나를 부른다 → Promise */
export function call(fn, ...args) {
  if (MODE === 'gas') {
    return new Promise((res, rej) => {
      google.script.run.withSuccessHandler(res).withFailureHandler((e) => rej(new Error(e && e.message ? e.message : String(e))))[fn](...args);
    });
  }
  if (MODE === 'dev') {
    return fetch(`/__gas/${fn}`, { method: 'POST', body: JSON.stringify(args) })
      .then((r) => r.json())
      .then((j) => { if (j.error) throw new Error(j.error); return j.value; });
  }
  return Promise.reject(new Error('서버 없이 여는 중이에요(혼자 모드).'));
}

/** 주소의 ?page=… 같은 값 — 앱스 스크립트 안에서는 바깥 주소를 google.script.url 로 읽어야 한다 */
export function getParams() {
  if (MODE === 'gas' && google.script.url) {
    return new Promise((res) => google.script.url.getLocation((loc) => res(loc.parameter || {})));
  }
  return Promise.resolve(Object.fromEntries(new URLSearchParams(location.search)));
}
