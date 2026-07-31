import { ref } from 'vue';

// 全局图片大图灯箱预览状态
export const isImagePreviewOpen = ref(false);
export const activePreviewUrl = ref('');
export const previewImageList = ref<string[]>([]);
export const currentImageIndex = ref(0);

/**
 * 唤起全局大图预览
 */
export function openImagePreview(url: string, images: string[] = [], index = 0) {
  if (!url) return;

  const list = images.length > 0 ? images : [url];
  const targetIndex = index >= 0 && index < list.length ? index : Math.max(0, list.indexOf(url));

  previewImageList.value = list;
  currentImageIndex.value = targetIndex !== -1 ? targetIndex : 0;
  activePreviewUrl.value = list[currentImageIndex.value] || url;
  isImagePreviewOpen.value = true;
}

/**
 * 切换到上一张图片
 */
export function prevImage() {
  if (previewImageList.value.length <= 1) return;
  currentImageIndex.value = (currentImageIndex.value - 1 + previewImageList.value.length) % previewImageList.value.length;
  activePreviewUrl.value = previewImageList.value[currentImageIndex.value];
}

/**
 * 切换到下一张图片
 */
export function nextImage() {
  if (previewImageList.value.length <= 1) return;
  currentImageIndex.value = (currentImageIndex.value + 1) % previewImageList.value.length;
  activePreviewUrl.value = previewImageList.value[currentImageIndex.value];
}

/**
 * 关闭大图预览
 */
export function closeImagePreview() {
  isImagePreviewOpen.value = false;
  activePreviewUrl.value = '';
  previewImageList.value = [];
  currentImageIndex.value = 0;
}

/**
 * 从粘贴/拖拽事件中获取图片 File 对象
 */
export function getImageFileFromEvent(e: ClipboardEvent | DragEvent): File | null {
  const items = 'clipboardData' in e ? e.clipboardData?.items : e.dataTransfer?.items;
  if (!items) return null;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      return item.getAsFile();
    }
  }
  return null;
}

/**
 * 将图片 File 转换为 Base64 或 Data URL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = err => reject(err);
    reader.readAsDataURL(file);
  });
}
