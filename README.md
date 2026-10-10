# dsh-snake

给吃白饭的大肥鱼开饭。


![贪吃蛇棋盘，就长这样](assets/preview.png)

## 玩

点棋盘开始。方向键或 WASD 转向，空格暂停，Esc 退出。棋盘按住能拖走，右上角减号收起来。

吃到米饭长一节，撞到自己重来。

输入框上方那个小头像就是入口，鼠标放上去她会说开饭啦。

## 装

这是首个跨平台 Alpha 版本（`v1.0.0-alpha.1`）。真实的 Windows 与 Web 界面仍需用户实测，自动测试通过不等于全端已经实测过。请从这个版本页下载：[v1.0.0-alpha.1](https://github.com/songyu00yo/dsh-snake/releases/tag/v1.0.0-alpha.1)。

稳定版 `0.2.2` 不包含 Web 版，无法安装 Web。

需要 Node.js 20+，并已安装且初始化对应 Harness。安装、更新、卸载前请退出桌面版或停止 Web 服务。

桌面版一键安装（macOS / Linux）：

```sh
curl -fsSL https://raw.githubusercontent.com/songyu00yo/dsh-snake/v1.0.0-alpha.1/scripts/install.sh | sh -s -- desktop
```

桌面版一键安装（Windows PowerShell）：

```powershell
& ([scriptblock]::Create((Invoke-RestMethod -Uri 'https://raw.githubusercontent.com/songyu00yo/dsh-snake/v1.0.0-alpha.1/scripts/install.ps1'))) -Profile desktop
```

把命令末尾的 `desktop` 换成 `web`，即安装 Web 版。Web 版是能管理服务端的本地或自托管 Harness，插件装到服务端，不是浏览器扩展。Web 首次安装前先运行一次 `dsh web` 初始化，然后停止服务。

桌面版首次安装前先启动桌面版一次再退出。装完重新打开桌面版；Web 版装完重启 Web 服务并刷新浏览器。

也可以下载 ZIP 解压，运行 `npm run install:desktop` 或 `npm run install:web`，无需开发依赖。

从源码安装：

```sh
git clone https://github.com/songyu00yo/dsh-snake.git
cd dsh-snake
npm ci
npm run build
npm run install:desktop
```

Web 版把最后一行换成 `npm run install:web`。

卸载：在保留的解压目录运行 `npm run uninstall:desktop`（Web 换 `uninstall:web`）。一键安装不保留下载目录，可运行安装目录中保留的卸载脚本。

macOS / Linux：

```sh
node "$HOME/.dsh/plugins/desktop/dsh-snake/scripts/profile.mjs" uninstall --profile desktop
```

Windows PowerShell：

```powershell
node "$env:USERPROFILE/.dsh/plugins/desktop/dsh-snake/scripts/profile.mjs" uninstall --profile desktop
```

卸载 Web 版时，把路径里的 `desktop` 和末尾的 `desktop` 都换成 `web`。若自定义了 `DSH_HOME`，以实际安装路径为准。

桌面版和 Web 版分别存放插件与注册，卸载一个不影响另一个。修改前会备份，失败自动回滚配置和旧插件。配置不存在时会提示初始化，不会擅自创建或自动安装 Node/Harness，也不需要 API 密钥。

## 兼容

DeepSeek Harness 0.2.0-rc.2。桌面版支持 Windows / macOS / Linux。Web 版首批目标为电脑 Chrome / Edge，暂不支持手机触控。Windows 使用 junction，无需管理员或开发者模式；兼容中文和空格路径。游戏前端不变，Windows 用系统字体显示米饭，Chrome / Edge 支持现有玻璃效果，无法折射则回退。

## 借来的东西

液态玻璃用的是 [shuding/liquid-glass](https://github.com/shuding/liquid-glass) 的位移图做法，MIT。

头像是 YunYueSama 的[大肥鱼项目](https://github.com/YunYueSama/codex-deepseek-pet)，按上游署名许可使用，细节见 [ASSETS.md](ASSETS.md)。

米饭走系统 emoji，没夹带额外的字体和图片。

本项目 MIT，全文在 [LICENSE](LICENSE)。

跟 DeepSeek 官方没关系，自己玩的。
