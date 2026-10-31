/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  자판기 · 도감 · 미션 · 교재 예제 · 확인 문제. 「화면에 적은 것과 실제 동작이 어긋나지 않는가」 를 지킨다.
 */
import { 묶음, 확인, 참 } from './harness.mjs';
import { MACHINE_CODE, PRODUCTS, COUPONS, CARDS, FIELDS, makeInputFn, cardOf } from '../src/data/machine.js';
import { MISSIONS, ATTACKS, NORMALS } from '../src/data/missions.js';
import { LESSONS, MISUSE, QUIZ } from '../src/data/lessons.js';
import { runMachine, shape, BLANK, logicSlip } from '../src/game/runner.js';
import { checkMission, evaluate, KINDS } from '../src/game/judge.js';
import { runPython } from '../src/lib/pymini.js';
import { scoreOf, stuckText } from '../src/teacher/score.js';
import { koreanOf } from '../src/data/translate.js';
import { readFileSync } from 'node:fs';
import { WRAPUP, wrapupFor, cleanNote, noteKey, collectNotes, notesSig, emptyRequired } from '../src/data/wrapup.js';
import { snoOk, nameOk, maskName, cleanSno, cleanName } from '../src/data/who.js';
import { LOGIC, logicHint, logicOpenNext, COMPARE, PAIR } from '../src/data/logic.js';
import { PARTS, cardsFor, MISSIONS_OF } from '../src/data/parts.js';
import { loadServer } from '../tools/fake-gas.mjs';
import { ORDER as HINT_ORDER, STEPS as HINT_STEPS, currentHint, openNext, HINT_CODE, hintCodeOk, ANSWER_CODE, answerCodeOk } from '../src/game/hints.js';

// input( ) 에 차례로 값을 넣되 질문 문구는 찍지 않는다 (교실 콘솔의 메아리 없이 print 한 것만 본다)
const run = (code, inputs = []) => runPython(code, { inputFn: (p, k) => inputs[k] });

