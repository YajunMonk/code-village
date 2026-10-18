#!/usr/bin/env python3
"""在临时工程中测试发行构建，不改真实 index、素材或存档。"""
import functools
import hashlib
import http.server
import importlib.util
import json
from pathlib import Path
import shutil
import stat
import struct
import subprocess
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch
from urllib.parse import urljoin
from urllib.request import urlopen
import zlib


ROOT = Path(__file__).resolve().parent.parent


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


builder = load('shore_builder', ROOT / 'source/build.py')
checks = load('shore_output_checks', ROOT / 'scripts/check-build-output.py')
ENCODER = builder.find_encoder()
DECODER = str(Path(ENCODER).with_name('dwebp'))


def png(width, height, pixels):
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))
    scanlines = b''.join(b'\0' + pixels[y * width * 4:(y + 1) * width * 4] for y in range(height))
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(scanlines)) + chunk(b'IEND', b''))


class BuildTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='shore-build-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.license = b'Copyright (c) 2026 Fixture Author \r\nSIL Open Font License, Version 1.1.\t\r\n'
        (self.root / 'FONT-LICENSE.txt').write_bytes(self.license)
        self.source = self.root / 'source'
        self.asset_dir = self.source / 'assets'
        self.asset_dir.mkdir(parents=True)
        (self.source / 'src').mkdir()
        shutil.copyfile(ROOT / 'source/assets/fusion-pixel.ttf', self.asset_dir / 'fusion-pixel.ttf')
        shutil.copyfile(ROOT / 'source/build.py', self.source / 'build.py')
        (self.source / 'src/00.js').write_text('const gameTitle = "像素彼岸";', encoding='utf-8')
        (self.source / 'src/shell.html').write_text('<!doctype html><html><head><!-- /SKELETON --><title>像素彼岸</title></head><body><script>/*BUNDLE*/</script></body></html>', encoding='utf-8')
        # 包括 alpha=0 下的非零 RGB，验证 -exact 没有抹去透明像素颜色。
        self.pixels = bytes([250, 41, 13, 255, 55, 180, 73, 0, 80, 130, 220, 128,
                             11, 22, 33, 64, 200, 150, 100, 255, 99, 88, 77, 0])
        self.original = png(3, 2, self.pixels)
        (self.asset_dir / 'a.png').write_bytes(self.original)
        (self.asset_dir / 'copy.png').write_bytes(self.original)
        (self.asset_dir / 'b.png').write_bytes(png(1, 1, bytes([9, 8, 7, 255])))
        self.manifest = {'a': 'a.png', 'alias': 'a.png', 'same-content': 'copy.png', 'b': 'b.png'}
        self.write_manifest()
        self.output = self.root / 'site/games/shore/index.html'

    def write_manifest(self):
        (self.asset_dir / 'manifest.json').write_text(json.dumps(self.manifest), encoding='utf-8')

    def write_icons(self):
        directory = self.asset_dir / 'v3'
        directory.mkdir(exist_ok=True)
        icons = {}
        for key, size, rel in [('favicon', 32, 'icon'), ('apple-touch', 180, 'apple-touch-icon'), ('app-512', 512, 'icon')]:
            relative = f'v3/{key}.png'
            (self.asset_dir / relative).write_bytes(png(size, size, bytes([50, 90, 70, 255]) * size * size))
            icons[key] = {'source': relative, 'rel': rel, 'sizes': f'{size}x{size}'}
        (directory / 'app-icons.json').write_text(json.dumps(icons), encoding='utf-8')
        shell = self.source / 'src/shell.html'
        shell.write_text(shell.read_text().replace('</title>', '</title><!-- APP_ICONS -->'), encoding='utf-8')
        return icons

    def build(self, **kwargs):
        return builder.build(self.source, output=kwargs.pop('output', self.output), cwebp=ENCODER, **kwargs)

    def test_hashes_dedup_and_lossless_pixels(self):
        run = subprocess.run
        with patch.object(builder.subprocess, 'run', wraps=run) as calls:
            report = self.build()
            self.assertEqual(calls.call_count, 3, '相同源路径不能重复编码')
        self.assertEqual(report['asset_keys'], 4)
        self.assertEqual(report['unique_source_files'], 3)
        self.assertEqual(report['unique_output_files'], 2)
        checks.check_external(self.output, self.source)
        self.assertEqual(stat.S_IMODE(self.output.stat().st_mode), 0o644)
        urls = checks.asset_urls(self.output.read_text())
        self.assertEqual(urls['a'], urls['alias'])
        self.assertEqual(urls['a'], urls['same-content'])
        self.assertEqual((self.asset_dir / 'a.png').read_bytes(), self.original)
        pam = self.root / 'roundtrip.pam'
        subprocess.run([DECODER, str(self.output.parent / urls['a']), '-pam', '-o', str(pam)], check=True, capture_output=True)
        header, pixels = pam.read_bytes().split(b'ENDHDR\n', 1)
        self.assertIn(b'WIDTH 3\nHEIGHT 2\nDEPTH 4', header)
        self.assertEqual(pixels, self.pixels, '每个 RGBA 像素必须完全一致')

    def test_subpath_http_and_stable_rebuild(self):
        self.write_icons()
        self.build()
        before = self.output.read_bytes()
        self.build()
        self.assertEqual(self.output.read_bytes(), before)
        class QuietHandler(http.server.SimpleHTTPRequestHandler):
            def log_message(self, *args):
                pass
        handler = functools.partial(QuietHandler, directory=str(self.root))
        server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
        thread = threading.Thread(target=lambda: server.serve_forever(poll_interval=.01), daemon=True)
        thread.start()
        try:
            page = f'http://127.0.0.1:{server.server_port}/site/games/shore/index.html'
            with urlopen(page) as response:
                html = response.read().decode()
            for url in set(checks.asset_urls(html).values()):
                resolved = urljoin(page, url)
                self.assertIn('/site/games/shore/assets/', resolved)
                with urlopen(resolved) as response:
                    self.assertEqual(response.status, 200)
                    self.assertEqual(response.headers.get_content_type(), 'image/webp')
                    self.assertEqual(hashlib.sha256(response.read()).hexdigest(), Path(url).stem)
            for icon in checks.app_icon_links(html).values():
                resolved = urljoin(page, icon['href'])
                self.assertIn('/site/games/shore/assets/', resolved)
                with urlopen(resolved) as response:
                    self.assertEqual(response.status, 200)
                    self.assertEqual(response.headers.get_content_type(), 'image/png')
                    self.assertEqual(hashlib.sha256(response.read()).hexdigest(), Path(icon['href']).stem)
        finally:
            server.shutdown()
            server.server_close()
            thread.join()

    def test_static_png_icons_and_offline_parity(self):
        icons = self.write_icons()
        before = {key: (self.asset_dir / item['source']).read_bytes() for key, item in icons.items()}
        report = self.build()
        html = self.output.read_text()
        links = checks.app_icon_links(html)
        self.assertEqual(set(links), set(icons))
        self.assertNotIn('<!-- APP_ICONS -->', html)
        for key, item in report['app_icons'].items():
            self.assertLess(html.index('data-app-icon="' + key + '"'), html.index('</head>'))
            self.assertEqual((self.output.parent / item['url']).read_bytes(), before[key])
            self.assertEqual((self.asset_dir / item['source']).read_bytes(), before[key])
        checks.check_external(self.output, self.source)
        offline = self.root / 'offline/game.html'
        fragment = self.root / 'embed/part.html'
        self.build(output=offline, standalone=True, fragment=fragment)
        checks.check_standalone(offline, report['assets'], self.license, html, report['app_icons'])
        checks.check_standalone(fragment, report['assets'], self.license, expected_icons=report['app_icons'])
        self.assertFalse((offline.parent / 'assets').exists(), '离线版图标不能依赖外部 assets')
        # 逐项内容检查不能被只比较 head 声明代替。
        first = next(iter(report['app_icons'].values()))
        (self.output.parent / first['url']).write_bytes(b'broken PNG')
        with self.assertRaisesRegex(AssertionError, '不是 PNG 图标'):
            checks.check_external(self.output, self.source)

    def test_invalid_icon_config_preserves_existing_entry(self):
        self.build()
        original = self.output.read_bytes()
        files = sorted((self.output.parent / 'assets').iterdir())
        icons = self.write_icons()
        config = self.asset_dir / 'v3/app-icons.json'
        for field, invalid, error in [('sizes', '16x16', '尺寸'), ('source', '../../outside.png', '超出素材目录'),
                                      ('source', 'v3/missing.png', '缺少或无法读取'), ('rel', 'stylesheet', 'rel 或 sizes')]:
            with self.subTest(field=field, invalid=invalid):
                changed = {key: dict(value) for key, value in icons.items()}
                changed['favicon'][field] = invalid
                config.write_text(json.dumps(changed))
                with self.assertRaisesRegex(builder.BuildError, error):
                    self.build()
                self.assertEqual(self.output.read_bytes(), original)
                self.assertEqual(sorted((self.output.parent / 'assets').iterdir()), files)

    def test_standalone_and_fragment_do_not_depend_on_assets(self):
        report = self.build()
        original = self.output.read_bytes()
        offline = self.root / 'elsewhere/离线游戏.html'
        self.build(output=offline, standalone=True)
        checks.check_standalone(offline, report['assets'])
        self.assertEqual(self.output.read_bytes(), original)
        fragment = self.root / 'embed/fragment.html'
        self.build(fragment=fragment)
        checks.check_standalone(fragment, report['assets'])
        self.assertNotIn('<!doctype', fragment.read_text())
        self.assertNotIn('</html>', fragment.read_text())

    def test_complete_license_survives_external_standalone_and_fragment(self):
        self.build()
        offline = self.root / 'offline/game.html'
        fragment = self.root / 'embed/part.html'
        self.build(output=offline, standalone=True, fragment=fragment)
        normalized = b'\n'.join(line.rstrip() for line in self.license.replace(b'\r\n', b'\n').split(b'\n'))
        marker = b'<script type="text/plain" id="font-license">' + normalized + b'</script>'
        for entry in (self.output, offline, fragment):
            with self.subTest(entry=entry):
                self.assertIn(marker, entry.read_bytes(), '许可正文统一 LF 并清除行尾空白后完整保留')
                self.assertEqual((entry.parent / 'FONT-LICENSE.txt').read_bytes(), self.license)

    def test_missing_license_preserves_existing_entry(self):
        self.build()
        original = self.output.read_bytes()
        (self.root / 'FONT-LICENSE.txt').unlink()
        with self.assertRaisesRegex(builder.BuildError, '无法读取完整字体许可'):
            self.build()
        self.assertEqual(self.output.read_bytes(), original)

    def test_missing_asset_fails_before_any_output(self):
        self.build()
        original = self.output.read_bytes()
        files = sorted((self.output.parent / 'assets').iterdir())
        self.manifest['missing'] = 'v2/not-ready.png'
        self.write_manifest()
        with self.assertRaisesRegex(builder.BuildError, 'missing.*缺少素材'):
            self.build()
        self.assertEqual(self.output.read_bytes(), original)
        self.assertEqual(sorted((self.output.parent / 'assets').iterdir()), files)

    def test_cli_missing_asset_preserves_default_entry(self):
        entry = self.root / 'index.html'
        entry.write_bytes(b'known good release')
        self.manifest['missing'] = 'missing.png'
        self.write_manifest()
        result = subprocess.run([sys.executable, str(self.source / 'build.py')], capture_output=True, text=True)
        self.assertEqual(result.returncode, 1)
        self.assertIn('缺少素材', result.stderr)
        self.assertEqual(entry.read_bytes(), b'known good release')

    def test_invalid_manifest_keys_and_path(self):
        cases = [('{}', '非空'), ('{"a":"a.png","a":"b.png"}', '重复资源键'),
                 ('{"a":"../../outside.png"}', '超出素材目录'), ('{"A":"a.png"}', '无效资源键')]
        for raw, error in cases:
            with self.subTest(raw=raw):
                (self.asset_dir / 'manifest.json').write_text(raw)
                with self.assertRaisesRegex(builder.BuildError, error):
                    self.build()
                self.assertFalse(self.output.exists())

    def test_encoder_failure_preserves_entry(self):
        self.build()
        original = self.output.read_bytes()
        with self.assertRaisesRegex(builder.BuildError, '转换失败'):
            builder.build(self.source, output=self.output, cwebp='/missing/cwebp')
        self.assertEqual(self.output.read_bytes(), original)
        (self.asset_dir / 'b.png').write_bytes(png(1, 1, bytes([1, 2, 3, 255]))[:24])
        with self.assertRaisesRegex(builder.BuildError, '转换失败'):
            self.build()
        self.assertEqual(self.output.read_bytes(), original)

    def test_16bit_png_cannot_be_silently_quantized(self):
        data = bytearray(self.original)
        data[24] = 16
        (self.asset_dir / 'a.png').write_bytes(data)
        with self.assertRaisesRegex(builder.BuildError, '16 位 PNG'):
            self.build()
        self.assertFalse(self.output.exists())

    def test_standalone_cannot_overwrite_default_index(self):
        entry = self.root / 'index.html'
        entry.write_bytes(b'known good release')
        with self.assertRaisesRegex(builder.BuildError, '不覆盖默认'):
            self.build(output=entry, standalone=True)
        self.assertEqual(entry.read_bytes(), b'known good release')

    def test_standalone_fragment_cannot_overwrite_default_index(self):
        entry = self.root / 'index.html'
        entry.write_bytes(b'known good release')
        offline = self.root / 'dist/offline.html'
        with self.assertRaisesRegex(builder.BuildError, '不覆盖默认'):
            self.build(output=offline, standalone=True, fragment=entry)
        self.assertEqual(entry.read_bytes(), b'known good release')
        self.assertFalse(offline.exists())

    def test_output_and_fragment_cannot_overwrite_source_inputs(self):
        targets = [self.asset_dir / 'a.png', self.asset_dir / 'manifest.json',
                   self.asset_dir / 'fusion-pixel.ttf', self.source / 'src/00.js',
                   self.source / 'src/shell.html', self.source / 'build.py']
        original = {target: target.read_bytes() for target in targets}
        for target in targets:
            for kind in ('output', 'fragment'):
                with self.subTest(target=target.name, kind=kind):
                    with self.assertRaisesRegex(builder.BuildError, '输出不能写入 source/'):
                        self.build(standalone=True, **{kind: target})
                    self.assertEqual(target.read_bytes(), original[target])
                    self.assertFalse(self.output.exists())

    def test_symlink_cannot_bypass_source_and_entry_protection(self):
        alias = self.root / 'asset-alias'
        alias.symlink_to(self.asset_dir, target_is_directory=True)
        with self.assertRaisesRegex(builder.BuildError, '输出不能写入 source/'):
            self.build(output=alias / 'a.png', standalone=True)
        self.assertEqual((self.asset_dir / 'a.png').read_bytes(), self.original)
        entry = self.root / 'index.html'
        entry.write_bytes(b'known good release')
        entry_alias = self.root / 'entry-alias.html'
        entry_alias.symlink_to(entry)
        with self.assertRaisesRegex(builder.BuildError, '不覆盖默认'):
            self.build(standalone=True, fragment=entry_alias)
        self.assertEqual(entry.read_bytes(), b'known good release')


if __name__ == '__main__':
    unittest.main(verbosity=2)
