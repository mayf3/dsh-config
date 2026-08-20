// dsh-app: DeepSeek Harness Web GUI 的极简 Electron 壳。
// 1) 打开 http://127.0.0.1:3080 的原生窗口（中文输入法正常）。
// 2) 常驻通知：任务完成时，mac 右上角出现一个置顶小窗口，浮在
//    其他应用之上，罗列已完成的会话任务，随时可点击、可清空。
'use strict'

const { app, BrowserWindow, shell, dialog, nativeImage, ipcMain, screen } = require('electron')
const path = require('path')
const fs = require('fs')

const DSH_URL = process.env.DSH_URL || 'http://127.0.0.1:3080'
// Dock/window icon: prefer the 1024px black-whale render, fall back to the
// small web favicon when the packaged assets are missing.
const ICON_PATH = (() => {
  const assets = path.join(__dirname, 'assets')
  for (const name of ['favicon-1024-black.png', 'favicon-1024.png', 'favicon.png']) {
    if (fs.existsSync(path.join(assets, name))) return path.join(assets, name)
  }
  return path.join(assets, 'favicon.png')
})()
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
  html, body { background: transparent; font-family: -apple-system, "PingFang SC", sans-serif; height: 100%; }
  .card {
    background: rgba(250, 251, 254, 0.96);
    border: 1px solid rgba(60, 60, 67, 0.14);
    border-radius: 14px;
    height: 100%;
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
    display: flex; align-items: flex-start; gap: 8px;
    padding: 10px 14px; cursor: pointer; border-bottom: 1px solid rgba(60, 60, 67, 0.06);
  }
  /* Kind tints: completed tasks sit on light green, waiting tasks on light
     yellow — the color, not the text, tells them apart. */
  .item[data-kind="done"] { background: #e9f7ee; }
  .item[data-kind="done"]:hover { background: #dcf2e4; }
  .item[data-kind="waiting"] { background: #fcf4dc; }
  .item[data-kind="waiting"]:hover { background: #f8ebc2; }
  .item .mark {
    flex: none; width: 8px; height: 8px; margin-top: 5px;
    border-radius: 50%; background: #4cd07d;
  }
  .item[data-kind="waiting"] .mark { background: #f2b53c; }
  .item:last-child { border-bottom: none; }
  .item .body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .item .task { font-size: 13px; font-weight: 500; color: #1d1d1f; }
  .item .meta { font-size: 11px; color: #8e8e93; }
  .item .close {
    flex: none; border: none; background: transparent; color: #b0b0b6;
    width: 26px; height: 24px; margin: -2px -4px 0 0; border-radius: 50%; cursor: pointer;
    font-size: 14px; line-height: 1; display: flex; align-items: center; justify-content: center;
  }
  .item .close:hover { background: rgba(60, 60, 67, 0.12); color: #1d1d1f; }
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
        '<div class="item" data-id="' + item.id + '" data-kind="' + (item.kind === 'waiting' ? 'waiting' : 'done') + '">' +
          '<i class="mark"></i>' +
          '<div class="body" data-open="1">' +
            '<span class="task">' + escapeHtml(item.task) + '</span>' +
            '<span class="meta">' + escapeHtml(item.sessionTitle || '会话') + ' · ' + fmt(item.at) + '</span>' +
          '</div>' +
          '<button class="close" data-close="1" title="关闭这条">×</button>' +
        '</div>').join('')
      for (const el of list.querySelectorAll('.item [data-open="1"]')) {
        el.addEventListener('click', (e) => {
          // Never let a body click leak into a sibling trigger.
          e.stopPropagation()
          ipcRenderer.send('dsh:notifier-open', el.closest('.item').dataset.id)
        })
      }
      for (const el of list.querySelectorAll('.item [data-close="1"]')) {
        el.addEventListener('click', (e) => {
          // Close is dismiss-only: remove the entry, never jump to it.
          e.stopPropagation()
          ipcRenderer.send('dsh:notifier-remove', el.closest('.item').dataset.id)
        })
      }
    }
    ipcRenderer.on('dsh:render', (_e, items) => render(items))
    document.getElementById('clear').addEventListener('click', (event) => {
      event.stopPropagation()
      // Clear the visible card immediately. The main process then commits the
      // same empty list without hiding this window or activating the main app.
      render([])
      ipcRenderer.send('dsh:notifier-clear')
    })
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
    // Never steal focus: a click on the card must not leave the app stuck
    // on the panel (Cmd+Tab would otherwise land here instead of the page).
    focusable: false,
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

/** Re-render the notifier and size it to content; hide ordinary empty states. */
function refreshNotifier(options = {}) {
  const win = ensureNotifier()
  const keepEmptyVisible = options.keepEmptyVisible === true
  if (doneTasks.length === 0 && !keepEmptyVisible) {
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
  const height = Math.min(NOTIFIER_MAX_HEIGHT, 44 + doneTasks.length * 58)
  win.setSize(NOTIFIER_WIDTH, Math.max(104, height))
  placeNotifier()
  win.showInactive()
}

function addDoneTask(data) {
  const sessionId = typeof data?.sessionId === 'string' ? data.sessionId : ''
  const task = typeof data?.task === 'string' && data.task !== '' ? data.task : '任务完成'
  // Dedupe: the same session + task already on the card is not added again,
  // so an agent finishing every turn never floods the card with the same
  // title. Clearing the card resets the set, so a later finish notifies again.
  if (doneTasks.some(t => t.sessionId === sessionId && t.task === task)) return
  const id = 't' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)
  doneTasks.push({
    id,
    sessionId,
    sessionTitle: typeof data?.sessionTitle === 'string' ? data.sessionTitle : '',
    task,
    at: typeof data?.at === 'number' ? data.at : Date.now(),
    kind: data?.kind === 'waiting' ? 'waiting' : 'done',
  })
  refreshNotifier()
}

function registerNotifierIpc() {
  ipcMain.on('dsh:task-done', (_event, data) => {
    addDoneTask(data)
  })
  ipcMain.on('dsh:notifier-clear', () => {
    doneTasks.length = 0
    // Keep the emptied card in place. Hiding the clicked auxiliary window can
    // return macOS to the Electron main window, which feels like navigation.
    refreshNotifier({ keepEmptyVisible: true })
  })
  ipcMain.on('dsh:notifier-remove', (_event, id) => {
    const index = doneTasks.findIndex(t => t.id === id)
    if (index !== -1) {
      doneTasks.splice(index, 1)
      refreshNotifier()
    }
  })
  ipcMain.on('dsh:notifier-open', (_event, id) => {
    // 点击条目：移除该条（视为已处理），面板保持常驻（其余条目仍可点击跳转），
    // 把主窗口带到前台并深链到对应会话；全部点完后面板自动收起。
    const index = doneTasks.findIndex(t => t.id === id)
    const entry = index !== -1 ? doneTasks[index] : undefined
    if (entry !== undefined) doneTasks.splice(index, 1)
    refreshNotifier()
    if (mainWindow !== null && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      // macOS: 通知窗不参与焦点时应用可能未激活，先激活应用再聚焦主窗。
      if (process.platform === 'darwin') app.focus({ steal: true })
      mainWindow.focus()
      if (entry !== undefined && entry.sessionId !== '') {
        // Deep-link the session once the page can receive it: a click during
        // the initial load must not lose the message (send before load ends
        // is dropped).
        const send = () => mainWindow.webContents.send('dsh:open-session', entry.sessionId)
        if (mainWindow.webContents.isLoading()) {
          mainWindow.webContents.once('did-finish-load', send)
        } else {
          send()
        }
      }
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
