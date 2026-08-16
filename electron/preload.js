// dsh-app preload: the only bridge between the dsh web page (sandboxed,
// contextIsolated) and the Electron main process. Exposes a minimal, typed
// surface for the task-done notifier; nothing else reaches the main world.
'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('dshApp', {
  /** Report one newly completed task to the always-on-top notifier. */
  notifyTaskDone: (data) => ipcRenderer.send('dsh:task-done', data),
})
