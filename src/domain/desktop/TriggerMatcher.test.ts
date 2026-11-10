import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_GLOBAL_TRIGGER,
  TRIGGER_DOUBLE_INTERVAL_MS,
  TRIGGER_MOVE_TOLERANCE_PX,
  type GlobalTrigger,
  type TriggerInput,
  type TriggerModifier
} from './GlobalTrigger';
import { TriggerMatcher, type TriggerInputEvent } from './TriggerMatcher';

/** 可手动推进的假定时器，避免测试依赖真实时间 */
class FakeTimers {
  private nextId = 1;
  private readonly timers = new Map<number, { callback: () => void; at: number }>();
  now = 0;

  setTimer = (callback: () => void, ms: number): unknown => {
    const id = this.nextId++;
    this.timers.set(id, { callback, at: this.now + ms });
    return id;
  };

  clearTimer = (handle: unknown): void => {
    this.timers.delete(handle as number);
  };

  advanceTo(time: number): void {
    this.now = time;
    for (const [id, timer] of [...this.timers]) {
      if (timer.at <= time) {
        this.timers.delete(id);
        timer.callback();
      }
    }
  }

  get pending(): number {
    return this.timers.size;
  }
}

const KEY_N: TriggerInput = { device: 'keyboard', code: 'KeyN' };
const KEY_M: TriggerInput = { device: 'keyboard', code: 'KeyM' };
const CTRL: TriggerInput = { device: 'keyboard', code: 'ControlLeft' };
const CTRL_RIGHT: TriggerInput = { device: 'keyboard', code: 'ControlRight' };
const MIDDLE: TriggerInput = { device: 'mouse', button: 'middle' };
const LEFT: TriggerInput = { device: 'mouse', button: 'left' };

