/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  시작 카드(로그인 · 자리 고르기)와 마지막 결과 카드.
 */
import { h, fill, modal, toast } from '../ui/dom.js';
import { createVending } from '../ui/vending.js';
import { call, online, MODE } from '../net/gas.js';
import { S, ME, enter, soloStart, savedMe, resetDevice, NET, devicePid, setNote } from '../game/store.js';
import { wrapupFor } from '../data/wrapup.js';
import { cleanSno, cleanName, snoOk, nameOk } from '../data/who.js';
import { CARDS } from '../data/machine.js';
import { MISSIONS } from '../data/missions.js';
import { QUIZ } from '../data/lessons.js';
import { PARTS, partOf, MISSIONS_OF } from '../data/parts.js';
import { LOGIC } from '../data/logic.js';
import { mountPart } from '../ui/router.js';

export function startCard(body, deck) {
  const vm = createVending();
  const right = h('div', { class: 'start-right' });
  fill(body, h('div', { class: 'start' },
    h('div', { class: 'start-left' }, vm.el),
    h('div', { class: 'start-mid' },
      h('p', { class: 'lead' }, '귀여운 자판기 뒤에서 ', h('b', {}, '파이썬 코드'), '가 돌고 있어요.'),
      h('ol', { class: 'steps' },
        h('li', {}, h('b', {}, '🎰 부수기'), ' — 이상한 값을 넣어 자판기를 멈추게 하고, 예외 5종을 모은다'),
        h('li', {}, h('b', {}, '🛡️ 막기'), ' — try·except 로 방어막을 짜서 같은 공격을 막는다'),
        h('li', {}, h('b', {}, '👾 보스전'), ' — 공격 10가지를 한꺼번에 막아 낸다')),
      right)),
    h('p', { class: 'start-copy' }, '© 2026 티쳐무 · 모든 권리 보유 — 학교 수업 목적으로만 이용해 주세요.'));
  vm.show(null);

  // 혼자 모드 — 몇 차시를 할지 학생이 고른다 (수업 중이면 선생님이 정한다)
  function solo(note) {
    fill(right, h('p', { class: 'muted' }, note || '서버 없이 여는 중이에요(혼자 모드). 기록은 이 브라우저에만 남아요.'),
      h('p', { class: 'part-q' }, '어디까지 해 볼까요?'),
      h('div', { class: 'part-pick' }, ...PARTS.map((p) => h('button', { class: 'btn part-btn' + (p.id === 'p1' ? ' primary' : ''), onClick: () => { soloStart(); mountPart(p.id, 'next'); } },
        h('b', {}, p.label), h('small', {}, p.note)))));
  }
  if (!online) { solo(); return; }
  fill(right, h('p', { class: 'muted' }, '수업을 찾는 중…'));
  const hello = () => call('apiHello').then((r) => {
    if (!r.session) {
      fill(right, h('p', {}, '⏳ 선생님이 아직 수업을 시작하지 않았어요.'),
        h('div', { class: 'row' },
          h('button', { class: 'btn', onClick: hello }, '↻ 다시 확인'),
          h('button', { class: 'btn', onClick: () => solo('혼자 해 보기 — 기록은 선생님께 가지 않고 이 브라우저에만 남아요.') }, '혼자 해 보기')));
      return;
    }
    picker(r.session);
  }).catch(() => {
    fill(right, h('p', {}, '⚠ 서버에 닿지 않아요.'),
      h('div', { class: 'row' },
        h('button', { class: 'btn', onClick: hello }, '↻ 다시 시도'),
        h('button', { class: 'btn', onClick: () => solo('혼자 해 보기 — 기록은 선생님께 가지 않고 이 브라우저에만 남아요.') }, '혼자 해 보기')));
  });

  // ① 로그인(학번 → 이름·비밀번호) → ② 자리 번호 고르기 → 들어가기  (2026-10-28 사용자 지시: 맨 처음에 로그인)
  function picker(session) {
    const prev = savedMe(session.id);
    const head = (...tail) => h('p', { class: 'session' }, `📚 ${session.name}`,
      session.part && session.part !== 'all' ? h('span', { class: 'part-tag' }, partOf(session.part).label) : null, ...tail);
    const note = () => h('p', { class: 'muted who-note' }, '학번·이름은 선생님 시트에만 기록돼요. 비밀번호는 알아볼 수 없게 바꿔 저장해서 선생님도 볼 수 없어요.');
    const field = (label, el) => h('label', {}, h('span', {}, label), el);
    const box = (attrs) => h('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', ...attrs });
    const pwBox = (label) => h('input', { type: 'password', maxlength: '30', autocomplete: 'off', 'aria-label': label, placeholder: '4자 이상' });
    // 들어가기 단추가 서버를 기다리는 동안 두 번 눌리지 않게
    const busy = (btn, on) => { btn.disabled = on; };

    // 로그인 ① — 학번
    function login(snoValue = '') {
      const sno = box({ inputmode: 'numeric', maxlength: '6', placeholder: '예) 20314', 'aria-label': '학번', value: snoValue });
      const msg = h('p', { class: 'who-msg' });
      const next = h('button', { class: 'btn primary big' }, '다음 ▶');
      const go = () => {
        if (!snoOk(sno.value)) { fill(msg, '학번은 숫자 4~6자리로 적어 주세요.'); sno.focus(); return; }
        const s = cleanSno(sno.value);
        busy(next, true);
        call('apiStudentCheck', s).then((r) => step2(s, r)).catch((e) => { fill(msg, `확인하지 못했어요 — ${e.message}`); busy(next, false); });
      };
      next.addEventListener('click', go);
      sno.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      const resume = prev && prev.tok ? h('button', { class: 'btn primary big resume', onClick: () => goIn(prev.seat, prev, true) },
        `▶ ${prev.stu} 학생(${prev.sno})으로 이어서 하기`) : null;
      fill(right, head(h('small', {}, ' — ① ', h('b', {}, '학번'), '을 적으세요')),
        resume,
        h('div', { class: 'who-form' }, field('🎓 학번', sno)),
        msg,
        h('div', { class: 'row' }, next),
        note());
      setTimeout(() => sno.focus(), 30);
    }

    // 로그인 ② — 처음 온 학생(new) · 계정이 있는 학생(login) · 선생님이 비밀번호를 초기화한 학생(reset)
    function step2(sno, r) {
      const msg = h('p', { class: 'who-msg' });
      const ok = h('button', { class: 'btn primary big' }, r.step === 'login' ? '로그인 ▶' : '비밀번호 정하고 들어가기 ▶');
      const back = h('button', { class: 'btn', onClick: () => login(sno) }, '← 학번 다시 적기');
      const pw = pwBox('비밀번호');
      const pw2 = r.step === 'login' ? null : pwBox('비밀번호 한 번 더');
      const stu = r.step === 'login' ? null : box({ maxlength: '20', placeholder: '예) 홍길동', 'aria-label': '이름' });
      const go = () => {
        if (stu && !nameOk(stu.value)) { fill(msg, '이름은 한글·영문으로 적어 주세요.'); stu.focus(); return; }
        if (pw.value.length < 4) { fill(msg, '비밀번호는 4자 이상이에요.'); pw.focus(); return; }
        if (pw2 && pw.value !== pw2.value) { fill(msg, '두 비밀번호가 서로 달라요. 다시 적어 주세요.'); pw2.value = ''; pw2.focus(); return; }
        busy(ok, true);
        call('apiStudentLogin', sno, stu ? cleanName(stu.value) : '', pw.value).then((res) => {
          if (!res.ok) { fill(msg, res.msg); busy(ok, false); pw.value = ''; if (pw2) pw2.value = ''; pw.focus(); return; }
          seats({ sno: res.sno, stu: res.name, tok: res.token });
        }).catch((e) => { fill(msg, `로그인하지 못했어요 — ${e.message}`); busy(ok, false); });
      };
      ok.addEventListener('click', go);
      [stu, pw, pw2].filter(Boolean).forEach((el) => el.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); }));
      const title = r.step === 'new' ? h('small', {}, ` — 학번 ${sno} · 처음 오셨네요! `, h('b', {}, '이름'), '과 ', h('b', {}, '비밀번호'), '를 정하세요')
        : r.step === 'reset' ? h('small', {}, ` — 학번 ${sno} · 비밀번호가 초기화되었어요. 이름을 확인하고 `, h('b', {}, '새 비밀번호'), '를 정하세요')
          : h('small', {}, ` — 학번 ${sno} · `, h('b', {}, `${r.who} 학생`), ', 비밀번호를 적으세요');
      fill(right, head(title),
        h('div', { class: 'who-form' },
          field('🎓 학번', h('b', { class: 'who-seat' }, sno)),
          stu ? field('🙂 이름', stu) : field('🙂 이름', h('b', {}, r.who)),
          field('🔑 비밀번호', pw),
          pw2 ? field('🔑 한 번 더', pw2) : null),
        msg,
        h('div', { class: 'row' }, back, ok),
        r.step === 'login' ? h('p', { class: 'muted who-note' }, '내 이름이 아니면 학번을 다시 확인하세요. 비밀번호를 잊었으면 선생님께 초기화를 부탁하세요.')
          : h('p', { class: 'muted who-note' }, '비밀번호는 다음 시간에도 써요. 잊지 않게 정하세요. (선생님도 볼 수 없어요)'));
      setTimeout(() => (stu || pw).focus(), 30);
    }

    // 자리 고르기 — 로그인한 학생(acct = { sno, stu, tok })
    function seats(acct) {
      fill(right,
        head(h('small', {}, ` — ${acct.stu} 학생 · ② 내가 앉은 `, h('b', {}, '자리 번호'), '를 고르세요')),
        h('div', { class: 'num-grid' }, ...Array.from({ length: 40 }, (_, k) => k + 1).map((n) =>
          h('button', { class: 'num' + (prev && n === prev.seat ? ' prev' : ''), onClick: () => goIn(n, acct, false) }, String(n)))),
        h('div', { class: 'row seat-foot' },
          h('button', { class: 'btn', onClick: () => login() }, '← 다른 학생으로 로그인')));
    }

    function goIn(seat, acct, force) {
      call('apiJoin', session.id, seat, devicePid(), force, acct.tok).then(async (r) => {
        if (r.seatTaken) {
          const yes = await modal('이 자리에 다른 학생이 있어요', `${seat}번 자리에 ${r.who} 학생이 먼저 들어와 있어요. 내 자리가 ${seat}번이 맞나요?`, { ok: '네, 맞아요', cancel: '다시 고르기' });
          if (yes) goIn(seat, acct, true); else seats(acct);
          return;
        }
        const stu = r.name || acct.stu;
        enter(session, seat, acct.sno, stu, r.state, acct.tok);
        toast(`${stu} 학생, 반가워요! (${seat}번 자리)`, 'gold');
        mountPart(session.part, typeof S.card === 'string' && S.card !== 'start' ? S.card : 'next');
      }).catch((e) => {
        // 출입증이 지났으면(6시간) 다시 로그인
        if (/로그인/.test(e.message)) { toast('다시 로그인해 주세요.', 'bad'); login(acct.sno); return; }
        toast(`들어가지 못했어요 — ${e.message}`, 'bad');
      });
    }
    login(prev ? prev.sno : '');
  }
  hello();
}

