import {
  sortTriggerModifiers,
  type GlobalTrigger,
  type TriggerInput,
  type TriggerModifier,
  type TriggerMouseButton
} from './GlobalTrigger';
import { getTriggerKeyInfo } from './triggerKeys';
import { getTriggerInputModifier, validateGlobalTrigger } from './triggerValidation';

/**
 * 设置界面"录制主键"时的规则：把一次按键或鼠标点击解释成触发器的修改。
 * 纯函数，不依赖 DOM；界面只负责把事件里的字段传进来。
 */

/** 录制期间当前按住的修饰键 */
export type HeldModifiers = Readonly<Record<TriggerModifier, boolean>>;

export type KeyCaptureResult =
  /** 录到了主键，连同按住的修饰键一起提交 */
  | { type: 'commit'; input: TriggerInput; modifiers: TriggerModifier[] }
  /** 按下的是修饰键：先等着，看后面是否跟着别的键 */
  | { type: 'pending-modifier'; modifier: TriggerModifier; code: string }
  | { type: 'cancel' }
  | { type: 'unsupported' };

const heldModifierList = (held: HeldModifiers): TriggerModifier[] =>
  sortTriggerModifiers((Object.keys(held) as TriggerModifier[]).filter(modifier => held[modifier]));

/** 解释录制期间的一次键盘按下。code 取自 KeyboardEvent.code。 */
export const captureKeyDown = (code: string, held: HeldModifiers): KeyCaptureResult => {
  const info = getTriggerKeyInfo(code);
  if (!info) return { type: 'unsupported' };

  if (info.kind === 'modifier' && info.modifier) {
    return { type: 'pending-modifier', modifier: info.modifier, code: info.code };
  }

  const modifiers = heldModifierList(held);
  // 单独按 Esc 是"取消录制"；想把 Esc 设为主键需要带修饰键一起按
  if (info.code === 'Escape' && modifiers.length === 0) return { type: 'cancel' };

  return { type: 'commit', input: { device: 'keyboard', code: info.code }, modifiers };
};

/** 只按了一个修饰键就松开：把这个修饰键本身当作主键（如"双击 Ctrl"） */
export const captureLoneModifier = (code: string): KeyCaptureResult => {
  const info = getTriggerKeyInfo(code);
  if (!info || info.kind !== 'modifier') return { type: 'unsupported' };
  return { type: 'commit', input: { device: 'keyboard', code: info.code }, modifiers: [] };
};

/** MouseEvent.button → 鼠标按键 */
const DOM_MOUSE_BUTTONS: Readonly<Record<number, TriggerMouseButton>> = {
  0: 'left',
  1: 'middle',
  2: 'right',
  3: 'x1',
  4: 'x2'
};

/** 解释录制区内的一次鼠标按下。button 取自 MouseEvent.button。 */
export const captureMouseDown = (button: number, held: HeldModifiers): KeyCaptureResult => {
  const mouseButton = DOM_MOUSE_BUTTONS[button];
  if (!mouseButton) return { type: 'unsupported' };
  return { type: 'commit', input: { device: 'mouse', button: mouseButton }, modifiers: heldModifierList(held) };
};

/**
 * 把录到的主键和修饰键写进触发器。
 * 如果原来的触发方式和新主键搭配不合法，改成能用的方式，避免录完立刻报错：
 * - 修饰键作主键 → 只能"双击"
 * - 不带修饰键的鼠标左键 / 右键 → 只能"长按"
 */
export const applyCapturedInput = (
  trigger: GlobalTrigger,
  input: TriggerInput,
  modifiers: readonly TriggerModifier[]
): GlobalTrigger => {
  const next: GlobalTrigger = {
    ...trigger,
    input: { ...input },
    modifiers: sortTriggerModifiers(modifiers)
  };
  if (validateGlobalTrigger(next) === null) return next;

  if (getTriggerInputModifier(input)) {
    return { ...next, modifiers: [], gesture: 'double' };
  }
  if (input.device === 'mouse' && next.modifiers.length === 0) {
    return { ...next, gesture: 'hold' };
  }
  return next;
};

/** 主键本身是修饰键时，不能再叠加修饰键，界面据此禁用修饰键选择 */
export const canCombineModifiers = (input: TriggerInput): boolean => getTriggerInputModifier(input) === undefined;

/** 切换某个修饰键的选中状态 */
export const toggleTriggerModifier = (trigger: GlobalTrigger, modifier: TriggerModifier): GlobalTrigger => {
  if (!canCombineModifiers(trigger.input)) return trigger;
  const modifiers = trigger.modifiers.includes(modifier)
    ? trigger.modifiers.filter(item => item !== modifier)
    : [...trigger.modifiers, modifier];
  return { ...trigger, modifiers: sortTriggerModifiers(modifiers) };
};
