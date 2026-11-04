import { describe, it, expect } from 'vitest';
import { marked } from 'marked';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cleanMarkdownHtml } from './markdownHelper';

marked.setOptions({
  gfm: true,
  breaks: true
});

marked.use({
  renderer: {
    image({ href, title, text }) {
      const titleAttr = title ? ` title="${title}"` : '';
      return `<img src="${href || ''}" alt="${text || ''}" class="markdown-asset-img"${titleAttr} />`;
    }
  }
});

function parseAndClean(content: string): string {
  if (!content) return '';
  const rawHtml = marked.parse(content) as string;
  return cleanMarkdownHtml(rawHtml).trim();
}

describe('MarkdownRenderer 图片缩略图与排版规范单测', () => {
  it('图片紧跟换行文案时，应消除因 breaks: true 产生的多余 br 元素', () => {
    const input = '![图片](asset://test-image.webp)\n这是一张测试图片';
    const html = parseAndClean(input);

    expect(html).not.toContain('<br>');
    expect(html).toContain('alt="图片"');
    expect(html).toContain('这是一张测试图片');
  });

  it('文案紧邻换行图片时，也应消除多余的 br 元素保持自然块级间距', () => {
    const input = '这是一张测试图片\n![图片](asset://test-image.webp)';
    const html = parseAndClean(input);

    expect(html).not.toContain('<br>');
    expect(html).toContain('这是一张测试图片');
    expect(html).toContain('alt="图片"');
  });

  it('同行无换行模式下，本身不应出现 br 元素', () => {
    const input = '![图片](asset://test-image.webp)这是一张测试图片';
    const html = parseAndClean(input);

    expect(html).not.toContain('<br>');
  });

  it('普通纯文本换行仍应保留 breaks: true 的换行 br 特性', () => {
    const input = '第一行文本\n第二行文本';
    const html = parseAndClean(input);

    expect(html).toContain('<br>');
    expect(html).toContain('第一行文本<br>第二行文本');
  });

  it('MarkdownRenderer.vue 应规范配置正方形缩略图尺寸与 object-fit 属性', async () => {
    const componentPath = path.resolve('src/modules/NoteCard/MarkdownRenderer.vue');
    const source = await readFile(componentPath, 'utf8');

    // 缩略图固定正方形宽高与等比裁剪
    expect(source).toContain('width: 64px;');
    expect(source).toContain('height: 64px;');
    expect(source).toContain('aspect-ratio: 1 / 1;');
    expect(source).toContain('object-fit: cover;');

    // 占位符也应保持正方形规格避免加载跳变
    expect(source).toContain('width="64" height="64"');
  });
});
