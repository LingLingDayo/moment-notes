import { globalShortcut } from 'electron';
import { RepeatGuard } from './RepeatGuard';
import type { TriggerBackendInstance, TriggerHandler } from './types';

/**
 * 系统快捷键后端（Electron globalShortcut）。
 * 按键会被系统拦截，不会再传给前台应用，也不需要全局钩子。
 *
 * @returns 监听实例；`occupied` 表示被其他程序占用；`unsupported` 表示这个组合无法用系统快捷键表达
 */
export const createAcceleratorBackend = (
  accelerator: string,
  onTrigger: TriggerHandler
): TriggerBackendInstance | 'occupied' | 'unsupported' => {
  const guard = new RepeatGuard({ onTrigger });
  const register = (): boolean => globalShortcut.register(accelerator, () => guard.handle(Date.now()));

  try {
    if (!register()) return 'occupied';
  } catch {
    return 'unsupported';
  }

  return {
    kind: 'accelerator',

    setPaused(paused) {
      guard.reset();
      if (paused) {
        // 暂停时释放按键，这样录制新快捷键时还能按到当前这一组
        globalShortcut.unregister(accelerator);
        return;
      }
      if (!globalShortcut.isRegistered(accelerator)) {
        try {
          register();
        } catch (error) {
          console.error('[trigger] 恢复系统快捷键失败:', error);
        }
      }
    },

    dispose() {
      guard.reset();
      globalShortcut.unregister(accelerator);
    }
  };
};
