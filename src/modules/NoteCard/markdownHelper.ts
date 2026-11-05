/**
 * 清理 Markdown 解析后 HTML 中多余的换行标签
 * 对于连续相邻的多张图片，消除其由于 breaks: true 产生的换行标签，使多图能够以行内流形式自然并排平铺展示；
 * 同时保留图片与文本之间的换行，确保用户在 Markdown 中回车换行的文本能够正确另起一行。
 */
export function cleanMarkdownHtml(rawHtml: string): string {
  if (!rawHtml) return '';
  return rawHtml.replace(/(<img\b[^>]*>)\s*<br\s*\/?>\s*(?=<img\b)/gi, '$1');
}

/**
 * 具有最大容量上限的简易 LRU 缓存 Map
 */
export class SimpleLruCache<K, V> {
  private cache = new Map<K, V>();

  constructor(private readonly maxCapacity = 300) {}

  public get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key)!;
    // 刷新至末尾
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  public set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxCapacity) {
      // 淘汰最久未使用的首个条目
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, value);
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}

export const markdownHtmlCache = new SimpleLruCache<string, string>(300);

/**
 * 带有 LRU 缓存机制的 Markdown 渲染解析包装函数
 * 避免在搜索过滤、长列表虚拟滚动卡片重挂载时重复进行 AST 解析与 DOMPurify 净化
 */
export function renderMarkdownCached(
  content: string,
  renderFn: (raw: string) => string,
  cache: SimpleLruCache<string, string> = markdownHtmlCache
): string {
  if (!content) return '';
  const cached = cache.get(content);
  if (cached !== undefined) {
    return cached;
  }
  const rendered = renderFn(content);
  cache.set(content, rendered);
  return rendered;
}
