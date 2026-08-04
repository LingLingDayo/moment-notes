import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUiStore } from './uiStore';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

describe('uiStore 持久化与规范单测', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const storeMap = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (key: string) => storeMap.get(key) || null,
      setItem: (key: string, value: string) => storeMap.set(key, value),
      removeItem: (key: string) => storeMap.delete(key),
      clear: () => storeMap.clear(),
      length: 0,
      key: () => null
    } as any;
  });

  it('initTheme 应该优先使用本地存储的主题设置', async () => {
    const uiStorePath = path.resolve('src/stores/uiStore.ts');
    const source = await readFile(uiStorePath, 'utf8');

    const storedThemeIdx = source.indexOf("const storedTheme = storage.getItem('sticky_notes_theme');");
    const utoolsEnvIdx = source.indexOf('else if (isUtoolsEnv)');

    expect(storedThemeIdx).not.toBe(-1);
    expect(utoolsEnvIdx).not.toBe(-1);
    expect(storedThemeIdx).toBeLessThan(utoolsEnvIdx);
  });

  it('doubleClickNoteAction 默认应为 copyAndPaste 并支持变更', () => {
    const uiStore = useUiStore();
    expect(uiStore.doubleClickNoteAction).toBe('copyAndPaste');

    uiStore.setDoubleClickNoteAction('fullscreen');
    expect(uiStore.doubleClickNoteAction).toBe('fullscreen');

    uiStore.setDoubleClickNoteAction('delete');
    expect(uiStore.doubleClickNoteAction).toBe('delete');
  });
});
