/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  앱스 스크립트 서버 — 진짜 gas/Code.gs 를 가짜 시트 위에서 그대로 돌린다.
 */
import { 묶음, 확인, 참 } from './harness.mjs';
import { loadServer } from '../tools/fake-gas.mjs';
import { CARDS } from '../src/data/machine.js';
import { MISSIONS } from '../src/data/missions.js';
import { QUIZ } from '../src/data/lessons.js';

const throws = (fn) => { try { fn(); return ''; } catch (e) { return e.message; } };

묶음('서버 — 앱과 같은 목록을 쓴다');
{
  const { api } = loadServer();
  확인('카드 5종', api.CARD_IDS, CARDS.map((c) => c.id));
  확인('미션', api.MISSION_IDS, MISSIONS.map((m) => m.id));
  확인('확인 문제 수', api.QUIZ_TOTAL, QUIZ.length);
}

묶음('서버 — 수업 · 번호 · 사건');
{
  const { api, gas } = loadServer();
  확인('처음엔 수업이 없다', api.apiHello(), { session: null });
  참('암호가 없으면 로그인 안내', /암호/.test(api.apiLogin('x').msg));
  gas.ui.promptAnswer = 'abcd';
  api.menuPassword();
  참('메뉴로 암호를 정한다', api.apiLogin('abcd').ok);
  확인('틀린 암호', api.apiLogin('abce').ok, false);
  참('암호는 해시로만 저장', !JSON.stringify(gas.props).includes('abcd'));
  const tok = api.apiLogin('abcd').token;
  참('출입증 없이 대시보드 못 연다', /로그인/.test(throws(() => api.apiDashboard('nope', ''))));
  const s = api.apiStartSession(tok, '2-3\n2교시');
  확인('수업 이름의 줄바꿈은 빈칸으로', s.name, '2-3 2교시');
  확인('학생은 지금 수업을 본다', api.apiHello().session, s);

  // 맨 처음 로그인 (2026-10-28) — 학번 → 이름·비밀번호. 그다음 자리를 고른다. 학생 한 명 = (수업, 학번) 한 줄
  확인('처음 온 학번', api.apiStudentCheck('20307'), { step: 'new' });
  참('학번은 숫자 4~6자리', /학번/.test(throws(() => api.apiStudentCheck('2030a'))));
  참('이름은 한글·영문', /이름/.test(throws(() => api.apiStudentLogin('20307', '<b>홍</b>', 'pw1234'))));
  참('빈 이름은 거절', /이름/.test(throws(() => api.apiStudentLogin('20307', '   ', 'pw1234'))));
  참('비밀번호는 4자 이상', /비밀번호/.test(throws(() => api.apiStudentLogin('20307', '홍길동', 'abc'))));
  const hong = api.apiStudentLogin('20307', '홍길동', 'pw1234');
  확인('계정을 만들면 출입증', [hong.ok, hong.sno, hong.name, typeof hong.token], [true, '20307', '홍길동', 'string']);
  참('비밀번호는 해시로만 저장', !JSON.stringify(gas.sheets.get('계정(비밀번호)').rows).includes('pw1234'));
  참('계정 시트는 숨긴다', gas.sheets.get('계정(비밀번호)').isSheetHidden());
  확인('다시 오면 가린 이름 + 비밀번호', api.apiStudentCheck('20307'), { step: 'login', who: '홍*동' });
  확인('틀린 비밀번호', api.apiStudentLogin('20307', '', 'pw9999').ok, false);
  확인('맞는 비밀번호 — 이름은 계정 것을 쓴다', [api.apiStudentLogin('20307', '김철수', 'pw1234').ok, api.apiStudentLogin('20307', '김철수', 'pw1234').name], [true, '홍길동']);
  const kimAcc = api.apiStudentLogin('20301', '김철수', 'kim1');
  const T = { hong: hong.token, kim: kimAcc.token };

  참('출입증 없이는 못 들어간다', /로그인/.test(throws(() => api.apiJoin(s.id, 7, 'aaaaaa11', false, 'nope'))));
  확인('들어가기', api.apiJoin(s.id, 7, 'aaaaaa11', false, T.hong), { ok: true, state: null, name: '홍길동' });
  확인('같은 학생이 다시 들어오면 괜찮다', api.apiJoin(s.id, 7, 'aaaaaa11', false, T.hong).ok, true);
  확인('다른 학생이 같은 자리를 고르면 묻는다 (이름은 가려서)', api.apiJoin(s.id, 7, 'bbbbbb22', false, T.kim), { ok: false, seatTaken: true, who: '홍*동' });
  확인('그래도 맞다고 하면 들어간다', api.apiJoin(s.id, 7, 'bbbbbb22', true, T.kim).ok, true);
  참('자리는 1~40', /1~40/.test(throws(() => api.apiJoin(s.id, 41, 'aaaaaa11', false, T.hong))));
  참('이상한 기기 번호는 거절', /기기/.test(throws(() => api.apiJoin(s.id, 3, '<script>', false, T.hong))));
  const ev = (o) => api.apiEvent({ sid: s.id, pid: 'aaaaaa11', seat: 7, token: T.hong, ...o });
  참('모르는 사건은 거절', /알 수 없는/.test(throws(() => ev({ kind: 'hack', state: {} }))));
  참('출입증 없는 사건은 거절 (학번을 적어 보내도)', /로그인/.test(throws(() => api.apiEvent({ sid: s.id, pid: 'aaaaaa11', seat: 7, sno: '20307', name: '홍길동', kind: 'found', x: 'KeyError', state: {} }))));

  const st = (o) => ({ cards: [], missions: [], boss: 0, stars: 0, quiz: 0, quizN: 0, ...o });
  const kim = (o) => api.apiEvent({ sid: s.id, pid: 'cccccc33', seat: 3, token: T.kim, ...o });
  ev({ kind: 'found', x: 'KeyError', state: st({ cards: ['KeyError', '해킹'] }) });
  kim({ kind: 'found', x: 'KeyError', state: st({ cards: ['KeyError', 'TypeError'] }) });
  kim({ kind: 'mission', x: 'm1', state: st({ cards: ['KeyError', 'TypeError'], missions: ['m1'], quiz: 9, quizN: 4 }) });
  kim({ kind: 'fail', x: 'm2:IndexError 못 막음', state: st({ cards: ['KeyError', 'TypeError'], missions: ['m1'], quiz: 3, quizN: 4 }) });
  ev({ kind: 'fail', x: 'm2:IndexError 못 막음', state: st({ cards: ['KeyError'] }) });
  ev({ kind: 'fail', x: 'm1:빈칸'.repeat(20), state: st({ cards: ['KeyError'] }) });

  const d = api.apiDashboard(tok, '');
  확인('학생 목록 (학번 차례, 자리를 옮기면 마지막 자리)', d.students.map((x) => [x.sno, x.name, x.num]), [['20301', '김철수', 3], ['20307', '홍길동', 7]]);
  확인('모르는 카드는 버린다', d.students.find((x) => x.sno === '20307').cards, ['KeyError']);
  확인('첫 발견은 먼저 보낸 학생', d.first.KeyError, { sno: '20307', num: 7, name: '홍길동' });
  확인('우리 반이 찾은 카드', d.classFound, ['KeyError', 'TypeError']);
  확인('미션 통과 수', d.missionPass, { m1: 1, m2: 0, m3: 0, boss: 0 });
  확인('가장 많이 막힌 곳', d.stuck[0], { what: 'm2:IndexError 못 막음', n: 2 });
  참('사건 내용은 40자까지', d.stuck.every((x) => x.what.length <= 40));
  확인('퀴즈 점수 — 마지막으로 보낸 기록', d.quiz, { right: 3, total: 4 });
  확인('범위 밖 숫자는 잘라 낸다', [api.clamp_(9, 0, 4), api.clamp_(-3, 0, 4), api.clamp_('x', 0, 4)], [4, 0, 0]);
  확인('소식은 최근 것부터', d.feed[0], { sno: '20301', num: 3, name: '김철수', kind: 'mission', x: 'm1' });

  // 대시보드는 4초 캐시 — 그 사이 새 사건은 다음 물음에 나온다
  api.apiEvent({ sid: s.id, pid: 'dddddd44', seat: 9, token: api.apiStudentLogin('20309', 'Kim Ana', 'ana1').token, kind: 'found', x: 'ValueError', state: st({ cards: ['ValueError'] }) });
  확인('캐시 안에서는 이전 답', api.apiDashboard(tok, s.id).students.length, 2);
  gas.setClock(() => Date.now() + 5000);
  gas.cache.forEach((v, k) => { if (k.startsWith('tok:') || k.startsWith('stu:')) v.until = Infinity; });
  확인('4초가 지나면 새 답 (영문 이름도 받는다)', api.apiDashboard(tok, s.id).students.length, 3);

  // 새 수업 — 지난 수업과 섞이지 않는다
  const s2 = api.apiStartSession(tok, '2-4 3교시');
  확인('새 수업은 비어 있다', api.apiDashboard(tok, s2.id).students.length, 0);
  확인('수업 목록 (최근 것부터)', api.apiSessions(tok).map((x) => [x.name, x.current]), [['2-4 3교시', true], ['2-3 2교시', false]]);
  확인('지난 수업도 다시 볼 수 있다', api.apiDashboard(tok, s.id).session.name, '2-3 2교시');

  // 2차시에 다른 자리 · 다른 컴퓨터로 와도 같은 학번이면 한 줄로 이어지고, 서버 기록을 돌려받는다
  const back = api.apiJoin(s.id, 15, 'eeeeee55', false, T.kim);
  확인('자리를 옮겨도 기록이 이어진다', [back.ok, back.state.cards, back.state.missions], [true, ['KeyError', 'TypeError'], ['m1']]);
  gas.setClock(() => Date.now() + 10000);
  gas.cache.forEach((v, k) => { if (k.startsWith('tok:') || k.startsWith('stu:')) v.until = Infinity; });
  const rows = api.apiDashboard(tok, s.id).students.filter((x) => x.sno === '20301');
  확인('한 학생은 한 줄 — 자리만 바뀐다', rows.map((x) => [x.num, x.pid]), [[15, 'eeeeee55']]);

  // 같은 컴퓨터를 같은 반 다른 학생이 쓰면 (기기는 같고 학번이 다름) 줄이 따로 생긴다
  const lee = api.apiStudentLogin('20321', '이영희', 'lee1').token;
  api.apiJoin(s.id, 21, 'aaaaaa11', false, lee);
  api.apiEvent({ sid: s.id, pid: 'aaaaaa11', seat: 21, token: lee, kind: 'found', x: 'IndexError', state: st({ cards: ['IndexError'] }) });
  gas.setClock(() => Date.now() + 15000);
  gas.cache.forEach((v, k) => { if (k.startsWith('tok:') || k.startsWith('stu:')) v.until = Infinity; });
  const both = api.apiDashboard(tok, s.id).students.filter((x) => x.pid === 'aaaaaa11').map((x) => [x.sno, x.cards]);
  확인('한 컴퓨터, 두 학생 — 기록이 섞이지 않는다', both, [['20307', ['KeyError']], ['20321', ['IndexError']]]);
  확인('이름 가리기', [api.maskName_('홍길동'), api.maskName_('김철'), api.maskName_('남궁민수'), api.maskName_('Ana')], ['홍*동', '김*', '남**수', 'A*a']);

  // 차시 범위 — 수업마다 따로, 같은 반의 2차시는 지난 수업을 이어서
  확인('새 수업은 1차시가 기본', api.apiStartSession(tok, '2-5 반').part, 'p1');
  const s5 = api.apiHello().session;
  확인('학생도 범위를 본다', s5.part, 'p1');
  확인('범위 바꾸기', api.apiSetPart(tok, s5.id, 'p2').part, 'p2');
  확인('바뀐 범위가 학생에게 간다', api.apiHello().session.part, 'p2');
  참('모르는 범위는 거절', /차시/.test(throws(() => api.apiSetPart(tok, s5.id, 'p9'))));
  참('출입증 없이 범위를 못 바꾼다', /로그인/.test(throws(() => api.apiSetPart('nope', s5.id, 'p1'))));
  delete gas.props['PART:' + s.id]; // 이 기능 전에 만든 수업 흉내
  확인('범위를 정하지 않은 옛 수업은 전체', api.partOf_(s.id), 'all');
  확인('지난 수업 이어서 하기', [api.apiResumeSession(tok, s.id).id, api.apiHello().session.id], [s.id, s.id]);
  확인('이어서 해도 그 수업의 범위는 그대로', api.apiHello().session.part, 'all');
  확인('수업 목록에 범위가 보인다', api.apiSessions(tok).find((x) => x.id === s5.id).part, 'p2');
  참('없는 수업은 이어서 못 한다', /없어요/.test(throws(() => api.apiResumeSession(tok, '0000000000'))));

  // 시트 머리글
  확인('현황 시트는 학번·이름·자리를 담는다', api.HEAD_STATE.slice(0, 4), ['수업', '학번', '이름', '자리']);
  참('기록 시트에는 이름 없이 학번만', api.HEAD_LOG.includes('학번') && !api.HEAD_LOG.includes('이름'));

  // 비밀번호를 잊으면 — 선생님이 시트 메뉴로 초기화, 학생은 이름을 확인하고 새로 정한다 (기록은 남는다)
  gas.ui.promptAnswer = '20307';
  api.menuResetStudent();
  확인('초기화된 계정', api.apiStudentCheck('20307'), { step: 'reset', who: '홍*동' });
  참('초기화하면 해시·솔트만 지운다 (이름은 남는다)', (() => { const r = gas.sheets.get('계정(비밀번호)').rows.find((x) => x && x[0] === '20307'); return r[1] === '홍길동' && r[2] === '' && r[3] === ''; })());
  확인('이름이 다르면 새 비밀번호를 못 정한다', api.apiStudentLogin('20307', '김철수', 'new1').ok, false);
  확인('이름이 맞으면 새 비밀번호', api.apiStudentLogin('20307', '홍길동', 'new1').ok, true);
  확인('새 비밀번호로 로그인', api.apiStudentLogin('20307', '', 'new1').ok, true);
  gas.ui.promptAnswer = '99999';
  api.menuResetStudent();
  참('없는 학번은 알려 준다', /계정이 없어요/.test(gas.ui.alerts.at(-1)));

  // 비밀번호를 10번 틀리면 10분 동안 막는다
  for (let k = 0; k < 10; k++) api.apiStudentLogin('20301', '', 'xxxx');
  참('10번 틀리면 막힌다 (맞는 비밀번호도)', /여러 번/.test(api.apiStudentLogin('20301', '', 'kim1').msg));
  gas.setClock(() => Date.now() + 15000 + 11 * 60 * 1000);
  const fresh = api.apiStudentLogin('20301', '', 'kim1');
  확인('10분이 지나면 다시 된다', fresh.ok, true);

  // 출입증은 6시간
  참('방금 받은 출입증으로 들어간다', api.apiJoin(s.id, 3, 'cccccc33', true, fresh.token).ok);
  gas.setClock(() => Date.now() + 15000 + 11 * 60 * 1000 + 6 * 3600 * 1000 + 1000);
  참('6시간이 지난 출입증은 다시 로그인', /로그인/.test(throws(() => api.apiJoin(s.id, 3, 'cccccc33', true, fresh.token))));

  gas.ui.confirm = 'YES';
  api.menuClear();
  확인('기록 모두 지우기 (계정까지)', [gas.sheets.get('기록').getLastRow(), gas.sheets.get('현황').getLastRow(), gas.sheets.get('계정(비밀번호)').getLastRow(), api.apiHello().session], [1, 1, 1, null]);
}

