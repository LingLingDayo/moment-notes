const fs = require('node:fs')
const path = require('node:path')

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
  }
}
