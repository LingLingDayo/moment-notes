import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  GLOBAL_TRIGGER_SETTING,
  HIDE_ON_BLUR_SETTING,
  type TriggerRegistrationResult
} from '../domain/desktop/DesktopSettings';
import { cloneGlobalTrigger, type GlobalTrigger } from '../domain/desktop/GlobalTrigger';
import { decodeSettingValue } from '../domain/settings/SettingDefinition';
import { desktopBridge } from '../infrastructure/desktop/desktopBridge';
import { settingRepository } from '../infrastructure/storage/SettingRepository';

/**
 * 桌面应用（Electron）形态专属的窗口行为设置：全局唤起快捷键、失焦自动隐藏。
 * 合法性由领域层的设置定义决定，这里只负责保存状态、持久化，并把结果同步给主进程。
 * 非桌面形态下不会初始化，所有 action 都是空操作。
 */
export const useDesktopStore = defineStore('desktopStore', () => {
  const globalTrigger = ref<GlobalTrigger>(cloneGlobalTrigger(GLOBAL_TRIGGER_SETTING.defaultValue));
  const hideOnBlur = ref<boolean>(HIDE_ON_BLUR_SETTING.defaultValue);
  /** 主进程最近一次注册快捷键的结果；尚未同步过时为 null */
  const registration = ref<TriggerRegistrationResult | null>(null);
  const isSyncing = ref(false);

  let initialized = false;
  let syncToken = 0;

  const isActive = (): boolean => initialized && desktopBridge.isAvailable();

  /** 把当前两项设置推给主进程。连续调用时只采纳最后一次的结果。 */
  const syncToMainProcess = async (): Promise<TriggerRegistrationResult | null> => {
    if (!isActive()) return null;
    const token = ++syncToken;
    isSyncing.value = true;
    const result = await desktopBridge.applyWindowSettings({
      globalTrigger: globalTrigger.value,
      hideOnBlur: hideOnBlur.value
    });
    if (token !== syncToken) return registration.value;
    registration.value = result;
    isSyncing.value = false;
    return result;
  };

  /** 只应在主窗口调用：主进程不接受独立便签窗口推送的窗口设置 */
  const init = async (): Promise<void> => {
    if (initialized || !desktopBridge.isAvailable()) return;
    initialized = true;
    globalTrigger.value = cloneGlobalTrigger(settingRepository.get(GLOBAL_TRIGGER_SETTING));
    hideOnBlur.value = settingRepository.get(HIDE_ON_BLUR_SETTING);
    await syncToMainProcess();
  };

  /**
   * 保存并应用快捷键。
   * 配置本身不合法时不保存，返回 null；合法则保存，并返回主进程的注册结果
   * （可能因为被其他程序占用而失败，此时界面应提示用户换一组）。
   */
  const setGlobalTrigger = async (value: unknown): Promise<TriggerRegistrationResult | null> => {
    if (!isActive()) return null;
    const trigger = decodeSettingValue(GLOBAL_TRIGGER_SETTING, value);
    if (!trigger) return null;
    globalTrigger.value = cloneGlobalTrigger(settingRepository.set(GLOBAL_TRIGGER_SETTING, trigger));
    return syncToMainProcess();
  };

  const resetGlobalTrigger = (): Promise<TriggerRegistrationResult | null> =>
    setGlobalTrigger(GLOBAL_TRIGGER_SETTING.defaultValue);

  const setHideOnBlur = async (value: unknown): Promise<void> => {
    if (!isActive()) return;
    const enabled = decodeSettingValue(HIDE_ON_BLUR_SETTING, value);
    if (enabled === undefined) return;
    hideOnBlur.value = settingRepository.set(HIDE_ON_BLUR_SETTING, enabled);
    await syncToMainProcess();
  };

  /** 录制快捷键期间暂停全局监听，否则按到当前快捷键会把窗口收起来 */
  const setTriggerPaused = (paused: boolean): void => {
    if (isActive()) desktopBridge.setTriggerPaused(paused);
  };

  /** 即将打开系统对话框（如文件选择）时调用，避免失焦隐藏把窗口收走 */
  const suspendAutoHideUntilFocus = (): void => {
    if (isActive()) desktopBridge.suspendAutoHideUntilFocus();
  };

  return {
    globalTrigger,
    hideOnBlur,
    registration,
    isSyncing,
    init,
    setGlobalTrigger,
    resetGlobalTrigger,
    setHideOnBlur,
    setTriggerPaused,
    suspendAutoHideUntilFocus
  };
});
