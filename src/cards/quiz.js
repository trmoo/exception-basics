/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  확인 문제 카드 — 한 장에 한 문제. 처음 고른 답만 기록한다.
 */
import { h, fill } from '../ui/dom.js';
import { codeView } from '../ui/code.js';
import { QUIZ } from '../data/lessons.js';
import { S, answerQuiz } from '../game/store.js';

export function quizCard(k) {
  return (body, deck) => {
    const q = QUIZ[k];
    const host = h('div', { class: 'qz-right' });
    const paint = () => {
      const answered = k in S.quiz;
      const picked = S.picks[k];
      fill(host,
        h('p', { class: 'qz-q' }, h('b', {}, `Q${k + 1}. `), q.q),
        h('div', { class: 'qz-choices' }, ...q.choices.map((ch, j) => {
          const cls = !answered ? '' : ch === q.answer ? ' right' : (picked === j ? ' wrong' : ' dim');
          return h('button', { class: 'choice' + cls, disabled: answered, onClick: () => { answerQuiz(k, ch === q.answer, j); paint(); } },
            h('span', { class: 'cnum' }, '①②③④'[j]), h('span', { class: 'ctext' }, ch));
        })),
        answered ? h('div', { class: 'qz-why ' + (S.quiz[k] ? 'ok' : 'no') }, S.quiz[k] ? '✅ 정답! ' : '❌ 아쉬워요. ', q.why) : null,
        answered ? h('button', { class: 'btn primary', onClick: () => deck.next() }, '다음 ▶') : null);
    };
    fill(body, h('div', { class: 'quiz' }, h('div', { class: 'qz-left' }, codeView(q.code)), host));
    paint();
  };
}
