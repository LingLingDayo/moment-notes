import { describe, it, expect } from 'vitest';
import {
  calculateSha256,
  getExtFromMime,
  createAssetUrl,
  isAssetUrl,
  extractAssetId,
  extractAssetIdsFromMarkdown,
  uint8ArrayToBase64,
  base64ToUint8Array,
  compressImage
} from './imageProcessing';

describe('imageProcessing utils', () => {
  it('calculateSha256 应为相同二进制生成相同的固定哈希', async () => {
    const data1 = new Uint8Array([1, 2, 3, 4, 5]);
    const data2 = new Uint8Array([1, 2, 3, 4, 5]);
    const data3 = new Uint8Array([5, 4, 3, 2, 1]);

    const hash1 = await calculateSha256(data1);
    const hash2 = await calculateSha256(data2);
    const hash3 = await calculateSha256(data3);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1.length).toBeGreaterThan(10);
  });

  it('getExtFromMime 应能正确映射后缀', () => {
    expect(getExtFromMime('image/png')).toBe('png');
    expect(getExtFromMime('image/jpeg')).toBe('jpg');
    expect(getExtFromMime('image/webp')).toBe('webp');
    expect(getExtFromMime('image/gif')).toBe('gif');
    expect(getExtFromMime('image/svg+xml')).toBe('svg');
    expect(getExtFromMime('unknown')).toBe('img');
  });

  it('createAssetUrl, isAssetUrl 与 extractAssetId 应保持一致', () => {
    const url = createAssetUrl('test_hash_123', 'webp');
    expect(url).toBe('asset://test_hash_123.webp');
    expect(isAssetUrl(url)).toBe(true);
    expect(isAssetUrl('https://example.com/img.png')).toBe(false);
    expect(extractAssetId(url)).toBe('test_hash_123');

    const urlNoExt = createAssetUrl('test_hash_456');
    expect(urlNoExt).toBe('asset://test_hash_456');
    expect(extractAssetId(urlNoExt)).toBe('test_hash_456');
  });

  it('extractAssetIdsFromMarkdown 应提取正文中的所有 assetId 并去重', () => {
    const md = `
# 标题
这里有一张图：
![截图](asset://img_abc123.png)
还有同一张图：
![再次引用](asset://img_abc123.png)
以及另外一张：
![](asset://img_def456.webp)
还有普通外链：
![](https://example.com/pic.jpg)
    `;

    const ids = extractAssetIdsFromMarkdown(md);
    expect(ids).toEqual(['img_abc123', 'img_def456']);
  });

  it('uint8ArrayToBase64 和 base64ToUint8Array 应能无损双向转换', () => {
    const original = new Uint8Array([0, 255, 128, 64, 32, 16, 8, 4, 2, 1]);
    const b64 = uint8ArrayToBase64(original);
    const recovered = base64ToUint8Array(b64);

    expect(Array.from(recovered)).toEqual(Array.from(original));
  });

  it('compressImage 对 GIF 应直接保留原始字节', async () => {
    const rawBytes = new Uint8Array([71, 73, 70, 56, 57, 97]); // GIF89a
    const file = new File([rawBytes], 'animation.gif', { type: 'image/gif' });

    const result = await compressImage(file);
    expect(result.mime).toBe('image/gif');
    expect(result.ext).toBe('gif');
    expect(Array.from(result.data)).toEqual(Array.from(rawBytes));
  });
});
