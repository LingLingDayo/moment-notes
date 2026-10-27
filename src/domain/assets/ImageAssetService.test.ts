import { describe, it, expect, beforeEach } from 'vitest';
import { ImageAssetService } from './ImageAssetService';
import { IAssetRepository } from '../../infrastructure/storage/AssetRepository';
import { Note } from '@type';

class MockAssetRepository implements IAssetRepository {
  public store = new Map<string, { data: Uint8Array; mime: string }>();

  async get(id: string): Promise<Uint8Array | null> {
    return this.store.get(id)?.data || null;
  }

  async getType(id: string): Promise<string | null> {
    return this.store.get(id)?.mime || null;
  }

  async put(id: string, data: Uint8Array, mimeType: string): Promise<boolean> {
    this.store.set(id, { data, mime: mimeType });
    return true;
  }

  async has(id: string): Promise<boolean> {
    return this.store.has(id);
  }

  async remove(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  async listIds(): Promise<string[]> {
    return Array.from(this.store.keys());
  }
}

describe('ImageAssetService', () => {
  let mockRepo: MockAssetRepository;
  let service: ImageAssetService;

  beforeEach(() => {
    mockRepo = new MockAssetRepository();
    service = new ImageAssetService(mockRepo);
  });

  it('saveImageFile 应保存图片并返回 asset:// 格式的 URL', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const file = new File([bytes], 'test.png', { type: 'image/png' });

    const result = await service.saveImageFile(file);
    expect(result.assetUrl).toMatch(/^asset:\/\/[a-f0-9]+\.png$/);
    expect(mockRepo.store.has(result.assetId)).toBe(true);

    // 再次保存相同文件，应去重且不报错
    const result2 = await service.saveImageFile(file);
    expect(result2.assetId).toBe(result.assetId);
    expect(mockRepo.store.size).toBe(1);
  });

  it('findOrphanAssets 和 cleanOrphanAssets 应能找出并清理未被引用的图片', async () => {
    // 存入两张图片
    await mockRepo.put('used_id_1', new Uint8Array([1]), 'image/png');
    await mockRepo.put('orphan_id_2', new Uint8Array([2]), 'image/png');

    const notes: Note[] = [
      {
        id: 'n1',
        categoryId: 'all',
        content: '这是引用的图片：![示例](asset://used_id_1.png)',
        color: '#fff',
        isPinned: false,
        createdAt: 100,
        updatedAt: 100
      }
    ];

    const orphans = await service.findOrphanAssets(notes);
    expect(orphans).toEqual(['orphan_id_2']);

    const cleanRes = await service.cleanOrphanAssets(notes);
    expect(cleanRes.cleanedCount).toBe(1);
    expect(mockRepo.store.has('orphan_id_2')).toBe(false);
    expect(mockRepo.store.has('used_id_1')).toBe(true);
  });

  it('exportAssetsForNotes 和 importAssets 能够正常流转', async () => {
    await mockRepo.put('asset_1', new Uint8Array([10, 20, 30]), 'image/png');

    const notes: Note[] = [
      {
        id: 'n1',
        categoryId: 'all',
        content: '![图](asset://asset_1.png)',
        color: '#fff',
        isPinned: false,
        createdAt: 100,
        updatedAt: 100
      }
    ];

    const exported = await service.exportAssetsForNotes(notes);
    expect(exported['asset_1']).toBeDefined();
    expect(exported['asset_1'].mime).toBe('image/png');

    // 导入到全新的仓储中
    const newRepo = new MockAssetRepository();
    const newService = new ImageAssetService(newRepo);

    const count = await newService.importAssets(exported);
    expect(count).toBe(1);
    expect(newRepo.store.has('asset_1')).toBe(true);
    expect(Array.from(newRepo.store.get('asset_1')!.data)).toEqual([10, 20, 30]);
  });
});
