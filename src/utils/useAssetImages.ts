import { imageAssetService } from '../domain/assets/ImageAssetService';

// 全局内存缓存：assetId -> ObjectURL
const assetUrlCache = new Map<string, string>();
const loadingPromises = new Map<string, Promise<string | null>>();

const MAX_CACHE_SIZE = 300;

/**
 * 获取或加载单个 assetId 的 ObjectURL
 */
export async function getOrLoadAssetUrl(assetId: string): Promise<string | null> {
  if (assetUrlCache.has(assetId)) {
    return assetUrlCache.get(assetId)!;
  }

  if (loadingPromises.has(assetId)) {
    return loadingPromises.get(assetId)!;
  }

  const loadPromise = (async () => {
    try {
      const url = await imageAssetService.getAssetBlobUrl(assetId);
      if (url) {
        if (assetUrlCache.size >= MAX_CACHE_SIZE) {
          const firstKey = assetUrlCache.keys().next().value;
          if (firstKey) {
            const oldUrl = assetUrlCache.get(firstKey);
            if (oldUrl) URL.revokeObjectURL(oldUrl);
            assetUrlCache.delete(firstKey);
          }
        }
        assetUrlCache.set(assetId, url);
        return url;
      }
      return null;
    } catch (err) {
      console.error(`[useAssetImages] Load asset ${assetId} failed:`, err);
      return null;
    } finally {
      loadingPromises.delete(assetId);
    }
  })();

  loadingPromises.set(assetId, loadPromise);
  return loadPromise;
}

/**
 * 扫描并批量渲染容器内所有 data-asset-id 图片
 */
export async function resolveAssetImagesInContainer(container: HTMLElement | null): Promise<void> {
  if (!container) return;

  const images = container.querySelectorAll<HTMLImageElement>('img[data-asset-id]');
  if (images.length === 0) return;

  for (const img of Array.from(images)) {
    const assetId = img.getAttribute('data-asset-id');
    if (!assetId) continue;

    // 已设置过 blob 则跳过
    if (img.src && img.src.startsWith('blob:')) continue;

    const url = await getOrLoadAssetUrl(assetId);
    if (url) {
      img.src = url;
      img.classList.add('asset-img-loaded');
    } else {
      img.classList.add('asset-img-failed');
      img.alt = `${img.alt || '图片'} (加载失败)`;
    }
  }
}

/**
 * 清除所有内存中的 ObjectURL 缓存，释放内存
 */
export function clearAssetUrlCache(): void {
  for (const url of assetUrlCache.values()) {
    URL.revokeObjectURL(url);
  }
  assetUrlCache.clear();
  loadingPromises.clear();
}
