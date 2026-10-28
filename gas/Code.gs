/*! 부숴봐! 자판기 (교재판) — 앱스 스크립트 서버
 *  © 2026 티쳐무 · 모든 권리 보유 — 학교 수업 목적으로만 이용해 주세요.
 *
 *  하는 일
 *    ① 웹 앱을 연다 (index.html — Vite 로 만든 앱 한 파일)
 *    ② 학생 기기가 보낸 「사건」(카드 발견·미션 통과·막힌 곳·퀴즈)을 시트에 적는다
 *    ③ 교사 대시보드에 수업 하나의 현황을 모아 준다
 *
 *  학생은 맨 처음 학번 · 이름 · 비밀번호로 로그인하고(2026-10-28 사용자 지시) 자리 번호(1~40)를 고른다.
 *  비밀번호는 솔트 + SHA-256 해시로만 「계정(비밀번호)」 시트(숨김)에 남아 선생님도 볼 수 없다. 잊으면 시트 메뉴로 초기화한다.
 *  학번·이름은 이 시트에만 남고, 발표 화면에는 이름을 가린다(홍*동).
 *  시트 메뉴 「기록 모두 지우기」 로 학기가 끝나면 지울 것.
 *  ⚠ 학생 기기는 사건이 있을 때만 짧게 부르고, 몇 초마다 묻는 것은 대시보드 하나뿐이다.
 *    대시보드 결과는 캐시에 잠깐 담아 두어 시트를 덜 읽는다 (동시 실행 한도 때문에).
 *  ⚠ 이 파일은 node 의 가짜 앱스 스크립트 위에서도 그대로 돈다(tools/fake-gas.mjs) — var·function 만 쓴다.
 */

var SHEET_LOG = '기록';
var SHEET_STATE = '현황';
var SHEET_SESSION = '수업';
var SHEET_ACCOUNT = '계정(비밀번호)';
var HEAD_LOG = ['시각', '수업', '학번', '자리', '기기', '종류', '내용'];
// 학생 한 명 = 한 줄 (수업 + 학번). 자리는 지금 앉은 곳 — 2차시에 자리를 옮겨도 기록이 이어진다.
var HEAD_STATE = ['수업', '학번', '이름', '자리', '기기', '카드', '카드 수', '미션', '미션 수', '보스전', '별', '퀴즈 정답', '퀴즈 푼 수', '마지막', '처음'];
var HEAD_SESSION = ['수업', '이름', '시작'];
// 학생 계정 — 수업과 상관없이 학번 하나에 한 줄. 해시·솔트가 비어 있으면 「초기화된 계정」 이다.
var HEAD_ACCOUNT = ['학번', '이름', '해시', '솔트', '만든 시각', '바꾼 시각'];
var PW_MIN = 4;
var PW_MAX = 30;
var STU_TTL = 21600;  // 학생 출입증 6시간 (CacheService 의 한도)
var FAIL_MAX = 10;    // 비밀번호를 10번 틀리면 10분 동안 막는다
// 차시 범위 — src/data/parts.js 의 PARTS 와 같아야 한다. 수업마다 스크립트 속성 PART:<수업> 에 담는다(시트 열을 늘리지 않으려고).
var PART_IDS = ['p1', 'p2', 'all'];

var CARD_IDS = ['ValueError', 'ZeroDivisionError', 'IndexError', 'KeyError', 'TypeError'];
var MISSION_IDS = ['m1', 'm2', 'm3', 'boss'];
var KINDS = ['found', 'mission', 'fail', 'boss', 'quiz', 'join'];
var MAX_NUM = 40;
var QUIZ_TOTAL = 4;

/* ── 웹 앱 ─────────────────────────────────────────────────────────── */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('부숴봐! 자판기')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ── 시트 메뉴 ─────────────────────────────────────────────────────── */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('🥤 부숴봐! 자판기')
    .addItem('① 시트 준비하기', 'menuSetup')
    .addItem('② 교사 암호 정하기', 'menuPassword')
    .addItem('③ 학생 비밀번호 초기화', 'menuResetStudent')
    .addSeparator()
    .addItem('기록 모두 지우기', 'menuClear')
    .addItem('앱 정보', 'menuAbout')
    .addToUi();
}

