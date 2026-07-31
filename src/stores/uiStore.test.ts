import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

describe('uiStore 持久化与规范单测', () => {
  it('initTheme 应该优先使用本地存储的主题设置', async () => {
    const uiStorePath = path.resolve('src/stores/uiStore.ts');
    const source = await readFile(uiStorePath, 'utf8');

    const storedThemeIdx = source.indexOf("const storedTheme = storage.getItem('sticky_notes_theme');");
    const utoolsEnvIdx = source.indexOf('else if (isUtoolsEnv)');

    expect(storedThemeIdx).not.toBe(-1);
    expect(utoolsEnvIdx).not.toBe(-1);
    expect(storedThemeIdx).toBeLessThan(utoolsEnvIdx);
  });
});
