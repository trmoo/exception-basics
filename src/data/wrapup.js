/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  🏁 오늘의 결과 — 「오늘 배운 것」 을 정리해 보여 주지 않고, 선생님과 함께 학생이 직접 적는 물음
 *  (2026-10-28 사용자 지시). 정답 문장은 화면에 없다. 💡 를 누르면 실마리 낱말만 보인다.
 *  적은 글은 이 기기에만 남고(S.notes) 선생님 시트로는 보내지 않는다.
 *  ⚠ node 로 그대로 불러다 시험한다. DOM 을 만들지 말 것.
 */

// part: 이 물음이 나오는 차시 (p1 · p2). 「전체」 범위에서는 모두 나온다.
export const WRAPUP = [
  { id: 'what', part: 'p1', q: '예외란 무엇인가요? 문법 오류와 무엇이 다른가요?', hint: '실행 도중 · 멈춘다 · 문법은 맞다' },
  { id: 'try', part: 'p1', q: 'try 와 except 는 각각 무슨 일을 하나요?', hint: '감싼다 · 오류가 나면 · 대신 할 일' },
  { id: 'many', part: 'p1', q: 'except 를 여러 개 두면 무엇이 좋은가요?', hint: '예외마다 · 다른 말 · 위에서부터' },
  { id: 'logic', part: 'p1', q: '⭐ 논리 오류는 실행 오류와 무엇이 다른가요? (심화를 했다면)', hint: '멈추지 않는다 · 틀린 결과 · if 로 검사' },
  { id: 'else', part: 'p2', q: 'else 는 언제 실행되나요?', hint: '예외가 나지 않았을 때' },
  { id: 'finally', part: 'p2', q: 'finally 는 언제 실행되나요? 어디에 쓰면 좋을까요?', hint: '언제나 · 마무리 · 뒷정리' },
  { id: 'misuse', part: 'p2', q: 'except: 만 쓰면 왜 안 되나요?', hint: '무엇이 잘못됐는지 · 오타까지 숨긴다 · 예외 이름' },
  { id: 'unsure', part: 'all', q: '🤔 아직 헷갈리는 것 한 가지', hint: '' },
];

/** 이 차시에 보여 줄 물음 */
export function wrapupFor(part) {
  return WRAPUP.filter((w) => part === 'all' || w.part === 'all' || w.part === part);
}
