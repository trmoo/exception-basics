/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  차시 범위 — 한 시간에 다 하기엔 많아서 두 차시로 나눈다(2026-10-25 사용자 지시).
 *    1차시  예외란(부숴봐!·도감) · try–except(미션 1) · 여러 except(미션 2) · ⭐ 심화(논리 오류) · 오늘의 결과
 *    2차시  else·finally(미션 3) · 보스전 · 남용 주의 · 확인 문제 · 오늘의 결과
 *  교사가 대시보드에서 수업마다 고르고, 혼자 모드에서는 시작 카드에서 고른다.
 *  범위 밖 카드는 학생 화면에서 사라진다(아래 단원 줄에도 안 보이고, ← → 로도 못 간다).
 *  ⚠ 같은 반은 2차시에도 「같은 수업」 을 이어서 써야 기록이 이어진다(기록은 수업 + 번호마다 따로).
 *  ⚠ gas/Code.gs 의 PART_IDS 와 같아야 한다 — 시험이 대조한다.
 *  ⚠ node 로 그대로 불러다 시험한다. DOM 을 만들지 말 것.
 */

export const PARTS = [
  { id: 'p1', label: '1차시', note: '예외란 · try–except · 여러 except · ⭐ 심화', chapters: ['c0', 'c1', 'c2', 'c3', 'cx'], also: ['result'] },
  { id: 'p2', label: '2차시', note: 'else·finally · 보스전 · 확인 문제', chapters: ['c0', 'c4', 'c5', 'c6'], also: [] },
  { id: 'all', label: '전체', note: '처음부터 끝까지 한 번에', chapters: null, also: [] },
];
export const partOf = (id) => PARTS.find((p) => p.id === id) || PARTS[PARTS.length - 1];

/** 이 차시에 보여 줄 카드만 (차례는 그대로) */
export function cardsFor(cards, partId) {
  const p = partOf(partId);
  if (!p.chapters) return cards.slice();
  return cards.filter((c) => p.chapters.includes(c.chapter) || p.also.includes(c.id));
}

/** 이 차시에 하는 미션 — 결과 카드가 「통과한 미션 n / m」 을 셀 때 쓴다 */
export const MISSIONS_OF = { p1: ['m1', 'm2'], p2: ['m3', 'boss'], all: ['m1', 'm2', 'm3', 'boss'] };
