/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  우리 해석기 ↔ 진짜 파이썬. 출력 · 예외 종류 · 메시지 · 줄 번호가 글자 하나까지 같아야 한다.
 */
import { readFileSync } from 'node:fs';
import { 묶음, 확인, 참 } from './harness.mjs';
import { runPython } from '../src/lib/pymini.js';
import { cases } from './golden-cases.mjs';

const golden = JSON.parse(readFileSync(new URL('./golden.json', import.meta.url), 'utf-8'));
const list = cases();

묶음('진짜 파이썬과 대조');
확인('사례 수가 기준과 같다 (조각을 고쳤으면 golden.py 를 다시 돌릴 것)', golden.cases.length, list.length);
for (let i = 0; i < list.length; i++) {
  const c = list[i], g = golden.cases[i];
  if (!g || g.name !== c.name) { 확인(`${c.name} — 기준의 이름이 같다`, g && g.name, c.name); continue; }
  const inputs = c.inputs || [];
  // golden.py 처럼 질문 문구는 찍지 않는다
  const r = runPython(c.code, { inputFn: (p, k) => inputs[k], files: c.files || {} });
  확인(`${c.name} — 출력`, r.output, g.output);
  확인(`${c.name} — 예외`, r.ok ? null : { type: r.errorType, msg: r.errorMsg, line: r.errorLine }, g.error);
}

묶음('파일 열기는 가짜 파일만');
{
  const r = runPython('open("C:/Windows/win.ini")', { files: {} });
  확인('진짜 디스크 파일도 「없는 파일」', r.errorType, 'FileNotFoundError');
  const w = runPython('open("a.txt", "w")', { files: {} });
  참('쓰기 모드는 막는다', !w.ok && w.errorType === '지원하지 않는 문법');
  const c = runPython('f = open("a.txt")\nf.close()\nf.read()', { files: { 'a.txt': 'x' } });
  확인('닫은 파일 읽기', [c.errorType, c.errorMsg], ['ValueError', 'I/O operation on closed file.']);
}
