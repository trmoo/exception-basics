/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  학번·이름 다듬기와 검사, 이름 가리기. gas/Code.gs 의 cleanSno_ · cleanName_ · maskName_ 과 같은 규칙이어야 한다(시험이 대조).
 *  ⚠ node 로 그대로 불러다 시험한다. DOM 을 만들지 말 것.
 */
export const cleanSno = (v) => String(v == null ? '' : v).replace(/\s/g, '');
export const cleanName = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
export const snoOk = (v) => /^[0-9]{4,6}$/.test(cleanSno(v));
export const nameOk = (v) => /^[가-힣A-Za-z][가-힣A-Za-z ]{0,19}$/.test(cleanName(v));
/** 홍길동 → 홍*동 · 김철 → 김* (발표 화면처럼 반 전체가 보는 곳에 쓴다) */
export function maskName(n) {
  n = String(n || '');
  if (n.length <= 1) return n;
  if (n.length === 2) return n[0] + '*';
  return n[0] + '*'.repeat(n.length - 2) + n[n.length - 1];
}
