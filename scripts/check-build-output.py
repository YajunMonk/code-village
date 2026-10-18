#!/usr/bin/env python3
"""只读校验构建产物、资源内容哈希与独立离线 HTML。"""
import argparse
import base64
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import struct


ROOT = Path(__file__).resolve().parent.parent


def asset_urls(html):
    match = re.search(r'const ASSET_DATA = (\{[^\n]*\});', html)
    assert match, '缺少 ASSET_DATA 映射'
    return json.loads(match[1])


def app_icon_links(html):
    class Icons(HTMLParser):
        def __init__(self):
            super().__init__()
            self.links = {}

        def handle_starttag(self, tag, attrs):
            item = dict(attrs)
            if tag == 'link' and 'data-app-icon' in item:
                key = item['data-app-icon']
                assert key not in self.links, f'重复的 head 图标：{key}'
                self.links[key] = item
    parser = Icons()
    parser.feed(html)
    return parser.links


def check_icon_png(data, item, key):
    assert len(data) >= 33 and data[:8] == b'\x89PNG\r\n\x1a\n' and data[12:16] == b'IHDR', f'不是 PNG 图标：{key}'
    width, height = struct.unpack('>II', data[16:24])
    assert (width, height) == (item['width'], item['height']) and width == height, f'图标尺寸不符：{key}'
    assert item['sizes'] == f'{width}x{height}', f'图标 sizes 不符：{key}'
    assert hashlib.sha256(data).hexdigest() == item['sha256'] == item['source_sha256'], f'PNG 图标内容不符：{key}'
    assert len(data) == item['bytes'] == item['source_bytes'], f'PNG 图标体积不符：{key}'


def check_font(html):
    match = re.search(r"const FONT_DATA = '([^']+)';", html)
    assert match and base64.b64decode(match[1], validate=True)[:4] == b'wOF2', '字体不是内嵌 WOFF2'


def check_license(html, license_file, expected=None):
    match = re.search(r'<script type="text/plain" id="font-license">(.*?)</script>', html, re.S)
    assert match, 'HTML 缺少字体许可原文'
    data = Path(license_file).read_bytes()
    normalized = data.decode('utf-8').replace('\r\n', '\n').replace('\r', '\n')
    normalized = '\n'.join(line.rstrip() for line in normalized.split('\n'))
    assert match[1] == normalized, '嵌入字体许可与随包文件文字不一致'
    if expected is not None:
        assert data == expected, '随包字体许可与源文件字节不一致'
    return data


def check_external(entry, source=None):
    entry = Path(entry).resolve()
    raw = entry.read_bytes()
    html = raw.decode('utf-8')
    check_font(html)
    urls = asset_urls(html)
    report = json.loads((entry.parent / 'assets/build-manifest.json').read_text(encoding='utf-8'))
    license_bytes = check_license(html, entry.parent / 'FONT-LICENSE.txt',
                                  (Path(source).parent / 'FONT-LICENSE.txt').read_bytes() if source else None)
    assert hashlib.sha256(license_bytes).hexdigest() == report['font_license']['sha256']
    assert len(license_bytes) == report['font_license']['bytes']
    assert hashlib.sha256(raw).hexdigest() == report['entrypoint']['sha256'], 'HTML 内容与构建记录不一致'
    assert len(raw) == report['entrypoint']['bytes']
    assert set(urls) == set(report['assets']) and len(urls) == report['asset_keys']
    unique = {}
    for key, url in urls.items():
        assert re.fullmatch(r'assets/[a-f0-9]{64}\.webp', url), f'不是同源相对哈希路径：{key}'
        data = (entry.parent / url).read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        item = report['assets'][key]
        assert digest == Path(url).stem == item['sha256'], f'资源哈希不符：{key}'
        assert len(data) == item['bytes'] and url == item['url']
        assert data[:4] == b'RIFF' and data[8:12] == b'WEBP', f'不是 WebP：{key}'
        if source:
            original = (Path(source) / 'assets' / item['source']).read_bytes()
            assert hashlib.sha256(original).hexdigest() == item['source_sha256'], f'原图已改变，需重建：{key}'
            assert len(original) == item['source_bytes']
        unique[url] = len(data)
    assert len(unique) == report['unique_output_files']
    assert sum(unique.values()) == report['webp_image_bytes']
    icons, links, icon_files = report.get('app_icons', {}), app_icon_links(html), {}
    assert set(links) == set(icons), '静态 head 图标与构建记录不完整匹配'
    for key, item in icons.items():
        link, url = links[key], item['url']
        assert re.fullmatch(r'assets/[a-f0-9]{64}\.png', url), f'图标不是同源相对 PNG：{key}'
        assert link.get('href') == url and link.get('type') == 'image/png', f'静态图标链接不符：{key}'
        assert link.get('rel') == item['rel'] and link.get('sizes') == item['sizes'], f'图标用途/尺寸声明不符：{key}'
        data = (entry.parent / url).read_bytes()
        check_icon_png(data, item, key)
        assert Path(url).stem == item['sha256'], f'PNG 图标文件名与哈希不符：{key}'
        if source:
            original = (Path(source) / 'assets' / item['source']).read_bytes()
            assert original == data, f'图标源文件已改变，需重建：{key}'
        icon_files[url] = len(data)
    assert sum(icon_files.values()) == report.get('app_icon_png_bytes', 0), '图标总字节数不符'
    if source:
        expected = json.loads((Path(source) / 'assets/manifest.json').read_text(encoding='utf-8'))
        assert set(expected) == set(urls), '源 manifest 与入口资源键不完整匹配'
        for key, relative in expected.items():
            assert report['assets'][key]['source'] == relative
        config_path = Path(source) / 'assets/v3/app-icons.json'
        expected_icons = json.loads(config_path.read_text(encoding='utf-8')) if config_path.exists() else {}
        assert set(expected_icons) == set(icons), '源 app-icons 配置与静态图标不匹配'
        for key, config in expected_icons.items():
            assert all(icons[key][field] == config[field] for field in ('source', 'rel', 'sizes')), f'图标配置不符：{key}'
    return report


