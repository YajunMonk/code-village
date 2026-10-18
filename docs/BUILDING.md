# 构建、验证与部署

## 运行环境

根目录的 `index.html` 与 `assets/` 已经可以运行。仅游玩时无需构建：

```sh
python3 scripts/serve.py --open
```

默认监听 `127.0.0.1:4173`，只对本机开放。`--port 4186` 可换一个独立测试地址；端口改变后存档也会隔离。

## 构建环境

- Python 3.10 或更新版本。
- `requirements-build.txt` 中固定的 FontTools 和 Brotli。
- libwebp 提供的 `cwebp` 可执行文件。
- Node.js 20 或更新版本：仅用于运行检查脚本，游戏本身无需 Node.js。

macOS 可通过 `brew install webp` 安装编码器；Debian / Ubuntu 可安装 `webp` 包。Windows 可使用 libwebp 官方预编译工具，将 `cwebp.exe` 加入 PATH，或在构建命令后指定 `--cwebp /path/to/cwebp`。

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-build.txt
.venv/bin/python source/build.py
```

Windows 使用 `.venv\Scripts\python.exe` 代替 `.venv/bin/python`。

构建合并 `source/src/`，裁剪内嵌字体，将正式 PNG 源图无损编码为 WebP，并生成内容哈希文件名。`assets/build-manifest.json` 记录入口、原图、发行资源、图标的尺寸与 SHA-256。缺图、哈希不符或构建失败不会静默生成缺损入口。

资源配置分为 `source/assets/manifest.json`（剧情、美术、头像）和 `source/assets/v3/app-icons.json`（浏览器与手机图标）。当前为 18 个资源键、17 张独立 WebP、4 张 PNG 图标。

## 检查

```sh
python3 scripts/check-build-output.py
node scripts/check-story-gameplay.mjs
node scripts/check-interface.mjs
node scripts/check-interiors.cjs
node scripts/check-residents.mjs
node scripts/check-opening-resume.cjs
node scripts/check-title-transition.cjs
node scripts/check-presentation.cjs
node scripts/check-text-rendering.cjs
node scripts/check-save-transfer.cjs
node scripts/check-save-ui.cjs
```

构建器本身的失败保护测试：

```sh
.venv/bin/python scripts/check-build.py
```

检查覆盖剧情与练习、窗口布局、居民、室内、续玩、像素呈现和存档失败恢复。录制 Canvas 与隔离存储用于检查程序契约，真实手机的显示、手感及网络体验还需实际验收。

### 浏览器调试

在独立测试地址打开 `http://127.0.0.1:4186/?qa=1`，可通过 `window.__game` 查看运行状态。`scripts/browser-playthrough.js` 可以加速主线流程。调试工具会操作测试进度，使用与日常游玩不同的端口。普通游戏地址不暴露该接口。

截图位于 `docs/images/`，从本版本的真实页面采集；手机截图使用浏览器触屏和设备尺寸模拟。

## 离线版与发行包

```sh
.venv/bin/python source/build.py --standalone
.venv/bin/python scripts/check-build-output.py --standalone dist/代码物语.html
.venv/bin/python scripts/package-release.py
```

- `dist/代码物语.html`：内嵌代码、字体、图片和图标的单文件版。
- `dist/代码物语-1.2-网页发行包.zip`：网页入口、引用资源、字体许可与操作说明。

`dist/` 和本地验证产物不提交到源码历史，发行文件附在 GitHub Releases。

## 静态部署

把网页包解压后的全部内容上传到静态托管服务，保持 `index.html`、`assets/` 和 `FONT-LICENSE.txt` 的相对位置。资源使用相对路径，可部署到根目录或 `/game/`，无需后端和运行时密钥。

本仓库的 GitHub Pages 使用 `main` 分支根目录，`.nojekyll` 保留。官网入口是 `https://buxiangai.com/game/`，托管发布独立于 GitHub 提交；更新仓库不会自动改动官网湖畔页面。

部署后验证首次加载、继续游戏、横竖屏、存档导出导入和资源请求。新网址的存档需通过导出与导入迁移，不能假定与旧网址共享。
