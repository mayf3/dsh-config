// dsh-app: DeepSeek Harness Web GUI 的极简 Electron 壳。
// 1) 打开 http://127.0.0.1:3080 的原生窗口（中文输入法正常）。
// 2) 常驻通知：任务完成时，mac 右上角出现一个置顶小窗口，浮在
//    其他应用之上，罗列已完成的会话任务，随时可点击、可清空。
'use strict'

const { app, BrowserWindow, shell, dialog, nativeImage, ipcMain, screen } = require('electron')
const path = require('path')

const DSH_URL = process.env.DSH_URL || 'http://127.0.0.1:3080'
const ICON_PATH = path.join(__dirname, 'assets', 'favicon.png')
const PRELOAD_PATH = path.join(__dirname, 'preload.js')

const NOTIFIER_WIDTH = 340
const NOTIFIER_MAX_HEIGHT = 480

let mainWindow = null
let notifier = null
// One entry per completed task: { id, sessionId, sessionTitle, task, at }.
const doneTasks = []

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
      preload: PRELOAD_PATH,
    },
  })
  mainWindow = win

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

  win.on('closed', () => {
    mainWindow = null
  })

  return win
}

// ── 常驻通知窗口 ────────────────────────────────────────────────────────────

/** The notifier's document: a rounded always-on-top card. */
function notifierHtml() {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: transparent; font-family: -apple-system, "PingFang SC", sans-serif; }
  .card {
    background: rgba(250, 251, 254, 0.96);
    border: 1px solid rgba(60, 60, 67, 0.14);
    border-radius: 14px;
    box-shadow: 0 12px 34px rgba(0, 0, 0, 0.22);
    overflow: hidden;
  }
  .head {
    display: flex; align-items: center; gap: 8px;
    padding: 12px 14px 10px;
    border-bottom: 1px solid rgba(60, 60, 67, 0.1);
  }
  .head .dot { width: 9px; height: 9px; border-radius: 50%; background: #34c759; flex: none; }
  .head .title { font-size: 13px; font-weight: 600; color: #1d1d1f; flex: 1; }
  .head .clear {
    border: none; background: transparent; color: #8e8e93;
    font-size: 12px; cursor: pointer; padding: 2px 6px; border-radius: 6px;
  }
  .head .clear:hover { background: rgba(60, 60, 67, 0.08); color: #1d1d1f; }
  .list { max-height: ${NOTIFIER_MAX_HEIGHT - 60}px; overflow: auto; }
  .item {
    display: flex; flex-direction: column; gap: 2px;
    padding: 10px 14px; cursor: pointer; border-bottom: 1px solid rgba(60, 60, 67, 0.06);
  }
  .item:hover { background: rgba(0, 122, 255, 0.06); }
  .item:last-child { border-bottom: none; }
  .item .task { font-size: 13px; font-weight: 500; color: #1d1d1f; }
  .item .meta { font-size: 11px; color: #8e8e93; }
  .empty { padding: 26px 14px; text-align: center; font-size: 12px; color: #8e8e93; }
</style></head><body>
  <div class="card">
    <div class="head">
      <span class="dot"></span>
      <span class="title">任务完成</span>
      <button class="clear" id="clear">清空</button>
    </div>
    <div class="list" id="list"></div>
  </div>
  <script>
    const { ipcRenderer } = require('electron')
    const list = document.getElementById('list')
    const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]))
    const fmt = (ts) => {
      const d = new Date(ts)
      const pad = (n) => String(n).padStart(2, '0')
      return pad(d.getHours()) + ':' + pad(d.getMinutes())
    }
    const render = (items) => {
      if (items.length === 0) {
        list.innerHTML = '<div class="empty">暂无完成任务</div>'
        return
      }
      list.innerHTML = items.map((item) =>
        '<div class="item" data-id="' + item.id + '">' +
          '<span class="task">' + escapeHtml(item.task) + '</span>' +
          '<span class="meta">' + escapeHtml(item.sessionTitle || '会话') + ' · ' + fmt(item.at) + '</span>' +
        '</div>').join('')
      for (const el of list.querySelectorAll('.item')) {
        el.addEventListener('click', () => ipcRenderer.send('dsh:notifier-open', el.dataset.id))
      }
    }
    ipcRenderer.on('dsh:render', (_e, items) => render(items))
    document.getElementById('clear').addEventListener('click', () => ipcRenderer.send('dsh:notifier-clear'))
  </script>
</body></html>`
}

/** Create (once) the always-on-top notifier window, hidden until tasks arrive. */
function ensureNotifier() {
  if (notifier !== null && !notifier.isDestroyed()) return notifier
  notifier = new BrowserWindow({
    width: NOTIFIER_WIDTH,
    height: 200,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    fullscreenable: false,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      sandbox: false,
    },
  })
  // macOS 顶层置顶（覆盖其他应用的全屏内容之上）。
  notifier.setAlwaysOnTop(true, 'screen-saver')
  notifier.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  notifierLoaded = false
  notifier.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(notifierHtml()))
  notifier.on('closed', () => { notifier = null })
  return notifier
}

/** Place the notifier at the top-right of the current display's work area. */
function placeNotifier() {
  const win = ensureNotifier()
  const [w] = win.getSize()
  const wa = screen.getPrimaryDisplay().workArea
  const x = wa.x + wa.width - w - 16
  const y = wa.y + 56
  win.setPosition(Math.round(x), Math.round(y))
}

let notifierLoaded = false

/** Re-render the notifier and size it to content; hide when empty. */
function refreshNotifier() {
  const win = ensureNotifier()
  if (doneTasks.length === 0) {
    win.hide()
    return
  }
  const items = [...doneTasks].reverse()
  if (notifierLoaded) {
    win.webContents.send('dsh:render', items)
  } else {
    // First ever task: the page is still loading, so queue the render until
    // it finishes (a naive send here would open an empty card).
    win.webContents.once('did-finish-load', () => {
      notifierLoaded = true
      win.webContents.send('dsh:render', items)
    })
  }
  const height = Math.min(NOTIFIER_MAX_HEIGHT, 60 + doneTasks.length * 58 + 4)
  win.setSize(NOTIFIER_WIDTH, Math.max(140, height))
  placeNotifier()
  win.showInactive()
}

function addDoneTask(data) {
  const id = 't' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)
  doneTasks.push({
    id,
    sessionId: typeof data?.sessionId === 'string' ? data.sessionId : '',
    sessionTitle: typeof data?.sessionTitle === 'string' ? data.sessionTitle : '',
    task: typeof data?.task === 'string' && data.task !== '' ? data.task : '任务完成',
    at: typeof data?.at === 'number' ? data.at : Date.now(),
  })
  refreshNotifier()
}

function registerNotifierIpc() {
  ipcMain.on('dsh:task-done', (_event, data) => {
    addDoneTask(data)
  })
  ipcMain.on('dsh:notifier-clear', () => {
    doneTasks.length = 0
    refreshNotifier()
  })
  ipcMain.on('dsh:notifier-open', (_event, id) => {
    // 点击条目：把主窗口带到前台（后续可扩展为直接跳到对应会话）。
    if (mainWindow !== null && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

app.whenReady().then(() => {
  // macOS Dock 图标：使用 web 页面的 favicon（与浏览器标签页一致）。
  if (process.platform === 'darwin') {
    const icon = nativeImage.createFromPath(ICON_PATH)
    if (!icon.isEmpty()) app.dock.setIcon(icon)
  }
  registerNotifierIpc()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 关窗即退出（工具型应用，符合网页直觉）。
app.on('window-all-closed', () => {
  app.quit()
})
