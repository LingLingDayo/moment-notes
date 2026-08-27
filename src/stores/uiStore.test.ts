import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUiStore } from './uiStore';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

describe('uiStore 持久化与规范单测', () => {
  let storeMap: Map<string, string>;

  beforeEach(() => {
    setActivePinia(createPinia());
    storeMap = new Map<string, string>();
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

    uiStore.setDoubleClickNoteAction('none');
    expect(uiStore.doubleClickNoteAction).toBe('none');
    expect(globalThis.localStorage.getItem('sticky_notes_double_click_note_action')).toBe('none');

    uiStore.setDoubleClickNoteAction('invalid' as any);
    expect(uiStore.doubleClickNoteAction).toBe('copyAndPaste');
    expect(globalThis.localStorage.getItem('sticky_notes_double_click_note_action')).toBe('copyAndPaste');
  });

  it('doubleClickNoteAction 应在 Store 初始化时读取并修复持久化值', () => {
    storeMap.set('sticky_notes_double_click_note_action', 'fullscreen');
    expect(useUiStore().doubleClickNoteAction).toBe('fullscreen');

    setActivePinia(createPinia());
    storeMap.set('sticky_notes_double_click_note_action', 'invalid');

    expect(useUiStore().doubleClickNoteAction).toBe('copyAndPaste');
    expect(storeMap.get('sticky_notes_double_click_note_action')).toBe('copyAndPaste');
  });

  it('skipDeleteConfirm 默认应为 false 并支持变更持久化', () => {
    const uiStore = useUiStore();
    expect(uiStore.skipDeleteConfirm).toBe(false);

    uiStore.setSkipDeleteConfirm(true);
    expect(uiStore.skipDeleteConfirm).toBe(true);
    expect(globalThis.localStorage.getItem('sticky_notes_skip_delete_confirm')).toBe('true');

    uiStore.setSkipDeleteConfirm(false);
    expect(uiStore.skipDeleteConfirm).toBe(false);
    expect(globalThis.localStorage.getItem('sticky_notes_skip_delete_confirm')).toBe('false');
  });

  it('enableImmersiveFullscreen 默认应为 false 并支持变更持久化', () => {
    const uiStore = useUiStore();
    expect(uiStore.enableImmersiveFullscreen).toBe(false);

    uiStore.setEnableImmersiveFullscreen(true);
    expect(uiStore.enableImmersiveFullscreen).toBe(true);
    expect(globalThis.localStorage.getItem('sticky_notes_enable_immersive_fullscreen')).toBe('true');

    uiStore.setEnableImmersiveFullscreen(false);
    expect(uiStore.enableImmersiveFullscreen).toBe(false);
    expect(globalThis.localStorage.getItem('sticky_notes_enable_immersive_fullscreen')).toBe('false');
  });
});
