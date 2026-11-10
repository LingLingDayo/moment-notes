import {
  TRIGGER_MODIFIERS,
  TRIGGER_MOUSE_BUTTONS,
  sortTriggerModifiers,
  type GlobalTrigger,
  type TriggerInput,
  type TriggerModifier
} from './GlobalTrigger';
import { getTriggerKeyInfo } from './triggerKeys';

export const getTriggerModifierLabel = (modifier: TriggerModifier): string =>
  TRIGGER_MODIFIERS.find(item => item.id === modifier)?.label ?? modifier;

export const getTriggerInputLabel = (input: TriggerInput): string => {
  if (input.device === 'mouse') {
    return TRIGGER_MOUSE_BUTTONS.find(item => item.id === input.button)?.label ?? input.button;
  }
  return getTriggerKeyInfo(input.code)?.label ?? input.code;
};

/** 组合里每个按键的名称，修饰键在前、主键在后，例如 `['Ctrl', '鼠标中键']` */
export const getTriggerComboParts = (trigger: GlobalTrigger): string[] => [
  ...sortTriggerModifiers(trigger.modifiers).map(getTriggerModifierLabel),
  getTriggerInputLabel(trigger.input)
];

/** 触发方式的补充说明；"按下"是默认方式，不需要说明，返回空字符串 */
export const getTriggerGestureNote = (trigger: GlobalTrigger): string => {
  if (trigger.gesture === 'hold') return `长按 ${trigger.holdMs}ms`;
  if (trigger.gesture === 'double') return '双击';
  return '';
};

/** 生成可读文案，例如 `Ctrl + 鼠标中键（长按 500ms）` */
export const formatGlobalTrigger = (trigger: GlobalTrigger): string => {
  const combo = getTriggerComboParts(trigger).join(' + ');
  const note = getTriggerGestureNote(trigger);
  return note ? `${combo}（${note}）` : combo;
};
