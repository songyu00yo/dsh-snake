# dsh-snake

一条吃白饭的蓝色大肥鱼，饭碗旁边多摆了一个棋盘。DeepSeek Harness 桌面版输入框上方挂着它，等 AI 吐字的空档，鼠标一伸过去就能开吃。

![插件运行截图](assets/preview.png)

截图是独立页面里的实际插件渲染，只截棋盘，不包含聊天界面。

头像入口一直在，不会自己跳出来抢镜。鼠标悬停或键盘聚焦，旁边冒一句「开饭啦」；点头像，棋盘向上展开；再点一下棋盘，游戏才开始。AI 工作状态不会让它自动开合，你叫它才来，不叫它就趴着。

## 版本

v0.2.1 还在等作者本人验收，没有正式发布。兼容目标是 DeepSeek Harness 桌面版 0.2.0-rc.2。

## 怎么吃

棋盘拿到焦点以后方向键才生效，WASD 也行。空格暂停或继续，Esc 退出。

方向键不能直接掉头，但撞到自己这条规矩还是算数的。每 160 毫秒走一格，最多缓存两个有效转向，每步消费一个。状态按会话留在内存里，退出应用就清空，不会偷偷记在你账上。

## 安装

源码安装先退出应用：

```bash
git clone https://github.com/songyu00yo/dsh-snake.git
cd dsh-snake
npm ci
npm run build
npm run install:desktop
```

然后重新打开。Node.js 20 或更新版本，构建和安装卸载都要用。

仓库自带 dist，源码安装按上面的顺序走一遍最稳。

已发布的 ZIP 在 https://github.com/songyu00yo/dsh-snake/releases 。同样是先退出应用，解压后在 dsh-snake 目录里直接：

```bash
npm run install:desktop
```

不需要下载开发依赖，也不用改配置文件。旧版本的安装包以它自己的版本说明为准。

## 更新

源码更新先退出应用：

```bash
git pull --ff-only
npm ci
npm run build
npm run install:desktop
```

然后重新打开。用已发布 ZIP 的话，去 releases 页面拿新版本，按上面的解压方式走一遍。

每次安装和卸载之前，脚本都会把配置和旧插件备份一份，放在 `~/.dsh/backups/dsh-snake/` 下面。别删这些备份。

如果要恢复整个配置，先看看那之后有没有别的插件动过同一份配置。

## 卸载

先退出应用：

```bash
npm run uninstall:desktop
```

然后重新打开。

## 素材许可

插件源码用 MIT，见 [LICENSE](LICENSE)。

DeepSeek 娘头像来自 YunYueSama 的 [codex-deepseek-pet](https://github.com/YunYueSama/codex-deepseek-pet)，遵循「大肥鱼项目署名许可 1.0」，完整文本见 [assets/LICENSE-avatar.txt](assets/LICENSE-avatar.txt)。署名要求：作者 YunYueSama，仓库 https://github.com/YunYueSama/codex-deepseek-pet 。

米饭是 Unicode 字符 🍚，用系统的 emoji 字体画，不带图片和字体文件，各系统长得会有点不一样。

液态玻璃的圆角距离场和 SVG 位移图技术来自 Shu Ding 的 [shuding/liquid-glass](https://github.com/shuding/liquid-glass)，MIT，完整文本见 [assets/LICENSE-liquid-glass.txt](assets/LICENSE-liquid-glass.txt)。

素材的详细出处写在 [ASSETS.md](ASSETS.md)。