function menuSetup() {
  setup_();
  SpreadsheetApp.getUi().alert('시트를 준비했어요.\n\n다음으로 「② 교사 암호 정하기」 를 눌러 대시보드 암호를 정해 주세요.');
}

function menuPassword() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt('교사 암호 정하기', '교사 대시보드를 열 때 쓸 암호를 적어 주세요 (4자 이상).', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var pw = String(res.getResponseText() || '');
  if (pw.length < 4) { ui.alert('4자 이상으로 정해 주세요.'); return; }
  setPassword_(pw);
  ui.alert('암호를 정했어요. 웹 앱 주소 끝에 ?page=teacher 를 붙여 열면 대시보드입니다.');
}

function menuResetStudent() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt('학생 비밀번호 초기화', '비밀번호를 잊은 학생의 학번을 적어 주세요.\n(활동 기록은 그대로 남고, 학생은 이름을 확인한 뒤 새 비밀번호를 정합니다)', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var sno;
  try { sno = cleanSno_(res.getResponseText()); } catch (e) { ui.alert(e.message); return; }
  var who = resetStudent_(sno);
  ui.alert(who ? '학번 ' + sno + ' (' + who + ') 학생의 비밀번호를 초기화했어요.\n학생이 학번을 다시 적으면 이름을 확인하고 새 비밀번호를 정합니다.'
    : '학번 ' + sno + ' 학생의 계정이 없어요. (아직 한 번도 들어오지 않았어요)');
}

function menuClear() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.alert('기록 모두 지우기', '모든 수업의 기록·현황과 학생 계정(비밀번호)을 지웁니다. 되돌릴 수 없어요. 지울까요?', ui.ButtonSet.YES_NO);
  if (res !== ui.Button.YES) return;
  clearAll_();
  ui.alert('지웠어요.');
}

function menuAbout() {
  SpreadsheetApp.getUi().alert('부숴봐! 자판기 (교재판)\n\n© 2026 티쳐무 · 모든 권리 보유\n학교 수업 목적으로만 이용해 주세요.\n\n학생의 학번·이름·자리 번호를 이 시트에만 기록합니다.\n비밀번호는 해시로만 저장되어 선생님도 볼 수 없습니다.\n학기가 끝나면 「기록 모두 지우기」 로 지워 주세요.');
}

/* ── 시트 다루기 ───────────────────────────────────────────────────── */
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function props_() { return PropertiesService.getScriptProperties(); }

function sheet_(name, head) {
  var sh = ss_().getSheetByName(name);
  if (!sh) {
    sh = ss_().insertSheet(name);
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function setup_() {
  sheet_(SHEET_SESSION, HEAD_SESSION);
  sheet_(SHEET_STATE, HEAD_STATE);
  sheet_(SHEET_LOG, HEAD_LOG);
  var acc = sheet_(SHEET_ACCOUNT, HEAD_ACCOUNT);
  if (!acc.isSheetHidden()) acc.hideSheet();
}

function rows_(sh, width) {
  var n = sh.getLastRow() - 1;
  if (n <= 0) return [];
  return sh.getRange(2, 1, n, width).getValues();
}

function clearAll_() {
  var names = [SHEET_LOG, SHEET_STATE, SHEET_SESSION, SHEET_ACCOUNT];
  var heads = [HEAD_LOG, HEAD_STATE, HEAD_SESSION, HEAD_ACCOUNT];
  for (var i = 0; i < names.length; i++) {
    var sh = sheet_(names[i], heads[i]);
    var n = sh.getLastRow() - 1;
    if (n > 0) sh.deleteRows(2, n);
  }
  props_().deleteProperty('CURRENT');
  CacheService.getScriptCache().removeAll(['dash:any']);
}

// 시트 쓰기는 한 번에 한 명씩(잠금). 30명이 한꺼번에 들어오면 뒷사람이 기다리므로 25초까지 기다리고,
// 그래도 못 잡으면 BUSY 로 시작하는 오류를 던진다 — 화면(src/net/gas.js)이 이 표식을 보고 조금 뒤 저절로 다시 보낸다.
var LOCK_WAIT = 25000;
var BUSY = 'BUSY: 지금 접속이 몰려 있어요. 잠시 뒤 다시 해 주세요.';
function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT)) throw new Error(BUSY);
  try { return fn(); } finally { lock.releaseLock(); }
}

