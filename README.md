# DSH Snake

给 DeepSeek Harness 做了个贪吃蛇，主角是吃白饭的大肥鱼。等 AI 干活的时候，顺手给她喂两碗。

饭管够，别吃到自己就行。

![贪吃蛇](assets/preview.png)

截图来自独立页面，只展示插件实际渲染的棋盘。

## 安装

需要 Node.js 20 或更新版本，兼容 DeepSeek Harness 桌面版 `0.2.0-rc.2`。

安装、更新或卸载前退出应用，完成后重新打开。

从源码安装：

```sh
git clone https://github.com/songyu00yo/dsh-snake.git
cd dsh-snake
npm ci
npm run build
npm run install:desktop
```

也可以下载 [ZIP 安装包](https://github.com/songyu00yo/dsh-snake/releases/latest)。解压后在 `dsh-snake` 目录运行 `npm run install:desktop`，不用安装开发依赖。

## 操作

点 DS 娘头像展开，再点棋盘开始。AI 工作时不会自动展开。

方向键或 WASD 转向，空格暂停或继续，Esc 释放焦点。能穿墙，撞到自己就结束，按方向键重开。

拖顶边移动，点右上角收起。点回聊天输入框，游戏会暂停。

## 更新与卸载

源码更新：

```sh
git pull --ff-only
npm ci
npm run build
npm run install:desktop
```

安装包更新：下载新 ZIP，解压后运行 `npm run install:desktop`。

卸载用 `npm run uninstall:desktop`。脚本修改前会备份配置和旧插件，备份位置会打印出来。

## 许可

代码采用 [MIT](LICENSE)。头像来自 YunYueSama 的 [codex-deepseek-pet](https://github.com/YunYueSama/codex-deepseek-pet)，适用上游署名许可。

液态玻璃来自 Shu Ding 的 [liquid-glass](https://github.com/shuding/liquid-glass)，采用 MIT 许可。米饭使用系统 emoji。详细来源和许可见 [ASSETS.md](ASSETS.md)。
