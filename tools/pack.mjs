/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  빌드 결과(dist/index.html)를 앱스 스크립트에 붙여 넣을 파일로 묶는다 → dist/appsscript/
 *    index.html        앱 전체 (HtmlService.createHtmlOutputFromFile('index') 가 연다)
 *    Code.gs           서버
 *    appsscript.json   웹 앱 설정 (실행: 나 · 액세스: 모든 사용자)
 *    붙여넣는 순서.md
 *
 *  ⚠ 모듈 스크립트(<script type="module">)를 보통 <script> 로 바꾸고 </body> 바로 앞으로 옮긴다.
 *    <head> 에 두면 body 가 생기기 전에 돌아 흰 화면이 된다(house-budget 에서 실제로 겪음).
 *  ⚠ replace 의 바꿀 글은 반드시 함수로 넘긴다 — 문자열로 넘기면 번들 속 「$&」 같은 글자가 바뀌어 버린다.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';

const DIST = new URL('../dist/', import.meta.url);
const OUT = new URL('../dist/appsscript/', import.meta.url);
mkdirSync(OUT, { recursive: true });

let html = readFileSync(new URL('index.html', DIST), 'utf-8');
const m = html.match(/<script type="module" crossorigin>([\s\S]*?)<\/script>/);
if (!m) throw new Error('dist/index.html 에서 모듈 스크립트를 찾지 못했어요. 빌드가 바뀌었나요?');
const code = m[1];
if (/<\/script/i.test(code)) throw new Error('번들 안에 </script 글자가 있어요 — 스크립트가 중간에 끊깁니다.');
html = html.replace(m[0], () => '');
html = html.replace('</body>', () => `<script>${code}</script>\n</body>`);
// 앱스 스크립트의 HtmlService 템플릿이 아니므로 <? ?> 는 그대로 두어도 되지만, 혹시 몰라 확인만 한다
writeFileSync(new URL('index.html', OUT), html);
copyFileSync(new URL('../gas/Code.gs', import.meta.url), new URL('Code.gs', OUT));
writeFileSync(new URL('appsscript.json', OUT), JSON.stringify({
  timeZone: 'Asia/Seoul',
  exceptionLogging: 'STACKDRIVER',
  runtimeVersion: 'V8',
  webapp: { executeAs: 'USER_DEPLOYING', access: 'ANYONE_ANONYMOUS' },
}, null, 2));
writeFileSync(new URL('붙여넣는 순서.md', OUT), `# 앱스 스크립트에 붙여 넣는 순서

1. 구글 시트를 새로 만들고 **확장 프로그램 → Apps Script** 를 연다.
2. 왼쪽 「파일」 의 \`Code.gs\` 내용을 모두 지우고, 이 폴더의 **Code.gs** 를 통째로 붙여 넣는다.
3. 「파일 +」 → **HTML** → 이름을 \`index\` 로 만들고(.html 은 저절로 붙음), 이 폴더의 **index.html** 을 통째로 붙여 넣는다.
4. ⚙️ 프로젝트 설정 → 「appsscript.json 매니페스트 파일 표시」 를 켜고, **appsscript.json** 내용을 붙여 넣는다.
5. 저장(Ctrl+S) → 시트로 돌아가 새로고침하면 메뉴 **🥤 부숴봐! 자판기** 가 생긴다.
   ① 시트 준비하기 → ② 교사 암호 정하기 (처음 한 번 권한 승인).
6. Apps Script 화면 오른쪽 위 **배포 → 새 배포 → 유형: 웹 앱**
   - 실행: **나** · 액세스 권한: **모든 사용자** → 배포
7. 나온 웹 앱 주소가 **학생 주소**, 그 끝에 \`?page=teacher\` 를 붙이면 **교사 대시보드**.

코드를 고친 뒤에는 **배포 관리 → ✏️ 수정 → 버전: 새 버전** 으로 바꿔야 주소가 그대로 유지된다.
`);
// 시험용 — google.script.run 을 흉내 내어 개발 서버(npm start)의 진짜 Code.gs 로 보내는 판.
// npm start 를 켜 둔 채 http://localhost:5173/dist/gas-test.html 로 열면 「앱스 스크립트 안에서와 똑같이」 돈다.
const STUB = `<script>
window.google = { script: {
  url: { getLocation: (cb) => cb({ parameter: Object.fromEntries(new URLSearchParams(location.search)) }) },
  run: { withSuccessHandler: (ok) => ({ withFailureHandler: (bad) => new Proxy({}, { get: (_, fn) => (...a) =>
    fetch('/__gas/' + fn, { method: 'POST', body: JSON.stringify(a) }).then((r) => r.json())
      .then((j) => (j.error ? bad(new Error(j.error)) : ok(j.value))).catch(bad) }) }) },
} };
</script>`;
writeFileSync(new URL('gas-test.html', DIST), html.replace('<head>', () => `<head>
${STUB}`));

console.log(`dist/appsscript/ 에 4개 파일을 만들었어요 (index.html ${(Buffer.byteLength(html) / 1024).toFixed(0)}KB).`);
