import {
  TRIGGER_DOUBLE_INTERVAL_MS,
  TRIGGER_MOVE_TOLERANCE_PX,
  type GlobalTrigger,
  type TriggerInput,
  type TriggerModifier
} from './GlobalTrigger';
import { canonicalizeKeyCode, getTriggerKeyInfo } from './triggerKeys';
import { getTriggerInputModifier } from './triggerValidation';

/**
 * 规范化后的全局输入事件。由主进程把底层钩子事件转换成这个形状再交给匹配器，
 * 匹配器本身不依赖任何平台 API，可以直接做单元测试。
 */
export interface TriggerButtonEvent {
  type: 'down' | 'up';
  input: TriggerInput;
  /** 事件发生时处于按下状态的修饰键 */
  modifiers: readonly TriggerModifier[];
  time: number;
  x?: number;
  y?: number;
}

export type TriggerInputEvent =
  | TriggerButtonEvent
  | { type: 'move'; x: number; y: number; time: number }
  /** 滚轮等会打断手势、但不属于按键的输入 */
  | { type: 'interrupt'; time: number };

export interface TriggerMatcherOptions {
  trigger: GlobalTrigger;
  /** @param gestureStartedAt 手势起始时刻（长按的按下时刻 / 双击的第一次按下时刻） */
  onTrigger: (gestureStartedAt: number) => void;
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

interface Point {
  x?: number;
  y?: number;
}

const getInputId = (input: TriggerInput): string => {
  if (input.device === 'mouse') return `mouse:${input.button}`;
  return `key:${getTriggerKeyInfo(input.code)?.code ?? canonicalizeKeyCode(input.code)}`;
};

const exceedsTolerance = (from: Point, to: Point): boolean => {
  if (from.x === undefined || from.y === undefined || to.x === undefined || to.y === undefined) {
    return false;
  }
  return Math.hypot(to.x - from.x, to.y - from.y) > TRIGGER_MOVE_TOLERANCE_PX;
};

/**
 * 把输入事件流匹配成"按下 / 长按 / 双击"手势。
 *
 * - 修饰键集合要求精确一致，多按一个也不算命中
 * - 长按：按下后计时，期间松开、按了别的键、滚动或鼠标位移超出容差都会取消
 * - 双击：两次按下之间不能夹杂其他按键，鼠标还要求落点基本不动
 */
export class TriggerMatcher {
  private readonly trigger: GlobalTrigger;
  private readonly onTrigger: (gestureStartedAt: number) => void;
  private readonly setTimer: (callback: () => void, ms: number) => unknown;
  private readonly clearTimer: (handle: unknown) => void;

  private readonly targetId: string;
  private readonly ownModifier: TriggerModifier | undefined;
  private readonly requiredModifiers: ReadonlySet<TriggerModifier>;

  private readonly pressed = new Set<string>();
  private hold: { timer: unknown; point: Point } | null = null;
  private lastTap: { time: number; point: Point } | null = null;

  constructor(options: TriggerMatcherOptions) {
    this.trigger = options.trigger;
    this.onTrigger = options.onTrigger;
    this.setTimer = options.setTimer ?? ((callback, ms) => setTimeout(callback, ms));
    this.clearTimer =
      options.clearTimer ?? (handle => clearTimeout(handle as ReturnType<typeof setTimeout>));

    this.targetId = getInputId(options.trigger.input);
    this.ownModifier = getTriggerInputModifier(options.trigger.input);
    this.requiredModifiers = new Set(options.trigger.modifiers);
  }

  handle(event: TriggerInputEvent): void {
    switch (event.type) {
      case 'down':
        this.handleDown(event);
        break;
      case 'up':
        this.handleUp(event);
        break;
      case 'move':
        if (this.hold && this.trigger.input.device === 'mouse' && exceedsTolerance(this.hold.point, event)) {
          this.cancelHold();
        }
        break;
      case 'interrupt':
        this.cancelHold();
        this.lastTap = null;
        break;
    }
  }

  /** 清空全部中间状态（暂停、重启监听时调用） */
  reset(): void {
    this.cancelHold();
    this.lastTap = null;
    this.pressed.clear();
  }

  private handleDown(event: TriggerButtonEvent): void {
    const id = getInputId(event.input);
    // 按住不放时系统会不断重复发送按下事件，只认第一次
    if (this.pressed.has(id)) return;
    this.pressed.add(id);

    if (id !== this.targetId || !this.modifiersMatch(event.modifiers)) {
      this.cancelHold();
      this.lastTap = null;
      return;
    }

    const point: Point = { x: event.x, y: event.y };

    if (this.trigger.gesture === 'press') {
      this.onTrigger(event.time);
      return;
    }

    if (this.trigger.gesture === 'hold') {
      this.cancelHold();
      const timer = this.setTimer(() => {
        this.hold = null;
        if (this.pressed.has(id)) {
          this.onTrigger(event.time);
        }
      }, this.trigger.holdMs);
      this.hold = { timer, point };
      return;
    }

    const previous = this.lastTap;
    const isSecondTap =
      previous !== null &&
      event.time - previous.time <= TRIGGER_DOUBLE_INTERVAL_MS &&
      !exceedsTolerance(previous.point, point);

    if (isSecondTap) {
      this.lastTap = null;
      this.onTrigger(previous.time);
    } else {
      this.lastTap = { time: event.time, point };
    }
  }

  private handleUp(event: TriggerButtonEvent): void {
    const id = getInputId(event.input);
    this.pressed.delete(id);

    if (!this.hold) return;

    const releasedModifier = getTriggerInputModifier(event.input);
    const releasedRequiredModifier =
      releasedModifier !== undefined && this.requiredModifiers.has(releasedModifier);

    if (id === this.targetId || releasedRequiredModifier) {
      this.cancelHold();
    }
  }

  private modifiersMatch(modifiers: readonly TriggerModifier[]): boolean {
    // 主键本身是修饰键时，它会出现在事件的修饰键状态里，比较前先排除
    const active = new Set(modifiers.filter(modifier => modifier !== this.ownModifier));
    if (active.size !== this.requiredModifiers.size) return false;
    for (const modifier of this.requiredModifiers) {
      if (!active.has(modifier)) return false;
    }
    return true;
  }

  private cancelHold(): void {
    if (!this.hold) return;
    this.clearTimer(this.hold.timer);
    this.hold = null;
  }
}
