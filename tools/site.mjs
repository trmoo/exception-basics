/*! 부숴봐! 자판기 — 예외 처리 — 체험 페이지 만들기 (깃허브 Pages 에 올리는 공개 체험판)
 * © 2026 티쳐무 · 모든 권리 보유
 *
 *   node tools/site.mjs   →   dist/site/index.html (안내) · student.html · teacher.html
 *
 * 미리보기와 같은 방법으로 만든다 — 서버도 시트도 없이, 브라우저 안의 가짜 시트 위에서 진짜 Code.gs 가 돈다.
 * 체험하는 사람이 적은 글은 그 브라우저 안에만 있고 창을 닫으면 사라진다(어디에도 보내지 않는다).
 * 포털(comedu_portal)의 「테스트 페이지」 단추가 이 주소를 가리킨다.
 */

/* 시트 메뉴만 있는 앱(선생님 웹 화면이 없는 앱)에 붙이는 공통 안내 */
const SHEET_NOTE = (menuWhat) => '선생님 기능(' + menuWhat + ')은 <b>사본 시트의 메뉴</b>에 있어 체험판에는 없습니다. ' +
  '개발자 도구(F12) 콘솔에서 <code>sheetDump(\'제출 현황\')</code> 을 치면 학생 답이 시트에 어떻게 쌓이는지 볼 수 있습니다.';
const STUDENT_BAND = (acct) => '지어낸 반 친구들과 함께 미리 써 보는 화면입니다. 적은 내용은 이 브라우저 안의 가짜 시트에만 있어 ' +
  '어디에도 보내지 않으며, 새로 고치면 사라집니다. ' + acct + ' · <a href="./">체험 안내</a>';

/* 이 앱은 Vite 로 빌드한 dist/index.html 에, 브라우저에서 도는 가짜 앱스 스크립트를 끼워 「앱스 스크립트 안에서 열린 것처럼」 만든다.
 *   tools/fake-gas.mjs(시험 · 개발 서버가 쓰는 것)를 글자 그대로 가져와 node 전용 부분만 바꾼다 — 따로 베끼지 않아 어긋나지 않는다.
 *   window.google.script.run 이 생기므로 화면은 MODE 'gas' 로 돈다(혼자 모드가 아니다). */
