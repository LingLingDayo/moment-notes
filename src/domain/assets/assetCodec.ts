/**
 * 图片 Asset 协议领域规则与编解码
 */

export const ASSET_PROTOCOL = 'asset://';

/**
 * 根据 MIME 类型推断后缀
 */
export function getExtFromMime(mime: string): string {
  switch (mime.toLowerCase()) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/gif':
      return 'gif';
    case 'image/svg+xml':
      return 'svg';
    case 'image/webp':
      return 'webp';
    case 'image/bmp':
      return 'bmp';
    default:
      return 'img';
  }
}

/**
 * 创建 asset:// URL
 */
export function createAssetUrl(id: string, ext?: string): string {
  const cleanId = id.trim();
  if (ext) {
    const cleanExt = ext.startsWith('.') ? ext.slice(1) : ext;
    return `${ASSET_PROTOCOL}${cleanId}.${cleanExt}`;
  }
  return `${ASSET_PROTOCOL}${cleanId}`;
}

/**
 * 判断是否为 asset:// 协议图片 URL
 */
export function isAssetUrl(url: string): boolean {
  return typeof url === 'string' && url.startsWith(ASSET_PROTOCOL);
}

/**
 * 从 asset:// URL 中提取纯 assetId（去除扩展名）
 * 例如 asset://abc1234567.webp -> abc1234567
 */
export function extractAssetId(url: string): string | null {
  if (!isAssetUrl(url)) return null;
  const path = url.slice(ASSET_PROTOCOL.length).trim();
  if (!path) return null;
  const firstDotIndex = path.indexOf('.');
  const id = firstDotIndex !== -1 ? path.slice(0, firstDotIndex) : path;
  return id || null;
}

/**
 * 从 Markdown 文本中提取所有 assetId
 * 匹配 ![...](asset://<id>...) 或直接出现的 asset://<id>...
 */
export function extractAssetIdsFromMarkdown(content: string): string[] {
  if (!content || !content.includes(ASSET_PROTOCOL)) return [];

  const assetIds = new Set<string>();
  const regex = /asset:\/\/([a-zA-Z0-9_-]+)(?:\.[a-zA-Z0-9]+)?/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      assetIds.add(match[1]);
    }
  }

  return Array.from(assetIds);
}
