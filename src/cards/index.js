/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 *  카드 목록 — 교재 12장 A 의 차례대로. 한 장에 한 가지만 담는다.
 */
import { startCard, resultCard } from './start.js';
import { lessonCard, misuseCard } from './lesson.js';
import { breakCard, dexCard } from './game.js';
import { missionCard } from './mission.js';
import { quizCard } from './quiz.js';
import { errorsCard, logicCard } from './logic.js';
import { QUIZ } from '../data/lessons.js';

export const CHAPTERS = [
  { id: 'c0', short: '시작', label: '시작', color: '#64748b' },
  { id: 'c1', short: '예외란', label: '예외란', color: '#ef4444' },
  { id: 'c2', short: 'try–except', label: 'try – except', color: '#2563eb' },
  { id: 'c3', short: '여러 except', label: '여러 예외 처리하기', color: '#7c3aed' },
  { id: 'cx', short: '⭐ 심화', label: '⭐ 심화 — 논리 오류', color: '#d97706' },
  { id: 'c4', short: 'else·finally', label: 'else 와 finally', color: '#0d9488' },
  { id: 'c5', short: '보스전', label: '보스전', color: '#ea580c' },
  { id: 'c6', short: '확인 문제', label: '확인 문제', color: '#475569' },
];

export function buildCards() {
  return [
    { id: 'start', chapter: 'c0', title: '부숴봐! 자판기', render: startCard },
    { id: 'l1', chapter: 'c1', title: '예외가 나면 프로그램이 멈춘다', render: lessonCard('l1') },
    { id: 'break', chapter: 'c1', title: '🎰 1라운드 — 자판기를 고장 내라!', render: breakCard },
    { id: 'dex', chapter: 'c1', title: '📖 예외 도감', render: dexCard },
    { id: 'l2', chapter: 'c2', title: 'try – except 로 감싸면', render: lessonCard('l2') },
    { id: 'm1', chapter: 'c2', title: '🛡️ 미션 1 — 첫 방어막', render: missionCard('m1') },
    { id: 'l3', chapter: 'c3', title: 'except 를 여러 개 두면', render: lessonCard('l3') },
    { id: 'm2', chapter: 'c3', title: '🛡️ 미션 2 — 종류별 방어막', render: missionCard('m2') },
    // ⭐ 심화 — 1차시에 미션 2 까지 빨리 끝낸 학생용 (논리 오류)
    { id: 'errors', chapter: 'cx', title: '⭐ 실행 오류와 논리 오류', render: errorsCard },
    { id: 'logic', chapter: 'cx', title: '🔍 논리 오류 사냥 — 멈추지 않는데 틀린 것', render: logicCard },
    { id: 'l4', chapter: 'c4', title: 'else 는 성공했을 때, finally 는 언제나', render: lessonCard('l4') },
    { id: 'm3', chapter: 'c4', title: '🛡️ 미션 3 — 성공하면, 언제나', render: missionCard('m3') },
    { id: 'boss', chapter: 'c5', title: '👾 보스전 — 공격 10가지를 막아라', render: missionCard('boss') },
    { id: 'misuse', chapter: 'c5', title: '⚠️ except: 만 쓰면 안 되는 까닭', render: misuseCard },
    ...QUIZ.map((q, k) => ({ id: `q${k + 1}`, chapter: 'c6', title: `확인 문제 ${k + 1} / ${QUIZ.length}`, render: quizCard(k) })),
    { id: 'result', chapter: 'c6', title: '🏁 오늘의 결과', render: resultCard },
  ];
}
