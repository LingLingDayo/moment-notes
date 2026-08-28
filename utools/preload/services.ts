import fs from 'node:fs';
import path from 'node:path';
import { ipcRenderer } from 'electron';

const DETACHED_NOTE_CHANGED_CHANNEL = 'moment-notes:detached-note-changed';
const DETACHED_NOTE_REFRESH_CHANNEL = 'moment-notes:detached-note-refresh';
const DETACHED_NOTE_ALWAYS_ON_TOP_CHANNEL = 'moment-notes:detached-note-always-on-top';
const DETACHED_NOTE_TOGGLE_MAXIMIZE_CHANNEL = 'moment-notes:detached-note-toggle-maximize';
const DETACHED_NOTE_MAXIMIZE_CHANGED_CHANNEL = 'moment-notes:detached-note-maximize-changed';

function subscribeIpc(channel: string, callback: (payload: any) => void): () => void {
  const listener = (_event: any, payload: any) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}.${pad(date.getMinutes())}.${pad(date.getSeconds())}`;
}

declare global {
  interface Window {
    utools: any;
    services: any;
  }
}

// 通过 window 对象向渲染进程注入 nodejs 能力
window.services = {
  // 读文件
  readFile(file: string): string {
    return fs.readFileSync(file, { encoding: 'utf-8' });
  },
  // 文本写入到下载目录或指定路径
  writeTextFile(text: string, filePath?: string): string {
    const timeStr = formatDateTime(new Date());
    const targetPath = filePath || path.join(window.utools.getPath('downloads'), timeStr + '.txt');
    fs.writeFileSync(targetPath, text, { encoding: 'utf-8' });
    return targetPath;
  },
  // 图片写入到下载目录
  writeImageFile(base64Url: string): string | undefined {
    const matchs = /^data:image\/([a-z]{1,20});base64,/i.exec(base64Url);
    if (!matchs) return;
    const timeStr = formatDateTime(new Date());
    const filePath = path.join(window.utools.getPath('downloads'), timeStr + '.' + matchs[1]);
    fs.writeFileSync(filePath, base64Url.substring(matchs[0].length), { encoding: 'base64' });
    return filePath;
  },
  detachedNote: {
    notifyParentChanged(noteId: string): void {
      window.utools.sendToParent(DETACHED_NOTE_CHANGED_CHANNEL, noteId);
    },
    requestAlwaysOnTop(noteId: string, alwaysOnTop: boolean): void {
      window.utools.sendToParent(DETACHED_NOTE_ALWAYS_ON_TOP_CHANNEL, { noteId, alwaysOnTop });
    },
    requestToggleMaximize(noteId: string): void {
      window.utools.sendToParent(DETACHED_NOTE_TOGGLE_MAXIMIZE_CHANNEL, { noteId });
    },
    onChildChanged(callback: (noteId: string) => void): () => void {
      return subscribeIpc(DETACHED_NOTE_CHANGED_CHANNEL, callback);
    },
    onAlwaysOnTopRequested(callback: (payload: { noteId: string; alwaysOnTop: boolean }) => void): () => void {
      return subscribeIpc(DETACHED_NOTE_ALWAYS_ON_TOP_CHANNEL, callback);
    },
    onToggleMaximizeRequested(callback: (payload: { noteId: string }) => void): () => void {
      return subscribeIpc(DETACHED_NOTE_TOGGLE_MAXIMIZE_CHANNEL, callback);
    },
    onRefreshRequested(callback: () => void): () => void {
      return subscribeIpc(DETACHED_NOTE_REFRESH_CHANNEL, callback);
    },
    onMaximizeChanged(callback: (isMaximized: boolean) => void): () => void {
      return subscribeIpc(DETACHED_NOTE_MAXIMIZE_CHANGED_CHANNEL, callback);
    }
  }
};
