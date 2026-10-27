/**
 * 图片处理与 Asset 协议工具模块
 */

export const ASSET_PROTOCOL = 'asset://';

export interface ImageCompressOptions {
  maxDimension?: number;
  quality?: number;
}

export interface CompressedImageResult {
  data: Uint8Array;
  mime: string;
  ext: string;
}

/**
 * 计算二进制数据 SHA-256 哈希值（16进制小写）
 */
export async function calculateSha256(data: Uint8Array): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data.buffer as ArrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Node 或备用简易哈希计算
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (hash << 5) - hash + data[i];
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

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
 * 智能压缩图片
 * - GIF 与 SVG 保留原始二进制避免丢失动效或失真
 * - 位图通过 Canvas 缩放转为 WebP
 * - 无 DOM/Canvas 环境（如 Node 测试）时安全回退保留原数据
 */
export async function compressImage(
  file: File,
  options: ImageCompressOptions = {}
): Promise<CompressedImageResult> {
  const { maxDimension = 2560, quality = 0.85 } = options;
  const mime = file.type || 'image/png';

  // GIF 与 SVG 直接保留原始数据
  if (mime === 'image/gif' || mime === 'image/svg+xml') {
    const buffer = await file.arrayBuffer();
    return {
      data: new Uint8Array(buffer),
      mime,
      ext: getExtFromMime(mime)
    };
  }

  // 如果环境不支持 Image/Canvas/createObjectURL，直接读取原始数据
  if (typeof window === 'undefined' || typeof document === 'undefined' || !window.URL?.createObjectURL) {
    const buffer = await file.arrayBuffer();
    return {
      data: new Uint8Array(buffer),
      mime,
      ext: getExtFromMime(mime)
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        file.arrayBuffer().then(buf => {
          resolve({
            data: new Uint8Array(buf),
            mime,
            ext: getExtFromMime(mime)
          });
        });
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            const buf = await file.arrayBuffer();
            resolve({
              data: new Uint8Array(buf),
              mime,
              ext: getExtFromMime(mime)
            });
            return;
          }
          const buf = await blob.arrayBuffer();
          resolve({
            data: new Uint8Array(buf),
            mime: 'image/webp',
            ext: 'webp'
          });
        },
        'image/webp',
        quality
      );
    };

    img.onerror = async () => {
      URL.revokeObjectURL(objectUrl);
      const buf = await file.arrayBuffer();
      resolve({
        data: new Uint8Array(buf),
        mime,
        ext: getExtFromMime(mime)
      });
    };

    img.src = objectUrl;
  });
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

/**
 * Uint8Array 与 Base64 互转工具（用于备份导入导出）
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof btoa !== 'undefined') {
    return btoa(binary);
  }
  const globalBuf = (globalThis as any).Buffer;
  return globalBuf ? globalBuf.from(bytes).toString('base64') : '';
}

export function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof atob !== 'undefined') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  const globalBuf = (globalThis as any).Buffer;
  return globalBuf ? new Uint8Array(globalBuf.from(base64, 'base64')) : new Uint8Array();
}

/**
 * 高性能异步 Base64 转二进制
 * 优先使用浏览器底层的 fetch DataURL 解码（在 C++ 线程执行，不阻塞 JS 主线程）
 */
export async function fastBase64ToUint8Array(base64: string): Promise<Uint8Array> {
  if (typeof fetch !== 'undefined') {
    try {
      const res = await fetch(`data:application/octet-stream;base64,${base64}`);
      const buf = await res.arrayBuffer();
      return new Uint8Array(buf);
    } catch {
      // 降级使用同步算法
    }
  }
  return base64ToUint8Array(base64);
}
