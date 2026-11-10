import type { DesktopWindowSettings, TriggerRegistrationResult } from '../../domain/desktop/DesktopSettings';

export interface SaveTextFileOptions {
  content: string;
  /** 默认文件名（不含目录） */
  filename: string;
  /** 保存对话框里文件类型过滤器的名称 */
  filterName: string;
  /** 不带点的扩展名，例如 ['json'] */
  extensions: string[];
}

export type SaveTextFileResult = 'success' | 'canceled' | 'failed';

/**
 * Electron preload 通过 contextBridge 暴露给渲染进程的接口（window.desktop）。
 * preload 的实现和渲染进程的调用方都以这份类型为准。
 */
export interface DesktopApi {
  readonly platform: 'electron';
  /** 把窗口行为设置推给主进程，返回全局触发器的实际注册结果 */
  applyWindowSettings(settings: DesktopWindowSettings): Promise<TriggerRegistrationResult>;
  /** 录制快捷键期间暂停全局触发器，避免录制时把窗口切走 */
  setTriggerPaused(paused: boolean): void;
  /** 即将打开系统文件选择框时调用：在窗口重新获得焦点之前不做失焦隐藏 */
  suspendAutoHideUntilFocus(): void;
  /** 弹出保存对话框并写入文本文件（对话框与写盘都在主进程完成） */
  saveTextFile(options: SaveTextFileOptions): SaveTextFileResult;
}
