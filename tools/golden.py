# 부숴봐! 자판기 (교재판) — © 2026 티쳐무 · 모든 권리 보유
# 진짜 파이썬(CPython)으로 test/golden-cases.mjs 의 조각들을 돌려 test/golden.json 을 만든다.
# 조각마다 「가짜 파일」 을 임시 폴더에 진짜로 써 두고 그 안에서 돌린다 — open( ) 이 앱과 똑같이 굴게.
#
#   PYTHONUTF8=1 python tools/golden.py
#
# ⚠ PYTHONUTF8=1 을 붙일 것. 윈도우의 open( ) 기본 인코딩은 CP949 라 한글·이모지 파일이 깨진다.
import gc, io, json, os, subprocess, sys, tempfile, traceback, contextlib, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
dump = subprocess.run(
    ['node', '-e', "import('./test/golden-cases.mjs').then(m => process.stdout.write(JSON.stringify(m.cases())))"],
    cwd=ROOT, capture_output=True, text=True, encoding='utf-8', check=True)
cases = json.loads(dump.stdout)

out = []
here = os.getcwd()
for c in cases:
    # 윈도우는 열린 파일을 못 지운다 — 조각이 닫지 않은 파일은 gc 로 닫고, 그래도 남으면 그냥 둔다
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        for name, text in (c.get('files') or {}).items():
            pathlib.Path(tmp, name).write_text(text, encoding='utf-8')
        os.chdir(tmp)
        feed = iter(c.get('inputs') or [])
        buf = io.StringIO()
        env = {'input': lambda prompt='': next(feed), '__name__': '__main__'}
        err = None
        try:
            with contextlib.redirect_stdout(buf):
                exec(compile(c['code'], 'main.py', 'exec'), env)
        except Exception as e:  # noqa: BLE001
            tb = traceback.extract_tb(e.__traceback__)
            line = [f.lineno for f in tb if f.filename == 'main.py'][-1]
            err = {'type': type(e).__name__, 'msg': str(e), 'line': line}
        finally:
            os.chdir(here)
            env.clear(); gc.collect()
    out.append({'name': c['name'], 'output': buf.getvalue().rstrip('\n'), 'error': err})

(ROOT / 'test' / 'golden.json').write_text(json.dumps({'python': sys.version.split()[0], 'cases': out}, ensure_ascii=False, indent=1), encoding='utf-8')
print(f'{len(out)}개 사례를 진짜 파이썬 {sys.version.split()[0]} 로 돌려 test/golden.json 에 담았습니다.')
