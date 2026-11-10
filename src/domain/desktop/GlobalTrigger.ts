/**
 * 全局唤起触发器的领域模型。
 * 这里是修饰键、鼠标按键、触发方式的唯一定义来源：界面选项、校验、文案与主进程匹配都从这里派生。
 */

export const TRIGGER_MODIFIERS = [
  { id: 'ctrl', label: 'Ctrl' },
  { id: 'alt', label: 'Alt' },
  { id: 'shift', label: 'Shift' },
  { id: 'meta', label: 'Win' }
] as const;

export type TriggerModifier = (typeof TRIGGER_MODIFIERS)[number]['id'];

export const TRIGGER_MOUSE_BUTTONS = [
  { id: 'left', label: '鼠标左键' },
  { id: 'right', label: '鼠标右键' },
  { id: 'middle', label: '鼠标中键' },
  { id: 'x1', label: '鼠标侧键 1（后退）' },
  { id: 'x2', label: '鼠标侧键 2（前进）' }
] as const;

export type TriggerMouseButton = (typeof TRIGGER_MOUSE_BUTTONS)[number]['id'];

export const TRIGGER_GESTURES = [
  { id: 'press', label: '按下', tooltip: '按下的瞬间触发' },
  { id: 'hold', label: '长按', tooltip: '按住达到设定时长后触发，提前松开或移动鼠标则不触发' },
  { id: 'double', label: '双击', tooltip: '短时间内连续按下两次触发' }
] as const;

export type TriggerGesture = (typeof TRIGGER_GESTURES)[number]['id'];

export type TriggerInput =
  | { device: 'keyboard'; code: string }
  | { device: 'mouse'; button: TriggerMouseButton };

export interface GlobalTrigger {
  enabled: boolean;
  modifiers: TriggerModifier[];
  input: TriggerInput;
  gesture: TriggerGesture;
  /** 长按判定时长（毫秒），仅 gesture 为 hold 时生效 */
  holdMs: number;
}

export const TRIGGER_HOLD_MS_MIN = 200;
export const TRIGGER_HOLD_MS_MAX = 2000;
export const TRIGGER_HOLD_MS_STEP = 50;
export const TRIGGER_HOLD_MS_DEFAULT = 500;

/** 双击判定：两次按下的最大间隔 */
export const TRIGGER_DOUBLE_INTERVAL_MS = 400;
/** 长按 / 双击期间允许的鼠标位移，超过则视为拖拽 */
export const TRIGGER_MOVE_TOLERANCE_PX = 8;

export const DEFAULT_GLOBAL_TRIGGER: GlobalTrigger = {
  enabled: true,
  modifiers: ['ctrl', 'alt'],
  input: { device: 'keyboard', code: 'KeyN' },
  gesture: 'press',
  holdMs: TRIGGER_HOLD_MS_DEFAULT
};

const modifierOrder = new Map<string, number>(
  TRIGGER_MODIFIERS.map((modifier, index) => [modifier.id, index])
);

export const isTriggerModifier = (value: unknown): value is TriggerModifier =>
  typeof value === 'string' && modifierOrder.has(value);

export const isTriggerMouseButton = (value: unknown): value is TriggerMouseButton =>
  TRIGGER_MOUSE_BUTTONS.some(button => button.id === value);

export const isTriggerGesture = (value: unknown): value is TriggerGesture =>
  TRIGGER_GESTURES.some(gesture => gesture.id === value);

/** 去重并按固定顺序排列修饰键，保证同一组合只有一种表示 */
export const sortTriggerModifiers = (modifiers: readonly TriggerModifier[]): TriggerModifier[] =>
  Array.from(new Set(modifiers)).sort(
    (a, b) => (modifierOrder.get(a) ?? 0) - (modifierOrder.get(b) ?? 0)
  );

export const cloneGlobalTrigger = (trigger: GlobalTrigger): GlobalTrigger => ({
  enabled: trigger.enabled,
  modifiers: [...trigger.modifiers],
  input: { ...trigger.input },
  gesture: trigger.gesture,
  holdMs: trigger.holdMs
});

const isSameTriggerInput = (a: TriggerInput, b: TriggerInput): boolean => {
  if (a.device === 'keyboard') return b.device === 'keyboard' && a.code === b.code;
  return b.device === 'mouse' && a.button === b.button;
};

/** 两个触发器的配置是否完全一致（修饰键不看顺序） */
export const isSameGlobalTrigger = (a: GlobalTrigger, b: GlobalTrigger): boolean =>
  a.enabled === b.enabled &&
  a.gesture === b.gesture &&
  a.holdMs === b.holdMs &&
  isSameTriggerInput(a.input, b.input) &&
  sortTriggerModifiers(a.modifiers).join('+') === sortTriggerModifiers(b.modifiers).join('+');