function now_() { return new Date().getTime(); }

/* ── 교사 암호 · 출입증 ────────────────────────────────────────────── */
function hash_(text) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  var out = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
    out += (b < 16 ? '0' : '') + b.toString(16);
  }
  return out;
}

function setPassword_(pw) {
  var salt = Utilities.getUuid();
  props_().setProperty('SALT', salt);
  props_().setProperty('TEACHER', hash_(salt + '|' + pw));
}

function checkToken_(token) {
  if (!token || !CacheService.getScriptCache().get('tok:' + token)) throw new Error('다시 로그인해 주세요.');
}

/** 교사 로그인 → 6시간짜리 출입증 */
function apiLogin(pw) {
  var saved = props_().getProperty('TEACHER');
  if (!saved) return { ok: false, msg: '아직 교사 암호가 없어요. 시트 메뉴 「🥤 부숴봐! 자판기 → ② 교사 암호 정하기」 를 먼저 해 주세요.' };
  var salt = props_().getProperty('SALT') || '';
  if (hash_(salt + '|' + String(pw || '')) !== saved) return { ok: false, msg: '암호가 맞지 않아요.' };
  var token = Utilities.getUuid();
  CacheService.getScriptCache().put('tok:' + token, '1', 21600);
  return { ok: true, token: token };
}

/* ── 수업 ──────────────────────────────────────────────────────────── */
function currentSession_() {
  var id = props_().getProperty('CURRENT');
  if (!id) return null;
  var list = rows_(sheet_(SHEET_SESSION, HEAD_SESSION), 3);
  for (var i = list.length - 1; i >= 0; i--) if (String(list[i][0]) === id) return { id: id, name: String(list[i][1]), part: partOf_(id) };
  return null;
}

function cleanPart_(p) {
  p = String(p || '');
  if (PART_IDS.indexOf(p) < 0) throw new Error('알 수 없는 차시예요.');
  return p;
}
/** 수업의 차시 범위 (정하지 않았으면 전체) */
function partOf_(sid) {
  var p = props_().getProperty('PART:' + sid);
  return PART_IDS.indexOf(p) >= 0 ? p : 'all';
}

/** 학생 화면이 처음 부른다 — 지금 진행 중인 수업 */
function apiHello() {
  setup_();
  return { session: currentSession_() };
}

/** 교사가 새 수업을 시작한다 (예: 「2-3 2교시」) */
function apiStartSession(token, name, part) {
  checkToken_(token);
  name = String(name || '').replace(/[\r\n\t]/g, ' ').slice(0, 30).trim() || '수업';
  part = cleanPart_(part || 'p1');
  return withLock_(function () {
    setup_();
    var id = Utilities.formatDate(new Date(), 'Asia/Seoul', 'MMddHHmmss') + Math.floor(Math.random() * 90 + 10);
    sheet_(SHEET_SESSION, HEAD_SESSION).appendRow([id, name, new Date()]);
    var before = props_().getProperty('CURRENT');
    props_().setProperty('CURRENT', id);
    props_().setProperty('PART:' + id, part);
    if (before) CacheService.getScriptCache().remove('dash:' + before); // 앞 수업이 「진행 중」 으로 남지 않게
    return { id: id, name: name, part: part };
  });
}

/** 지난 수업을 다시 지금 수업으로 — 같은 반의 2차시는 1차시 수업을 이어서 써야 기록이 이어진다 */
function apiResumeSession(token, sid) {
  checkToken_(token);
  sid = cleanSid_(sid);
  return withLock_(function () {
    var list = rows_(sheet_(SHEET_SESSION, HEAD_SESSION), 3);
    for (var i = 0; i < list.length; i++) {
      if (String(list[i][0]) === sid) {
        var before = props_().getProperty('CURRENT');
        props_().setProperty('CURRENT', sid);
        // 대시보드 4초 캐시에 「지난 수업」 이 남지 않게
        CacheService.getScriptCache().removeAll(['dash:' + sid, 'dash:' + before]);
        return { id: sid, name: String(list[i][1]), part: partOf_(sid) };
      }
    }
    throw new Error('그런 수업이 없어요.');
  });
}

