/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  보스전 「모범 방어막」 비밀코드의 해시를 만든다 — 나온 값을 src/game/hints.js 의 ANSWER_HASH 에 붙인다.
 *  쓰는 법: node tools/hash-code.mjs 새코드
 *  ⚠ 원문 코드는 저장소 어디에도 적지 말 것(공개 저장소다).
 */
import { answerHash } from '../src/game/hints.js';

const code = process.argv[2];
if (!code) { console.error('쓰는 법: node tools/hash-code.mjs 새코드'); process.exit(1); }
console.log(answerHash(code));
