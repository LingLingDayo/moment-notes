import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

test('uiStore.ts 中的 initTheme 优先使用本地存储的主题设置', async () => {
  const uiStorePath = path.resolve('src/stores/uiStore.ts');
  const source = await readFile(uiStorePath, 'utf8');

  // 验证 storedTheme 逻辑在 initTheme 中优先于 isUtoolsEnv 条件执行
  const storedThemeIdx = source.indexOf("const storedTheme = storage.getItem('sticky_notes_theme');");
  const utoolsEnvIdx = source.indexOf('else if (isUtoolsEnv)');

  assert.ok(storedThemeIdx !== -1, '应该调用 storage.getItem 获取 sticky_notes_theme');
  assert.ok(utoolsEnvIdx !== -1, '应该包含 else if (isUtoolsEnv)');
  assert.ok(storedThemeIdx < utoolsEnvIdx, 'storedTheme 逻辑必须在 isUtoolsEnv 之前检查');
});