/** 수업의 차시 범위를 바꾼다 — 학생 화면은 카드를 넘길 때 알아챈다 */
function apiSetPart(token, sid, part) {
  checkToken_(token);
  sid = cleanSid_(sid);
  part = cleanPart_(part);
  props_().setProperty('PART:' + sid, part);
  CacheService.getScriptCache().remove('dash:' + sid);
  return { id: sid, part: part };
}

/** 지난 수업 목록 (최근 것부터) */
function apiSessions(token) {
  checkToken_(token);
  var list = rows_(sheet_(SHEET_SESSION, HEAD_SESSION), 3);
  var cur = props_().getProperty('CURRENT');
  var out = [];
  for (var i = list.length - 1; i >= 0 && out.length < 30; i--) {
    out.push({ id: String(list[i][0]), name: String(list[i][1]), current: String(list[i][0]) === cur, part: partOf_(String(list[i][0])) });
  }
  return out;
}

/* ── 학생 계정 · 로그인 ────────────────────────────────────────────── */
function findAccount_(sh, sno) {
  var list = rows_(sh, HEAD_ACCOUNT.length);
  for (var i = 0; i < list.length; i++) if (String(list[i][0]) === sno) return { row: i + 2, v: list[i] };
  return null;
}
function cleanPw_(pw) {
  pw = String(pw == null ? '' : pw);
  if (pw.length < PW_MIN || pw.length > PW_MAX) throw new Error('비밀번호는 ' + PW_MIN + '~' + PW_MAX + '자로 정해 주세요.');
  return pw;
}
/** 비밀번호를 잊은 학생 — 해시·솔트만 비운다(이름과 활동 기록은 남는다). 이름을 돌려준다, 계정이 없으면 '' */
function resetStudent_(sno) {
  return withLock_(function () {
    var sh = sheet_(SHEET_ACCOUNT, HEAD_ACCOUNT);
    var a = findAccount_(sh, sno);
    if (!a) return '';
    sh.getRange(a.row, 3, 1, 2).setValues([['', '']]);
    CacheService.getScriptCache().remove('fail:' + sno);
    return String(a.v[1]);
  });
}

/**
 * 로그인 ① 학번만 적었을 때 — 어떤 화면을 보여 줄지 정한다.
 *   new    처음 온 학생 → 이름 + 비밀번호 정하기
 *   login  계정이 있다 → (가린 이름을 보여 주고) 비밀번호
 *   reset  선생님이 초기화했다 → 이름 확인 + 새 비밀번호 정하기
 */
function apiStudentCheck(sno) {
  sno = cleanSno_(sno);
  setup_();
  var a = findAccount_(sheet_(SHEET_ACCOUNT, HEAD_ACCOUNT), sno);
  if (!a) return { step: 'new' };
  return { step: String(a.v[2]) ? 'login' : 'reset', who: maskName_(a.v[1]) };
}

/**
 * 로그인 ② — 새 계정 만들기 · 비밀번호 확인 · 초기화 뒤 새 비밀번호를 한 함수로.
 * 맞으면 6시간짜리 학생 출입증을 준다. 이름은 계정에 적힌 것을 쓴다(화면이 보낸 이름을 믿지 않는다).
 */
