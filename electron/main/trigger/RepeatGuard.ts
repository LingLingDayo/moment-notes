/**
 * 系统级快捷键在按住不放时会按键盘的重复速率连续触发，
 * 而系统快捷键拿不到"松开"事件，无法直接区分"按住"和"再按一次"。
 *
 * 这里按时间特征过滤：
 * - 与上一次事件间隔很短 → 处于连发流中，忽略
 * - 间隔落在"首次重复延迟"范围内 → 可能是连发的第一下，先等一个连发周期：
 *   期间又来了事件就确认是连发并丢弃，否则按正常的再次按下处理
 */

/** 连发流中相邻两次事件的最大间隔 */
export const REPEAT_INTERVAL_MAX_MS = 80;
/** 系统"首次重复延迟"的上限（Windows 最慢档约 1 秒） */
export const REPEAT_INITIAL_DELAY_MAX_MS = 1100;

export interface RepeatGuardOptions {
  onTrigger: (eventTime: number) => void;
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export class RepeatGuard {
  private readonly onTrigger: (eventTime: number) => void;
  private readonly setTimer: (callback: () => void, ms: number) => unknown;
  private readonly clearTimer: (handle: unknown) => void;

  private lastEventAt = Number.NEGATIVE_INFINITY;
  private pending: unknown = null;

  constructor(options: RepeatGuardOptions) {
    this.onTrigger = options.onTrigger;
    this.setTimer = options.setTimer ?? ((callback, ms) => setTimeout(callback, ms));
    this.clearTimer =
      options.clearTimer ?? (handle => clearTimeout(handle as ReturnType<typeof setTimeout>));
  }

  handle(eventTime: number): void {
    const gap = eventTime - this.lastEventAt;
    this.lastEventAt = eventTime;

    if (gap <= REPEAT_INTERVAL_MAX_MS) {
      // 连发流：如果上一下还在观察期，说明它也是连发，一并丢弃
      this.cancelPending();
      return;
    }

    if (gap <= REPEAT_INITIAL_DELAY_MAX_MS) {
      this.cancelPending();
      this.pending = this.setTimer(() => {
        this.pending = null;
        this.onTrigger(eventTime);
      }, REPEAT_INTERVAL_MAX_MS);
      return;
    }

    this.onTrigger(eventTime);
  }

  reset(): void {
    this.cancelPending();
    this.lastEventAt = Number.NEGATIVE_INFINITY;
  }

  private cancelPending(): void {
    if (this.pending === null) return;
    this.clearTimer(this.pending);
    this.pending = null;
  }
}
