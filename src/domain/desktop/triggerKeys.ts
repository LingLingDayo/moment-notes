import type { TriggerModifier } from './GlobalTrigger';

/**
 * 可作为触发主键的键盘按键表，键名使用 KeyboardEvent.code（与键盘布局无关）。
 * - modifier：修饰键本身（只允许"双击"触发）
 * - function：F1–F24，可以不带修饰键
 * - standard：其余按键，必须搭配 Ctrl / Alt / Win
 */
export type TriggerKeyKind = 'modifier' | 'function' | 'standard';

export interface TriggerKeyInfo {
  code: string;
  label: string;
  kind: TriggerKeyKind;
  modifier?: TriggerModifier;
}

const range = (count: number, start = 0): number[] =>
  Array.from({ length: count }, (_, index) => index + start);

const letters: TriggerKeyInfo[] = range(26).map(index => {
  const letter = String.fromCharCode(65 + index);
  return { code: `Key${letter}`, label: letter, kind: 'standard' };
});

const digits: TriggerKeyInfo[] = range(10).map(digit => ({
  code: `Digit${digit}`,
  label: String(digit),
  kind: 'standard'
}));

const functionKeys: TriggerKeyInfo[] = range(24, 1).map(index => ({
  code: `F${index}`,
  label: `F${index}`,
  kind: 'function'
}));

const numpadDigits: TriggerKeyInfo[] = range(10).map(digit => ({
  code: `Numpad${digit}`,
  label: `小键盘 ${digit}`,
  kind: 'standard'
}));

const namedKeys: Array<[code: string, label: string]> = [
  ['Space', 'Space'],
  ['Enter', 'Enter'],
  ['Tab', 'Tab'],
  ['Escape', 'Esc'],
  ['Backspace', 'Backspace'],
  ['Delete', 'Delete'],
  ['Insert', 'Insert'],
  ['Home', 'Home'],
  ['End', 'End'],
  ['PageUp', 'PageUp'],
  ['PageDown', 'PageDown'],
  ['ArrowUp', '↑'],
  ['ArrowDown', '↓'],
  ['ArrowLeft', '←'],
  ['ArrowRight', '→'],
  ['Backquote', '`'],
  ['Minus', '-'],
  ['Equal', '='],
  ['BracketLeft', '['],
  ['BracketRight', ']'],
  ['Backslash', '\\'],
  ['Semicolon', ';'],
  ['Quote', '\''],
  ['Comma', ','],
  ['Period', '.'],
  ['Slash', '/'],
  ['NumpadAdd', '小键盘 +'],
  ['NumpadSubtract', '小键盘 -'],
  ['NumpadMultiply', '小键盘 *'],
  ['NumpadDivide', '小键盘 /'],
  ['NumpadDecimal', '小键盘 .']
];

const modifierKeys: TriggerKeyInfo[] = [
  { code: 'ControlLeft', label: 'Ctrl', kind: 'modifier', modifier: 'ctrl' },
  { code: 'AltLeft', label: 'Alt', kind: 'modifier', modifier: 'alt' },
  { code: 'ShiftLeft', label: 'Shift', kind: 'modifier', modifier: 'shift' },
  { code: 'MetaLeft', label: 'Win', kind: 'modifier', modifier: 'meta' }
];

export const TRIGGER_KEYS: readonly TriggerKeyInfo[] = [
  ...letters,
  ...digits,
  ...functionKeys,
  ...namedKeys.map(([code, label]): TriggerKeyInfo => ({ code, label, kind: 'standard' })),
  ...numpadDigits,
  ...modifierKeys
];

const keyInfoByCode = new Map(TRIGGER_KEYS.map(info => [info.code, info]));

// 左右两侧的修饰键视为同一个键，统一记成左侧的 code
const RIGHT_TO_LEFT_MODIFIER: Record<string, string> = {
  ControlRight: 'ControlLeft',
  AltRight: 'AltLeft',
  ShiftRight: 'ShiftLeft',
  MetaRight: 'MetaLeft'
};

export const canonicalizeKeyCode = (code: string): string => RIGHT_TO_LEFT_MODIFIER[code] ?? code;

export const getTriggerKeyInfo = (code: string): TriggerKeyInfo | undefined =>
  keyInfoByCode.get(canonicalizeKeyCode(code));

export const isSupportedTriggerKey = (code: string): boolean => getTriggerKeyInfo(code) !== undefined;
