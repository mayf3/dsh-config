#!/usr/bin/env bash
# 一键部署 dsh 个性化配置到本机。
# 用法: ./install.sh [--skip-bg] [--skip-electron]
#   --skip-bg        保留兼容：背景图已随 ui-side-panel 插件分发，无实际作用
#   --skip-electron  跳过 Electron 壳部署
set -euo pipefail

REPO="$(cd "$(dirname "$0")" && pwd)"
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
HARNESS="${HARNESS:-$HOME/workspace/github/deepseek-harness}"

echo "==> 1/5 profiles/web（cordis.patch.yml + package.json）"
mkdir -p "$DSH_HOME/profiles/web"
cp "$REPO/profiles/web/cordis.patch.yml" "$REPO/profiles/web/package.json" "$DSH_HOME/profiles/web/"

echo "==> 2/5 ui-side-panel 插件"
mkdir -p "$DSH_HOME/profiles/node_modules/@dsh-user"
rm -rf "$DSH_HOME/profiles/node_modules/@dsh-user/ui-side-panel"
cp -R "$REPO/plugins/ui-side-panel" "$DSH_HOME/profiles/node_modules/@dsh-user/ui-side-panel"

echo "==> 3/5 settings.yaml（覆盖前备份 .bak）"
if [[ -f "$DSH_HOME/settings.yaml" ]]; then cp "$DSH_HOME/settings.yaml" "$DSH_HOME/settings.yaml.bak-$(date +%Y%m%d-%H%M%S)"; fi
cp "$REPO/settings/settings.yaml" "$DSH_HOME/settings.yaml"

echo "==> 4/5 cordis-smart 预设"
mkdir -p "$DSH_HOME/.agent-presets"
rm -rf "$DSH_HOME/.agent-presets/cordis-smart"
cp -R "$REPO/agents/cordis-smart" "$DSH_HOME/.agent-presets/cordis-smart"

# 背景图已随 ui-side-panel 插件分发（plugins/ui-side-panel/assets/），
# 由插件 host 侧 /ui-side-panel/assets 路由提供，不再部署到 apps/web/dist。
# --skip-bg 参数保留兼容旧用法，现在无实际作用。
echo "==> 5/5 背景图随 ui-side-panel 插件分发（无需 dist 部署）"

if [[ "$*" != *"--skip-electron"* && -d "$HOME/dsh-app" ]]; then
  echo "==> 额外: Electron 壳 -> ~/dsh-app/"
  cp "$REPO/electron/main.js" "$REPO/electron/package.json" "$HOME/dsh-app/"
  cp "$REPO/electron/assets/"* "$HOME/dsh-app/assets/" 2>/dev/null || true
fi

echo "完成。刷新 Web 页面生效；host 侧改动需重启 dsh web。"
