import { booleanSettingCodec, type SettingDefinition } from '../settings/SettingDefinition';
import { DEFAULT_GLOBAL_TRIGGER, type GlobalTrigger } from './GlobalTrigger';
import { parseGlobalTrigger, validateGlobalTrigger, type TriggerBackend } from './triggerValidation';

/**
 * 仅在 Electron 桌面应用形态下生效的设置。
 * platforms 是界面可见性、备份导入导出是否处理这些设置的唯一依据。
 */
const DESKTOP_PLATFORMS = ['electron'] as const;

const decodeGlobalTrigger = (value: unknown): GlobalTrigger | undefined => {
  let raw = value;
  // 存储里是 JSON 字符串，备份文件里是对象，两种都要能解析
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return undefined;
    }
  }
  const trigger = parseGlobalTrigger(raw);
  if (!trigger || validateGlobalTrigger(trigger) !== null) return undefined;
  return trigger;
};

export const GLOBAL_TRIGGER_SETTING = {
  key: 'globalTrigger',
  storageKey: 'sticky_notes_global_trigger',
  defaultValue: DEFAULT_GLOBAL_TRIGGER,
  platforms: DESKTOP_PLATFORMS,
  codec: {
    decode: decodeGlobalTrigger,
    encode: (value: GlobalTrigger) => JSON.stringify(value)
  }
} satisfies SettingDefinition<'globalTrigger', GlobalTrigger>;

export const HIDE_ON_BLUR_SETTING = {
  key: 'hideOnBlur',
  storageKey: 'sticky_notes_hide_on_blur',
  defaultValue: false,
  platforms: DESKTOP_PLATFORMS,
  codec: booleanSettingCodec
} satisfies SettingDefinition<'hideOnBlur', boolean>;

/** 渲染进程推送给主进程的窗口行为设置 */
export interface DesktopWindowSettings {
  globalTrigger: GlobalTrigger;
  hideOnBlur: boolean;
}

/** 主进程注册触发器后的结果，用于在设置界面反馈是否真正生效 */
export interface TriggerRegistrationResult {
  ok: boolean;
  /** 实际使用的监听方式；触发器被停用时为 none */
  backend: TriggerBackend | 'none';
  message?: string;
}
