import { describe, expect, it } from 'vitest';
import { DOUBLE_CLICK_NOTE_ACTION_SETTING } from '../../domain/noteInteractions/DoubleClickNoteActionRegistry';
import { SettingRepository, SettingStorageAdapter } from './SettingRepository';

const createStorageAdapter = (initialValues: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initialValues));
  const adapter: SettingStorageAdapter = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };

  return { adapter, values };
};

describe('SettingRepository', () => {
  it('缺少存储值时应返回领域默认值', () => {
    const { adapter, values } = createStorageAdapter();
    const repository = new SettingRepository(adapter);

    expect(repository.get(DOUBLE_CLICK_NOTE_ACTION_SETTING)).toBe('copyAndPaste');
    expect(values.size).toBe(0);
  });

  it('应读取合法值并将非法存储值修复为默认值', () => {
    const storageKey = DOUBLE_CLICK_NOTE_ACTION_SETTING.storageKey;
    const { adapter, values } = createStorageAdapter({ [storageKey]: 'fullscreen' });
    const repository = new SettingRepository(adapter);

    expect(repository.get(DOUBLE_CLICK_NOTE_ACTION_SETTING)).toBe('fullscreen');

    values.set(storageKey, 'invalid');
    expect(repository.get(DOUBLE_CLICK_NOTE_ACTION_SETTING)).toBe('copyAndPaste');
    expect(values.get(storageKey)).toBe('copyAndPaste');
  });

  it('写入时应统一完成规范化与序列化', () => {
    const { adapter, values } = createStorageAdapter();
    const repository = new SettingRepository(adapter);
    const storageKey = DOUBLE_CLICK_NOTE_ACTION_SETTING.storageKey;

    expect(repository.set(DOUBLE_CLICK_NOTE_ACTION_SETTING, 'none')).toBe('none');
    expect(values.get(storageKey)).toBe('none');

    expect(repository.set(DOUBLE_CLICK_NOTE_ACTION_SETTING, 'invalid')).toBe('copyAndPaste');
    expect(values.get(storageKey)).toBe('copyAndPaste');
  });
});
