import { describe, expect, it, vi } from 'vitest';
import type { AppSettings } from '@type';
import { DEFAULT_GLOBAL_TRIGGER, type GlobalTrigger } from '../domain/desktop/GlobalTrigger';
import type { SettingPlatform } from '../domain/settings/SettingDefinition';
import { applyDesktopSettings, getDesktopSettings, type DesktopSettingsStore } from './desktopSettingsHelper';
import { applySettings, getCurrentSettings } from './settingsHelper';

const middleHold: GlobalTrigger = {
  enabled: true,
  modifiers: [],
  input: { device: 'mouse', button: 'middle' },
  gesture: 'hold',
  holdMs: 600
};

const createContext = (platform: SettingPlatform, overrides: Partial<DesktopSettingsStore> = {}) => {
  const store: DesktopSettingsStore = {
    globalTrigger: middleHold,
    hideOnBlur: true,
    setGlobalTrigger: vi.fn(),
    setHideOnBlur: vi.fn(),
    ...overrides
  };
  const resolveStore = vi.fn(() => store);
  return { store, resolveStore, context: { platform, resolveStore } };
};

describe('desktopSettingsHelper', () => {
  it('桌面形态下导出两项桌面设置，且导出的是副本', () => {
    const { store, context } = createContext('electron');

    const exported = getDesktopSettings(context);

    expect(exported).toEqual({ globalTrigger: middleHold, hideOnBlur: true });
    expect(exported.globalTrigger).not.toBe(store.globalTrigger);
  });

  it.each<SettingPlatform>(['utools', 'browser'])('%s 形态下不导出桌面设置，也不访问 Store', platform => {
    const { resolveStore, context } = createContext(platform);

    expect(getDesktopSettings(context)).toEqual({});
    expect(resolveStore).not.toHaveBeenCalled();
  });

  it('桌面形态下把备份里的桌面设置交给 Store 应用', () => {
    const { store, context } = createContext('electron');

    applyDesktopSettings({ globalTrigger: DEFAULT_GLOBAL_TRIGGER, hideOnBlur: false }, context);

    expect(store.setGlobalTrigger).toHaveBeenCalledWith(DEFAULT_GLOBAL_TRIGGER);
    expect(store.setHideOnBlur).toHaveBeenCalledWith(false);
  });

  it('备份里没有的桌面设置不会被改动', () => {
    const { store, resolveStore, context } = createContext('electron');

    applyDesktopSettings({ theme: 'dark' }, context);
    expect(resolveStore).not.toHaveBeenCalled();

    applyDesktopSettings({ hideOnBlur: true }, context);
    expect(store.setHideOnBlur).toHaveBeenCalledWith(true);
    expect(store.setGlobalTrigger).not.toHaveBeenCalled();
  });

  it.each<SettingPlatform>(['utools', 'browser'])('%s 形态下忽略备份里的桌面设置', platform => {
    const { store, resolveStore, context } = createContext(platform);

    applyDesktopSettings({ globalTrigger: middleHold, hideOnBlur: true }, context);

    expect(resolveStore).not.toHaveBeenCalled();
    expect(store.setGlobalTrigger).not.toHaveBeenCalled();
    expect(store.setHideOnBlur).not.toHaveBeenCalled();
  });
});

describe('settingsHelper 与桌面设置的衔接', () => {
  const uiStore = { isDark: false };
  const noteStore = {};
  const shortcutStore = { shortcuts: [] };
  const categoryStore = { collapsedCategoryIds: [] };

  it('非桌面形态下导出的设置不包含桌面专属项', () => {
    const settings = getCurrentSettings(uiStore, noteStore, shortcutStore, categoryStore);

    expect(settings).not.toHaveProperty('globalTrigger');
    expect(settings).not.toHaveProperty('hideOnBlur');
  });

  it('非桌面形态下恢复带桌面设置的备份不会报错', () => {
    const settings: AppSettings = { globalTrigger: middleHold, hideOnBlur: true };

    expect(() => applySettings(settings, uiStore, noteStore, shortcutStore, categoryStore)).not.toThrow();
  });
});
