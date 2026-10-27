import { Note } from '@type';
import { IAssetRepository, assetRepository } from '../../infrastructure/storage/AssetRepository';
import {
  compressImage,
  calculateSha256,
  createAssetUrl,
  extractAssetIdsFromMarkdown,
  uint8ArrayToBase64,
  base64ToUint8Array,
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
   * 导入图片数据到存储中
   */
  public async importAssets(assets: Record<string, ImageAssetExportItem>): Promise<number> {
    if (!assets || typeof assets !== 'object') return 0;

    let importedCount = 0;
    const entries = Object.entries(assets);

    for (const [id, item] of entries) {
      if (!item || !item.data) continue;
      const exists = await this.repo.has(id);
      if (!exists) {
        const bytes = base64ToUint8Array(item.data);
        const mime = item.mime || 'image/png';
        const ok = await this.repo.put(id, bytes, mime);
        if (ok) {
          importedCount++;
        }
      }
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