묶음('서버 — 🏁 오늘 배운 것 제출 · ✍️ 정리 (2026-10-28)');
{
  const { api, gas } = loadServer();
  gas.ui.promptAnswer = 'abcd';
  api.menuPassword();
  const tok = api.apiLogin('abcd').token;
  const s = api.apiStartSession(tok, '2-1', 'p1');
  const hong = api.apiStudentLogin('20307', '홍길동', 'pw1234').token;
  const kim = api.apiStudentLogin('20301', '김철수', 'kim1').token;
  api.apiJoin(s.id, 7, 'aaaaaa11', false, hong);
  api.apiJoin(s.id, 3, 'bbbbbb22', false, kim);
  let tick = 0;
  // 대시보드 4초 캐시를 넘기되 출입증은 살려 둔다
  const later = () => { tick += 5000; gas.setClock(() => Date.now() + tick); gas.cache.forEach((v, k) => { if (k.startsWith('tok:') || k.startsWith('stu:')) v.until = Infinity; }); };
  const sub = (token, o) => api.apiSubmitNotes({ sid: s.id, pid: 'aaaaaa11', seat: 7, token, part: 'p1', ...o });

  참('출입증 없이 못 낸다 (학번을 적어 보내도)', /로그인/.test(throws(() => api.apiSubmitNotes({ sid: s.id, pid: 'aaaaaa11', seat: 7, sno: '20307', name: '홍길동', part: 'p1', notes: { what: 'x' } }))));
  참('모두 비우면 못 낸다', /한 칸 이상/.test(throws(() => sub(hong, { notes: { what: '  ', try: '' } }))));
  참('이 차시 물음이 아닌 것만 적어도 못 낸다', /한 칸 이상/.test(throws(() => sub(hong, { notes: { else: '2차시 물음' } }))));
  참('모르는 차시는 거절', /차시/.test(throws(() => sub(hong, { part: 'p7', notes: { what: 'x' } }))));
  gas.lock.busy = true;
  참('접속이 몰리면 BUSY (화면이 다시 보낸다)', /^BUSY/.test(throws(() => sub(hong, { notes: { what: 'x' } }))));
  gas.lock.busy = false;

  const r1 = sub(hong, { notes: { what: '실행 도중에\n멈추는 것', try: '=SUM(A1)', many: '-', logic: '', unsure: 'x'.repeat(400), else: '2차시 물음은 버린다', hack: '모르는 칸' } });
  확인('제출 — 적은 칸 수 / 이 차시 물음 수', [r1.ok, r1.n, r1.total, typeof r1.at], [true, 4, 5, 'number']);
  const sh = gas.sheets.get('오늘 배운 것');
  참('「오늘 배운 것」 시트가 생긴다', !!sh);
  확인('머리글', sh.rows[0].slice(0, 8), ['수업', '학번', '이름', '자리', '차시', '처음 제출', '마지막 제출', '제출 횟수']);
  확인('물음마다 한 열', sh.rows[0].slice(8), api.NOTES.map((n) => n[2]));
  const line = sh.rows[1];
  확인('학번·이름은 출입증에서 가린다', line.slice(0, 5), [s.id, '20307', '홍길동', 7, 'p1']);
  확인('줄바꿈은 빈칸으로', line[8], '실행 도중에 멈추는 것');
  확인('= · - 로 시작하는 글은 앞에 \' 를 붙여 글자로 둔다 (수식이 되지 않게)', [line[9], line[10]], ["'=SUM(A1)", "'-"]);
  확인('300자까지', line[8 + 7].length, 300);
  확인('다른 차시 물음 · 모르는 칸은 버린다', [line[8 + 4], line.length], ['', 8 + api.NOTES.length]);
  참('기록 시트에는 제출했다는 것만 (글은 안 남긴다)', gas.sheets.get('기록').rows.some((r) => r && r[5] === 'notes' && r[6] === 'p1:4/5') && !JSON.stringify(gas.sheets.get('기록').rows).includes('멈추는 것'));

  참('출입증 없이 글을 못 읽는다', /로그인/.test(throws(() => api.apiNotes('nope', s.id))));
  const n1 = api.apiNotes(tok, s.id);
  확인('✍️ 정리 — 낸 글 그대로 (앞의 \' 는 뗀다, 비운 칸은 없다)', n1.rows[0].notes, { what: '실행 도중에 멈추는 것', try: '=SUM(A1)', many: '-', unsure: 'x'.repeat(300) });
  확인('✍️ 정리 — 수업 차시', n1.session, { id: s.id, part: 'p1' });
  확인('수업을 고르지 않으면 지금 수업', api.apiNotes(tok, '').rows.length, 1);

  // 고쳐서 다시 내면 같은 줄을 고쳐 쓴다
  const first = line[5];
  sub(hong, { notes: { what: '고친 답', try: 'try 는 감싸고 except 는 대신 할 일' } });
  확인('다시 내면 같은 줄', sh.getLastRow(), 2);
  확인('처음 제출 시각은 남고 횟수가 는다', [sh.rows[1][5] === first, sh.rows[1][7]], [true, 2]);
  확인('다시 낸 글로 바뀐다 (비우고 낸 칸은 비운다)', api.apiNotes(tok, s.id).rows[0].notes, { what: '고친 답', try: 'try 는 감싸고 except 는 대신 할 일' });

  api.apiSubmitNotes({ sid: s.id, pid: 'bbbbbb22', seat: 3, token: kim, part: 'p1', notes: { unsure: '여러 except 차례' } });
  확인('학번 차례', api.apiNotes(tok, s.id).rows.map((r) => [r.sno, r.name, r.num, r.part]), [['20301', '김철수', 3, 'p1'], ['20307', '홍길동', 7, 'p1']]);

  // 2차시 — 같은 수업 · 같은 학생이라도 차시마다 한 줄 (「헷갈리는 것」 이 1차시 답을 덮지 않게)
  api.apiSetPart(tok, s.id, 'p2');
  api.apiSubmitNotes({ sid: s.id, pid: 'aaaaaa11', seat: 7, token: hong, part: 'p2', notes: { else: '예외가 없을 때', unsure: '2차시에 헷갈린 것', what: '1차시 칸은 버린다' } });
  const rs = api.apiNotes(tok, s.id).rows.filter((r) => r.sno === '20307');
  확인('차시마다 한 줄', rs.map((r) => [r.part, r.notes]), [['p1', { what: '고친 답', try: 'try 는 감싸고 except 는 대신 할 일' }], ['p2', { else: '예외가 없을 때', unsure: '2차시에 헷갈린 것' }]]);

  later();
  확인('대시보드 — 학생마다 낸 차시 (글은 싣지 않는다)', api.apiDashboard(tok, s.id).students.map((x) => [x.sno, x.noted]), [['20301', ['p1']], ['20307', ['p1', 'p2']]]);
  참('대시보드 답에는 글이 없다 (5초마다 읽으므로)', !JSON.stringify(api.apiDashboard(tok, s.id)).includes('고친 답'));

  // 다른 컴퓨터에 앉아도 낸 글이 돌아온다 — 빈 칸으로 다시 내서 덮어쓰지 않게
  const back = api.apiJoin(s.id, 9, 'cccccc33', false, hong);
  확인('들어오면 낸 글을 돌려받는다', back.state.notes.map((e) => [e.part, e.notes.what || e.notes.else, typeof e.at]), [['p1', '고친 답', 'number'], ['p2', '예외가 없을 때', 'number']]);
  확인('낸 글이 없는 학생은 그대로', api.apiJoin(s.id, 21, 'dddddd44', false, api.apiStudentLogin('20321', '이영희', 'lee1').token).state, null);

  // 이 기능 전에 만든 시트 — 읽기만 할 때는 탭을 만들지 않고 빈 것으로 본다
  gas.sheets.delete('오늘 배운 것');
  later();
  확인('옛 시트에서도 대시보드 · 정리가 열린다', [api.apiNotes(tok, s.id).rows.length, api.apiDashboard(tok, s.id).students[0].noted, gas.sheets.has('오늘 배운 것')], [0, [], false]);
  sub(hong, { part: 'p2', notes: { finally: '언제나' } });
  참('처음 제출할 때 탭을 만든다', gas.sheets.has('오늘 배운 것') && gas.sheets.get('오늘 배운 것').getLastRow() === 2);

  gas.ui.confirm = 'YES';
  api.menuClear();
  확인('기록 모두 지우기에 「오늘 배운 것」 도 들어간다', gas.sheets.get('오늘 배운 것').getLastRow(), 1);
}

