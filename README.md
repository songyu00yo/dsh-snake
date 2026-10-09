# dsh-snake

给吃白饭的大肥鱼开饭。

嗯，就是那个——你叫她大肥鱼，她要鼓腮抗议一下的那种。这次不吵架了，我给你在输入框上面摆了一张点阵棋盘：一条小蛇，几粒白米饭。她自己上桌吃，你负责按方向键。工作的时候她不来烦你，什么时候想玩，点一下头像就行。

当前版本 `v0.2.1`，**在等作者本人验收**。所以我先把话说在前头：**尚未完成验收，也没正式对外发**。你拿到的要么是仓库源码自己构建的预览版，要么是 [Releases](https://github.com/songyu00yo/dsh-snake/releases) 里已经挂出来的旧安装包，旧包以它自己那份文档为准。想尝鲜就用源码装，出问题敲我 issue。

![贪吃蛇截图](assets/preview.png)

*这张图是独立页面的实际插件渲染，用的是模拟会话，不是真在跑 AI 的窗口。*

## 这是啥

- 位置在 **DeepSeek Harness 桌面版**的会话输入框上方，属于输入区 dock 那层。
- 她 **不会在你干活的时候主动弹出来**。AI 正在跑、正在吐字，棋盘不会自己蹦出来打扰你，这点是我特意压住的。
- 入口一开始就是 **DS 娘头像加一碗 🍚**。你把鼠标挪上去、或者键盘聚焦上去，旁边会浮出“开饭啦”；**点这个头像**，棋盘才从输入框边上向上展开——不是掉下来，也不是点完再出现第二个入口。
- 棋盘展开后，再点一下棋盘开始；棋盘拿到键盘焦点以后，直接按方向键也能开始。
- 盘子是点阵风，米饭用 emoji 🍚，蛇头就是大肥鱼本鱼，走的是剪裁过的头像。棋盘带一点液态玻璃的折射感（参考了 Shu Ding 的 SVG 位移那套，MIT，细节见下方素材许可）。
- 每局独立记分，切会话各自一张棋盘。AI 开始干活、收工，都**不会改变棋盘的展开状态**，也不会冒出一句“本轮结束”之类的提示。
- 失焦、切标签页、点输入框、切会话的时候会自动暂停，不偷偷跑分。

## 兼容

- **目标环境**：DeepSeek Harness 桌面版 `0.2.0-rc.2`。
- 其他版本我没试过，rc 之后如果 dock 槽位或会话 DOM 结构改了，可能整片落不下来。届时开 issue，别自己硬修。
- 需要 **Node.js ≥ 20**。构建用它，安装 / 卸载脚本也用它。

## 从源码安装

**先退出 DeepSeek Harness**，再在终端里敲下面这几步。

```
git clone https://github.com/songyu00yo/dsh-snake.git
cd dsh-snake
npm ci
npm run build
npm run install:desktop
```

- `npm ci` 按 `package-lock.json` 精确装，别用 `npm install`，除非你在改依赖。
- `npm run build` 会把 `engine.ts` / `glass.ts` / `client.ts` 一起编成 `dist/client.js`，同时把 `assets/deepseek-girl.png` 内联成头像 data URL。安装前请重新构建；安装脚本会检查 `dist/client.js` 是否存在。
- `npm run install:desktop` 会把插件复制到 `~/.dsh/plugins/desktop/dsh-snake`，给 profile 建软链，并在 `~/.dsh/profiles/desktop/package.json` 里把 `dsh-snake` 加进 `dependencies` 和 `dsh.profile.bundles`。**这一步之前会先把现有配置和旧插件整包备份**，备份路径会打印在输出里。
- 想换目录的话，先设 `DSH_HOME`，脚本会读这个变量。
- 装完 **重新打开 DeepSeek Harness**，插件在启动时加载。

## 从 Releases 安装

仓库里 Release 页挂了已经打好的安装包：

- https://github.com/songyu00yo/dsh-snake/releases

先退出 DeepSeek Harness，解压之后，**在解压得到的 `dsh-snake` 目录里直接跑**：

```
npm run install:desktop
```

不用把它复制到源码仓库里，不用手改 `package.json`，也不用另外下开发依赖。脚本自己会处理目标目录的事。旧安装包对应的版本行为，以它那份文档为准。**`v0.2.1` 目前还没正式发，要尝鲜只能走上面的源码安装。**

## 怎么玩

1. 打开一个会话，在输入框上方找 **DS 娘头像**——就是那块小小的圆头像，旁边压着一粒 🍚。
2. **鼠标悬停或键盘聚焦在她身上**，旁边会浮出“开饭啦”。**点她**，棋盘从输入框边上向上展开。
3. 点一下棋盘，或者按方向键，游戏开始。5 节身子，边穿墙边吃米饭。
4. 操作：

   - 方向键或 **WASD** 转向。每 160 毫秒走一格，输入缓冲区里最多存两个有效转向，每走一步消费一个；**直接反向会被拒**。所以指望连续掉头不行。
   - **空格** 暂停 / 继续。
   - **Esc** 暂停并放下焦点。
   - 棋盘上**拖顶部那条 18 px 的把手**可以挪位置，会按输入框位置自动夹住，不会飞出会话区。
   - 右上角 **−** 收起来，再点头像还能开。
5. 吃到自己就结束，满盘吃完算通关。结束或通关之后，按方向键会直接重开一局，方向就是那一键。

几条不想让你误会的：

- **AI 在忙着的时候，不会自动展开棋盘**。想看自己点。
- **AI 开始或结束干活，都不动棋盘的展开状态**，也没有本轮结束的提示文字。
- 点输入框、切会话、窗口失焦或隐藏，游戏会自己暂停；每个会话各自的进度和位置只存在内存里，退出应用就清空。
- 动效在系统开了“减少动态”时会关掉，不会跟你较劲。

## 更新

**先退出应用**，再执行：

```
git pull --ff-only
npm ci
npm run build
npm run install:desktop
```

`install:desktop` 会先整包备份再覆盖，之前的版本在 `~/.dsh/backups/dsh-snake/<时间戳>/` 里，出事了可以去翻。**装完重新打开应用。**

Releases 装的：下载新包、解压、在解压出的目录里跑 `npm run install:desktop`，再重新打开。

## 卸载

**先退出应用**，然后：

```
npm run uninstall:desktop
```

脚本会删掉 `~/.dsh/plugins/desktop/dsh-snake` 和 profile 里的软链，把 `dsh-snake` 从 `dependencies` 和 `dsh.profile.bundles` 里去掉。**卸载前同样整包备份配置和旧插件。**

几句提醒：

- 备份是**每次安装或卸载前做一次**，在脚本开头，不是拆成很多步。备份都在 `~/.dsh/backups/dsh-snake/<时间戳>/` 里。
- **不要手动装、手动卸、手动删备份**，统一走 `npm run install:desktop` / `npm run uninstall:desktop`。脚本会检查目录占用，并备份配置和旧插件，手改容易把 profile 弄成半截状态。
- 如果你确实要拿某份备份去顶替当前整份配置，**先看清楚那次备份之后你又装过、删过哪些插件**，别把别人的记录一起吃了。
- **重启才有反应。**

## 已知的坑

- 目标是桌面版 `0.2.0-rc.2`，其它版本、其它平台没验过。
- 液态玻璃折射只在支持 `backdrop-filter: url(#...)` 的 Chromium 里出效果，不支持的会退化成普通毛玻璃，不影响玩。
- 米饭是系统 emoji 字体画的，Windows / macOS / Linux 长得会有点不一样，这是预期内的。
- 会话里如果拿不到 `[data-conversation-content]` 或 `[data-composer-card]`，棋盘不渲染。这多半是宿主结构变了，来 issue 说一声。
- **`v0.2.1` 还在等作者本人验收，没对外发。** 眼下当预览用，别指望稳如老狗。

## 素材与许可

这个项目里混了好几种来源，得拆开说。

### 代码

MIT，见 [LICENSE](LICENSE)。Copyright (c) 2026 songyu00yo。

### 大肥鱼头像

- 作者：**YunYueSama**
- 仓库：https://github.com/YunYueSama/codex-deepseek-pet
- 来源提交：`7661c8b304c5400701f91da01b1a643a207331de`
- 原文件：`assets/whale/portrait.png`，本地未修改，只在 Canvas 绘制时裁头部。
- 许可：上游“大肥鱼项目署名许可 1.0”，完整文本在 [assets/LICENSE-avatar.txt](assets/LICENSE-avatar.txt)。

你如果要转发、二次分发、或者拿它做衍生，**必须保留**这两行署名（允许放 README / 致谢 / 关于页，不需要打水印）：

> 作者：YunYueSama
> 仓库：https://github.com/YunYueSama/codex-deepseek-pet

别只写“来源网络”，也别只写作者省仓库地址，这是授权里明确点名的。另外别暗示原作者或 DeepSeek 官方认可你——想都不要想。

### 液态玻璃算法

- 作者：**Shu Ding**
- 仓库：[shuding/liquid-glass](https://github.com/shuding/liquid-glass)
- 来源提交：`a2d2e847f793430e3409a52927af815a23f4d372`
- 本地实现：`glass.ts`，移植圆角距离场和 SVG 位移图那套，折射只在外沿 12 px，最大位移 6 px，只在尺寸变化时重算位移图。
- 许可：MIT，完整文本在 [assets/LICENSE-liquid-glass.txt](assets/LICENSE-liquid-glass.txt)。

### 米饭

Unicode 字符 🍚，走系统 emoji 字体，**不附带任何米饭图片或字体文件**。

### 参考

上游是社区二创“大肥鱼”项目本身，源头人设和素材约定在 YunYueSama 那边，本插件只是拿她的头像做蛇头，别的照抄不了。具体在 [ASSETS.md](ASSETS.md) 里也列了一遍。这是社区插件，与 DeepSeek 官方无隶属关系。

## 反馈

- 仓库：https://github.com/songyu00yo/dsh-snake
- 出问题带上版本号（`v0.2.1`）、桌面版版本（`0.2.0-rc.2`）、操作系统，以及有没有构建成功。截图最好有，看得清楚。

就这样，去喂鱼吧。