function apiStudentLogin(sno, name, pw) {
  sno = cleanSno_(sno);
  var cache = CacheService.getScriptCache();
  var fails = Number(cache.get('fail:' + sno)) || 0;
  if (fails >= FAIL_MAX) return { ok: false, msg: '비밀번호를 여러 번 틀렸어요. 10분 뒤에 다시 하거나 선생님께 말씀해 주세요.' };
  var miss = function (msg) {
    cache.put('fail:' + sno, String(fails + 1), 600);
    var left = FAIL_MAX - fails - 1;
    return { ok: false, msg: msg + (left <= 3 ? ' (' + left + '번 더 틀리면 10분 동안 막혀요)' : '') };
  };
  return withLock_(function () {
    setup_();
    var sh = sheet_(SHEET_ACCOUNT, HEAD_ACCOUNT);
    var a = findAccount_(sh, sno);
    var t = new Date();
    var who;
    if (a && String(a.v[2])) {
      // 계정이 있다 — 비밀번호 확인
      if (hash_(String(a.v[3]) + '|' + String(pw == null ? '' : pw)) !== String(a.v[2])) return miss('비밀번호가 맞지 않아요.');
      who = String(a.v[1]);
    } else {
      name = cleanName_(name);
      pw = cleanPw_(pw);
      var salt = Utilities.getUuid();
      if (a) {
        // 초기화된 계정 — 이름이 맞아야 새 비밀번호를 정할 수 있다
        if (String(a.v[1]) !== name) return miss('이 학번의 이름과 달라요. 학번과 이름을 다시 확인해 주세요.');
        sh.getRange(a.row, 3, 1, 4).setValues([[hash_(salt + '|' + pw), salt, a.v[4], t]]);
      } else {
        sh.appendRow([sno, name, hash_(salt + '|' + pw), salt, t, t]);
      }
      who = name;
    }
    cache.remove('fail:' + sno);
    var token = Utilities.getUuid();
    cache.put('stu:' + token, sno + '|' + who, STU_TTL);
    return { ok: true, token: token, sno: sno, name: who };
  });
}

/** 학생 출입증 → { sno, name }. 없거나 지났으면 다시 로그인하게 한다 */
function auth_(token) {
  var v = token ? CacheService.getScriptCache().get('stu:' + String(token)) : null;
  if (!v) throw new Error('다시 로그인해 주세요.');
  var i = v.indexOf('|');
  return { sno: v.slice(0, i), name: v.slice(i + 1) };
}

/* ── 학생 사건 ─────────────────────────────────────────────────────── */
function cleanNum_(n) {
  n = Math.floor(Number(n));
  if (!(n >= 1 && n <= MAX_NUM)) throw new Error('자리 번호는 1~' + MAX_NUM + ' 사이여야 해요.');
  return n;
}
function cleanSno_(v) {
  v = String(v == null ? '' : v).replace(/\s/g, '');
  if (!/^[0-9]{4,6}$/.test(v)) throw new Error('학번은 숫자 4~6자리로 적어 주세요.');
  return v;
}
function cleanName_(v) {
  v = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  if (!/^[가-힣A-Za-z][가-힣A-Za-z ]{0,19}$/.test(v)) throw new Error('이름은 한글·영문 20자 안으로 적어 주세요.');
  return v;
}
function cleanPid_(p) {
  p = String(p || '');
  if (!/^[a-z0-9]{6,24}$/.test(p)) throw new Error('기기 번호가 올바르지 않아요.');
  return p;
}
function cleanSid_(s) {
  s = String(s || '');
  if (!/^[0-9]{8,16}$/.test(s)) throw new Error('수업 번호가 올바르지 않아요.');
  return s;
}
function pick_(list, allowed) {
  var out = [];
  for (var i = 0; i < (list || []).length; i++) {
    var v = String(list[i]);
    if (allowed.indexOf(v) >= 0 && out.indexOf(v) < 0) out.push(v);
  }
  return out;
}
function clamp_(n, lo, hi) { n = Math.floor(Number(n) || 0); return Math.max(lo, Math.min(hi, n)); }
/** 이름 가리기 — 홍길동 → 홍*동 (발표 화면·학생에게 보이는 확인 문구용) */
function maskName_(n) {
  n = String(n || '');
  if (n.length <= 1) return n;
  if (n.length === 2) return n.charAt(0) + '*';
  return n.charAt(0) + new Array(n.length - 1).join('*') + n.charAt(n.length - 1);
}

/** 현황 시트에서 (수업, 학번) 줄을 찾는다 — 없으면 0 */
function findStateRow_(sh, sid, sno) {
  var list = rows_(sh, 2);
  for (var i = 0; i < list.length; i++) {
    if (String(list[i][0]) === sid && String(list[i][1]) === sno) return i + 2;
  }
  return 0;
}
function stateOf_(row) {
  return {
    cards: String(row[5]).split(',').filter(String),
    missions: String(row[7]).split(',').filter(String),
    boss: Number(row[9]) || 0, stars: Number(row[10]) || 0,
    quiz: Number(row[11]) || 0, quizN: Number(row[12]) || 0,
  };
}

