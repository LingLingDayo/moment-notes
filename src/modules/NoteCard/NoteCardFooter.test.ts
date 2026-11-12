import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

describe('NoteCardFooter 架构拆分与质量规范单测', () => {
  it('NoteCardFooter.vue 行数必须严格在 600 行以内，远离红线', async () => {
    const filePath = path.resolve('src/modules/NoteCard/NoteCardFooter.vue');
    const source = await readFile(filePath, 'utf8');
    const lineCount = source.split('\n').length;

    expect(lineCount).toBeLessThan(600);
    expect(lineCount).toBeLessThan(450); // 重构拆分后约 380 行
  });

  it('已拆分出的 3 个子组件均独立存在且体量精简', async () => {
    const popovers = [
      'NoteColorPickerPopover.vue',
      'NoteCategoryPickerPopover.vue',
      'NoteFormatPickerPopover.vue'
    ];

    for (const name of popovers) {
      const p = path.resolve('src/modules/NoteCard', name);
      const content = await readFile(p, 'utf8');
      const lines = content.split('\n').length;
      expect(lines).toBeLessThan(200);
      expect(lines).toBeGreaterThan(20);
    }
  });

  it('必须统一遵守 AGENTS.md 规范：禁止使用原生 title 属性，统一使用 data-tooltip', async () => {
    const files = [
      'src/modules/NoteCard/NoteCardFooter.vue',
      'src/modules/NoteCard/NoteColorPickerPopover.vue',
      'src/modules/NoteCard/NoteCategoryPickerPopover.vue',
      'src/modules/NoteCard/NoteFormatPickerPopover.vue'
    ];

    for (const file of files) {
      const source = await readFile(path.resolve(file), 'utf8');
      // 检查原生 HTML 标签中是否误用原生 title 属性
      const hasNativeTitle = /<(?:button|div|span|a|p|img|i|input)\s+[^>]*\btitle="[^"]*"/i.test(source);
      expect(hasNativeTitle).toBe(false);
      expect(source).toContain('data-tooltip=');
    }
  });
});
