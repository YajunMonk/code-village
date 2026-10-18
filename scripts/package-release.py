#!/usr/bin/env python3
"""Package only the current verified web entrypoint and its referenced assets."""
from pathlib import Path
import argparse
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--report', type=Path, default=Path('artifacts/qa/release/package.json'),
                    help='Package verification report path (relative to the project root by default)')
args = parser.parse_args()
manifest = json.loads((ROOT / 'assets/build-manifest.json').read_text(encoding='utf-8'))
entry = ROOT / 'index.html'
assert hashlib.sha256(entry.read_bytes()).hexdigest() == manifest['entrypoint']['sha256'], 'Rebuild before packaging'
files = {'index.html', 'FONT-LICENSE.txt', 'assets/build-manifest.json'}
asset_records = [*manifest['assets'].values(), *manifest.get('app_icons', {}).values()]
files.update(item['url'] for item in asset_records)
for item in asset_records:
    assert hashlib.sha256((ROOT / item['url']).read_bytes()).hexdigest() == item['sha256'], item['url']
destination = ROOT / 'dist' / '代码物语-1.2-网页发行包.zip'
destination.parent.mkdir(exist_ok=True)
readme = '''代码物语 · 星灯之约 1.2

和 AI 搭档修好一家小店，在像素小镇里完成你的第一次开发冒险。
在线游玩：https://buxiangai.com/game/
项目源码：https://github.com/YajunMonk/code-village

解压后保留 index.html 和 assets/ 的相对位置。可用任意静态服务器运行，
或在此目录执行 python3 -m http.server 4173 --bind 127.0.0.1，
然后打开 http://127.0.0.1:4173/。网站部署时上传整个目录，支持子路径。

电脑：方向键或 WASD 行走；Shift 跑步；空格互动；Q 手记；C 图鉴；Esc 暂停。
手机：屏幕方向键、A 和跑步键；屋内点地板走动、点人物和物件互动。
进度自动保存在当前设备、当前浏览器的网站数据中。
换设备、浏览器或网址时，在「设置与存档」导出 JSON 备份，再到新设备导入。
导入前可预览，确认后会保留上一份进度，必要时可恢复。
无需账号、API Key 或付费 AI 服务；游戏内终端、订单和部署是教学模拟。

制作：王不响 / YajunMonk；基于本仓库最初的 demo 持续开发。
字体：Fusion Pixel，TakWolf；随附 FONT-LICENSE.txt 为完整许可。
原画与角色图集通过 AI 辅助生成，音乐音效由代码合成。
代码与美术的使用授权请联系项目作者确认。
'''
with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for relative in sorted(files):
        archive.write(ROOT / relative, relative)
    archive.writestr('开始游玩.txt', readme)
with zipfile.ZipFile(destination) as archive:
    assert archive.testzip() is None, 'Corrupt ZIP entry'
    for relative in files:
        assert hashlib.sha256(archive.read(relative)).digest() == hashlib.sha256((ROOT / relative).read_bytes()).digest(), relative
report = {'file': str(destination.relative_to(ROOT)), 'bytes': destination.stat().st_size,
          'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(),
          'entries': len(files) + 1, 'index_sha256': manifest['entrypoint']['sha256'],
          'app_icon_count': len(manifest.get('app_icons', {}))}
report_path = ROOT / args.report
report_path.parent.mkdir(parents=True, exist_ok=True)
report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, ensure_ascii=False))