export function resultCard(body, deck) {
  const found = Object.keys(S.cards).length;
  const part = ME.part || 'all';
  const ms = MISSIONS_OF[part] || MISSIONS.map((m) => m.id);
  const done = ms.filter((id) => S.missions[id]).length;
  const q = Object.values(S.quiz);
  const p1 = part !== 'p2', p2 = part !== 'p1';
  // 「오늘 배운 것」 은 보여 주지 않고 선생님과 함께 학생이 직접 적는다 (정답 문장 없음, 💡 는 실마리 낱말만)
  const notes = S.notes || {};
  const rows = wrapupFor(part).map((w) => {
    const inp = h('input', { type: 'text', class: 'wu-in', maxlength: '300', value: notes[w.id] || '', placeholder: '내 말로 적어 보세요', 'aria-label': w.q, spellcheck: 'false' });
    inp.addEventListener('input', () => setNote(w.id, inp.value));
    const tip = w.hint ? h('button', { class: 'wu-tip', title: '실마리 낱말 보기', onClick: (e) => { inp.placeholder = `💡 ${w.hint}`; e.currentTarget.disabled = true; inp.focus(); } }, '💡') : null;
    return h('label', { class: 'wu-row' }, h('span', { class: 'wu-q' }, w.q), inp, tip || h('span', {}));
  });
  const tile = (icon, big, label) => h('div', { class: 'res-tile' }, h('div', { class: 'res-icon' }, icon), h('div', { class: 'res-big' }, big), h('div', {}, label));
  fill(body, h('div', { class: 'result' },
    h('div', { class: 'res-tiles' },
      tile('📖', `${found} / ${CARDS.length}`, '모은 예외 카드'),
      tile('🛡️', `${done} / ${ms.length}`, part === 'all' ? '통과한 미션' : `통과한 미션 (${partOf(part).label})`),
      p1 ? tile('🔍', `${LOGIC.filter((x) => S.logic && S.logic[x.id]).length} / ${LOGIC.length}`, '논리 오류 (⭐ 심화)') : null,
      p2 ? tile('👾', `${S.boss} / 10 ${'⭐'.repeat(S.stars)}`, '보스전') : null,
      p2 ? tile('✅', `${q.filter(Boolean).length} / ${QUIZ.length}`, '확인 문제') : null),
    h('div', { class: 'res-summary' },
      h('h3', {}, '✍️ 오늘 배운 것 — 선생님과 함께 정리해요'),
      h('p', { class: 'muted wu-lead' }, '선생님과 이야기 나눈 뒤 내 말로 적어 보세요. 막히면 💡 를 누르면 실마리 낱말이 보여요. (적은 글은 이 컴퓨터에만 남아요)'),
      // 물음이 많으면(「전체」 범위) 두 칸으로 — 한 화면에 들어가게
      h('div', { class: 'wu-list' + (rows.length > 5 ? ' two' : '') }, ...rows),
      part === 'p1' ? h('p', { class: 'muted wu-next' }, '다음 시간 — else·finally 와 👾 보스전! 오늘 기록은 그대로 이어져요.') : null),
    h('div', { class: 'res-foot' },
      ME.num ? h('span', { class: 'muted' }, NET.status === 'err' ? '⚠ 선생님께 기록을 보내지 못한 것이 있어요.' : `✅ ${ME.stu} 학생의 기록이 선생님께 보내졌어요.`)
        : h('span', { class: 'muted' }, MODE === 'solo' ? '혼자 모드 — 기록은 이 브라우저에만 있어요.' : ''),
      h('button', { class: 'btn', onClick: () => deck.go(0) }, '↺ 처음 카드로'),
      h('button', { class: 'btn', onClick: () => askReset() }, '🧹 기록 초기화'))));
}

/** 🧹 기록 초기화 — 찾은 카드·힌트·미션·보스전·확인 문제·내 코드를 이 기기에서 모두 지우고 처음 카드로 */
export async function askReset() {
  const ok = await modal('🧹 기록 초기화',
    h('div', {},
      h('p', {}, '이 기기에 남은 활동 기록을 ', h('b', {}, '모두'), ' 지우고 처음부터 다시 시작할까요?'),
      h('p', { class: 'muted' }, '지워지는 것: 도감 카드 · 열어 본 힌트 · 미션과 보스전 · 확인 문제 · 내가 쓴 코드 · 고른 번호'),
      h('p', { class: 'muted' }, '선생님 화면으로 이미 보낸 기록은 남아요. 지운 기록은 되돌릴 수 없어요.')),
    { ok: '모두 지우기', cancel: '그만두기' });
  if (!ok) return;
  resetDevice();
  mountPart('all');
  toast('기록을 모두 지웠어요. 처음부터 시작해요!');
}