describe('TriggerMatcher', () => {
  let timers: FakeTimers;
  let fired: number[];

  const create = (overrides: Partial<GlobalTrigger>): TriggerMatcher =>
    new TriggerMatcher({
      trigger: { ...DEFAULT_GLOBAL_TRIGGER, ...overrides },
      onTrigger: startedAt => fired.push(startedAt),
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer
    });

  /** 先把时钟推进到事件发生的时刻（期间到期的定时器会先触发），再投递事件 */
  const send = (matcher: TriggerMatcher, event: TriggerInputEvent) => {
    timers.advanceTo(event.time);
    matcher.handle(event);
  };

  const down = (
    matcher: TriggerMatcher,
    input: TriggerInput,
    time: number,
    modifiers: TriggerModifier[] = [],
    point: { x?: number; y?: number } = {}
  ) => send(matcher, { type: 'down', input, modifiers, time, ...point });

  const up = (matcher: TriggerMatcher, input: TriggerInput, time: number, modifiers: TriggerModifier[] = []) =>
    send(matcher, { type: 'up', input, modifiers, time });

  beforeEach(() => {
    timers = new FakeTimers();
    fired = [];
  });

  describe('按下', () => {
    it('修饰键精确一致时立即触发，并回传按下时刻', () => {
      const matcher = create({});
      down(matcher, KEY_N, 100, ['ctrl', 'alt']);
      expect(fired).toEqual([100]);
    });

    it('修饰键多一个或少一个都不触发', () => {
      const matcher = create({});
      down(matcher, KEY_N, 100, ['ctrl']);
      up(matcher, KEY_N, 110, ['ctrl']);
      down(matcher, KEY_N, 200, ['ctrl', 'alt', 'shift']);
      expect(fired).toEqual([]);
    });

    it('忽略按住不放产生的重复按下事件', () => {
      const matcher = create({});
      down(matcher, KEY_N, 100, ['ctrl', 'alt']);
      down(matcher, KEY_N, 130, ['ctrl', 'alt']);
      down(matcher, KEY_N, 160, ['ctrl', 'alt']);
      expect(fired).toEqual([100]);

      up(matcher, KEY_N, 200, ['ctrl', 'alt']);
      down(matcher, KEY_N, 300, ['ctrl', 'alt']);
      expect(fired).toEqual([100, 300]);
    });

    it('其他按键不触发', () => {
      const matcher = create({});
      down(matcher, KEY_M, 100, ['ctrl', 'alt']);
      expect(fired).toEqual([]);
    });
  });

  describe('长按', () => {
    const holdMiddle = { modifiers: [], input: MIDDLE, gesture: 'hold', holdMs: 500 } satisfies Partial<GlobalTrigger>;

    it('按住达到时长后触发，回传的是按下时刻', () => {
      const matcher = create(holdMiddle);
      down(matcher, MIDDLE, 1000, [], { x: 10, y: 10 });
      timers.advanceTo(1499);
      expect(fired).toEqual([]);
      timers.advanceTo(1500);
      expect(fired).toEqual([1000]);
    });

    it('提前松开不触发', () => {
      const matcher = create(holdMiddle);
      down(matcher, MIDDLE, 1000, [], { x: 10, y: 10 });
      up(matcher, MIDDLE, 1200);
      timers.advanceTo(2000);
      expect(fired).toEqual([]);
      expect(timers.pending).toBe(0);
    });

    it('鼠标位移在容差内仍然触发，超出容差则取消', () => {
      const within = create(holdMiddle);
      down(within, MIDDLE, 0, [], { x: 100, y: 100 });
      send(within, { type: 'move', x: 100 + TRIGGER_MOVE_TOLERANCE_PX, y: 100, time: 100 });
      timers.advanceTo(500);
      expect(fired).toEqual([0]);

      fired = [];
      const beyond = create(holdMiddle);
      down(beyond, MIDDLE, 1000, [], { x: 100, y: 100 });
      send(beyond, { type: 'move', x: 100 + TRIGGER_MOVE_TOLERANCE_PX + 1, y: 100, time: 1100 });
      timers.advanceTo(2000);
      expect(fired).toEqual([]);
    });

    it('键盘长按不受鼠标移动影响', () => {
      const matcher = create({ modifiers: ['ctrl'], input: KEY_N, gesture: 'hold', holdMs: 300 });
      down(matcher, KEY_N, 0, ['ctrl']);
      send(matcher, { type: 'move', x: 500, y: 500, time: 100 });
      timers.advanceTo(300);
      expect(fired).toEqual([0]);
    });

    it('期间按了别的键、滚动滚轮都会取消', () => {
      const byKey = create(holdMiddle);
      down(byKey, MIDDLE, 0);
      down(byKey, KEY_M, 100);
      timers.advanceTo(600);
      expect(fired).toEqual([]);

      const byWheel = create(holdMiddle);
      down(byWheel, MIDDLE, 1000);
      send(byWheel, { type: 'interrupt', time: 1100 });
      timers.advanceTo(2000);
      expect(fired).toEqual([]);
    });

    it('所需的修饰键提前松开会取消', () => {
      const matcher = create({ modifiers: ['ctrl'], input: LEFT, gesture: 'hold', holdMs: 500 });
      down(matcher, CTRL, 0, ['ctrl']);
      down(matcher, LEFT, 100, ['ctrl'], { x: 0, y: 0 });
      up(matcher, CTRL_RIGHT, 300);
      timers.advanceTo(1000);
      expect(fired).toEqual([]);
    });

    it('先按住修饰键再长按主键可以触发', () => {
      const matcher = create({ modifiers: ['ctrl'], input: LEFT, gesture: 'hold', holdMs: 500 });
      down(matcher, CTRL, 0, ['ctrl']);
      down(matcher, LEFT, 100, ['ctrl'], { x: 0, y: 0 });
      timers.advanceTo(600);
      expect(fired).toEqual([100]);
    });
  });

  describe('双击', () => {
    const doubleMiddle = { modifiers: [], input: MIDDLE, gesture: 'double' } satisfies Partial<GlobalTrigger>;

    it('时间窗内的第二次按下触发，回传第一次按下的时刻', () => {
      const matcher = create(doubleMiddle);
      down(matcher, MIDDLE, 1000, [], { x: 5, y: 5 });
      up(matcher, MIDDLE, 1050);
      down(matcher, MIDDLE, 1000 + TRIGGER_DOUBLE_INTERVAL_MS, [], { x: 5, y: 5 });
      expect(fired).toEqual([1000]);
    });

    it('超出时间窗不触发，并以这次按下重新计为第一击', () => {
      const matcher = create(doubleMiddle);
      down(matcher, MIDDLE, 1000);
      up(matcher, MIDDLE, 1050);
      const second = 1000 + TRIGGER_DOUBLE_INTERVAL_MS + 1;
      down(matcher, MIDDLE, second);
      up(matcher, MIDDLE, second + 50);
      expect(fired).toEqual([]);

      down(matcher, MIDDLE, second + 200);
      expect(fired).toEqual([second]);
    });

    it('连按三次只触发一次', () => {
      const matcher = create(doubleMiddle);
      for (const time of [0, 150, 300]) {
        down(matcher, MIDDLE, time);
        up(matcher, MIDDLE, time + 40);
      }
      expect(fired).toEqual([0]);
    });

    it('两次按下之间夹了别的键不触发', () => {
      const matcher = create(doubleMiddle);
      down(matcher, MIDDLE, 0);
      up(matcher, MIDDLE, 40);
      down(matcher, KEY_M, 100);
      up(matcher, KEY_M, 140);
      down(matcher, MIDDLE, 200);
      expect(fired).toEqual([]);
    });

    it('鼠标两次落点相距过远不触发', () => {
      const matcher = create(doubleMiddle);
      down(matcher, MIDDLE, 0, [], { x: 0, y: 0 });
      up(matcher, MIDDLE, 40);
      down(matcher, MIDDLE, 200, [], { x: 100, y: 0 });
      expect(fired).toEqual([]);
    });

    it('修饰键作为主键时可以双击触发，左右两侧视为同一个键', () => {
      const matcher = create({ modifiers: [], input: CTRL, gesture: 'double' });
      down(matcher, CTRL, 0, ['ctrl']);
      up(matcher, CTRL, 50);
      down(matcher, CTRL_RIGHT, 200, ['ctrl']);
      expect(fired).toEqual([0]);
    });

    it('修饰键主键与其他修饰键同时按下时不触发', () => {
      const matcher = create({ modifiers: [], input: CTRL, gesture: 'double' });
      down(matcher, CTRL, 0, ['ctrl', 'shift']);
      up(matcher, CTRL, 50, ['shift']);
      down(matcher, CTRL, 200, ['ctrl', 'shift']);
      expect(fired).toEqual([]);
    });
  });

  it('reset 会清掉进行中的长按和已记录的第一击', () => {
    const hold = create({ modifiers: [], input: MIDDLE, gesture: 'hold', holdMs: 500 });
    down(hold, MIDDLE, 0);
    hold.reset();
    timers.advanceTo(1000);
    expect(fired).toEqual([]);
    expect(timers.pending).toBe(0);

    const double = create({ modifiers: [], input: MIDDLE, gesture: 'double' });
    down(double, MIDDLE, 2000);
    double.reset();
    down(double, MIDDLE, 2100);
    expect(fired).toEqual([]);
  });
});