/**
 * 로그인한 학생이 자리를 고른다 — 이 수업에서 이 학번의 줄을 만들거나 이어 쓴다.
 * 학번·이름은 출입증으로 가린다(화면이 보낸 학번을 믿지 않는다).
 * 한 번 더 묻는 경우(force 로 넘어간다):
 *   seatTaken  다른 학번이 그 자리에 앉아 있다 (자리를 잘못 골랐을 수 있다)
 * 들어오면 서버에 남은 기록(카드·미션·보스전·퀴즈)을 돌려준다 — 2차시에 다른 컴퓨터에 앉아도 이어진다.
 */
function apiJoin(sid, seat, pid, force, token) {
  sid = cleanSid_(sid); seat = cleanNum_(seat); pid = cleanPid_(pid);
  var me = auth_(token);
  var sno = me.sno, name = me.name;
  return withLock_(function () {
    var sh = sheet_(SHEET_STATE, HEAD_STATE);
    var list = rows_(sh, HEAD_STATE.length);
    var mine = null;
    for (var i = 0; i < list.length; i++) {
      if (String(list[i][0]) !== sid) continue;
      if (String(list[i][1]) === sno) mine = list[i];
      else if (!force && Number(list[i][3]) === seat) return { ok: false, seatTaken: true, who: maskName_(list[i][2]) };
    }
    writeState_(sh, sid, sno, name, seat, pid, null);
    sheet_(SHEET_LOG, HEAD_LOG).appendRow([new Date(), sid, sno, seat, pid, 'join', '']);
    return { ok: true, state: mine ? stateOf_(mine) : null, name: name };
  });
}

function writeState_(sh, sid, sno, name, seat, pid, st) {
  var row = findStateRow_(sh, sid, sno);
  var t = new Date();
  var prev = row ? sh.getRange(row, 1, 1, HEAD_STATE.length).getValues()[0] : null;
  var old = prev ? stateOf_(prev) : { cards: [], missions: [], boss: 0, stars: 0, quiz: 0, quizN: 0 };
  var cards = st ? pick_(st.cards, CARD_IDS) : old.cards;
  var ms = st ? pick_(st.missions, MISSION_IDS) : old.missions;
  var vals = [sid, sno, name || (prev ? prev[2] : ''), seat || (prev ? prev[3] : ''), pid,
    cards.join(','), cards.length, ms.join(','), ms.length,
    st ? clamp_(st.boss, 0, 10) : old.boss,
    st ? clamp_(st.stars, 0, 3) : old.stars,
    st ? clamp_(st.quiz, 0, QUIZ_TOTAL) : old.quiz,
    st ? clamp_(st.quizN, 0, QUIZ_TOTAL) : old.quizN,
    t, prev ? prev[14] : t];
  if (row) sh.getRange(row, 1, 1, vals.length).setValues([vals]);
  else sh.appendRow(vals);
}

/**
 * 학생 기기의 사건 하나.
 *   ev = { sid, pid, seat, token, kind: found·mission·fail·boss·quiz, x: 짧은 내용, state: 지금까지의 기록 }
 */
function apiEvent(ev) {
  ev = ev || {};
  var sid = cleanSid_(ev.sid), pid = cleanPid_(ev.pid), seat = cleanNum_(ev.seat);
  var me = auth_(ev.token);
  var sno = me.sno, name = me.name;
  var kind = String(ev.kind || '');
  if (KINDS.indexOf(kind) < 0) throw new Error('알 수 없는 사건이에요.');
  var x = String(ev.x || '').replace(/[\r\n\t]/g, ' ').slice(0, 40);
  return withLock_(function () {
    writeState_(sheet_(SHEET_STATE, HEAD_STATE), sid, sno, name, seat, pid, ev.state || {});
    sheet_(SHEET_LOG, HEAD_LOG).appendRow([new Date(), sid, sno, seat, pid, kind, x]);
    return { ok: true };
  });
}

