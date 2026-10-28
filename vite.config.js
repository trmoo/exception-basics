/*! 부숴봐! 자판기 (교재판) — exception-basics
 *  © 2026 티쳐무 · 모든 권리 보유
 *  학교 수업 목적으로만 이용해 주세요. 자세한 내용은 LICENSE 파일을 보세요.
 */
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// 빌드 결과 맨 앞에 남길 저작권 배너. `/*!` 로 시작해야 압축 과정에서 지워지지 않는다.
const 배너 = `/*! 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
 * 학교 수업 목적으로만 이용해 주세요. 무단 배포·상업적 이용을 금합니다. */`;

/**
 * 개발 서버 전용 — 진짜 gas/Code.gs 를 가짜 시트 위에서 돌려 /__gas/함수이름 으로 답한다.
 * 학생 탭과 대시보드 탭이 같은 가짜 시트를 나눠 써서, 배포 없이 처음부터 끝까지 시험할 수 있다.
 * 개발용 교사 암호는 teach1234. (빌드 결과에는 이 코드가 들어가지 않는다)
 */
function fakeGas() {
  let server = null;
  return {
    name: 'fake-gas',
    apply: 'serve',
    async configureServer(vite) {
      const { loadServer } = await import('./tools/fake-gas.mjs');
      server = loadServer();
      server.api.setup_();
      server.api.setPassword_('teach1234');
      vite.middlewares.use('/__gas/', (req, res) => {
        let raw = '';
        req.on('data', (c) => { raw += c; });
        req.on('end', () => {
          const fn = decodeURIComponent(req.url.replace(/^\//, '').split('?')[0]);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          // 학생 화면이 부를 수 있는 것은 api 로 시작하는 함수뿐 (진짜 google.script.run 도 마찬가지로 공개 함수만)
          if (!/^api[A-Z]\w*$/.test(fn) || typeof server.api[fn] !== 'function') { res.end(JSON.stringify({ error: `없는 함수: ${fn}` })); return; }
          try {
            const value = server.api[fn](...JSON.parse(raw || '[]'));
            res.end(JSON.stringify({ value: value === undefined ? null : value }));
          } catch (e) { res.end(JSON.stringify({ error: e.message })); }
        });
      });
    },
  };
}

export default defineConfig({
  // GitHub Pages 하위 경로에서도 자원이 열리도록 상대 경로를 쓴다.
  base: './',
  plugins: [fakeGas(), viteSingleFile()],
  // legalComments 를 'none' 으로 두면 `/*!` 배너까지 지워진다. 반드시 'inline'.
  esbuild: { legalComments: 'inline' },
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    rollupOptions: { output: { banner: 배너 } },
  },
});
