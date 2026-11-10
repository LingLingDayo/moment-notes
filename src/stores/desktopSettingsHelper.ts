import type { AppSettings } from '@type';
import { GLOBAL_TRIGGER_SETTING, HIDE_ON_BLUR_SETTING } from '../domain/desktop/DesktopSettings';
import { cloneGlobalTrigger, type GlobalTrigger } from '../domain/desktop/GlobalTrigger';
import { isSettingAvailableOn, type SettingPlatform } from '../domain/settings/SettingDefinition';
import { getRuntimePlatform } from '../infrastructure/platform/platform';
import { useDesktopStore } from './desktopStore';

/** 备份导入导出只依赖 desktopStore 的这一小部分，便于单独测试 */
export interface DesktopSettingsStore {
  globalTrigger: GlobalTrigger;
  hideOnBlur: boolean;
  setGlobalTrigger(value: unknown): unknown;
  setHideOnBlur(value: unknown): unknown;
}

export interface DesktopSettingsContext {
  platform: SettingPlatform;
  resolveStore: () => DesktopSettingsStore;
}

const defaultContext = (): DesktopSettingsContext => ({
  platform: getRuntimePlatform(),
  resolveStore: useDesktopStore
});

/** 桌面专属设置是否参与备份，完全由设置定义里的适用平台决定 */
const isAvailable = (platform: SettingPlatform): boolean =>
  isSettingAvailableOn(GLOBAL_TRIGGER_SETTING, platform) && isSettingAvailableOn(HIDE_ON_BLUR_SETTING, platform);

/** 导出备份时附带的桌面专属设置；非桌面形态下返回空对象，不往备份里写这两项 */
export const getDesktopSettings = (
  context: DesktopSettingsContext = defaultContext()
): Pick<AppSettings, 'globalTrigger' | 'hideOnBlur'> => {
  if (!isAvailable(context.platform)) return {};
  const store = context.resolveStore();
  return {
    globalTrigger: cloneGlobalTrigger(store.globalTrigger),
    hideOnBlur: store.hideOnBlur
  };
};

/**
 * 恢复备份里的桌面专属设置；非桌面形态下直接忽略。
 * 取值是否合法由 desktopStore 按设置定义校验，不合法的值会被丢弃。
 */
export const applyDesktopSettings = (
  settings: AppSettings,
  context: DesktopSettingsContext = defaultContext()
): void => {
  if (!isAvailable(context.platform)) return;
  if (settings.globalTrigger === undefined && settings.hideOnBlur === undefined) return;
  const store = context.resolveStore();
  if (settings.hideOnBlur !== undefined) {
    void store.setHideOnBlur(settings.hideOnBlur);
  }
  if (settings.globalTrigger !== undefined) {
    void store.setGlobalTrigger(settings.globalTrigger);
  }
};
