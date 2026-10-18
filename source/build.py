#!/usr/bin/env python3
"""构建《代码物语》：默认输出轻量 index.html 与无损 WebP 资源。

  python source/build.py
  python source/build.py --standalone [dist/代码物语.html]
  python source/build.py --fragment fragment.html

只读素材 manifest 与可选 v3/app-icons.json 指定的 PNG；不改原图、不清理旧资源。
--fragment 保持可独立嵌入：片段内嵌字体和图片，与默认外部资源构建兼容。
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shutil
import struct
import subprocess
import sys
import tempfile

HERE = Path(__file__).resolve().parent
PNG_SIGNATURE = b'\x89PNG\r\n\x1a\n'


class BuildError(Exception):
    """输入或构建失败；入口文件保持原样。"""


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise BuildError(f'manifest 有重复资源键：{key}')
        result[key] = value
    return result


def read_manifest(source_dir: Path) -> dict:
    """在转换和写出之前检查全部素材，不能静默跳过缺图。"""
    asset_dir = (source_dir / 'assets').resolve()
    manifest_path = asset_dir / 'manifest.json'
    try:
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'), object_pairs_hook=_unique_object)
    except (OSError, ValueError) as exc:
        raise BuildError(f'无法读取素材 manifest：{manifest_path}: {exc}') from exc
    if not isinstance(manifest, dict) or not manifest:
        raise BuildError('素材 manifest 必须是非空的 key -> PNG 相对路径对象')
    assets, errors = {}, []
    for key, relative in manifest.items():
        if not isinstance(key, str) or not re.fullmatch(r'[a-z0-9][a-z0-9_-]*', key):
            errors.append(f'无效资源键：{key!r}')
            continue
        if not isinstance(relative, str) or not relative or Path(relative).is_absolute():
            errors.append(f'{key}: 需要素材目录内的 PNG 相对路径')
            continue
        path = (asset_dir / relative).resolve()
        if not path.is_relative_to(asset_dir):
            errors.append(f'{key}: 路径超出素材目录：{relative}')
            continue
        if not path.is_file():
            errors.append(f'{key}: 缺少素材：{relative}')
            continue
        data = path.read_bytes()
        if path.suffix.lower() != '.png' or len(data) < 24 or data[:8] != PNG_SIGNATURE:
            errors.append(f'{key}: 不是有效的 PNG 文件：{relative}')
            continue
        width, height = struct.unpack('>II', data[16:24])
        if not width or not height:
            errors.append(f'{key}: PNG 尺寸无效：{relative}')
            continue
        if len(data) > 24 and data[24] == 16:
            errors.append(f'{key}: 16 位 PNG 不能无损转换为 8 位 WebP：{relative}')
            continue
        assets[key] = {'source': relative, 'path': path, 'source_sha256': sha256(data),
                       'source_bytes': len(data), 'width': width, 'height': height}
    if errors:
        raise BuildError('素材检查失败，未更新入口：\n  ' + '\n  '.join(errors))
    return assets


def read_app_icons(source_dir: Path) -> dict:
    """可选的浏览器/手机 PNG 图标；与游戏画面 manifest 分开，不经 WebP 转换。"""
    asset_dir = (source_dir / 'assets').resolve()
    config_path = asset_dir / 'v3/app-icons.json'
    if not config_path.exists():
        return {}
    try:
        config = json.loads(config_path.read_text(encoding='utf-8'), object_pairs_hook=_unique_object)
    except (OSError, ValueError) as exc:
        raise BuildError(f'无法读取 app-icons 配置：{exc}') from exc
    if not isinstance(config, dict) or not config:
        raise BuildError('app-icons 配置必须是非空的图标对象')
    icons = {}
    for key, item in config.items():
        if not isinstance(key, str) or not re.fullmatch(r'[a-z0-9][a-z0-9_-]*', key) or not isinstance(item, dict):
            raise BuildError(f'app-icons 无效图标配置：{key!r}')
        relative, rel, sizes = item.get('source'), item.get('rel'), item.get('sizes')
        if not isinstance(relative, str) or not relative or Path(relative).is_absolute():
            raise BuildError(f'app-icons {key}: 需要素材目录内的 PNG 相对路径')
        path = (asset_dir / relative).resolve()
        if not path.is_relative_to(asset_dir):
            raise BuildError(f'app-icons {key}: 路径超出素材目录')
        if rel not in ('icon', 'apple-touch-icon') or not isinstance(sizes, str) or not re.fullmatch(r'[1-9][0-9]*x[1-9][0-9]*', sizes):
            raise BuildError(f'app-icons {key}: rel 或 sizes 无效')
        try:
            data = path.read_bytes()
        except OSError as exc:
            raise BuildError(f'app-icons {key}: 缺少或无法读取图标：{relative}') from exc
        if path.suffix.lower() != '.png' or len(data) < 33 or data[:8] != PNG_SIGNATURE or data[12:16] != b'IHDR':
            raise BuildError(f'app-icons {key}: 不是有效的 PNG 文件')
        width, height = struct.unpack('>II', data[16:24])
        if width != height or sizes != f'{width}x{height}':
            raise BuildError(f'app-icons {key}: PNG 尺寸必须为正方形且与 sizes 一致')
        icons[key] = {'source': relative, 'path': path, 'rel': rel, 'sizes': sizes,
                      'source_sha256': sha256(data), 'source_bytes': len(data), 'width': width, 'height': height}
    return icons


def prepare_app_icons(icons: dict) -> tuple[dict, dict]:
    records, files = {}, {}
    for key, icon in icons.items():
        data = icon['path'].read_bytes()
        digest = sha256(data)
        if digest != icon['source_sha256']:
            raise BuildError(f'app-icons 素材在构建期间发生变化，请重新构建：{icon["source"]}')
        url = f'assets/{digest}.png'
        records[key] = {name: value for name, value in icon.items() if name != 'path'}
        records[key].update(url=url, sha256=digest, bytes=len(data))
        files[url] = data
    return records, files


def find_encoder(explicit: str | None = None) -> str:
    executable = explicit or shutil.which('cwebp')
    if not executable and Path('/opt/homebrew/bin/cwebp').is_file():
        executable = '/opt/homebrew/bin/cwebp'
    if not executable:
        raise BuildError('找不到 cwebp。请安装 WebP 工具，或用 --cwebp 指定可执行文件。')
    return executable


def subset_font(source_dir: Path, js: str, shell: str) -> bytes:
    try:
        from fontTools import subset
        from fontTools.ttLib import TTFont
    except ImportError as exc:
        raise BuildError('缺少字体构建依赖。请使用 .venv/bin/python，或安装 requirements-build.txt。') from exc
    chars = set(js) | set(shell)
    chars |= set(chr(c) for c in range(0x20, 0x7f))
    chars |= set('，。！？、；：（）「」【】《》…—·“”‘’▶▼◀▲♥')
    font = TTFont(source_dir / 'assets' / 'fusion-pixel.ttf', recalcTimestamp=False)
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = []
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(text=''.join(sorted(chars)))
    sub.subset(font)
    buf = io.BytesIO()
    font.flavor = 'woff2'
    font.save(buf)
    cmap = font.getBestCmap()
    missing = sorted(c for c in chars if ord(c) > 0x7f and ord(c) not in cmap and not c.isspace())
    if missing:
        print('字体里缺这些字：', ''.join(missing), file=sys.stderr)
    font.close()
    return buf.getvalue()


def convert_assets(assets: dict, encoder: str, staging: Path) -> tuple[dict, dict]:
    """相同源路径只转换一次；相同输出内容也只发布一个哈希文件。"""
    converted, files, records = {}, {}, {}
    for key, asset in assets.items():
        source = asset['path']
        if source not in converted:
            target = staging / f'{len(converted)}.webp'
            try:
                subprocess.run([encoder, '-quiet', '-lossless', '-exact', '-metadata', 'all',
                                '-m', '6', str(source), '-o', str(target)],
                               check=True, capture_output=True, text=True)
            except (OSError, subprocess.CalledProcessError) as exc:
                detail = getattr(exc, 'stderr', '') or str(exc)
                raise BuildError(f'无损 WebP 转换失败：{asset["source"]}\n{detail.strip()}') from exc
            data = target.read_bytes()
            if data[:4] != b'RIFF' or data[8:12] != b'WEBP':
                raise BuildError(f'cwebp 没有生成有效 WebP：{asset["source"]}')
            digest = sha256(data)
            url = f'assets/{digest}.webp'
            converted[source] = (url, digest, data)
            files[url] = data
        url, digest, data = converted[source]
        # 转换期间若有人更新源素材，就停止发布；下一次构建会读取完整的新版本。
        if sha256(source.read_bytes()) != asset['source_sha256']:
            raise BuildError(f'素材在构建期间发生变化，请重新构建：{asset["source"]}')
        records[key] = {name: asset[name] for name in ('source', 'source_sha256', 'source_bytes', 'width', 'height')}
        records[key].update(url=url, sha256=digest, bytes=len(data))
    return records, files


def render_html(shell: str, js: str, font: bytes, urls: dict, font_license: str,
                app_icons: dict | None = None) -> str:
    if shell.count('/*BUNDLE*/') != 1:
        raise BuildError('shell.html 必须恰好包含一个 /*BUNDLE*/ 占位符')
    if shell.count('<!-- /SKELETON -->') != 1:
        raise BuildError('shell.html 必须包含唯一的 <!-- /SKELETON -->，用于保留字体许可')
    if '</script' in font_license.lower():
        raise BuildError('字体许可含有 HTML script 结束标记，不能直接嵌入')
    app_icons = app_icons or {}
    if shell.count('<!-- APP_ICONS -->') > 1 or (app_icons and shell.count('<!-- APP_ICONS -->') != 1):
        raise BuildError('启用 app-icons 时 shell.html 必须恰好包含一个 <!-- APP_ICONS --> 占位符')
    links = '\n'.join(f'<link rel="{item["rel"]}" type="image/png" sizes="{item["sizes"]}" '
                      f'href="{item["url"]}" data-app-icon="{key}">' for key, item in app_icons.items())
    shell = shell.replace('<!-- APP_ICONS -->', links)
    bundle = "(() => {\n'use strict';\nconst FONT_DATA = '%s';\nconst ASSET_DATA = %s;\n%s\n})();" % (
        base64.b64encode(font).decode('ascii'), json.dumps(urls, ensure_ascii=True), js)
    notice = '<script type="text/plain" id="font-license">' + font_license + '</script>'
    return shell.replace('/*BUNDLE*/', bundle).replace('<!-- /SKELETON -->', '<!-- /SKELETON -->\n' + notice, 1)


def extract_fragment(html: str) -> str:
    marker = '<!-- /SKELETON -->'
    if html.count(marker) != 1:
        raise BuildError('shell.html 缺少唯一的 <!-- /SKELETON -->，不能生成片段')
    return re.sub(r'</body>\s*</html>\s*$', '', html.split(marker, 1)[1]).strip() + '\n'


def atomic_write(path: Path, data: bytes):
    path.parent.mkdir(parents=True, exist_ok=True)
    handle, temp_name = tempfile.mkstemp(prefix=f'.{path.name}.', suffix='.tmp', dir=path.parent)
    try:
        os.fchmod(handle, 0o644)
        with os.fdopen(handle, 'wb') as stream:
            stream.write(data)
        os.replace(temp_name, path)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)


def build(source_dir: Path = HERE, *, output: Path | None = None, standalone: bool = False,
          fragment: Path | None = None, cwebp: str | None = None) -> dict:
    source_dir = Path(source_dir).resolve()
    project_dir = source_dir.parent
    output = Path(output or (project_dir / 'dist' / '代码物语.html' if standalone else project_dir / 'index.html')).resolve()
    fragment = Path(fragment).resolve() if fragment else None
    if standalone and (project_dir / 'index.html').resolve() in (output, fragment):
        raise BuildError('--standalone 不覆盖默认 index.html，请使用 dist/ 内的文件名')
    if fragment == output:
        raise BuildError('fragment 不能与完整 HTML 使用同一个输出路径')
    for target in (output, fragment):
        if target is not None and target.is_relative_to(source_dir):
            raise BuildError(f'输出不能写入 source/，避免覆盖原图、字体或源码：{target}')
        if target is not None and target.name == 'FONT-LICENSE.txt':
            raise BuildError('HTML 输出不能覆盖 FONT-LICENSE.txt')
    license_path = project_dir / 'FONT-LICENSE.txt'
    try:
        license_bytes = license_path.read_bytes()
        font_license = license_bytes.decode('utf-8').replace('\r\n', '\n').replace('\r', '\n')
        font_license = '\n'.join(line.rstrip() for line in font_license.split('\n'))
    except (OSError, UnicodeError) as exc:
        raise BuildError(f'无法读取完整字体许可：{license_path}: {exc}') from exc
    if not font_license.strip():
        raise BuildError('FONT-LICENSE.txt 不能为空')
    license_targets = {output.parent / 'FONT-LICENSE.txt'}
    if fragment:
        license_targets.add(fragment.parent / 'FONT-LICENSE.txt')
    for target in license_targets:
        if target.exists() and target.read_bytes() != license_bytes:
            raise BuildError(f'输出目录已有不同的 FONT-LICENSE.txt，未覆盖：{target}')
    assets = read_manifest(source_dir)
    app_icons = read_app_icons(source_dir)
    js_files = sorted((source_dir / 'src').glob('*.js'))
    if not js_files:
        raise BuildError('src/ 中没有 JavaScript 文件')
    js = '\n'.join(path.read_text(encoding='utf-8') for path in js_files)
    shell = (source_dir / 'src' / 'shell.html').read_text(encoding='utf-8')
    font = subset_font(source_dir, js, shell)
    encoder = find_encoder(cwebp)
    with tempfile.TemporaryDirectory(prefix='pixel-shore-build-') as temp:
        records, files = convert_assets(assets, encoder, Path(temp))
    icon_records, icon_files = prepare_app_icons(app_icons)
    urls = {key: item['url'] for key, item in records.items()}
    inline_urls = None
    inline_icons = None
    if standalone or fragment:
        embedded = {url: 'data:image/webp;base64,' + base64.b64encode(data).decode('ascii') for url, data in files.items()}
        inline_urls = {key: embedded[item['url']] for key, item in records.items()}
        inline_icons = {key: {**item, 'url': 'data:image/png;base64,' + base64.b64encode(icon_files[item['url']]).decode('ascii')}
                        for key, item in icon_records.items()}
    html = render_html(shell, js, font, inline_urls if standalone else urls, font_license,
                       inline_icons if standalone else icon_records)
    html_bytes = html.encode('utf-8')
    fragment_bytes = extract_fragment(render_html(shell, js, font, inline_urls, font_license, inline_icons)).encode('utf-8') if fragment else None
    unique_sources = {asset['path']: asset for asset in assets.values()}
    report = {
        'format': 1, 'mode': 'standalone' if standalone else 'external',
        'entrypoint': {'file': output.name, 'bytes': len(html_bytes), 'sha256': sha256(html_bytes)},
        'font_bytes': len(font), 'asset_keys': len(records), 'unique_source_files': len(unique_sources),
        'font_license': {'file': 'FONT-LICENSE.txt', 'bytes': len(license_bytes), 'sha256': sha256(license_bytes)},
        'unique_output_files': len(files), 'source_image_bytes': sum(a['source_bytes'] for a in unique_sources.values()),
        'webp_image_bytes': sum(len(data) for data in files.values()), 'assets': records,
        'app_icons': icon_records, 'app_icon_png_bytes': sum(len(data) for data in icon_files.values()),
    }
    if not standalone:
        # 先检查所有目标，再发布资源；转换/缺图失败不会覆盖现有 index。
        output_files = {**files, **icon_files}
        for url, data in output_files.items():
            target = output.parent / url
            if target.exists() and target.read_bytes() != data:
                raise BuildError(f'哈希资源路径已存在但内容不符：{target}')
        for url, data in output_files.items():
            target = output.parent / url
            if not target.exists():
                atomic_write(target, data)
        atomic_write(output.parent / 'assets' / 'build-manifest.json', (json.dumps(report, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
    for target in license_targets:
        if not target.exists():
            atomic_write(target, license_bytes)
    if fragment:
        atomic_write(fragment, fragment_bytes)
    atomic_write(output, html_bytes)
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--standalone', nargs='?', const=str(HERE.parent / 'dist' / '代码物语.html'), metavar='HTML', help='生成独立离线 HTML，不覆盖默认 index')
    parser.add_argument('--fragment', type=Path, metavar='HTML', help='额外生成内嵌资源的可移植 HTML 片段')
    parser.add_argument('--cwebp', help='指定 cwebp 可执行文件')
    args = parser.parse_args(argv)
    try:
        report = build(output=Path(args.standalone) if args.standalone else None,
                       standalone=args.standalone is not None, fragment=args.fragment, cwebp=args.cwebp)
    except (BuildError, OSError) as exc:
        print(f'构建失败：{exc}', file=sys.stderr)
        return 1
    entry = report['entrypoint']
    print(f'{entry["file"]}: {entry["bytes"] / 1024:.1f} KiB；字体 {report["font_bytes"] / 1024:.1f} KiB')
    print(f'素材 {report["asset_keys"]} 个键 / {report["unique_source_files"]} 张原图 / {report["unique_output_files"]} 个 WebP；'
          f'PNG {report["source_image_bytes"] / 1048576:.2f} MiB → 无损 WebP {report["webp_image_bytes"] / 1048576:.2f} MiB')
    if report['app_icons']:
        print(f'静态 PNG 图标 {len(report["app_icons"])} 个；{report["app_icon_png_bytes"] / 1024:.1f} KiB')
    if args.fragment:
        print(f'fragment -> {args.fragment}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