function browserFakeGas() {
  let s = readFileSync(join(ROOT, 'tools', 'fake-gas.mjs'), 'utf8');
  const swap = (re, to, what) => {
    if (!re.test(s)) throw new Error('tools/fake-gas.mjs 가 바뀌었습니다 — 「' + what + '」 를 찾지 못했어요. tools/site.mjs 를 함께 고치세요.');
    s = s.replace(re, to);
  };
  swap(/^import [^\n]*\n/gm, '', 'import 줄');
  swap(/createHash\('sha256'\)\.update\(String\(text\), 'utf8'\)\.digest\(\)/, '__sha256(String(text))', 'createHash');
  swap(/randomUUID\(\)/g, '__uuid()', 'randomUUID');
  swap(/\/\*\* Code\.gs 를 가짜 환경 위에서[\s\S]*$/, '', 'loadServer');
  swap(/^export /gm, '', 'export');
  return s;
}
const SHA256 = `
function __sha256(str) {
  var msg = Array.from(new TextEncoder().encode(str));
  var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,
    0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,
    0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,
    0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  var len = msg.length * 8;
  msg.push(0x80);
  while (msg.length % 64 !== 56) msg.push(0);
  msg.push(0, 0, 0, 0, (len >>> 24) & 255, (len >>> 16) & 255, (len >>> 8) & 255, len & 255);
  var w = new Array(64), i, j, a, b, c, d, e, f, g, h, t1, t2;
  function r(x, n) { return (x >>> n) | (x << (32 - n)); }
  for (i = 0; i < msg.length; i += 64) {
    for (j = 0; j < 16; j++) w[j] = (msg[i + j * 4] << 24) | (msg[i + j * 4 + 1] << 16) | (msg[i + j * 4 + 2] << 8) | msg[i + j * 4 + 3];
    for (j = 16; j < 64; j++) w[j] = (w[j - 16] + (r(w[j - 15], 7) ^ r(w[j - 15], 18) ^ (w[j - 15] >>> 3)) + w[j - 7] + (r(w[j - 2], 17) ^ r(w[j - 2], 19) ^ (w[j - 2] >>> 10))) | 0;
    a = H[0]; b = H[1]; c = H[2]; d = H[3]; e = H[4]; f = H[5]; g = H[6]; h = H[7];
    for (j = 0; j < 64; j++) {
      t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[j] + w[j]) | 0;
      t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  var out = [];
  for (i = 0; i < 8; i++) out.push((H[i] >>> 24) & 255, (H[i] >>> 16) & 255, (H[i] >>> 8) & 255, H[i] & 255);
  return out;
}
function __uuid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var v = Math.random() * 16 | 0; return (c === 'x' ? v : (v & 3 | 8)).toString(16); });
}`;
/* 씨앗 — 선생님 암호 · 지금 수업 하나 · 이미 들어와 있는 반 친구 여섯 */
const SEED = `
(function () {
  var A = __api;
  A.setup_();
  A.setPassword_('teach1234');
  var tok = A.apiLogin('teach1234').token;
  var s = A.apiStartSession(tok, '2-3 체험 수업', A.PART_IDS[A.PART_IDS.length - 1]);
  var kids = [['20301', '김하늘'], ['20302', '박도윤'], ['20303', '이서아'], ['20304', '최지호'], ['20305', '정유나'], ['20306', '한시우']];
  kids.forEach(function (k, i) {
    var me = A.apiStudentLogin(k[0], k[1], 'pw1234');
    var pid = 'demo' + k[0];
    A.apiJoin(s.id, i + 1, pid, false, me.token);
    var nc = Math.min(A.CARD_IDS.length, i + 1), nm = Math.min(A.MISSION_IDS.length, Math.floor(i / 2));
    var st = { cards: A.CARD_IDS.slice(0, nc), missions: A.MISSION_IDS.slice(0, nm), boss: i, stars: Math.min(3, nm),
      quiz: Math.min(A.QUIZ_TOTAL, i), quizN: Math.min(A.QUIZ_TOTAL, i + 1) };
    A.CARD_IDS.slice(0, nc).forEach(function (c) { A.apiEvent({ sid: s.id, pid: pid, seat: i + 1, token: me.token, kind: 'found', x: c, state: st }); });
    if (nm) A.apiEvent({ sid: s.id, pid: pid, seat: i + 1, token: me.token, kind: 'mission', x: A.MISSION_IDS[nm - 1], state: st });
  });
})();`;
function buildException(forcePage) {
  const code = readFileSync(join(ROOT, 'gas', 'Code.gs'), 'utf8');
  const names = [...code.matchAll(/^function\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  const vars = [...code.matchAll(/^var\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  const inject = `<script>
/* ===== 체험 페이지 — 브라우저 안의 가짜 앱스 스크립트 (__DEMO_GAS__, 실제 앱에는 들어가지 않습니다) ===== */
${SHA256}
${browserFakeGas()}
var __gas = makeGas();
var __api = (function () {
  var keys = Object.keys(__gas.env);
  var fn = new Function(keys.join(','), ${JSON.stringify(code).replace(/<\//g, '<\\/')} + '\\nreturn { ${[...names, ...vars].join(', ')} };');
  return fn.apply(null, keys.map(function (k) { return __gas.env[k]; }));
})();
${SEED}
(function () {
  var FORCE = ${JSON.stringify(forcePage || '')};
  function runner(ok, bad) {
    return new Proxy({}, { get: function (t, name) {
      if (typeof name !== 'string') return undefined;
      if (name === 'withSuccessHandler') return function (f) { return runner(f, bad); };
      if (name === 'withFailureHandler') return function (f) { return runner(ok, f); };
      return function () {
        var args = JSON.parse(JSON.stringify(Array.prototype.slice.call(arguments)));
        setTimeout(function () {
          try {
            var f = __api[name];
            if (typeof f !== 'function' || !/^api/.test(name)) throw new Error('그런 서버 함수가 없습니다: ' + name);
            var v = f.apply(null, args);
            ok(v === undefined ? v : JSON.parse(JSON.stringify(v)));
          } catch (e) { bad(e); }
        }, 120);
      };
    } });
  }
  window.google = { script: {
    run: runner(function () {}, function (e) { console.error(e); }),
    url: { getLocation: function (cb) {
      var p = {}; new URLSearchParams(location.search).forEach(function (v, k) { p[k] = v; });
      if (FORCE) p.page = FORCE;
      setTimeout(function () { cb({ parameter: p, hash: location.hash.slice(1) }); }, 0);
    } },
  } };
})();
</script>`;
  let html = readFileSync(join(ROOT, 'dist', 'index.html'), 'utf8');
  if (!/<head>/i.test(html)) throw new Error('dist/index.html 에 <head> 가 없습니다.');
  html = html.replace(/<head>/i, (m) => m + '\n' + inject);
  return html;
}

const STAGE_BAND = '새로 고치면 처음으로 돌아갑니다 · ';
const APP = {
  name: '부숴봐! 자판기 — 예외 처리', emoji: '🥤', repo: 'exception-basics', color: '#0369a1', color2: '#0284c7',
  desc: '자판기를 일부러 고장 내며 예외를 찾고 try–except 로 방어막을 세우는 2차시 게임 — 학생 화면과 선생님 대시보드를 미리 써 보는 체험 페이지',
  intro: '귀여운 자판기 뒤에서 <b>진짜 파이썬 코드</b>가 돕니다. 돈 · 번호 · 사람 수를 넣어 자판기를 고장 내며 예외 다섯 가지를 찾고, <b>try–except · else · finally</b> 로 방어막을 세우는 2차시 게임입니다. 선생님은 대시보드에서 반 전체 진행을 실시간으로 봅니다.',
  build: [['npm', 'run', 'build']],
  from: null,
  fake: ['__DEMO_GAS__'],
  minKB: 150,
  pages: [{
    file: 'student.html', badge: true,
    band: STAGE_BAND + '반 친구 20301~20306 / pw1234',
    card: {
      title: '🧑‍🎓 학생 화면', go: '학생 화면 열기',
      who: '로그인하고 자리를 고른 뒤, 자판기를 고장 내며 예외를 찾아 갑니다.',
      acct: '학번 <b class="big">20307</b> 처럼 <b>아무 학번</b>으로 처음 들어와 이름 · 비밀번호를 정합니다.<br>' +
        '<span style="color:var(--sub)">선생님이 「2-3 체험 수업」 을 열어 둔 상태입니다. 자리는 7번부터 비어 있어요.</span>',
      more: ['<code>20301</code> ~ <code>20306</code> / <code>pw1234</code> — 이미 들어와 있는 반 친구 (1~6번 자리)'],
      try: ["🎰 1라운드 — 값을 넣어 자판기를 고장 내면 빨간 줄과 한국어 풀이가 뜹니다. 찾은 예외는 도감에 모입니다.","🛡️ 방어막 — 미션마다 except 를 채워 같은 공격을 다시 넣어 보고, 보스전에 도전합니다.","⭐ 심화 — 실행 오류와 논리 오류 · 논리 오류 사냥","🏁 오늘 배운 것 — 내 말로 적어 [📤 제출하기]"],
    },
  }, {
    file: 'teacher.html', badge: true,
    band: STAGE_BAND + '선생님 암호 teach1234',
    teacher: true,
    card: {
      title: '👩‍🏫 선생님 대시보드', go: '선생님 대시보드 열기', teacher: true,
      who: '반 전체 진행을 실시간으로 보고, 수업 범위를 고르고, 학생이 적은 정리를 읽습니다.',
      acct: '선생님 암호 <b class="big">teach1234</b>',
      try: ['📺 발표 — 교실 TV 에 띄우는 화면(카드 · 첫 발견 · 순위 · 소식, 이름은 가려 둠)',
        '🔍 선생님 — 학생 타일 · 미션별 통과 · 가장 많이 막힌 곳 · 확인 문제 정답률',
        '✍️ 정리 — 학생이 제출한 「오늘 배운 것」 을 물음별로 읽습니다.'],
    },
  }],
  notes: ['<b>학생 화면과 선생님 대시보드는 서로 이어져 있지 않습니다.</b> 저마다 따로 지어낸 반이라, 학생 화면에서 한 일이 대시보드에 나타나지 않습니다. ' +
    '실제 앱에서는 한 스프레드시트로 이어져 학생이 예외를 찾는 순간 대시보드에 뜹니다.',
    '이 기기에 남는 진행 기록(자리 · 찾은 카드)은 브라우저 저장소에 있어, 새로 고친 뒤 「이어서 하기」 가 보일 수 있습니다. 처음부터 하려면 오른쪽 위 「🧹 기록 초기화」를 누르세요.'],
};
APP.pages[0].make = () => toDemo(buildException(''), APP.pages[0]);
APP.pages[1].make = () => toDemo(buildException('teacher'), APP.pages[1]);


/* ───────────────────────── 아래는 앱마다 똑같은 부분 ─────────────────────────
 * 체험 페이지 만드는 순서
 *   ① APP.build 의 명령을 차례로 돌린다 (미리보기 · 빌드)
 *   ② APP.from(미리보기 파일)을 읽어 「미리보기 모드」 띠를 「체험 페이지」 띠로 바꾸고 탭 제목 앞에 [체험] 을 붙인다
 *   ③ APP.pages 마다 dist/site/<file> 로 쓴다 (선생님 화면은 page 값을 박아 둔다)
 *   ④ 안내 첫 화면 dist/site/index.html 을 만든다
 *   ⑤ 점검 — 하나라도 어긋나면 멈춘다(배포하지 않는다)
 */
import { execFileSync, execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'dist', 'site');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ① 미리보기 · 빌드 */
for (const [cmd, ...args] of APP.build) {
  /* 윈도우의 npm 은 .cmd 라 셸로만 부를 수 있다 — 명령이 이 파일에 박힌 글자뿐이라 한 줄로 이어 넘긴다 */
  if (process.platform === 'win32' && cmd === 'npm') execSync(['npm', ...args].join(' '), { cwd: ROOT, stdio: 'inherit' });
  else execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit' });
}

/* ② 미리보기 파일을 체험판으로 */
const BAND = '<b>체험 페이지</b> — ';
function toDemo(html, page) {
  const band = BAND + page.band;
  if (page.badge) {
    /* 1280×720 무대 앱 — 화면을 가리지 않게 왼쪽 아래 작은 딱지로 */
    html = html.replace('</body>', () => '<div style="position:fixed;left:8px;bottom:8px;z-index:2147483000;max-width:min(560px,70vw);' +
      'background:rgba(255,246,224,.94);border:2px solid #d9a12a;border-radius:10px;padding:4px 10px;' +
      'font:12px/1.5 sans-serif;color:#8a5a00;pointer-events:none">' + band + '</div>\n</body>');
  } else if (/<b>미리보기 모드<\/b>/.test(html)) {
    html = html.replace(/<b>미리보기 모드<\/b>[\s\S]*?<\/div>/, () => band + '</div>');
  } else {
    html = html.replace('</body>', () => '<div style="position:fixed;left:0;right:0;bottom:0;z-index:2147483000;' +
      'background:#fff6e0;border-top:2px solid #d9a12a;padding:5px 12px;font:13px/1.5 sans-serif;color:#8a5a00;' +
      'text-align:center;pointer-events:none">' + band + '</div>\n</body>');
  }
  if (/<title>/.test(html)) html = html.replace(/<title>/, () => '<title>[체험] ');
  else html = html.replace(/<head[^>]*>/i, (m) => m + '\n<title>[체험] ' + esc(APP.name) + '</title>');
  if (page.edit) html = page.edit(html);
  return html;
}

rmSync(SITE, { recursive: true, force: true });
mkdirSync(SITE, { recursive: true });
const src = APP.from ? readFileSync(join(ROOT, APP.from), 'utf8') : '';
const sizes = {};
for (const page of APP.pages) {
  const html = page.make ? page.make() : toDemo(src, page);
  writeFileSync(join(SITE, page.file), html, 'utf8');
  sizes[page.file] = Math.round(Buffer.byteLength(html, 'utf8') / 1024);
}

/* ④ 안내 첫 화면 */
const li = (arr) => arr.map((x) => '<li>' + x + '</li>').join('\n          ');
const cards = APP.pages.filter((p) => p.card).map((p) => `
      <section class="card">
        <h2>${p.card.title}</h2>
        <p class="who">${p.card.who}</p>
        <a class="go${p.card.teacher ? ' teacher' : ''}" href="${p.file}">${p.card.go} →</a>
        <div class="acct">${p.card.acct}</div>
        ${p.card.more ? '<h3>다른 계정</h3>\n        <ul>\n          ' + li(p.card.more) + '\n        </ul>' : ''}
        <h3>해 볼 것</h3>
        <ul>
          ${li(p.card.try)}
        </ul>
      </section>`).join('\n');
const guide = `<!doctype html>
<!--
  ${APP.name} — 체험 페이지 안내
  © 2026 티쳐무 · 모든 권리 보유 (오픈소스 라이선스 없음)
  깃허브 Pages 첫 화면. tools/site.mjs 가 만든다.
  체험 화면은 서버 없이 브라우저 안의 가짜 시트에서 진짜 서버 코드(Code.gs)를 돌린다.
-->
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(APP.name)} — 체험 페이지</title>
  <meta name="description" content="${esc(APP.desc)}">
  <style>
    :root{
      --bg:#f6f3ee; --card:#fff; --ink:#1d2430; --sub:#5b6474; --line:#e3ddd3;
      --brand:${APP.color || '#2c4a80'}; --brand2:${APP.color2 || '#3d63a8'}; --accent:#e8684a;
      --warn:#8a5a00; --warnbg:#fff5df; --infobg:#eaf0fa;
      --radius:18px; --shadow:0 2px 12px rgba(40,30,20,.08);
    }
    *{box-sizing:border-box}
    body{margin:0; background:var(--bg); color:var(--ink);
      font:18px/1.75 "Pretendard","Noto Sans KR","Malgun Gothic","맑은 고딕",-apple-system,sans-serif;
      -webkit-text-size-adjust:100%}
    a{color:var(--brand)}
    .wrap{max-width:1080px; margin:0 auto; padding:0 16px}
    header{background:linear-gradient(135deg,var(--brand),var(--brand2)); color:#fff; padding:40px 0 34px}
    header h1{margin:0; font-size:clamp(28px,4.6vw,42px); font-weight:900; letter-spacing:-.02em}
    header .tag{display:inline-block; background:rgba(255,255,255,.18); border-radius:999px; padding:2px 14px;
      font-size:15px; font-weight:700; margin-bottom:10px}
    header p{margin:12px 0 0; font-size:clamp(17px,2.2vw,20px); opacity:.95; max-width:820px}
    main{padding:28px 0 12px}
    .cards{display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr)); gap:20px}
    .card{background:var(--card); border:1px solid var(--line); border-radius:var(--radius); box-shadow:var(--shadow);
      padding:24px 24px 22px; display:flex; flex-direction:column}
    .card h2{margin:0 0 6px; font-size:26px; font-weight:900}
    .card .who{color:var(--sub); margin:0 0 14px}
    .go{display:block; text-align:center; text-decoration:none; font-weight:900; font-size:22px; color:#fff;
      background:var(--brand); border-radius:14px; padding:16px 18px; margin:4px 0 16px}
    .go:hover,.go:focus-visible{background:var(--brand2)}
    .go.teacher{background:var(--accent)}
    .go.teacher:hover,.go.teacher:focus-visible{background:#d4553a}
    .acct{background:var(--infobg); border-radius:12px; padding:12px 16px; margin:0 0 14px}
    .acct b.big{font-size:22px; letter-spacing:.02em}
    code{font:inherit; font-weight:800; background:#fff; border:1px solid var(--line); border-radius:7px; padding:0 7px}
    h3{margin:6px 0 4px; font-size:19px}
    ul{margin:4px 0 0; padding-left:1.25em}
    li{margin:3px 0}
    .note{background:var(--warnbg); border:1px solid #ecd39b; color:#5b3c00; border-radius:var(--radius);
      padding:20px 24px; margin:24px 0 0}
    .note h2{margin:0 0 6px; font-size:22px; color:var(--warn)}
    .use{background:var(--card); border:1px solid var(--line); border-radius:var(--radius); padding:20px 24px; margin:20px 0 0}
    .use h2{margin:0 0 6px; font-size:22px}
    footer{color:var(--sub); font-size:15px; text-align:center; padding:26px 16px 36px}
    @media (max-width:560px){ body{font-size:17px} .card{padding:20px 18px} .go{font-size:20px} }
  </style>
</head>
<body>
  <header>
    <div class="wrap">
      <span class="tag">체험 페이지</span>
      <h1>${APP.emoji} ${esc(APP.name)}</h1>
      <p>${APP.intro}</p>
    </div>
  </header>

  <main class="wrap">
    <div class="cards">${cards}
    </div>

    <section class="note">
      <h2>⚠ 알아 두세요</h2>
      <ul>
        <li>체험 화면은 <b>서버 없이 이 브라우저 안의 가짜 시트</b>에서 진짜 서버 코드를 돌립니다. 적은 내용은 어디에도 보내지 않으며,
          <b>새로 고치거나 창을 닫으면 처음 상태</b>로 돌아갑니다.</li>
        ${li(APP.notes)}
        <li>진짜 학생 이름 · 학번은 넣지 마세요. 화면에 나오는 학생은 모두 지어낸 사람입니다.</li>
      </ul>
    </section>

    <section class="use">
      <h2>🏫 우리 반에서 쓰려면</h2>
      <p style="margin:0">구글 스프레드시트에 붙여 쓰는 앱스 스크립트 웹앱이라, 학생의 기록은 선생님의 구글 드라이브에만 쌓입니다.
        <a href="https://trmoo.github.io/comedu_portal/">티쳐무의 정보 수업 도구함</a>에서 「교사용 사본 만들기」를 누르면
        배포까지 따라 하는 안내가 나옵니다. 코드는 <a href="https://github.com/trmoo/${APP.repo}">저장소</a>에 있습니다.</p>
    </section>
  </main>

  <footer>
    © 2026 티쳐무 · 모든 권리 보유 · 학교 수업 목적으로만 이용해 주세요 ·
    <a href="https://github.com/trmoo/${APP.repo}">저장소</a>
  </footer>
</body>
</html>
`;
writeFileSync(join(SITE, 'index.html'), guide, 'utf8');

/* ⑤ 점검 */
const bad = [];
const files = readdirSync(SITE);
for (const f of files) {
  const html = readFileSync(join(SITE, f), 'utf8');
  if (!html.includes('© 2026 티쳐무')) bad.push(f + ' 에 저작권 표시(© 2026 티쳐무)가 없습니다.');
  for (const m of html.matchAll(/href="([^"#:?]+\.html)(?:[?#][^"]*)?"/g)) {
    if (!files.includes(m[1])) bad.push(f + ' 의 링크 ' + m[1] + ' 가 가리키는 파일이 없습니다.');
  }
}
for (const page of APP.pages) {
  const html = readFileSync(join(SITE, page.file), 'utf8');
  if (!html.includes(BAND)) bad.push(page.file + ' 에 체험 페이지 안내 띠가 없습니다.');
  if (html.includes('<b>미리보기 모드</b>')) bad.push(page.file + ' 에 「미리보기 모드」 띠가 남았습니다.');
  if (!APP.fake.some((m) => html.includes(m))) bad.push(page.file + ' 에 가짜 서버가 없습니다 — 진짜 서버로 보내는 화면이 되면 안 됩니다.');
  if (sizes[page.file] < APP.minKB) bad.push(page.file + ' 가 너무 작습니다(' + sizes[page.file] + 'KB) — 빌드가 덜 된 것 같습니다.');
}
const idx = readFileSync(join(SITE, 'index.html'), 'utf8');
for (const page of APP.pages.filter((p) => p.card)) {
  if (!idx.includes('href="' + page.file + '"')) bad.push('index.html 에 ' + page.file + ' 링크가 없습니다.');
}
if (bad.length) {
  console.error('체험 페이지 점검 실패:\n  - ' + bad.join('\n  - '));
  process.exit(1);
}
console.log('체험 페이지를 만들었습니다 → dist/site/ (안내 · ' +
  Object.entries(sizes).map(([f, kb]) => f + ' ' + kb + 'KB').join(' · ') + ')');