/* ── 교사 대시보드 ─────────────────────────────────────────────────── */
/** 수업 하나의 현황. 같은 수업을 여러 번 물으면 4초 동안은 캐시로 답한다. */
function apiDashboard(token, sid) {
  checkToken_(token);
  var cur = currentSession_();
  sid = sid ? cleanSid_(sid) : (cur ? cur.id : '');
  if (!sid) return { session: null };
  var cache = CacheService.getScriptCache();
  var hit = cache.get('dash:' + sid);
  if (hit) return JSON.parse(hit);
  var out = dashboard_(sid);
  cache.put('dash:' + sid, JSON.stringify(out), 4);
  return out;
}

function dashboard_(sid) {
  var sessions = rows_(sheet_(SHEET_SESSION, HEAD_SESSION), 3);
  var name = '';
  for (var i = 0; i < sessions.length; i++) if (String(sessions[i][0]) === sid) name = String(sessions[i][1]);

  var t = now_();
  var students = [];
  var names = {};
  var states = rows_(sheet_(SHEET_STATE, HEAD_STATE), HEAD_STATE.length);
  for (var a = 0; a < states.length; a++) {
    var r = states[a];
    if (String(r[0]) !== sid) continue;
    var last = r[13] instanceof Date ? r[13].getTime() : Number(new Date(r[13])) || 0;
    var st = stateOf_(r);
    names[String(r[1])] = String(r[2]);
    students.push({
      sno: String(r[1]), name: String(r[2]), num: Number(r[3]) || 0, pid: String(r[4]),
      cards: st.cards, missions: st.missions,
      boss: st.boss, stars: st.stars, quiz: st.quiz, quizN: st.quizN,
      online: t - last < 3 * 60 * 1000,
    });
  }
  students.sort(function (p, q) { return p.sno < q.sno ? -1 : p.sno > q.sno ? 1 : 0; });

  var first = {};
  var stuck = {};
  var feed = [];
  var logs = rows_(sheet_(SHEET_LOG, HEAD_LOG), HEAD_LOG.length);
  for (var b = 0; b < logs.length; b++) {
    var g = logs[b];
    if (String(g[1]) !== sid) continue;
    var kind = String(g[5]), x = String(g[6]);
    var who = { sno: String(g[2]), num: Number(g[3]) || 0, name: names[String(g[2])] || '' };
    if (kind === 'found' && CARD_IDS.indexOf(x) >= 0 && !first[x]) first[x] = who;
    if (kind === 'fail') stuck[x] = (stuck[x] || 0) + 1;
    if (kind === 'found' || kind === 'mission' || kind === 'boss') feed.push({ sno: who.sno, num: who.num, name: who.name, kind: kind, x: x });
  }
  var stuckList = [];
  for (var k in stuck) if (Object.prototype.hasOwnProperty.call(stuck, k)) stuckList.push({ what: k, n: stuck[k] });
  stuckList.sort(function (p, q) { return q.n - p.n; });

  var missionPass = {};
  for (var m = 0; m < MISSION_IDS.length; m++) missionPass[MISSION_IDS[m]] = 0;
  var quizSum = 0, quizN = 0;
  for (var s = 0; s < students.length; s++) {
    for (var j = 0; j < students[s].missions.length; j++) missionPass[students[s].missions[j]]++;
    if (students[s].quizN) { quizSum += students[s].quiz; quizN += students[s].quizN; }
  }

  return {
    session: { id: sid, name: name, part: partOf_(sid), current: props_().getProperty('CURRENT') === sid },
    students: students,
    first: first,
    // 우리 반이 찾은 카드 — 학생 현황을 합친 것 (방에 들어오기 전에 찾은 카드도 들어간다)
    classFound: CARD_IDS.filter(function (c) {
      for (var q = 0; q < students.length; q++) if (students[q].cards.indexOf(c) >= 0) return true;
      return false;
    }),
    missionPass: missionPass,
    stuck: stuckList.slice(0, 8),
    feed: feed.slice(-12).reverse(),
    quiz: { right: quizSum, total: quizN },
    at: t,
  };
}
