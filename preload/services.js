const fs = require('node:fs')
const path = require('node:path')
const { ipcRenderer } = require('electron')

const DETACHED_NOTE_CHANGED_CHANNEL = 'moment-notes:detached-note-changed'
const DETACHED_NOTE_REFRESH_CHANNEL = 'moment-notes:detached-note-refresh'
const DETACHED_NOTE_ALWAYS_ON_TOP_CHANNEL = 'moment-notes:detached-note-always-on-top'

function subscribeIpc (channel, callback) {
  const listener = (_event, payload) => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

function formatDateTime (date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}.${pad(date.getMinutes())}.${pad(date.getSeconds())}`
}

// 通过 window 对象向渲染进程注入 nodejs 能力
window.services = {
  // 读文件
  readFile (file) {
    return fs.readFileSync(file, { encoding: 'utf-8' })
  },
  // 文本写入到下载目录或指定路径
  writeTextFile (text, filePath) {
    const timeStr = formatDateTime(new Date())
    const targetPath = filePath || path.join(window.utools.getPath('downloads'), timeStr + '.txt')
    fs.writeFileSync(targetPath, text, { encoding: 'utf-8' })
    return targetPath
  },
  // 图片写入到下载目录
  writeImageFile (base64Url) {
    const matchs = /^data:image\/([a-z]{1,20});base64,/i.exec(base64Url)
    if (!matchs) return
    const timeStr = formatDateTime(new Date())
    const filePath = path.join(window.utools.getPath('downloads'), timeStr + '.' + matchs[1])
    fs.writeFileSync(filePath, base64Url.substring(matchs[0].length), { encoding: 'base64' })
    return filePath
  },
  detachedNote: {
    notifyParentChanged (noteId) {
      window.utools.sendToParent(DETACHED_NOTE_CHANGED_CHANNEL, noteId)
    },
    requestAlwaysOnTop (noteId, alwaysOnTop) {
      window.utools.sendToParent(DETACHED_NOTE_ALWAYS_ON_TOP_CHANNEL, { noteId, alwaysOnTop })
    },
    onChildChanged (callback) {
      return subscribeIpc(DETACHED_NOTE_CHANGED_CHANNEL, callback)
    },
    onAlwaysOnTopRequested (callback) {
      return subscribeIpc(DETACHED_NOTE_ALWAYS_ON_TOP_CHANNEL, callback)
    },
    onRefreshRequested (callback) {
      return subscribeIpc(DETACHED_NOTE_REFRESH_CHANNEL, callback)
    }
  }
}
