/** 主进程与 preload 共用的 IPC 通道名 */
export const DESKTOP_CHANNELS = {
  /** invoke：推送窗口行为设置，返回触发器注册结果 */
  applySettings: 'desktop:apply-settings',
  /** send：录制快捷键期间暂停 / 恢复全局触发器 */
  setTriggerPaused: 'desktop:set-trigger-paused',
  /** send：在窗口重新获得焦点前挂起失焦隐藏 */
  suspendAutoHide: 'desktop:suspend-auto-hide',
  /** sendSync：弹出保存对话框并写入文本文件 */
  saveTextFile: 'desktop:save-text-file'
} as const;
