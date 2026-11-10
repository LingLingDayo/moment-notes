import type { DesktopWindowSettings, TriggerRegistrationResult } from '../../domain/desktop/DesktopSettings';
import type { DesktopApi, SaveTextFileOptions, SaveTextFileResult } from './DesktopApi';

const getApi = (): DesktopApi | undefined => (typeof window === 'undefined' ? undefined : window.desktop);

const toErrorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * 渲染进程访问 Electron 主进程的唯一入口。
 * Store 和组件只依赖这里，不直接读 window.desktop，非桌面形态下所有方法都安全降级。
 */
export const desktopBridge = {
  isAvailable(): boolean {
    return getApi() !== undefined;
  },

  async applyWindowSettings(settings: DesktopWindowSettings): Promise<TriggerRegistrationResult> {
    const api = getApi();
    if (!api) {
      return { ok: false, backend: 'none', message: '当前不是桌面应用形态' };
    }
    try {
      // 先深拷贝成普通对象：响应式代理无法通过 IPC 的结构化克隆
      const plain = JSON.parse(JSON.stringify(settings)) as DesktopWindowSettings;
      return await api.applyWindowSettings(plain);
    } catch (error) {
      return { ok: false, backend: 'none', message: toErrorMessage(error) };
    }
  },

  setTriggerPaused(paused: boolean): void {
    getApi()?.setTriggerPaused(paused);
  },

  suspendAutoHideUntilFocus(): void {
    getApi()?.suspendAutoHideUntilFocus();
  },

  saveTextFile(options: SaveTextFileOptions): SaveTextFileResult {
    const api = getApi();
    if (!api) return 'failed';
    try {
      return api.saveTextFile(options);
    } catch (error) {
      console.error('保存文件失败:', error);
      return 'failed';
    }
  }
};
