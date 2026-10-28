/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  카드 넘기기를 차시 범위에 맞춰 다시 세운다. main.js 가 실제 함수를 등록하고, 카드 파일은 이것만 부른다
 *  (카드 파일이 main.js 를 불러오면 고리가 생기므로).
 *    mountPart(part, go)  go: 카드 id · 'next'(시작 다음 카드) · 없으면 시작 카드
 */
let impl = null;
export function setMounter(fn) { impl = fn; }
export function mountPart(part, go) { if (impl) impl(part, go); }
