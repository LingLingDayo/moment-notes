import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const SOURCE_ROOT = path.resolve('src');
const STYLE_FILE_EXTENSIONS = new Set(['.css', '.scss', '.vue']);

async function collectStyleFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async entry => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectStyleFiles(entryPath);
      return STYLE_FILE_EXTENSIONS.has(path.extname(entry.name)) ? [entryPath] : [];
    })
  );

  return files.flat();
}

test('源码样式不使用实时背景模糊', async () => {
  const files = await collectStyleFiles(SOURCE_ROOT);
  const violations = [];

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    if (/backdrop-filter\s*:|filter\s*:\s*blur\(/u.test(source)) {
      violations.push(path.relative(process.cwd(), file));
    }
  }

  assert.deepEqual(violations, []);
});

test('常驻合成提示不包含无法合成的阴影属性', async () => {
  const files = await collectStyleFiles(SOURCE_ROOT);
  const violations = [];

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    if (/will-change\s*:[^;]*box-shadow/u.test(source)) {
      violations.push(path.relative(process.cwd(), file));
    }
  }

  assert.deepEqual(violations, []);
});

test('动画只声明实际参与过渡的属性', async () => {
  const files = await collectStyleFiles(SOURCE_ROOT);
  const violations = [];

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    if (/transition\s*:\s*all(?:\s|;)/u.test(source)) {
      violations.push(path.relative(process.cwd(), file));
    }
  }

  assert.deepEqual(violations, []);
});

test('便签卡片不会为每个实例常驻创建合成层', async () => {
  const noteCardRoot = path.join(SOURCE_ROOT, 'modules', 'NoteCard');
  const files = await collectStyleFiles(noteCardRoot);
  const violations = [];

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    if (/will-change\s*:/u.test(source)) {
      violations.push(path.relative(process.cwd(), file));
    }
  }

  assert.deepEqual(violations, []);
});
