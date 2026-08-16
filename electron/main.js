// dsh-app: DeepSeek Harness Web GUI 的极简 Electron 壳。
// 仅负责打开 http://127.0.0.1:3080 的原生窗口，不做任何页面改造。
// Electron 在 macOS 上使用系统输入法桥接，中文输入正常（与 VS Code 同款运行时）。
'use strict'

const { app, BrowserWindow, shell, dialog, nativeImage } = require('electron')
const path = require('path')

const DSH_URL = process.env.DSH_URL || 'http://127.0.0.1:3080'
// Web 页面的 favicon（与浏览器标签页一致的图标），用于 Dock / 窗口。
const ICON_PATH = path.join(__dirname, 'assets', 'favicon.png')

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    title: 'DeepSeek Harness',
    icon: ICON_PATH,
    backgroundColor: '#f5f6f7',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  win.loadURL(DSH_URL)

  // 页面里的外部链接一律交给系统浏览器，不在应用窗口内打开。
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })

  // 加载失败（比如 dsh web 还没启动）时给出可操作的提示。
  win.webContents.on('did-fail-load', (_event, code, desc, url) => {
    if (code === -3) return // ERR_ABORTED：正常导航中断，忽略
    dialog.showMessageBox(win, {
      type: 'error',
      title: '无法连接 DeepSeek Harness',
      message: `无法加载 ${url}`,
      detail: `${desc} (${code})\n\n请确认 dsh web 已在运行（例如：pnpm dsh web 或 dsh web），然后点击「重试」。`,
      buttons: ['重试', '退出'],
    }).then(({ response }) => {
      if (response === 0) win.reload()
      else app.quit()
    })
  })

  return win
}

app.whenReady().then(() => {
  // macOS Dock 图标：使用 web 页面的 favicon（与浏览器标签页一致）。
  if (process.platform === 'darwin') {
    const icon = nativeImage.createFromPath(ICON_PATH)
    if (!icon.isEmpty()) app.dock.setIcon(icon)
  }
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 关窗即退出（工具型应用，符合网页直觉）。
app.on('window-all-closed', () => {
  app.quit()
})
