/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  대시보드의 점수·문구 — 순수 함수라 node 로 시험한다.
 */
export const MISSION_LABEL = { m1: '미션 1 try–except', m2: '미션 2 여러 except', m3: '미션 3 else·finally', boss: '보스전' };

/** 순위 점수 — 카드 10 · 미션 20 · 보스전 막은 수 1 · 별 5 · 확인 문제 정답 5 */
export function scoreOf(s) {
  return s.cards.length * 10 + s.missions.length * 20 + s.boss + s.stars * 5 + s.quiz * 5;
}

/** 「m2:IndexError 못 막음」 → 「미션 2 여러 except — IndexError 못 막음」 */
export function stuckText(what) {
  const [m, rest] = String(what).split(':');
  return `${MISSION_LABEL[m] || m} — ${rest || ''}`;
}
