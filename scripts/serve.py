#!/usr/bin/env python3
"""Local-only launcher. Uses a stable origin so browser saves survive restarts."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse
import functools
import urllib.request
import webbrowser

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=4173)
parser.add_argument('--open', action='store_true')
args = parser.parse_args()
url = f'http://127.0.0.1:{args.port}/'
handler = functools.partial(SimpleHTTPRequestHandler, directory=str(ROOT))
try:
    server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
except OSError as exc:
    try:
        with urllib.request.urlopen(url, timeout=2) as response:
            # 构建入口的页头含完整字体许可，标识位于约 19 KiB 之后。
            existing = response.read(65536).decode('utf-8', 'replace')
        # 固定游戏标识独立于展示名；兼容仍在运行的旧版入口。
        identity = '<meta name="game-id" content="code-village">'
        legacy_title = '<title>像素彼岸 · 星灯之约</title>'
        if identity not in existing and legacy_title not in existing:
            raise RuntimeError('端口被其他程序使用，请用 --port 指定另一个端口。') from exc
    except Exception:
        raise SystemExit(f'无法使用 {url}：请检查端口是否被其他程序占用。')
    if args.open:
        webbrowser.open(url)
    print(f'游戏已在运行：{url}')
else:
    print(f'代码物语已启动：{url}\n按 Ctrl+C 停止。进度保存在此地址的浏览器中。', flush=True)
    if args.open:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
