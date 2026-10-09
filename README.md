# DSH Snake

## 在 DeepSeek 工作时吃一碗饭

DSH Snake 是 DeepSeek Harness 的贪吃蛇插件。游戏嵌在输入框上方，用淡点阵、青绿色圆点蛇身和 DeepSeek 娘头像组成棋盘。食物是 🍚。

![游戏效果](assets/preview.png)

AI 开始工作时，棋盘自动展开，等待你点击。没有开始玩，本轮工作结束后就收起。开始玩后，棋盘会保留，只提示“本轮工作已结束”。

## 安装

需要 Git、Node.js 20 或更新版本，以及已初始化的 DeepSeek Harness 桌面配置。当前验证版本为 `0.2.0-rc.2`。

先退出 DeepSeek Harness，再在终端执行：

```sh
git clone https://github.com/songyu00yo/dsh-snake.git
cd dsh-snake
npm run build
npm test
npm run install:desktop
```

重新打开应用。已有会话的输入框上方会出现“摸鱼”入口。空白会话也可手动展开游戏。

安装脚本把插件复制到 `~/.dsh/plugins/desktop/dsh-snake`，并注册到桌面配置。修改前备份配置和旧插件，备份位置会打印在终端。其他插件、聊天记录和应用本体保持原样。自定义数据目录时，可在命令前设置 `DSH_HOME`。

## 操作

点击棋盘开始或继续。棋盘获得焦点后，以下按键生效：

| 按键 | 操作 |
| --- | --- |
| ↑ / W | 向上 |
| ↓ / S | 向下 |
| ← / A | 向左 |
| → / D | 向右 |
| 空格 | 暂停或继续 |
| Esc | 暂停并退出棋盘焦点 |

点击输入框即可正常打字，游戏会暂停。切换会话、窗口失去焦点或隐藏时也会暂停，返回后点击继续。

吃一碗饭增长一节。穿过边界会从对面继续，撞到自己结束本局，点击重开。“收起”隐藏棋盘，“摸鱼”重新展开。各会话独立保留进度，退出应用后清空。

## 更新与卸载

更新前退出应用，在仓库目录执行：

```sh
git pull --ff-only
npm run build
npm test
npm run install:desktop
```

卸载时退出应用，执行：

```sh
npm run uninstall:desktop
```

重新打开应用。卸载只删除本插件及其注册项。需要恢复时，从脚本打印的备份目录取回旧插件和配置。恢复整个配置前，请核对之后是否安装过其他插件。

## 开发

没有新增运行依赖。`engine.js` 管理规则，`client.js` 管理界面。构建脚本把规则和头像嵌入客户端文件，运行时不请求外部素材。

```sh
npm run build
npm run check
npm test
```

修改后重新安装并重启应用。贡献要求见 [CONTRIBUTING.md](CONTRIBUTING.md)，代理工作规范见 [AGENTS.md](AGENTS.md)。

## 许可与素材

代码采用 [MIT](LICENSE)。头像作者为 **YunYueSama**，来源：[codex-deepseek-pet](https://github.com/YunYueSama/codex-deepseek-pet)。显示时裁切头部，原图未修改，适用上游署名许可。

素材版本与许可见 [ASSETS.md](ASSETS.md)。这是社区插件，与 DeepSeek 官方无隶属关系。
