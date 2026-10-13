#!/usr/bin/env python3
"""把 src/ 里的代码和像素字体打包成一个 index.html。

用法：python3 source/build.py [--fragment 输出路径]
字体只保留游戏里真正用到的字，体积很小。
"""
import base64, glob, io, os, re, sys
from fontTools import subset
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')

def main():
    js_files = sorted(glob.glob(os.path.join(SRC, '*.js')))
    js = '\n'.join(open(f, encoding='utf-8').read() for f in js_files)
    shell = open(os.path.join(SRC, 'shell.html'), encoding='utf-8').read()

    chars = set(js) | set(shell)
    chars |= set(chr(c) for c in range(0x20, 0x7f))
    chars |= set('，。！？、；：（）「」【】《》…—·“”‘’▶▼◀▲♥')
    font = TTFont(os.path.join(HERE, 'assets', 'fusion-pixel.ttf'))
    opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = []; opts.name_IDs = ['*']; opts.notdef_outline = True
    sub = subset.Subsetter(opts); sub.populate(text=''.join(sorted(chars))); sub.subset(font)
    buf = io.BytesIO(); font.flavor = 'woff2'; font.save(buf)
    font_b64 = base64.b64encode(buf.getvalue()).decode()
    cmap = font.getBestCmap()
    missing = sorted(c for c in chars if ord(c) > 0x7f and ord(c) not in cmap and not c.isspace())
    if missing:
        print('字体里缺这些字：', ''.join(missing))

    bundle = "(() => {\n'use strict';\nconst FONT_DATA = '%s';\n%s\n})();" % (font_b64, js)
    html = shell.replace('/*BUNDLE*/', bundle)
    out = os.path.join(HERE, '..', 'index.html')
    open(out, 'w', encoding='utf-8').write(html)
    print('index.html', round(len(html) / 1024), 'KB，字体', round(len(buf.getvalue()) / 1024), 'KB')

    if '--fragment' in sys.argv:
        frag_path = sys.argv[sys.argv.index('--fragment') + 1]
        frag = html.split('<!-- /SKELETON -->', 1)[1].replace('</body>\n</html>', '').strip() + '\n'
        open(frag_path, 'w', encoding='utf-8').write(frag)
        print('fragment ->', frag_path)

if __name__ == '__main__':
    main()