def check_standalone(entry, expected=None, expected_license=None, expected_html=None, expected_icons=None):
    html = Path(entry).read_bytes().decode('utf-8')
    check_font(html)
    check_license(html, Path(entry).parent / 'FONT-LICENSE.txt', expected_license)
    urls = asset_urls(html)
    if expected is not None:
        assert set(urls) == set(expected), '离线资源不完整'
    for key, url in urls.items():
        assert url.startswith('data:image/webp;base64,'), f'离线文件引用了外部图片：{key}'
        data = base64.b64decode(url.split(',', 1)[1], validate=True)
        assert data[:4] == b'RIFF' and data[8:12] == b'WEBP'
        if expected is not None:
            assert hashlib.sha256(data).hexdigest() == expected[key]['sha256'], f'离线与网页资源不一致：{key}'
    links = app_icon_links(html)
    if expected_icons is not None:
        assert set(links) == set(expected_icons), '离线 PNG 图标不完整'
    for key, link in links.items():
        url = link.get('href', '')
        assert url.startswith('data:image/png;base64,'), f'离线图标引用了外部图片：{key}'
        data = base64.b64decode(url.split(',', 1)[1], validate=True)
        assert len(data) >= 33 and data[:8] == b'\x89PNG\r\n\x1a\n' and data[12:16] == b'IHDR', f'离线图标不是 PNG：{key}'
        width, height = struct.unpack('>II', data[16:24])
        assert width > 0 and width == height and link.get('sizes') == f'{width}x{height}', f'离线图标尺寸不符：{key}'
        assert link.get('type') == 'image/png' and link.get('rel') in ('icon', 'apple-touch-icon'), f'离线图标用途不符：{key}'
        if expected_icons is not None:
            item = expected_icons[key]
            check_icon_png(data, item, key)
            assert link['rel'] == item['rel'] and link['sizes'] == item['sizes'], f'离线与网页图标用途不一致：{key}'
    assert not re.search(r'(?:src|href)=["\']https?://', html), '离线文件有远程 HTML 依赖'
    if expected_html is not None:
        def normalize(content):
            content = re.sub(r'const ASSET_DATA = (\{[^\n]*\});', 'const ASSET_DATA = {};', content)
            return re.sub(r'<link\b[^>]*\bdata-app-icon="[^"]+"[^>]*>',
                          lambda match: re.sub(r'\bhref="[^"]*"', 'href="APP_ICON"', match[0]), content)
        assert normalize(html) == normalize(expected_html), '离线与网页版本的代码、样式或字体不一致'
    return len(urls)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--entry', type=Path, default=ROOT / 'index.html')
    parser.add_argument('--source', type=Path, default=ROOT / 'source')
    parser.add_argument('--standalone', type=Path)
    args = parser.parse_args()
    report = check_external(args.entry, args.source)
    if args.standalone:
        check_standalone(args.standalone, report['assets'], (args.source.parent / 'FONT-LICENSE.txt').read_bytes(),
                         args.entry.read_bytes().decode('utf-8'), report.get('app_icons', {}))
    print(f'PASS: {report["asset_keys"]} keys, {report["unique_output_files"]} hashed WebP files, '
          f'{len(report.get("app_icons", {}))} static PNG icons, {report["entrypoint"]["bytes"]} HTML bytes, '
          'source/output SHA-256, embedded WOFF2 and full font license'
          + (', standalone parity.' if args.standalone else '.'))


if __name__ == '__main__':
    main()
