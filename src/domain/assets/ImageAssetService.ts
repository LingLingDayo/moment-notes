import { Note } from '@type';
import { IAssetRepository, assetRepository } from '../../infrastructure/storage/AssetRepository';
import {
  compressImage,
  calculateSha256,
  createAssetUrl,
  extractAssetIdsFromMarkdown,
  uint8ArrayToBase64,
  fastBase64ToUint8Array,
  getExtFromMime
} from '../../utils/imageProcessing';

export interface ImageAssetExportItem {
  mime: string;
  data: string; // base64 string
}

export class ImageAssetService {
  constructor(private repo: IAssetRepository = assetRepository) {}

  /**
   * 保存单张图片文件，返回对应的 asset:// URL 和 assetId
   */
  public async saveImageFile(file: File): Promise<{ assetUrl: string; assetId: string }> {
    const compressed = await compressImage(file);
    const hash = await calculateSha256(compressed.data);
    const assetId = hash;

    const exists = await this.repo.has(assetId);
    if (!exists) {
      const ok = await this.repo.put(assetId, compressed.data, compressed.mime);
      if (!ok) {
        throw new Error('Failed to save image attachment to storage');
      }
    }

    const assetUrl = createAssetUrl(assetId, compressed.ext);
    return { assetUrl, assetId };
  }

  /**
   * 查找所有未被任何便签引用的孤儿图片 ID
   */
  public async findOrphanAssets(notes: Note[]): Promise<string[]> {
    const referencedIds = new Set<string>();

    for (const note of notes) {
      if (note.content) {
        const ids = extractAssetIdsFromMarkdown(note.content);
        ids.forEach(id => referencedIds.add(id));
      }
    }

    const allStoredIds = await this.repo.listIds();
    return allStoredIds.filter(id => !referencedIds.has(id));
  }

  /**
   * 清理孤儿图片，释放存储空间
   */
  public async cleanOrphanAssets(notes: Note[]): Promise<{ cleanedCount: number }> {
    const orphanIds = await this.findOrphanAssets(notes);
    let cleanedCount = 0;

    for (const id of orphanIds) {
      const ok = await this.repo.remove(id);
      if (ok) {
        cleanedCount++;
      }
    }

    return { cleanedCount };
  }

  /**
   * 导出指定便签列表中引用的所有图片（Base64 形式）
   */
  public async exportAssetsForNotes(notes: Note[]): Promise<Record<string, ImageAssetExportItem>> {
    const assetMap: Record<string, ImageAssetExportItem> = {};
    const referencedIds = new Set<string>();

    for (const note of notes) {
      if (note.content) {
        const ids = extractAssetIdsFromMarkdown(note.content);
        ids.forEach(id => referencedIds.add(id));
      }
    }

    for (const id of referencedIds) {
      const data = await this.repo.get(id);
      const mime = (await this.repo.getType(id)) || 'image/png';
      if (data) {
        assetMap[id] = {
          mime,
          data: uint8ArrayToBase64(data)
        };
      }
    }

    return assetMap;
  }

  /**
   * 导入图片数据到存储中（支持分批并发与时间片让出，防止海量图片阻塞主线程）
   */
  public async importAssets(
    assets: Record<string, ImageAssetExportItem>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<number> {
    if (!assets || typeof assets !== 'object') return 0;

    const entries = Object.entries(assets);
    const total = entries.length;
    if (total === 0) return 0;

    let importedCount = 0;
    const BATCH_SIZE = 6;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async ([id, item]) => {
          if (!item || !item.data) return;
          const exists = await this.repo.has(id);
          if (!exists) {
            const bytes = await fastBase64ToUint8Array(item.data);
            const mime = item.mime || 'image/png';
            const ok = await this.repo.put(id, bytes, mime);
            if (ok) {
              importedCount++;
            }
          }
        })
      );

      onProgress?.(Math.min(i + BATCH_SIZE, total), total);
      // 让出事件循环，确保 UI 能够渲染帧并响应用户交互
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    return importedCount;
  }

  /**
   * 获取图片的 Blob URL
   */
  public async getAssetBlobUrl(assetId: string): Promise<string | null> {
    const data = await this.repo.get(assetId);
    if (!data) return null;

    let mime = await this.repo.getType(assetId);
    if (!mime) {
      mime = 'image/png';
    }

    const blob = new Blob([data.buffer as ArrayBuffer], { type: mime });
    return URL.createObjectURL(blob);
  }

  public getExtFromMime(mime: string): string {
    return getExtFromMime(mime);
  }
}

export const imageAssetService = new ImageAssetService();
