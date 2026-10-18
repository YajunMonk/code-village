# 制作与素材说明

《代码物语 · 星灯之约》由王不响 / [YajunMonk](https://github.com/YajunMonk) 制作，基于本仓库最初的「代码村大冒险」demo 持续开发。原始 Git 历史保留。

## 画面、声音与文本

- 标题、剧情镜头、室内原画与人物头像：本项目通过 AI 辅助生成并整合。正式源 PNG 保存在 `source/assets/`，运行图以无损 WebP 发布。
- 行走角色、环境、道具、灯光和剧情表情：由游戏代码绘制与组合。
- 音乐和音效：通过 Web Audio 合成。
- 居民对白：围绕小镇生活与产品开发重新创作。部分思考方式参考历史人物，游戏角色使用原创姓名和外观，台词不作为名人原话引用。
- README 截图：从本版本的真实游戏页面采集，手机画面采用浏览器设备模拟。

`source/assets/manifest.json` 指定正式源图；`assets/build-manifest.json` 记录源图及发行图的 SHA-256，可用于核对素材。

## 字体

使用 TakWolf 的 [Fusion Pixel Font](https://github.com/TakWolf/fusion-pixel-font)，遵循 SIL Open Font License。完整许可见 [FONT-LICENSE.txt](../FONT-LICENSE.txt)，构建与发行时一并保留。字体许可独立于游戏代码和美术。

## 使用授权

仓库公开供查看和交流，当前未指定代码与美术的统一开源许可证。需要复制、分发或商业使用时，请先联系作者确认授权。第三方字体按其独立许可使用。
