import { describe, it, expect, vi } from 'vitest';
import { marked } from 'marked';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  cleanMarkdownHtml,
  SimpleLruCache,
  renderMarkdownCached
} from './markdownHelper';

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
  it('相邻多张换行图片之间，应消除多余的 br 元素以实现行内流自然并排', () => {
    const input = '![图片1](asset://image1.webp)\n![图片2](asset://image2.webp)';
    const html = parseAndClean(input);

    expect(html).not.toContain('<br>');
    expect(html).toContain('alt="图片1"');
    expect(html).toContain('alt="图片2"');
  });

  it('同行紧邻的多张图片无换行时，不包含 br 且保持连续行内排布，与后续文案正常换行', () => {
    const input = '![图片1](asset://image1.webp)![图片2](asset://image2.webp)\n这是一张测试图片';
    const html = parseAndClean(input);

    expect(html).toContain('alt="图片1"');
    expect(html).toContain('alt="图片2"');
    expect(html).toMatch(/class="markdown-asset-img"[^>]*><img[^>]*alt="图片2"/);
    expect(html).toContain('<br>这是一张测试图片');
  });

  it('图片紧跟换行文案时，应保留换行 br 元素确保文案自然折至下一行', () => {
    const input = '![图片](asset://test-image.webp)\n这是一张测试图片';
    const html = parseAndClean(input);

    expect(html).toContain('<br>');
    expect(html).toContain('alt="图片"');
    expect(html).toContain('这是一张测试图片');
  });

  it('文案紧邻换行图片时，应保留换行 br 元素确保图片另起新行', () => {
    const input = '这是一张测试图片\n![图片](asset://test-image.webp)';
    const html = parseAndClean(input);

    expect(html).toContain('<br>');
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

  it('MarkdownRenderer.vue 应规范配置正方形缩略图尺寸、行内流排版与 object-fit 属性', async () => {
    const componentPath = path.resolve('src/modules/NoteCard/MarkdownRenderer.vue');
    const source = await readFile(componentPath, 'utf8');

    // 缩略图固定正方形宽高与等比裁剪，并支持 inline-block 行内流
    expect(source).toContain('width: 64px;');
    expect(source).toContain('height: 64px;');
    expect(source).toContain('aspect-ratio: 1 / 1;');
    expect(source).toContain('object-fit: cover;');
    expect(source).toContain('display: inline-block;');

    // 占位符也应保持正方形规格避免加载跳变
    expect(source).toContain('width="64" height="64"');
  });

  describe('Markdown LRU 缓存与解析包装器', () => {
    it('SimpleLruCache 超过容量限制时正确淘汰最久未使用的元素', () => {
      const cache = new SimpleLruCache<string, number>(3);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      expect(cache.size()).toBe(3);
      expect(cache.get('a')).toBe(1); // 访问 a，刷新活跃顺序

      cache.set('d', 4); // 此时最久未使用应为 b，b 被淘汰
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('a')).toBe(1);
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    it('renderMarkdownCached 命中缓存时直接复用，不重复调用渲染函数', () => {
      const testCache = new SimpleLruCache<string, string>(10);
      const renderFn = vi.fn((src: string) => `<html>${src}</html>`);

      const res1 = renderMarkdownCached('# Title', renderFn, testCache);
      expect(res1).toBe('<html># Title</html>');
      expect(renderFn).toHaveBeenCalledTimes(1);

      // 第二次相同内容应命中缓存
      const res2 = renderMarkdownCached('# Title', renderFn, testCache);
      expect(res2).toBe('<html># Title</html>');
      expect(renderFn).toHaveBeenCalledTimes(1);

      // 内容变动时应调用渲染函数
      const res3 = renderMarkdownCached('# Another', renderFn, testCache);
      expect(res3).toBe('<html># Another</html>');
      expect(renderFn).toHaveBeenCalledTimes(2);
    });
  });
});