묶음('서버 — 30명이 한꺼번에 몰릴 때 (잠금을 못 잡음)');
{
  const { api, gas } = loadServer();
  const { retryable, errText } = await import('../src/net/retry.js');
  gas.ui.promptAnswer = 'abcd';
  api.menuPassword();
  const s = api.apiStartSession(api.apiLogin('abcd').token, '2-1', 'p1');
  const hong = api.apiStudentLogin('20307', '홍길동', 'pw1234');

  gas.lock.busy = true;
  const busyLogin = throws(() => api.apiStudentLogin('20399', '박새로', 'pw1234'));
  참('잠금을 못 잡으면 BUSY 로 시작하는 오류', /^BUSY/.test(busyLogin));
  참('그 오류는 화면이 다시 보낼 실패로 본다', retryable(new Error(busyLogin)));
  참('화면에는 BUSY 표식 없이 보인다', !/BUSY/.test(errText(new Error(busyLogin))) && /몰려/.test(errText(new Error(busyLogin))));
  확인('바쁠 때는 계정을 만들지 않는다', api.apiStudentCheck('20399').step, 'new');
  참('사건도 BUSY', /^BUSY/.test(throws(() => api.apiEvent({ sid: s.id, pid: 'aaaaaa11', seat: 7, token: hong.token, kind: 'found', x: 'KeyError', state: {} }))));
  참('자리 고르기도 BUSY', /^BUSY/.test(throws(() => api.apiJoin(s.id, 7, 'aaaaaa11', false, hong.token))));
  // 바빠서 실패한 것은 비밀번호 틀림으로 세지 않는다
  for (let i = 0; i < 12; i++) throws(() => api.apiStudentLogin('20307', '', 'pw1234'));

  gas.lock.busy = false;
  참('풀리면 같은 요청이 그대로 들어간다', api.apiStudentLogin('20399', '박새로', 'pw1234').ok);
  참('바쁠 때 실패한 횟수는 막힘으로 세지 않는다', api.apiStudentLogin('20307', '', 'pw1234').ok);
  참('자리 고르기도 다시 된다', api.apiJoin(s.id, 7, 'aaaaaa11', false, hong.token).ok);

  // 다시 보내면 안 되는 실패 — 비밀번호 틀림·출입증 지남은 몇 번을 보내도 같다
  참('출입증 지남은 다시 보내지 않는다', !retryable(new Error('다시 로그인해 주세요.')));
  참('알 수 없는 사건도 다시 보내지 않는다', !retryable(new Error('알 수 없는 사건이에요.')));
  참('통신이 끊긴 것은 다시 보낸다', retryable(new Error('NetworkError: Connection failure due to HTTP 0')) && retryable(new TypeError('Failed to fetch')));
}