묶음('교재 범위');
확인('도감은 예외 5종 (파일 입출력 전이라 FileNotFoundError 는 뺐다)', CARDS.map((c) => c.id).sort(), ['IndexError', 'KeyError', 'TypeError', 'ValueError', 'ZeroDivisionError']);
확인('채점기도 같은 5종', [...KINDS].sort(), CARDS.map((c) => c.id).sort());
for (const m of MISSIONS) {
  const sh = shape(m.answer);
  참(`${m.id} 모범 답안에 교재 밖 문법(raise·as)이 없다`, !/\braise\b|\bas\s+e\b|class\s/.test(m.answer));
  참(`${m.id} 모범 답안에 except: 만능 방어막이 없다`, !sh.catchAll);
  참(`${m.id} 모범 답안에 파일 입출력이 없다`, !/\bopen\(|FileNotFoundError/.test(m.answer));
}

묶음('자판기 코드와 화면');
{
  const r = runPython(`${MACHINE_CODE.split('\n').slice(0, 3).join('\n')}\nprint(메뉴)\nprint(가격)\nprint(쿠폰)`);
  확인('메뉴', r.lines[0], `[${PRODUCTS.map((p) => `'${p.name}'`).join(', ')}]`);
  확인('가격', r.lines[1], `[${PRODUCTS.map((p) => p.price).join(', ')}]`);
  확인('쿠폰', r.lines[2], `{${Object.entries(COUPONS).map(([k, v]) => `'${k}': ${typeof v === 'string' ? `'${v}'` : v}`).join(', ')}}`);
  for (const f of FIELDS) 참(`입력 칸 「${f.label}」 의 질문이 코드에 있다`, MACHINE_CODE.split('\n').some((l) => l.includes('input(') && f.match.test(l.slice(l.indexOf('input(')))));
  const fn = makeInputFn({ num: 'N', coupon: 'C', people: 'P' });
  확인('질문 문구로 칸 고르기', [fn('나눠 낼 사람 수: ', 0), fn('메뉴 번호(0~4): ', 2), fn('쿠폰 코드: ', 0)], ['P', 'N', 'C']);
  참('자판기에 파일 입출력이 없다', !/\bopen\(|FileNotFoundError/.test(MACHINE_CODE));
}

묶음('1라운드 — 공격은 의도한 고장을 낸다');
for (const a of ATTACKS) 확인(a.label, runMachine(MACHINE_CODE, a.values).type, a.expect);
for (const k of KINDS) 참(`${k} 를 낼 공격이 있다`, ATTACKS.some((a) => a.expect === k));
for (const n of NORMALS) 확인(`정상 손님 「${n.label}」`, runMachine(MACHINE_CODE, n.values).status, 'vend');
{
  const r = runMachine(MACHINE_CODE, { num: '0', coupon: '', people: '0' });
  참('0명이면 음료를 내주기 전에 멈춘다 (팔고 나서 멈추면 안 된다)', r.status === 'crash' && !r.out.some((l) => /나왔습니다/.test(l)));
}

묶음('2라운드 — 모범 답안은 통과, 빈칸 코드는 막힌다');
for (const m of MISSIONS) {
  확인(`${m.id} 모범 답안 통과`, checkMission(m, m.answer).items.filter((x) => !x.ok).map((x) => x.text), []);
  if (!m.boss) {
    참(`${m.id} 빈칸 코드에 빈칸이 있다`, m.starter.includes(BLANK));
    참(`${m.id} 빈칸 코드는 통과 못 한다`, !checkMission(m, m.starter).pass);
  }
}
{
  // 빈칸을 힌트에 적은 차례대로 채우면 모범 답안이 된다 (힌트가 틀린 차례를 말하면 여기서 깨진다)
  const fills = { m1: ['try', 'except'], m2: ['IndexError', 'KeyError', 'except', 'ZeroDivisionError'], m3: ['else', 'finally'] };
  for (const [id, f] of Object.entries(fills)) {
    const m = MISSIONS.find((x) => x.id === id);
    let code = m.starter;
    for (const x of f) code = code.replace(BLANK, x);
    확인(`${id} 빈칸을 힌트 차례대로 채우면 모범 답안`, code, m.answer);
    const last = m.hints[m.hints.length - 1];
    let at = -1;
    if (id === 'm2') {
      // 미션 2 는 정답 차례를 알려 주지 않는다 — 도감의 예외 이름만 섞어서 나열 (2026-10-25 사용자 지시)
      const named = CARDS.map((c) => c.id).filter((x) => last.includes(x));
      확인('m2 마지막 힌트는 도감의 예외 이름을 모두 나열한다', named.sort(), CARDS.map((c) => c.id).sort());
      const order = CARDS.map((c) => c.id).sort((a, b) => last.indexOf(a) - last.indexOf(b));
      참('m2 마지막 힌트의 차례가 빈칸 차례와 다르다', order.filter((x) => f.includes(x)).join() !== f.filter((x) => x !== 'except').join());
      참('m2 마지막 힌트는 except 빈칸을 알려 주지 않는다', !/\bexcept\b/.test(last));
    } else {
      참(`${id} 마지막 힌트가 빈칸 낱말을 그 차례로 말한다`, f.every((x) => { const k = last.indexOf(x, at + 1); if (k < 0) return false; at = k; return true; }));
    }
  }
  for (let i = 1; i < 3; i++) 참(`미션 ${i} 답으로는 미션 ${i + 1} 을 못 넘는다`, !checkMission(MISSIONS[i], MISSIONS[i - 1].answer).pass);
  참('1라운드 코드로는 보스전을 못 넘는다', !checkMission(MISSIONS[3], MACHINE_CODE).pass);
}

묶음('채점기 — 아쉬운 방어막');
{
  const head = MACHINE_CODE.split('\n').slice(0, 3).join('\n');
  const body = MACHINE_CODE.split('\n').slice(3).map((l) => (l ? '    ' + l : l)).join('\n');
  const lazy = `${head}\ntry:\n${body}\nexcept:\n    pass\n`;
  const c = checkMission(MISSIONS[3], lazy);
  참('except: pass — 말 없음으로 판정', evaluate(lazy).attacks.every((x) => x.verdict === 'silent'));
  참('except: pass — 남용 경고', c.notes.some((n) => /except: 만 쓰면/.test(n.text)));
  참('except: pass — 보스전 별 셋은 못 받는다', c.stars.count < 3);
  const fail = checkMission(MISSIONS[1], MISSIONS[0].answer);
  확인('막힌 곳 꼬리표 (대시보드로 간다)', fail.fails, ['IndexError 못 막음', 'KeyError 못 막음', 'TypeError 못 막음']);
  참('꼬리표는 서버의 40자 제한 안', fail.fails.every((t) => `m2:${t}`.length <= 40));
  const broken = checkMission(MISSIONS[0], 'try:\nprint(1)\n');
  참('문법 오류는 「코드가 실행되기」', !broken.pass && /실행/.test(broken.items[0].text));
  const changed = MISSIONS[0].answer.replace('"나왔습니다!"', '"드릴게요"');
  참('판매 문구를 바꾸면 정상 손님 실패', checkMission(MISSIONS[0], changed).items.some((x) => !x.ok && /정상 손님/.test(x.text)));
}

묶음('교재 예제 · 남용 주의');
{
  const r1 = run(LESSONS.l1.code, ['hello']);
  확인('예외란 — hello 면 ValueError 로 멈추고 뒤 줄은 안 돈다', [r1.errorType, r1.ran.includes(3)], ['ValueError', false]);
  const r2 = run(LESSONS.l2.code, ['hello']);
  확인('try–except — 잡고 끝까지 간다', r2.lines, ['정수를 입력해야 합니다.', '프로그램을 마칩니다.']);
  확인('else·finally — 글자를 넣으면', run(LESSONS.l4.code, ['hello']).lines, ['정수를 입력해야 합니다.', '프로그램을 종료합니다.']);
  확인('else·finally — 숫자를 넣으면', run(LESSONS.l4.code, ['7']).lines, ['입력한 값은 7 입니다.', '프로그램을 종료합니다.']);
  for (const [id, l] of Object.entries(LESSONS)) 참(`교재 예제 ${id} 에 파일 입출력이 없다`, !/\bopen\(|FileNotFoundError/.test(l.code));
  const bad = run(MISUSE.bad, [MISUSE.input]);
  const good = run(MISUSE.good, [MISUSE.input]);
  확인('except: 는 오타를 덮는다', [bad.ok, bad.lines], [true, ['문제가 생겼어요.']]);
  확인('이름을 적으면 오타가 드러난다', good.errorType, 'NameError');
}

묶음('확인 문제');
for (const [i, q] of QUIZ.entries()) {
  참(`Q${i + 1} 정답이 보기에 있다`, q.choices.includes(q.answer));
  확인(`Q${i + 1} 보기 4개, 겹치지 않음`, new Set(q.choices).size, 4);
  if (q.type === 'output') 확인(`Q${i + 1} 정답 = 실제 출력`, run(q.code, q.inputs).lines.join('\n'), q.answer);
  참(`Q${i + 1} 에 파일 입출력이 없다`, !/\bopen\(|FileNotFoundError/.test(q.code + q.choices.join('')));
  if (q.check) {
    let code = q.code.replace('㉠', q.check.fill[0]).replace('㉡', q.check.fill[1]);
    for (const [inp, want] of q.check.cases) 확인(`Q${i + 1} 정답으로 채우면 「${inp}」 → ${want}`, run(code, [inp]).lines.at(-1), want);
  }
}

묶음('대시보드 점수');
확인('점수 셈', scoreOf({ cards: ['a', 'b'], missions: ['m1'], boss: 10, stars: 3, quiz: 4 }), 20 + 20 + 10 + 15 + 20);
확인('막힌 곳 문구', stuckText('m2:IndexError 못 막음'), '미션 2 여러 except — IndexError 못 막음');

묶음('1라운드 힌트 — 찾은 것에 따라 달라지고, 하나씩 열린다');
{
  const found = (...ids) => Object.fromEntries(ids.map((id) => [id, {}]));
  확인('힌트 순서가 도감 5종과 같다', [...HINT_ORDER].sort(), CARDS.map((c) => c.id).sort());
  for (const id of HINT_ORDER) {
    const v = { num: '0', coupon: '', people: '1', ...HINT_STEPS[id].try };
    확인(`${id} 마지막 힌트대로 넣으면 정말 그 예외`, runMachine(MACHINE_CODE, v).type, id);
    참(`${id} 힌트에 예외 이름을 쓰지 않는다`, HINT_STEPS[id].steps.every((t) => !HINT_ORDER.some((x) => t.includes(x))));
  }
  확인('힌트 비밀코드는 1029', HINT_CODE, '1029');
  확인('비밀코드 판정 — 맞음·빈칸 섞임·틀림·빈 값', [hintCodeOk('1029'), hintCodeOk(' 10 29 '), hintCodeOk('1028'), hintCodeOk(''), hintCodeOk(null)], [true, true, false, false, false]);
  { const src = readFileSync(new URL('../src/cards/game.js', import.meta.url), 'utf8');
    참('힌트 상자는 비밀코드를 넣기 전(S.hintOn 이 거짓)에는 잠겨 있다', /if \(!S\.hintOn\)/.test(src) && src.indexOf('!S.hintOn') < src.indexOf('openHint(); draw()')); }
  { const src = readFileSync(new URL('../src/game/store.js', import.meta.url), 'utf8');
    참('새 기록은 힌트가 잠긴 채로 시작한다', /hintOn: false/.test(src));
    참('새 기록은 모범 방어막이 잠긴 채로 시작한다', /answerOn: false/.test(src)); }
  확인('모범 방어막 비밀코드는 5050', ANSWER_CODE, '5050');
  확인('모범 방어막 코드 판정 — 맞음·빈칸 섞임·힌트 코드·빈 값', [answerCodeOk('5050'), answerCodeOk(' 50 50 '), answerCodeOk('1029'), answerCodeOk(''), answerCodeOk(null)], [true, true, false, false, false]);
  { const src = readFileSync(new URL('../src/cards/mission.js', import.meta.url), 'utf8');
    참('보스전 모범 방어막은 S.answerOn 이 참일 때만 바로 불러오고, 아니면 비밀코드를 묻는다', /S\.answerOn \? useAnswer\(\) : askCode\(\)/.test(src) && /answerCodeOk\(code\.value\)/.test(src));
    참('보스전 시작 코드는 모범 답안이 아니다(내 방어막 또는 맨손)', !/m\.boss \? m\.answer/.test(src)); }
  확인('처음에는 아무 힌트도 열리지 않았다', [currentHint({}).level, currentHint({}).text], [0, '']);
  확인('하나도 못 찾았으면 가장 쉬운 것부터', currentHint({}).target, 'ValueError');
  확인('KeyError 를 찾았으면 TypeError 로 이어 준다', currentHint(found('ValueError', 'IndexError', 'KeyError')).target, 'TypeError');
  확인('ValueError 만 찾았으면 IndexError', currentHint(found('ValueError')).target, 'IndexError');
  참('4가지면 「마지막 하나」', /마지막/.test(currentHint(found('ValueError', 'IndexError', 'KeyError', 'TypeError')).intro));
  확인('다 찾으면 힌트 없음', currentHint(found(...HINT_ORDER)), null);
  let seen = {};
  seen = openNext({}, seen);
  확인('한 번 누르면 1단계만', [currentHint({}, seen).level, currentHint({}, seen).text], [1, HINT_STEPS.ValueError.steps[0]]);
  seen = openNext({}, openNext({}, openNext({}, seen)));
  확인('3단계에서 멈춘다', [currentHint({}, seen).level, currentHint({}, seen).more], [3, false]);
  확인('새 예외를 찾으면 다음 목표는 처음부터', currentHint(found('ValueError'), seen).level, 0);
  참('힌트 문구에 아직 못 찾은 예외 이름이 없다', HINT_ORDER.every((id) => {
    const f = found(...HINT_ORDER.filter((x) => x !== id));
    const t = currentHint(f, { [id]: 3 });
    return !(t.intro + t.text).includes(id);
  }));
}

묶음('1라운드 — 논리 오류 (예외는 아니지만 결과가 틀림)');
{
  const go = (o) => { const v = { num: '0', coupon: '', people: '1', ...o }; const r = runMachine(MACHINE_CODE, v); return [r, logicSlip(v, r)]; };
  const [r1, s1] = go({ num: '-1' });
  확인('-1번이면 멈추지 않고 주스가 나온다', [r1.status, r1.product && r1.product.name], ['vend', '주스']);
  참('-1번은 논리 오류로 짚는다', !!s1 && s1.field === 'num' && s1.text.includes('-1번에 주스가'));
  확인('-5번이면 콜라', go({ num: '-5' })[0].product.name, '콜라');
  확인('-6번은 IndexError 라 논리 오류가 아니다', [go({ num: '-6' })[0].type, go({ num: '-6' })[1]], ['IndexError', null]);
  const [r2, s2] = go({ people: '-2' });
  참('사람 수 -2 도 논리 오류', r2.status === 'vend' && !!s2 && s2.field === 'people' && s2.text.includes('-600'));
  const [, s3] = go({ people: '2000' });
  참('값보다 많은 사람 → 한 명당 0원', !!s3 && s3.text.includes('1200원을 2000명') && s3.text.includes('0원'));
  const [, s4] = go({ people: '7' });
  참('1200원을 7명 → 3원 모자람', !!s4 && s4.text.includes('171원씩') && s4.text.includes('1197원') && s4.text.includes('3원이 모자라요'));
  const [, s5] = go({ num: '3', coupon: 'LUCKY', people: '3' });
  참('쿠폰을 뺀 값으로 셈한다 (커피 1500 − 500 = 1000 → 1원 모자람)', !!s5 && s5.text.includes('1000원을 3명') && s5.text.includes('1원이 모자라요'));
  확인('나누어떨어지면 논리 오류가 아니다', [go({ people: '2' })[1], go({ num: '3', coupon: 'LUCKY', people: '4' })[1]], [null, null]);
  for (const p of ['7', '2000', '3']) {
    // 자판기가 실제로 찍은 「한 명당」 과 안내의 몫이 같은지
    const v = { num: '0', coupon: '', people: p };
    const r = runMachine(MACHINE_CODE, v);
    const each = Number(/한 명당 (-?\d+) 원/.exec(r.out.join(' '))[1]);
    참(`사람 수 ${p} — 안내의 몫이 자판기 출력(${each}원)과 같다`, each === 0 ? logicSlip(v, r).text.includes('0원') : logicSlip(v, r) === null || logicSlip(v, r).text.includes(`${each}원씩`));
  }
  확인('정상 손님은 논리 오류가 아니다', NORMALS.map((n) => go(n.values)[1]), NORMALS.map(() => null));
  참('메뉴 이름이 모두 받침 없음 (「…가 나왔어요」 조사)', PRODUCTS.every((p) => (p.name.charCodeAt(p.name.length - 1) - 0xac00) % 28 === 0));
}

묶음('오류 한국어 말풍선');
{
  for (const a of ATTACKS) {
    const r = runMachine(MACHINE_CODE, a.values);
    const ko = koreanOf(`${r.type}: ${r.msg}`);
    참(`${a.label} → 「${ko}」`, ko.length > 0 && !/[a-z]{4,} [a-z]{4,}/.test(ko.replace(/'.*?'/g, '')));
  }
  확인('IndexError', koreanOf('IndexError: list index out of range'), '리스트의 범위를 벗어난 위치(인덱스)예요.');
  확인('ValueError 는 넣은 값을 보여 준다', koreanOf("ValueError: invalid literal for int() with base 10: '칠'"), "정수형으로 바꿀 수 없는 값이에요: '칠'");
  확인('TypeError 는 자료형을 한국어로', koreanOf("TypeError: unsupported operand type(s) for -: 'int' and 'str'"), '자료형이 맞지 않아 계산할 수 없어요: int(정수) - str(문자열)');
  확인('NameError (남용 주의 카드)', koreanOf("NameError: name '번오' is not defined. Did you mean: '번호'?"), "없는 이름(변수)이에요: '번오' — 철자를 확인해 보세요.");
  확인('오류 줄이 아니면 빈칸', [koreanOf('한 명당 1200 원'), koreanOf('')], ['', '']);
}

묶음('차시 범위 — 1차시 · 2차시 · 전체');
{
  // 카드 목록은 DOM 을 쓰는 파일이라 node 로 못 부른다 — 글자로 읽어 id·단원만 꺼낸다
  const src = readFileSync(new URL('../src/cards/index.js', import.meta.url), 'utf-8');
  const list = [...src.matchAll(/\{ id: '(\w+)', chapter: '(c\w+)'/g)].map((m) => ({ id: m[1], chapter: m[2] }));
  const quizAt = list.findIndex((c) => c.id === 'result');
  list.splice(quizAt, 0, ...QUIZ.map((q, k) => ({ id: `q${k + 1}`, chapter: 'c6' })));
  const ids = (p) => cardsFor(list, p).map((c) => c.id);
  확인('1차시 (⭐ 심화 포함)', ids('p1'), ['start', 'l1', 'break', 'dex', 'l2', 'm1', 'l3', 'm2', 'errors', 'logic', 'result']);
  확인('2차시', ids('p2'), ['start', 'l4', 'm3', 'boss', 'misuse', ...QUIZ.map((q, k) => `q${k + 1}`), 'result']);
  확인('전체는 모든 카드', ids('all'), list.map((c) => c.id));
  참('모든 카드가 1차시나 2차시 가운데 하나에 들어 있다', list.every((c) => ids('p1').includes(c.id) || ids('p2').includes(c.id)));
  확인('모르는 범위는 전체로', ids('엉뚱'), list.map((c) => c.id));
  참('심화는 2차시에 없다', !ids('p2').includes('logic') && !ids('p2').includes('errors'));
  for (const p of ['p1', 'p2']) 참(`${p} 의 미션 수 = 그 차시에 열리는 미션 카드`, MISSIONS_OF[p].every((m) => ids(p).includes(m)) && MISSIONS.filter((m) => ids(p).includes(m.id)).length === MISSIONS_OF[p].length);
  확인('서버와 같은 범위 이름', loadServer().api.PART_IDS, PARTS.map((p) => p.id));
}

묶음('⭐ 심화 — 논리 오류');
{
  확인('논리 오류 4가지', LOGIC.map((x) => x.id), ['negIndex', 'negPeople', 'zeroShare', 'remainder']);
  for (const x of LOGIC) {
    const v = { num: '0', coupon: '', people: '1', ...x.try };
    const r = runMachine(MACHINE_CODE, v);
    확인(`${x.name} — 마지막 힌트 값은 멈추지 않는다`, r.status, 'vend');
    확인(`${x.name} — 그리고 이 논리 오류로 판정된다`, logicSlip(v, r) && logicSlip(v, r).kind, x.id);
    참(`${x.name} — 힌트 3단계, 마지막에만 넣을 값`, x.hints.length === 3 && Object.values(x.try).every((val) => x.hints[2].includes(val) && !x.hints[0].includes(` ${val} `)));
    참(`${x.name} — 막는 코드가 진짜 파이썬 문법`, (() => { try { shape(x.fix); return shape(`if True:\n    pass\n${x.fix}`) !== null; } catch (e) { return false; } })());
  }
  확인('처음 힌트는 첫째 것, 아직 안 엶', [logicHint({}).target, logicHint({}).level], ['negIndex', 0]);
  const seen = logicOpenNext({}, {});
  확인('한 번 누르면 1단계', logicHint({}, seen).text, LOGIC[0].hints[0]);
  확인('찾으면 다음 목표로', logicHint({ negIndex: {} }, seen).target, 'negPeople');
  확인('다 찾으면 없음', logicHint(Object.fromEntries(LOGIC.map((x) => [x.id, {}]))), null);
  // 소개 카드의 두 손님 — 하나는 멈추고, 하나는 멈추지 않는데 틀린다
  const [a, b] = PAIR.map((p) => runMachine(MACHINE_CODE, p.values));
  확인('실행 오류 손님은 멈춘다', [a.status, a.type], ['crash', 'ZeroDivisionError']);
  확인('논리 오류 손님은 팔고, 논리 오류로 판정', [b.status, logicSlip(PAIR[1].values, b).kind], ['vend', 'remainder']);
  확인('비교표 5줄', COMPARE.length, 5);
}

묶음('학번·이름 — 화면과 서버가 같은 규칙');
{
  const { api } = loadServer();
  const ok = (fn) => { try { fn(); return true; } catch (e) { return false; } };
  for (const v of ['20307', '1234', '123456', ' 20307 ', '2030', '1234567', '2030a', '', '-2030']) 확인(`학번 「${v}」`, snoOk(v), ok(() => api.cleanSno_(v)));
  for (const v of ['홍길동', 'Kim Ana', '  홍  길동 ', '김', '<b>', '홍길동1', '', 'ㅎㅎ', 'a'.repeat(21)]) 확인(`이름 「${v}」`, nameOk(v), ok(() => api.cleanName_(v)));
  for (const v of ['홍길동', '김철', '남궁민수', 'A', 'Ana']) 확인(`가리기 「${v}」`, maskName(v), api.maskName_(v));
  확인('다듬기', [cleanSno(' 20 307 '), cleanName('  홍  길동 ')], ['20307', '홍 길동']);
}

묶음('🏁 오늘 배운 것 — 학생이 직접 적는다');
{
  확인('1차시 물음', wrapupFor('p1').map((w) => w.id), ['what', 'try', 'many', 'logic', 'unsure']);
  확인('2차시 물음', wrapupFor('p2').map((w) => w.id), ['else', 'finally', 'misuse', 'unsure']);
  확인('전체는 모두', wrapupFor('all').length, WRAPUP.length);
  참('물음은 물음표로 끝나거나 「한 가지」', WRAPUP.every((w) => /\?|\)$|한 가지$/.test(w.q)));
  const card = readFileSync(new URL('../src/cards/start.js', import.meta.url), 'utf-8');
  참('결과 카드에 정리 문장(정답)을 다시 적지 않는다', !/잡지 않으면 그 자리에서 멈춘다|예외가 없을 때만 \/ 언제나|예상되는 예외의 이름을 적는다/.test(card));

  // 📤 제출 (2026-10-28) — 화면과 서버가 같은 물음·같은 다듬기를 쓴다
  const { api } = loadServer();
  확인('서버와 같은 물음 · 차시', api.NOTES.map((n) => [n[0], n[1]]), WRAPUP.map((w) => [w.id, w.part]));
  확인('서버와 같은 길이 한도', api.NOTE_MAX, 300);
  for (const v of ['  예외는  멈춤 ', 'a\nb\tc\r', '=1+1', 'x'.repeat(400), '', null, undefined, ' ' + '가'.repeat(299) + ' 끝', 'a\u0000b\u007f']) {
    확인(`다듬기가 서버와 같다 「${String(v).slice(0, 10)}」`, cleanNote(v), api.cleanNote_(v));
  }
  참('두 번 다듬어도 같다 (서버가 한 번 더 다듬는다)', ['  a ', 'x'.repeat(299) + ' y', 'a\u0000b', ' \n '].every((v) => cleanNote(cleanNote(v)) === cleanNote(v)));
  const W = (id) => WRAPUP.find((w) => w.id === id);
  확인('「헷갈리는 것」 은 차시마다 따로 적는다', [noteKey(W('unsure'), 'p1'), noteKey(W('unsure'), 'p2'), noteKey(W('what'), 'p1')], ['unsure@p1', 'unsure@p2', 'what']);
  확인('제출할 글 모으기 — 이 차시 물음만, 비운 칸은 빈 글', collectNotes('p1', { what: ' 실행 중 멈춤 ', 'unsure@p1': '없음', 'unsure@p2': '다른 차시', else: '2차시' }),
    { what: '실행 중 멈춤', try: '', many: '', logic: '', unsure: '없음' });
  참('낸 그대로면 꼬리표가 같고 고치면 달라진다', notesSig('p1', { what: 'a ' }) === notesSig('p1', { what: 'a', try: '' }) && notesSig('p1', { what: 'a' }) !== notesSig('p1', { what: 'b' }));
  확인('⭐ 심화는 비워도 짚지 않는다', emptyRequired('p1', { what: 'a', try: 'b', many: 'c', unsure: 'd' }).map((w) => w.id), []);
  확인('비운 칸 짚기', emptyRequired('p1', { what: 'a', try: '  ' }).map((w) => w.id), ['try', 'many', 'unsure']);
  참('결과 카드에 제출 단추가 있다', /submitNotes\(part/.test(card) && /선생님께 제출하기/.test(card));
}
