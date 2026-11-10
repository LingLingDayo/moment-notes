import {
  TRIGGER_HOLD_MS_DEFAULT,
  TRIGGER_HOLD_MS_MAX,
  TRIGGER_HOLD_MS_MIN,
  isTriggerGesture,
  isTriggerModifier,
  isTriggerMouseButton,
  sortTriggerModifiers,
  type GlobalTrigger,
  type TriggerInput,
  type TriggerModifier
} from './GlobalTrigger';
import { getTriggerKeyInfo } from './triggerKeys';

export const clampTriggerHoldMs = (value: unknown): number => {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : TRIGGER_HOLD_MS_DEFAULT;
  return Math.min(TRIGGER_HOLD_MS_MAX, Math.max(TRIGGER_HOLD_MS_MIN, Math.round(numeric)));
};

const parseTriggerInput = (value: unknown): TriggerInput | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;

  if (raw.device === 'keyboard' && typeof raw.code === 'string') {
    // getTriggerKeyInfo 已把右侧修饰键归一到左侧
    const info = getTriggerKeyInfo(raw.code);
    return info ? { device: 'keyboard', code: info.code } : undefined;
  }
  if (raw.device === 'mouse' && isTriggerMouseButton(raw.button)) {
    return { device: 'mouse', button: raw.button };
  }
  return undefined;
};

/**
 * 把任意来源（存储、备份文件、IPC）的数据解析成规范化的触发器。
 * 只负责结构合法性；组合是否安全由 validateGlobalTrigger 判断。
 */
export const parseGlobalTrigger = (value: unknown): GlobalTrigger | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;

  const input = parseTriggerInput(raw.input);
  if (!input || !isTriggerGesture(raw.gesture) || !Array.isArray(raw.modifiers)) return undefined;
  if (!raw.modifiers.every(isTriggerModifier)) return undefined;

  return {
    enabled: raw.enabled !== false,
    modifiers: sortTriggerModifiers(raw.modifiers as TriggerModifier[]),
    input,
    gesture: raw.gesture,
    holdMs: clampTriggerHoldMs(raw.holdMs)
  };
};

/** 主键本身是修饰键时返回它对应的修饰键，否则返回 undefined */
export const getTriggerInputModifier = (input: TriggerInput): TriggerModifier | undefined =>
  input.device === 'keyboard' ? getTriggerKeyInfo(input.code)?.modifier : undefined;

/**
 * 校验触发器组合是否安全可用。
 * @returns 不合法时返回面向用户的原因，合法时返回 null
 */
export const validateGlobalTrigger = (trigger: GlobalTrigger): string | null => {
  const { input, modifiers, gesture } = trigger;

  if (input.device === 'mouse') {
    const isPrimaryButton = input.button === 'left' || input.button === 'right';
    if (isPrimaryButton && modifiers.length === 0 && gesture !== 'hold') {
      return '鼠标左键 / 右键需要搭配修饰键，或改用"长按"，否则日常点击都会唤起窗口';
    }
    return null;
  }

  const keyInfo = getTriggerKeyInfo(input.code);
  if (!keyInfo) {
    return '不支持将该按键作为唤起键';
  }

  if (keyInfo.kind === 'modifier') {
    if (modifiers.length > 0) {
      return `以 ${keyInfo.label} 作为主键时不能再叠加其他修饰键`;
    }
    if (gesture !== 'double') {
      return `单独的 ${keyInfo.label} 键只支持"双击"触发`;
    }
    return null;
  }

  if (keyInfo.kind === 'standard') {
    const hasStrongModifier = modifiers.some(modifier => modifier !== 'shift');
    if (!hasStrongModifier) {
      return '该按键需要搭配 Ctrl / Alt / Win 中的至少一个，否则会干扰正常输入';
    }
  }

  return null;
};

export type TriggerBackend = 'accelerator' | 'hook';

/**
 * 选择监听方式：
 * - accelerator：系统级快捷键，按键会被拦截，不会漏给前台应用，仅适用于"键盘 + 按下"
 * - hook：全局输入监听，能识别鼠标、长按、双击，但只监听不拦截
 */
export const resolveTriggerBackend = (trigger: GlobalTrigger): TriggerBackend =>
  trigger.input.device === 'keyboard' && trigger.gesture === 'press' ? 'accelerator' : 'hook';
