import { describe, expect, it, vi } from 'vitest';
import { REPEAT_INITIAL_DELAY_MAX_MS, REPEAT_INTERVAL_MAX_MS, RepeatGuard } from './RepeatGuard';

/** 手动推进的定时器，避免测试依赖真实时间 */
const createHarness = () => {
  const timers = new Map<number, () => void>();
  let nextId = 1;
  const onTrigger = vi.fn();
  const guard = new RepeatGuard({
    onTrigger,
    setTimer: callback => {
      const id = nextId++;
      timers.set(id, callback);
      return id;
    },
    clearTimer: handle => {
      timers.delete(handle as number);
    }
  });
  const flushTimers = () => {
    const callbacks = [...timers.values()];
    timers.clear();
    callbacks.forEach(callback => callback());
  };
  return { guard, onTrigger, flushTimers, pendingCount: () => timers.size };
};

describe('RepeatGuard', () => {
  it('第一次按下立即触发', () => {
    const { guard, onTrigger, pendingCount } = createHarness();

    guard.handle(1000);

    expect(onTrigger).toHaveBeenCalledExactlyOnceWith(1000);
    expect(pendingCount()).toBe(0);
  });

  it('间隔足够长的两次按下都立即触发', () => {
    const { guard, onTrigger } = createHarness();

    guard.handle(1000);
    guard.handle(1000 + REPEAT_INITIAL_DELAY_MAX_MS + 1);

    expect(onTrigger).toHaveBeenCalledTimes(2);
  });

  it('按住不放产生的连发只触发一次', () => {
    const { guard, onTrigger, flushTimers } = createHarness();

    guard.handle(1000);
    // 首次重复延迟 500ms，之后每 33ms 一次
    let time = 1500;
    guard.handle(time);
    for (let index = 0; index < 20; index++) {
      time += 33;
      guard.handle(time);
    }
    flushTimers();

    expect(onTrigger).toHaveBeenCalledExactlyOnceWith(1000);
  });

  it('较快的再次按下在观察期结束后触发', () => {
    const { guard, onTrigger, flushTimers, pendingCount } = createHarness();

    guard.handle(1000);
    guard.handle(1400);

    expect(onTrigger).toHaveBeenCalledTimes(1);
    expect(pendingCount()).toBe(1);

    flushTimers();

    expect(onTrigger).toHaveBeenCalledTimes(2);
    expect(onTrigger).toHaveBeenLastCalledWith(1400);
  });

  it('间隔恰好等于连发周期上限时仍视为连发', () => {
    const { guard, onTrigger, flushTimers } = createHarness();

    guard.handle(1000);
    guard.handle(1000 + REPEAT_INTERVAL_MAX_MS);
    flushTimers();

    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('reset 会丢弃观察期内的事件并清空时间记录', () => {
    const { guard, onTrigger, flushTimers, pendingCount } = createHarness();

    guard.handle(1000);
    guard.handle(1400);
    guard.reset();

    expect(pendingCount()).toBe(0);
    flushTimers();
    expect(onTrigger).toHaveBeenCalledTimes(1);

    guard.handle(1410);
    expect(onTrigger).toHaveBeenCalledTimes(2);
  });
});
