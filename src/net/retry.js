/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  다시 보낼지 가르는 규칙 — node 시험에서도 부를 수 있게 gas.js 에서 떼어 두었다(gas.js 는 import.meta.env 를 써서 node 에서 못 부른다).
 */
// 다시 보내면 되는 실패 — 서버가 「접속이 몰렸다」(Code.gs 의 BUSY)고 했거나, 통신이 잠깐 끊겼을 때
// (비밀번호가 틀렸다·출입증이 지났다 같은 실패는 다시 보내도 같으므로 여기에 넣지 않는다)
export const retryable = (e) => /^BUSY|NetworkError|Failed to fetch|Load failed|HTTP 0|server error|서버 오류/i.test(String(e && e.message || e));
/** 화면에 보일 오류 글 — BUSY 표식은 떼어 낸다 */
export const errText = (e) => String(e && e.message || e).replace(/^BUSY:\s*/, '');
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

