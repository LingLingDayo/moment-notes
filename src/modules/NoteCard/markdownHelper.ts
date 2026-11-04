/**
 * 清理 Markdown 解析后 HTML 中多余的换行标签
 * 解决由于 marked 配置 breaks: true 时，块级图片与紧邻文本之间产生多余 <br> 的排版缺陷
 */
export function cleanMarkdownHtml(rawHtml: string): string {
  if (!rawHtml) return '';
  return rawHtml
    .replace(/(<img\b[^>]*>)\s*<br\s*\/?>/gi, '$1')
    .replace(/<br\s*\/?>\s*(<img\b[^>]*>)/gi, '$1');
}

