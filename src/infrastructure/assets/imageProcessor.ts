import { getExtFromMime } from '../../domain/assets/assetCodec';

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
  const mime = file.type || 'image/jpeg';

  // 1. 动图 GIF 和矢量图 SVG 严格保持原始格式，不做破坏性压缩转换
  if (mime === 'image/gif' || mime === 'image/svg+xml') {
    const buf = await file.arrayBuffer();
    return {
      data: new Uint8Array(buf),
      mime,
      ext: getExtFromMime(mime)
    };
  }

  // 2. 检测运行环境：Node 单元测试等无 Canvas / Image 环境时回退使用原始数据
  if (typeof window === 'undefined' || typeof document === 'undefined' || !window.createImageBitmap) {
    const buf = await file.arrayBuffer();
    return {
      data: new Uint8Array(buf),
      mime,
      ext: getExtFromMime(mime)
    };
  }

  // 3. 浏览器端位图压缩处理
  return new Promise<CompressedImageResult>((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      let width = img.naturalWidth;
      let height = img.naturalHeight;

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
        const buf = await file.arrayBuffer();
        resolve({
          data: new Uint8Array(buf),
          mime,
          ext: getExtFromMime(mime)
        });
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
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
