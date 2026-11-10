import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopApi } from '../../src/infrastructure/desktop/DesktopApi';
import { DESKTOP_CHANNELS } from '../shared/channels';

/**
 * 沙箱 preload：只暴露界面真正需要的最小接口，
 * 文件读写、全局监听等能力全部留在主进程。
 */
const api: DesktopApi = {
  platform: 'electron',
  applyWindowSettings: settings => ipcRenderer.invoke(DESKTOP_CHANNELS.applySettings, settings),
  setTriggerPaused: paused => ipcRenderer.send(DESKTOP_CHANNELS.setTriggerPaused, paused),
  suspendAutoHideUntilFocus: () => ipcRenderer.send(DESKTOP_CHANNELS.suspendAutoHide),
  saveTextFile: options => ipcRenderer.sendSync(DESKTOP_CHANNELS.saveTextFile, options)
};

contextBridge.exposeInMainWorld('desktop', api);
