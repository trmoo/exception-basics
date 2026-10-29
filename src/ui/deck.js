/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  카드 넘기기 틀.
 *  ★ 화면은 언제나 1280×720 「무대」 하나다. 창 크기에 맞춰 통째로 키우거나 줄이므로
 *    교실 TV·노트북·태블릿 어디서나 스크롤이 생기지 않는다. 카드 안 내용도 이 크기에 맞게 쓴다.
 */
import { h, fill, beginScreen, toast } from './dom.js';

export const W = 1280, H = 720;

/** 무대를 만들고 창 크기에 맞춰 늘이고 줄인다 */
export function createStage() {
  const stage = h('div', { class: 'stage' });
  const holder = h('div', { class: 'stage-holder' }, stage);
  const fit = () => {
    const s = Math.min(window.innerWidth / W, window.innerHeight / H);
    stage.style.transform = `scale(${s})`;
    holder.style.width = `${W * s}px`;
    holder.style.height = `${H * s}px`;
  };
  window.addEventListener('resize', fit);
  fit();
  return { holder, stage };
}

/**
 * 카드 넘기기.
 *   cards: [{ id, chapter, title, render(body, api) }]
 *   api.next( ) · api.go(i) — 카드 안에서 넘길 때
 *   locked( ) 가 참이면 첫 카드(시작)에서 못 나간다 — 학번으로 로그인하기 전에는 다른 카드를 넘겨볼 수 없게
 */
let keyHandler = null;
export function createDeck(stage, cards, { chapters, start = 0, onMove, chip, tools, locked } = {}) {
  const isLocked = () => !!(locked && locked());
  let i = isLocked() ? 0 : Math.max(0, Math.min(cards.length - 1, start));
  const head = h('header', { class: 'card-head' });
  const body = h('main', { class: 'card-body' });
  const foot = h('footer', { class: 'card-foot' });
  fill(stage, head, body, foot);

  function paint() {
    beginScreen();
    const c = cards[i];
    const chIdx = chapters.findIndex((x) => x.id === c.chapter);
    const lock = isLocked();
    fill(head,
      h('div', { class: 'ch-tag', style: { '--c': chapters[chIdx].color } }, chapters[chIdx].label),
      h('h1', {}, c.title),
      chip ? chip() : null,
      tools ? tools() : null);
    fill(foot,
      h('button', { class: 'nav prev', disabled: i === 0, onClick: () => go(i - 1), 'aria-label': '이전 카드' }, '◀ 이전'),
      h('nav', { class: 'chapters', 'aria-label': '단원' }, ...chapters.map((ch, k) => {
        const first = cards.findIndex((x) => x.chapter === ch.id);
        const inCh = cards.filter((x) => x.chapter === ch.id).length;
        const pos = cards.slice(0, i + 1).filter((x) => x.chapter === ch.id).length;
        return h('button', { class: 'ch' + (k === chIdx ? ' on' : '') + (k < chIdx ? ' done' : ''), style: { '--c': ch.color }, disabled: lock && k !== chIdx,
          title: lock && k !== chIdx ? '로그인한 뒤에 열 수 있어요' : null, onClick: () => go(first) },
          h('span', {}, ch.short), k === chIdx && inCh > 1 ? h('small', {}, ` ${pos}/${inCh}`) : null);
      })),
      h('button', { class: 'nav next', disabled: lock || i === cards.length - 1, title: lock ? '로그인한 뒤에 넘길 수 있어요' : null, onClick: () => go(i + 1), 'aria-label': '다음 카드' }, '다음 ▶'));
    fill(body);
    c.render(body, api);
    if (onMove) onMove(i);
  }
  function go(k) {
    if (k < 0 || k >= cards.length) return;
    if (k !== 0 && isLocked()) { if (k !== i) toast('먼저 학번으로 로그인해 주세요 🔐', 'bad'); return; }
    i = k; paint();
  }
  const api = { next: () => go(i + 1), go, refreshHead: () => paint(), get index() { return i; } };

  // 차시가 바뀌면 deck 을 새로 세운다 — 앞 deck 의 키 처리기를 걷어 내지 않으면 → 한 번에 두 장씩 넘어간다
  if (keyHandler) window.removeEventListener('keydown', keyHandler);
  keyHandler = (e) => {
    // 글을 치는 칸에서는 화살표가 커서를 움직여야 한다
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (document.querySelector('.overlay')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(i + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(i - 1); }
  };
  window.addEventListener('keydown', keyHandler);
  paint();
  return api;
}
