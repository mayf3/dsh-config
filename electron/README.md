# dsh-app

DeepSeek Harness Web GUI 的 macOS 原生应用壳（Electron）。

## 为什么需要它

Chrome 的「在应用中打开」（PWA 应用窗口）在 macOS 上有一个已知问题：窗口切到别的应用再切回来后，中文输入法的候选框不再出现（英文输入正常）。这是 Chromium 应用窗口的输入法会话 bug，网页本身无法修复。

本壳用 Electron（VS Code、Cursor 同款运行时）把 `http://127.0.0.1:3080` 包成真正的原生窗口，中文输入法正常。

## 安装

```sh
cd ~/dsh-app
npm install --save-dev electron
```

国内网络下载慢时可先设置镜像再安装：

```sh
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
npm install --save-dev electron
```

## 使用

先启动 dsh web（另开终端）：

```sh
cd /path/to/deepseek-harness
pnpm dsh web
```

再启动应用：

```sh
cd ~/dsh-app
npm start
```

## 说明

- 界面与浏览器打开的网页完全一致（同一个本地服务），不改动任何页面代码
- 关窗即退出；页面的外部链接会用系统浏览器打开
- 如果 dsh web 没启动就打开应用，会弹出提示并可重试
- 可自定义地址：`DSH_URL=http://127.0.0.1:3080 npm start`
- 右上角任务通知支持逐条关闭和清空；两种操作都会原位更新，最后一项消失时显示空状态，不切回主窗口

## 右侧面板（持久化插件）

右侧面板（任务清单 + 会话详情）通过 web profile 的 patch 注册为持久化插件，
不依赖动态插件，dsh web 重启后依然存在：

- 插件包：`~/.dsh/profiles/node_modules/@dsh-user/ui-side-panel/`
- 注册行：`~/.dsh/profiles/web/cordis.patch.yml` 的 `insert: ui-side-panel`

如需卸载面板，删除 patch 中的该行（并可选删除插件包目录）后重启 dsh web 即可。
注意：如果重新运行 profile 的 `pnpm install`，手动放置的插件包可能被清理，届时重新
放置，或把包声明进 `~/.dsh/profiles/web/package.json` 的 dependencies。
