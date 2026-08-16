# dsh-config

DeepSeek Harness 的个人化配置仓库。主仓库（deepseek-harness）升级/重建不会覆盖这里的内容；用 `install.sh` 一键部署到本机。

## 内容

| 目录 | 内容 | 部署目标 |
|---|---|---|
| `profiles/web/` | `cordis.patch.yml`（挂载右侧面板插件）、`package.json`（bundle 声明） | `~/.dsh/profiles/web/` |
| `plugins/ui-side-panel/` | 右侧面板插件（任务清单/会话统计/鲸鱼娘交互与养成等全部定制，含 `assets/` 背景图，由插件 host 路由 `/ui-side-panel/assets` 提供） | `~/.dsh/profiles/node_modules/@dsh-user/ui-side-panel/` |
| `settings/settings.yaml` | 模型路由（oc-go）、默认预设 `cordis-smart`、权限 | `~/.dsh/settings.yaml` |
| `agents/cordis-smart/` | 自定义 agent 预设（创造模式） | `~/.dsh/.agent-presets/cordis-smart/` |
| `electron/` | Electron 壳（main.js / package.json / favicon） | `~/dsh-app/` |

## 安装

```sh
./install.sh            # 全部部署
./install.sh --skip-bg  # 跳过背景图
```

部署后：**刷新 Web 页面**即可生效（前端改动）；host 侧改动（插件/预设）需**重启 dsh web**。

## 日常维护

- 本仓库是唯一真源：修改 `plugins/ui-side-panel/` 后，重跑 `./install.sh`（或手动 `rm -rf ~/.dsh/profiles/node_modules/@dsh-user/ui-side-panel && cp -R plugins/ui-side-panel ~/.dsh/profiles/node_modules/@dsh-user/`）部署
- 背景图随插件分发，主仓库重建前端不再丢失
- 注意：主仓库 `pnpm install` 会清掉 `profiles/node_modules` 下手动放置的插件，需要重跑 `./install.sh`
