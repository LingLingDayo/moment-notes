import type { GlobalTrigger, TriggerModifier, TriggerMouseButton } from '../../../src/domain/desktop/GlobalTrigger';
import { TRIGGER_KEYS } from '../../../src/domain/desktop/triggerKeys';

/**
 * 领域层用 KeyboardEvent.code 描述按键，这里负责翻译成两套后端各自的键名：
 * Electron globalShortcut 的 accelerator，以及 uiohook 的 UiohookKey。
 */

const ACCELERATOR_MODIFIERS: Record<TriggerModifier, string> = {
  ctrl: 'Control',
  alt: 'Alt',
  shift: 'Shift',
  meta: 'Super'
};

const ACCELERATOR_NAMED_KEYS: Record<string, string> = {
  Space: 'Space',
  Enter: 'Enter',
  Tab: 'Tab',
  Escape: 'Esc',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Insert: 'Insert',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: '\'',
  Comma: ',',
  Period: '.',
  Slash: '/',
  NumpadAdd: 'numadd',
  NumpadSubtract: 'numsub',
  NumpadMultiply: 'nummult',
  NumpadDivide: 'numdiv',
  NumpadDecimal: 'numdec'
};

/** KeyboardEvent.code → accelerator 里的键名；修饰键等无法表达的按键返回 undefined */
export const getAcceleratorKey = (code: string): string | undefined => {
  const letter = /^Key([A-Z])$/.exec(code);
  if (letter) return letter[1];

  const digit = /^Digit(\d)$/.exec(code);
  if (digit) return digit[1];

  if (/^F([1-9]|1\d|2[0-4])$/.test(code)) return code;

  const numpadDigit = /^Numpad(\d)$/.exec(code);
  if (numpadDigit) return `num${numpadDigit[1]}`;

  return ACCELERATOR_NAMED_KEYS[code];
};

/** 把"键盘 + 按下"触发器转换成 accelerator，例如 `Control+Alt+N`；无法表达时返回 undefined */
export const buildAccelerator = (trigger: GlobalTrigger): string | undefined => {
  if (trigger.input.device !== 'keyboard' || trigger.gesture !== 'press') return undefined;
  const key = getAcceleratorKey(trigger.input.code);
  if (!key) return undefined;
  return [...trigger.modifiers.map(modifier => ACCELERATOR_MODIFIERS[modifier]), key].join('+');
};

const UIOHOOK_MODIFIER_KEY_NAMES: Record<string, string> = {
  ControlLeft: 'Ctrl',
  ControlRight: 'CtrlRight',
  AltLeft: 'Alt',
  AltRight: 'AltRight',
  ShiftLeft: 'Shift',
  ShiftRight: 'ShiftRight',
  MetaLeft: 'Meta',
  MetaRight: 'MetaRight'
};

/** KeyboardEvent.code → UiohookKey 的属性名 */
export const getUiohookKeyName = (code: string): string => {
  const modifierName = UIOHOOK_MODIFIER_KEY_NAMES[code];
  if (modifierName) return modifierName;

  const letter = /^Key([A-Z])$/.exec(code);
  if (letter) return letter[1];

  const digit = /^Digit(\d)$/.exec(code);
  if (digit) return digit[1];

  return code;
};

/**
 * 根据 uiohook 的键码表生成"键码 → KeyboardEvent.code"的反查表。
 * 表里没有的键码由调用方当作"其他按键"处理。
 */
export const buildKeycodeLookup = (uiohookKeys: Readonly<Record<string, number>>): Map<number, string> => {
  const lookup = new Map<number, string>();
  const codes = [...TRIGGER_KEYS.map(info => info.code), ...Object.keys(UIOHOOK_MODIFIER_KEY_NAMES)];
  for (const code of codes) {
    const keycode = uiohookKeys[getUiohookKeyName(code)];
    if (typeof keycode === 'number' && !lookup.has(keycode)) {
      lookup.set(keycode, code);
    }
  }
  return lookup;
};

/** uiohook 的鼠标按键编号（libuiohook 的 MOUSE_BUTTON1–5） */
const UIOHOOK_MOUSE_BUTTONS: Record<number, TriggerMouseButton> = {
  1: 'left',
  2: 'right',
  3: 'middle',
  4: 'x1',
  5: 'x2'
};

export const getMouseButton = (button: unknown): TriggerMouseButton | undefined =>
  typeof button === 'number' ? UIOHOOK_MOUSE_BUTTONS[button] : undefined;
