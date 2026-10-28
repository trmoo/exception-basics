/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  귀여운 자판기 그림. runMachine( ) 의 결과를 받아 표정·연기·방어막으로 보여 준다.
 *    idle 🙂 · vend 😄 음료가 떨어진다 · crash 😵 흔들림·연기·빨간 경고등
 *    calm 😌 파란 방어막 + 침착한 말 · silent 🤐 방어막은 떴는데 말이 없다
 */
import { h } from './dom.js';
import { PRODUCTS } from '../data/machine.js';

const FACE = { idle: '🙂', vend: '😄', crash: '😵', calm: '😌', silent: '🤐', blank: '🤔', broken: '😵‍💫' };

export function createVending({ small = false } = {}) {
  const face = h('div', { class: 'vm-face', 'aria-hidden': 'true' }, FACE.idle);
  const msg = h('div', { class: 'vm-msg' }, '무엇을 드릴까요?');
  const slots = PRODUCTS.map((p, i) => h('div', { class: 'vm-slot' },
    h('div', { class: 'vm-can' }, p.icon),
    h('div', { class: 'vm-label' }, h('b', {}, `${i}`), ` ${p.name}`),
    h('div', { class: 'vm-price' }, `${p.price.toLocaleString()}원`)));
  const drop = h('div', { class: 'vm-drop' });
  const smoke = h('div', { class: 'vm-smoke', 'aria-hidden': 'true' }, ...Array.from({ length: 6 }, (_, i) => h('span', { style: { '--i': i } })));
  const el = h('div', { class: 'vm idle' + (small ? ' small' : ''), role: 'img', 'aria-label': '파이썬 자판기' },
    h('div', { class: 'vm-shield', 'aria-hidden': 'true' }),
    h('div', { class: 'vm-body' },
      h('div', { class: 'vm-top' }, h('span', { class: 'vm-lamp' }), h('span', {}, 'PYTHON 자판기'), h('span', { class: 'vm-lamp' })),
      h('div', { class: 'vm-screen' }, face, msg),
      h('div', { class: 'vm-shelf' }, ...slots),
      h('div', { class: 'vm-tray' }, drop)),
    smoke,
    h('div', { class: 'vm-sparks', 'aria-hidden': 'true' }, '⚡', '💥'));

  function show(res, values = {}) {
    const st = res ? res.status : 'idle';
    el.className = 'vm ' + st + (small ? ' small' : '');
    void el.offsetWidth; // 같은 상태를 다시 보여 줄 때도 애니메이션이 처음부터 돌게
    face.textContent = FACE[st] || '🙂';
    const n = /^\s*\d+\s*$/.test(values.num || '') ? Number(values.num) : -1;
    slots.forEach((s, i) => s.classList.toggle('on', i === n));
    drop.textContent = '';
    const said = res ? res.out : [];
    switch (st) {
      case 'vend': msg.textContent = said.join('\n'); drop.textContent = res.product ? res.product.icon : '🥤'; break;
      case 'crash': msg.textContent = `ERROR\n${res.type}`; break;
      case 'calm': msg.textContent = said.join('\n'); break;
      case 'silent': msg.textContent = '……'; break;
      case 'blank': msg.textContent = '빈칸을 먼저 채워 주세요'; break;
      case 'broken': msg.textContent = `코드가 돌지 못해요\n${res.type || ''}`; break;
      default: msg.textContent = '무엇을 드릴까요?';
    }
  }
  return { el, show };
}
