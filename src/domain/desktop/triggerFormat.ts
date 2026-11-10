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

/** 生成可读文案，例如 `Ctrl + 鼠标中键（长按 500ms）` */
export const formatGlobalTrigger = (trigger: GlobalTrigger): string => {
  const combo = [
    ...sortTriggerModifiers(trigger.modifiers).map(getTriggerModifierLabel),
    getTriggerInputLabel(trigger.input)
  ].join(' + ');

  if (trigger.gesture === 'hold') return `${combo}（长按 ${trigger.holdMs}ms）`;
  if (trigger.gesture === 'double') return `${combo}（双击）`;
  return combo;
};
