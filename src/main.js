/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  학교 수업 목적으로만 이용해 주세요. 자세한 내용은 LICENSE 를 보세요.
 *
 *  카드 차례 = 교재 12장 A 의 절 차례
 *    시작 → 1 예외란 → 2 try–except → 3 여러 except → 4 else·finally → 5 보스전 → 6 확인 문제
 *  주소에 ?page=teacher 를 붙이면 교사 대시보드가 열린다.
 */
import './style.css';
import { h, toast } from './ui/dom.js';
import { createStage, createDeck } from './ui/deck.js';
import { getParams, MODE, call } from './net/gas.js';
import { S, ME, setCard, onChange } from './game/store.js';
import { CHAPTERS, buildCards } from './cards/index.js';
import { askReset } from './cards/start.js';
import { cardsFor, partOf } from './data/parts.js';
import { setMounter } from './ui/router.js';
import { renderDashboard } from './teacher/dashboard.js';

const { holder, stage } = createStage();
document.body.append(holder);

getParams().then((p) => {
  if (p.page === 'teacher') {
    document.title = '부숴봐! 자판기 — 교사 대시보드';
    renderDashboard(stage);
    return;
  }
  const all = buildCards();
  let lastCheck = 0;

  // 차시 범위에 맞춰 카드 넘기기를 세운다 — 범위 밖 카드는 목록에서 아예 빠진다
  function mount(part, go) {
    ME.part = partOf(part).id;
    const cards = cardsFor(all, ME.part);
    let start = 0;
    if (go === 'next') start = Math.min(1, cards.length - 1);
    else if (go) { const k = cards.findIndex((c) => c.id === go); start = k >= 0 ? k : Math.min(1, cards.length - 1); }
    createDeck(stage, cards, {
      // 1차시에는 확인 문제 없이 결과 카드만 남으니 그 단원 이름을 「정리」 로
      chapters: CHAPTERS.filter((ch) => cards.some((c) => c.chapter === ch.id))
        .map((ch) => (ME.part === 'p1' && ch.id === 'c6' ? { ...ch, short: '정리', label: '정리' } : ch)),
      start,
      onMove: (i) => { if (ME.pid) setCard(cards[i].id); checkPart(cards[i].id); },
      chip: () => h('div', { class: 'me-chip' },
        ME.num ? `${ME.num}번 자리 · ${ME.stu}` : (MODE === 'solo' ? '혼자 모드' : '로그인 전'),
        ME.name ? h('small', {}, ` · ${ME.name}`) : null,
        ME.pid && ME.part !== 'all' ? h('small', { class: 'me-part' }, ` · ${partOf(ME.part).label}`) : null,
        h('span', { class: 'me-cards' }, `📖 ${Object.keys(S.cards).length}/5`)),
      // 어느 카드에서나 누를 수 있는 기록 초기화 (확인 창을 한 번 거친다)
      tools: () => h('button', { class: 'reset-btn', title: '이 기기의 활동 기록을 모두 지웁니다', onClick: () => askReset() }, '🧹 기록 초기화'),
    });
  }
  // 선생님이 수업 중에 범위를 바꾸면 — 카드를 넘길 때 (15초에 한 번만) 서버에 물어 알아챈다
  function checkPart(cardId) {
    if (MODE === 'solo' || !ME.sid || Date.now() - lastCheck < 15000) return;
    lastCheck = Date.now();
    call('apiHello').then((r) => {
      const s = r && r.session;
      if (!s || s.id !== ME.sid || !s.part || s.part === ME.part) return;
      toast(`선생님이 범위를 「${partOf(s.part).label}」 로 바꿨어요`, 'gold');
      mount(s.part, cardId);
    }).catch(() => { /* 다음에 다시 */ });
  }
  setMounter(mount);
  mount('all');
  // 카드를 찾으면 머리의 「📖 n/5」 을 바로 고친다
  onChange(() => { const el = stage.querySelector('.me-cards'); if (el) el.textContent = `📖 ${Object.keys(S.cards).length}/5`; });
});
