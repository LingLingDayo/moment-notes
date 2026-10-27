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
 * 从粘贴/拖拽事件中获取所有图片 File 对象列表
 */
export function getImageFilesFromEvent(e: ClipboardEvent | DragEvent): File[] {
  const files: File[] = [];

  // 1. 优先通过 items 获取（支持剪贴板和拖拽）
  const items = 'clipboardData' in e ? e.clipboardData?.items : e.dataTransfer?.items;
  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
  }

  // 2. 拖拽降级通过 dataTransfer.files 获取
  if (files.length === 0 && 'dataTransfer' in e && e.dataTransfer?.files) {
    for (let i = 0; i < e.dataTransfer.files.length; i++) {
      const file = e.dataTransfer.files[i];
      if (file.type.startsWith('image/')) {
        files.push(file);
      }
    }
  }

  return files;
}

/**
 * 从粘贴/拖拽事件中获取第一张图片 File 对象
 */
export function getImageFileFromEvent(e: ClipboardEvent | DragEvent): File | null {
  const files = getImageFilesFromEvent(e);
  return files.length > 0 ? files[0] : null;
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
