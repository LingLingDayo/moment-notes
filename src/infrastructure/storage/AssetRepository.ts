import { isUTools } from '@utils/storage';

export interface AssetRecord {
  id: string;
  data: Uint8Array;
  mimeType: string;
}

export interface IAssetRepository {
  get(id: string): Promise<Uint8Array | null>;
  getType(id: string): Promise<string | null>;
  put(id: string, data: Uint8Array, mimeType: string): Promise<boolean>;
  has(id: string): Promise<boolean>;
  remove(id: string): Promise<boolean>;
  listIds(): Promise<string[]>;
}

const ASSET_DOC_PREFIX = 'mn_asset/';

/**
 * uTools DB 附件存储实现
 */
export class UToolsAssetRepository implements IAssetRepository {
  private formatDocId(id: string): string {
    return id.startsWith(ASSET_DOC_PREFIX) ? id : `${ASSET_DOC_PREFIX}${id}`;
  }

  private parseDocId(docId: string): string {
    return docId.startsWith(ASSET_DOC_PREFIX) ? docId.slice(ASSET_DOC_PREFIX.length) : docId;
  }

  public async get(id: string): Promise<Uint8Array | null> {
    try {
      const docId = this.formatDocId(id);
      if (window.utools.db?.promises?.getAttachment) {
        return await window.utools.db.promises.getAttachment(docId);
      }
      return window.utools.db?.getAttachment ? window.utools.db.getAttachment(docId) : null;
    } catch (err) {
      console.error('[UToolsAssetRepository] get attachment error:', err);
      return null;
    }
  }

  public async getType(id: string): Promise<string | null> {
    try {
      const docId = this.formatDocId(id);
      if (window.utools.db?.promises?.getAttachmentType) {
        return await window.utools.db.promises.getAttachmentType(docId);
      }
      return window.utools.db?.getAttachmentType ? window.utools.db.getAttachmentType(docId) : null;
    } catch (err) {
      console.error('[UToolsAssetRepository] get attachment type error:', err);
      return null;
    }
  }

  public async put(id: string, data: Uint8Array, mimeType: string): Promise<boolean> {
    try {
      const docId = this.formatDocId(id);
      let res;
      if (window.utools.db?.promises?.postAttachment) {
        res = await window.utools.db.promises.postAttachment(docId, data, mimeType);
      } else if (window.utools.db?.postAttachment) {
        res = window.utools.db.postAttachment(docId, data, mimeType);
      }
      return !!res && !res.error;
    } catch (err) {
      console.error('[UToolsAssetRepository] post attachment error:', err);
      return false;
    }
  }

  public async has(id: string): Promise<boolean> {
    try {
      const docId = this.formatDocId(id);
      let doc;
      if (window.utools.db?.promises?.get) {
        doc = await window.utools.db.promises.get(docId);
      } else if (window.utools.db?.get) {
        doc = window.utools.db.get(docId);
      }
      return !!doc;
    } catch {
      return false;
    }
  }

  public async remove(id: string): Promise<boolean> {
    try {
      const docId = this.formatDocId(id);
      let res;
      if (window.utools.db?.promises?.remove) {
        res = await window.utools.db.promises.remove(docId);
      } else if (window.utools.db?.remove) {
        res = window.utools.db.remove(docId);
      }
      return !!res && !res.error;
    } catch (err) {
      console.error('[UToolsAssetRepository] remove attachment error:', err);
      return false;
    }
  }

  public async listIds(): Promise<string[]> {
    try {
      let docs: Array<{ _id: string }> = [];
      if (window.utools.db?.promises?.allDocs) {
        docs = await window.utools.db.promises.allDocs(ASSET_DOC_PREFIX);
      } else if (window.utools.db?.allDocs) {
        docs = window.utools.db.allDocs(ASSET_DOC_PREFIX);
      }
      return docs.map(doc => this.parseDocId(doc._id));
    } catch (err) {
      console.error('[UToolsAssetRepository] list ids error:', err);
      return [];
    }
  }
}

/**
 * 浏览器端 IndexedDB 或内存降级存储实现
 */
export class IndexedDbAssetRepository implements IAssetRepository {
  private dbName = 'moment_notes_assets_db';
  private storeName = 'assets';
  private memoryFallback = new Map<string, AssetRecord>();

  private async openDb(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') return null;

    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(this.dbName, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.warn('[IndexedDbAssetRepository] IndexedDB open error, falling back to memory');
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });
  }

  public async get(id: string): Promise<Uint8Array | null> {
    const db = await this.openDb();
    if (!db) {
      return this.memoryFallback.get(id)?.data || null;
    }

    return new Promise((resolve) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.get(id);
      req.onsuccess = () => {
        const record = req.result as AssetRecord | undefined;
        resolve(record ? record.data : null);
      };
      req.onerror = () => resolve(null);
    });
  }

  public async getType(id: string): Promise<string | null> {
    const db = await this.openDb();
    if (!db) {
      return this.memoryFallback.get(id)?.mimeType || null;
    }

    return new Promise((resolve) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.get(id);
      req.onsuccess = () => {
        const record = req.result as AssetRecord | undefined;
        resolve(record ? record.mimeType : null);
      };
      req.onerror = () => resolve(null);
    });
  }

  public async put(id: string, data: Uint8Array, mimeType: string): Promise<boolean> {
    const db = await this.openDb();
    if (!db) {
      this.memoryFallback.set(id, { id, data, mimeType });
      return true;
    }

    return new Promise((resolve) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.put({ id, data, mimeType });
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  }

  public async has(id: string): Promise<boolean> {
    const db = await this.openDb();
    if (!db) {
      return this.memoryFallback.has(id);
    }

    return new Promise((resolve) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.count(id);
      req.onsuccess = () => resolve(req.result > 0);
      req.onerror = () => resolve(false);
    });
  }

  public async remove(id: string): Promise<boolean> {
    const db = await this.openDb();
    if (!db) {
      return this.memoryFallback.delete(id);
    }

    return new Promise((resolve) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  }

  public async listIds(): Promise<string[]> {
    const db = await this.openDb();
    if (!db) {
      return Array.from(this.memoryFallback.keys());
    }

    return new Promise((resolve) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.getAllKeys();
      req.onsuccess = () => resolve((req.result as string[]) || []);
      req.onerror = () => resolve([]);
    });
  }
}

/**
 * 环境自适应仓储门面
 */
export class EnvironmentAssetRepository implements IAssetRepository {
  private utoolsRepo = new UToolsAssetRepository();
  private browserRepo = new IndexedDbAssetRepository();

  private get activeRepo(): IAssetRepository {
    return isUTools() && window.utools?.db ? this.utoolsRepo : this.browserRepo;
  }

  public get(id: string): Promise<Uint8Array | null> {
    return this.activeRepo.get(id);
  }

  public getType(id: string): Promise<string | null> {
    return this.activeRepo.getType(id);
  }

  public put(id: string, data: Uint8Array, mimeType: string): Promise<boolean> {
    return this.activeRepo.put(id, data, mimeType);
  }

  public has(id: string): Promise<boolean> {
    return this.activeRepo.has(id);
  }

  public remove(id: string): Promise<boolean> {
    return this.activeRepo.remove(id);
  }

  public listIds(): Promise<string[]> {
    return this.activeRepo.listIds();
  }
}

export const assetRepository = new EnvironmentAssetRepository();
