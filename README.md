# DSH Snake

## 给吃白饭的大肥鱼开饭

DeepSeek 还在想，我已经想摸鱼了。

于是我给 DeepSeek Harness 做了个贪吃蛇。主角是吃白饭的大肥鱼，食物当然是一碗 🍚。她沿着点阵吃饭，吃一碗长一节。等 AI 干活的这点时间，总算有鱼可摸了。

入口放在聊天输入框上方。点 DS 娘头像，展开玻璃棋盘；再点棋盘，开始喂饭。想继续聊天就点回输入框，游戏会暂停。棋盘靠右悬浮，顶边可以拖动，右上角可以收起。

![开饭入口](assets/preview-entry.png)

![游戏效果](assets/preview.png)

截图来自独立验收页，使用模拟会话展示插件的实际渲染。[深色效果](assets/preview-dark.png)和[窄窗口效果](assets/preview-narrow.png)也已保存。

棋盘只在点击头像后展开。AI 开始或结束工作，都不会替你开饭或收碗。

本文描述 `v0.2.1`，该版本等待用户验收，尚未正式发布。要体验本页介绍的新版，请从源码安装。

## 安装：先把饭碗摆好

需要 Node.js 20 或更新版本，以及已初始化的 DeepSeek Harness 桌面配置。从源码安装还需要 Git。兼容目标为 DeepSeek Harness 桌面版 `0.2.0-rc.2`；`v0.2.1` 的最终效果由用户验收。

已发布版本可以从 [Releases](https://github.com/songyu00yo/dsh-snake/releases) 下载 ZIP 安装包。解压后先退出 DeepSeek Harness，在 `dsh-snake` 目录打开终端，执行：

```sh
npm run install:desktop
```

安装包已包含构建文件，这条命令不需要安装开发依赖。请以所下载版本的说明为准。

从源码安装当前版本，先退出 DeepSeek Harness，再执行：

```sh
git clone https://github.com/songyu00yo/dsh-snake.git
cd dsh-snake
npm ci
npm run build
npm run check
npm test
npm run install:desktop
```

重新打开应用，输入框上方会出现 DS 娘头像和一碗饭。鼠标停在入口上，或用键盘聚焦入口，会提示“开饭啦”。空白会话也能点击头像展开。

安装脚本把插件复制到 `~/.dsh/plugins/desktop/dsh-snake`，并注册到桌面配置。修改前备份配置和旧插件，备份位置会打印在终端。其他插件、聊天记录和应用本体保持原样。自定义数据目录时，可在命令前设置 `DSH_HOME`。

## 操作：负责带路，白饭管够

点击棋盘开始或继续。键盘控制只在棋盘获得焦点后生效，聊天输入框里的 WASD 还是普通字母。

| 按键 | 操作 |
| --- | --- |
| ↑ / W | 向上 |
| ↓ / S | 向下 |
| ← / A | 向左 |
| → / D | 向右 |
| 空格 | 暂停或继续 |
| Esc | 暂停并退出棋盘焦点 |

吃到一碗饭，蛇身就长一节。穿过边界会直接从对面出现，撞到自己才结束本局。白饭吃多了，记得给自己留条路。死亡后按方向键或 WASD，就能朝该方向重开；快速连按时最多缓存两个有效转向。

拖动棋盘顶边可以调整位置，拖动时暂停。点右上角收起，头像入口会重新出现，下次点头像再开饭。

点击输入框即可正常打字，游戏会暂停。切换会话、窗口失去焦点或隐藏时也会暂停，返回后点击棋盘继续。各会话分别保留游戏进度和棋盘位置，退出应用后清空。摸了多久的鱼，插件不记账。

## 更新与卸载：添饭或收碗

更新前退出应用，在仓库目录执行：

```sh
git pull --ff-only
npm ci
npm run build
npm run check
npm test
npm run install:desktop
```

卸载时退出应用，执行：

```sh
npm run uninstall:desktop
```

重新打开应用。卸载只删除本插件及其注册项。需要恢复时，从脚本打印的备份目录取回旧插件和配置。恢复整个配置前，请核对之后是否安装过其他插件。

## 开发

棋盘默认 272 × 208 px，分成 17 × 13 格，每格 16 px，窄窗口按比例缩小。青绿色圆点蛇身每 160 毫秒移动一格，蛇头使用 DS 娘头像。米饭由系统 emoji 字体绘制，各系统外观可能略有不同。

液态玻璃只折射背景边缘，中央和游戏前景保持清晰。展开用 420 毫秒向上显露，末段轻微回弹；收起用 240 毫秒下落、收束并淡出。点阵不缩放，头像和饭碗共用 56 × 44 px 的点击区域。系统开启“减少动态效果”时直接切换。

`engine.ts` 管理游戏规则，`glass.ts` 生成边缘折射图，`client.ts` 管理界面。构建会把 TypeScript 编译为 `dist/client.js`，并嵌入头像。素材离线可用。TypeScript 只用于开发和构建，插件运行时沿用宿主提供的 React，不新增运行依赖。

```sh
npm ci
npm run build
npm run check
npm test
```

修改后重新安装并重启应用。贡献要求见 [CONTRIBUTING.md](CONTRIBUTING.md)，代理工作规范见 [AGENTS.md](AGENTS.md)。

## 许可与素材

代码采用 [MIT](LICENSE)。头像作者为 **YunYueSama**，来源：[codex-deepseek-pet](https://github.com/YunYueSama/codex-deepseek-pet)。显示时裁切头部，原图未修改，适用上游署名许可。

液态玻璃算法改编自 Shu Ding 的 [liquid-glass](https://github.com/shuding/liquid-glass)，采用 MIT 许可。素材版本与许可见 [ASSETS.md](ASSETS.md)。这是社区插件，与 DeepSeek 官方无隶属关系。
