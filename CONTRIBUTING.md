# 贡献指南

## 提交修改

在 Issue 中描述问题或需求。修复明确的小问题，可以直接提交 Pull Request。避免顺手重构无关代码。

提交前运行：

```sh
npm run build
npm run check
npm test
```

界面改动附实际截图，说明验证过的 Harness 版本。检查自动展开、未玩收起、玩过保留、输入框打字和按键控制。安装脚本测试使用临时 `DSH_HOME`。

## 发布

更新 `package.json` 与 CHANGELOG 中的版本，确认 README 与安装行为一致。检查素材许可及打包内容，通过检查后创建版本标签和 GitHub Release。
