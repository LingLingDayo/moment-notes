import { ref } from 'vue';

// 全局图片大图灯箱预览状态
export const isImagePreviewOpen = ref(false);
export const activePreviewUrl = ref('');

/**
 * 唤起全局大图预览
 */
export function openImagePreview(url: string) {
  if (!url) return;
  activePreviewUrl.value = url;
  isImagePreviewOpen.value = true;
}

/**
 * 关闭大图预览
 */
export function closeImagePreview() {
  isImagePreviewOpen.value = false;
  activePreviewUrl.value = '';
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
