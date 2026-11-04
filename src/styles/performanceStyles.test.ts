import { describe, it, expect } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const SOURCE_ROOT = path.resolve('src');
const STYLE_FILE_EXTENSIONS = new Set(['.css', '.scss', '.vue']);

async function collectStyleFiles(directory: string): Promise<string[]> {
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

describe('前端 SCSS 与 Vue 样式性能审计测试', () => {
  it('常驻合成提示不包含无法合成的阴影属性', async () => {
    const files = await collectStyleFiles(SOURCE_ROOT);
    const violations: string[] = [];

    for (const file of files) {
      const source = await readFile(file, 'utf8');
      if (/will-change\s*:[^;]*box-shadow/u.test(source)) {
        violations.push(path.relative(process.cwd(), file).replace(/\\/g, '/'));
      }
    }

    expect(violations).toEqual([]);
  });

  it('便签卡片不会为每个实例常驻创建合成层', async () => {
    const noteCardRoot = path.join(SOURCE_ROOT, 'modules', 'NoteCard');
    const files = await collectStyleFiles(noteCardRoot);
    const violations: string[] = [];

    for (const file of files) {
      const source = await readFile(file, 'utf8');
      if (/will-change\s*:/u.test(source)) {
        violations.push(path.relative(process.cwd(), file).replace(/\\/g, '/'));
      }
    }

    expect(violations).toEqual([]);
  });

  it('图片预览器全屏蒙层不使用大面积高斯模糊以规避渲染性能缺陷', async () => {
    const modalPath = path.join(SOURCE_ROOT, 'components', 'ImagePreviewModal.vue');
    const source = await readFile(modalPath, 'utf8');

    // 匹配 .image-preview-overlay 内部样式块
    const overlayMatch = source.match(/\.image-preview-overlay\s*\{([^}]+)\}/u);
    expect(overlayMatch).toBeTruthy();
    const overlayRules = overlayMatch ? overlayMatch[1] : '';

    expect(overlayRules).not.toContain('backdrop-filter');
    expect(overlayRules).not.toContain('-webkit-backdrop-filter');
  });
});
