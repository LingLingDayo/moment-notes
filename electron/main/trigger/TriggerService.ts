import type { TriggerRegistrationResult } from '../../../src/domain/desktop/DesktopSettings';
import type { GlobalTrigger } from '../../../src/domain/desktop/GlobalTrigger';
import { formatGlobalTrigger } from '../../../src/domain/desktop/triggerFormat';
import { resolveTriggerBackend } from '../../../src/domain/desktop/triggerValidation';
import { createAcceleratorBackend } from './acceleratorBackend';
import { createHookBackend } from './hookBackend';
import { buildAccelerator } from './keyMaps';
import type { TriggerBackendInstance, TriggerHandler } from './types';

const toErrorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * 全局触发器的注册与切换。
 * "键盘 + 按下"优先用系统快捷键；涉及鼠标、长按、双击时改用全局钩子。
 */
export class TriggerService {
  private backend: TriggerBackendInstance | null = null;
  private paused = false;
  /** 串行执行，避免连续修改设置时新旧注册互相抢占同一组按键 */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly onTrigger: TriggerHandler) {}

  apply(trigger: GlobalTrigger): Promise<TriggerRegistrationResult> {
    const run = this.queue.then(() => this.replaceBackend(trigger));
    this.queue = run.catch(() => undefined);
    return run;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.backend?.setPaused(paused);
  }

  dispose(): void {
    this.backend?.dispose();
    this.backend = null;
  }

  private async replaceBackend(trigger: GlobalTrigger): Promise<TriggerRegistrationResult> {
    const previous = this.backend;
    this.backend = null;
    // 系统快捷键要先释放，否则重新注册同一组按键会被判定为占用
    if (previous?.kind === 'accelerator') previous.dispose();

    try {
      if (!trigger.enabled) return { ok: true, backend: 'none' };

      const next = await this.createBackend(trigger);
      next.setPaused(this.paused);
      this.backend = next;
      return { ok: true, backend: next.kind };
    } catch (error) {
      console.error('[trigger] 注册全局触发器失败:', error);
      return { ok: false, backend: 'none', message: toErrorMessage(error) };
    } finally {
      // 钩子放到最后再释放：新旧都用钩子时可以保持它一直运行，不必反复启停
      if (previous?.kind === 'hook') previous.dispose();
    }
  }

  private async createBackend(trigger: GlobalTrigger): Promise<TriggerBackendInstance> {
    if (resolveTriggerBackend(trigger) === 'accelerator') {
      const accelerator = buildAccelerator(trigger);
      if (accelerator) {
        const result = createAcceleratorBackend(accelerator, this.onTrigger);
        if (result === 'occupied') {
          throw new Error(`「${formatGlobalTrigger(trigger)}」已被系统或其他程序占用`);
        }
        if (result !== 'unsupported') return result;
      }
    }

    try {
      return await createHookBackend(trigger, this.onTrigger);
    } catch (error) {
      throw new Error(`全局监听组件启动失败：${toErrorMessage(error)}`);
    }
  }
}
