import { describe, it, expect } from 'vitest';
import {
  APP_SETTING_DEFINITIONS,
  APP_SETTINGS_MAP,
  getSettingDefinition,
  ENABLE_AUTO_COPY_SELECTION_SETTING,
  GRID_COLUMNS_SETTING,
  MIN_NOTE_WIDTH_SETTING,
  SORT_MODE_SETTING
} from './AppSettingRegistry';
import { decodeSettingValue, resolveSettingValue } from './SettingDefinition';

describe('AppSettingRegistry 领域设置注册表', () => {
  it('注册表中所有设置项均具备合法的 key、storageKey 与 defaultValue', () => {
    expect(APP_SETTING_DEFINITIONS.length).toBeGreaterThan(20);

    for (const def of APP_SETTING_DEFINITIONS) {
      expect(def.key).toBeTruthy();
      expect(def.storageKey).toBeTruthy();
      expect(def.codec).toBeDefined();
      expect(APP_SETTINGS_MAP.get(def.key)).toBe(def);
      expect(getSettingDefinition(def.key)).toBe(def);
    }
  });

  it('ENABLE_AUTO_COPY_SELECTION_SETTING 正确编解码', () => {
    expect(ENABLE_AUTO_COPY_SELECTION_SETTING.defaultValue).toBe(true);
    expect(decodeSettingValue(ENABLE_AUTO_COPY_SELECTION_SETTING, 'false')).toBe(false);
    expect(decodeSettingValue(ENABLE_AUTO_COPY_SELECTION_SETTING, false)).toBe(false);
    expect(decodeSettingValue(ENABLE_AUTO_COPY_SELECTION_SETTING, 'invalid')).toBeUndefined();
    expect(resolveSettingValue(ENABLE_AUTO_COPY_SELECTION_SETTING, 'invalid')).toBe(true);
  });

  it('GRID_COLUMNS_SETTING 支持 auto 与数字 1..4', () => {
    expect(decodeSettingValue(GRID_COLUMNS_SETTING, 'auto')).toBe('auto');
    expect(decodeSettingValue(GRID_COLUMNS_SETTING, '3')).toBe(3);
    expect(decodeSettingValue(GRID_COLUMNS_SETTING, 2)).toBe(2);
    expect(decodeSettingValue(GRID_COLUMNS_SETTING, 5)).toBeUndefined();
  });

  it('MIN_NOTE_WIDTH_SETTING 范围约束与数字解码', () => {
    expect(decodeSettingValue(MIN_NOTE_WIDTH_SETTING, '280')).toBe(280);
    expect(decodeSettingValue(MIN_NOTE_WIDTH_SETTING, 50)).toBeUndefined(); // 小于 min 100
    expect(decodeSettingValue(MIN_NOTE_WIDTH_SETTING, 'abc')).toBeUndefined();
  });

  it('SORT_MODE_SETTING 枚举白名单过滤', () => {
    expect(decodeSettingValue(SORT_MODE_SETTING, 'title')).toBe('title');
    expect(decodeSettingValue(SORT_MODE_SETTING, 'date')).toBe('date');
    expect(decodeSettingValue(SORT_MODE_SETTING, 'unknown')).toBeUndefined();
  });
});
