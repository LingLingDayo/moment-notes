import { ref, type Ref } from 'vue';
import { Note, NoteType } from '@type';
import { getImageFilesFromEvent } from './imageHandler';
import { imageAssetService } from '../domain/assets/ImageAssetService';

export interface UseNoteImageUploadOptions {
  content: Ref<string>;
  textareaRef: Ref<HTMLTextAreaElement | null>;
  note: Ref<Note>;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  setNoteType?: (type: NoteType) => void;
  onContentChange?: () => void;
}

export function useNoteImageUpload(options: UseNoteImageUploadOptions) {
  const { content, textareaRef, note, showToast, setNoteType, onContentChange } = options;
  const isDraggingOver = ref(false);
  const isUploading = ref(false);

  /**
   * 将 Markdown 文本插入到当前 textarea 光标所在位置
   */
  const insertTextAtCursor = (insertText: string): { start: number; end: number } => {
    const el = textareaRef.value;
    const current = content.value || '';

    if (!el) {
      const newContent = current ? `${current}\n${insertText}` : insertText;
      content.value = newContent;
      return { start: newContent.length, end: newContent.length };
    }

    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;

    const before = current.substring(0, start);
    const after = current.substring(end);

    const prefix = before.length > 0 && !before.endsWith('\n') ? '\n' : '';
    const suffix = after.length > 0 && !after.startsWith('\n') ? '\n' : '';
    const fullInsert = `${prefix}${insertText}${suffix}`;

    content.value = before + fullInsert + after;
    onContentChange?.();

    return {
      start: start + prefix.length,
      end: start + prefix.length + insertText.length
    };
  };

  /**
   * 上传并插入图片列表
   */
  const processImageFiles = async (files: File[]) => {
    if (files.length === 0) return;

    // 检查并自动切换便签为 Markdown 格式
    if (note.value.type !== 'markdown') {
      if (setNoteType) {
        setNoteType('markdown');
        showToast('已自动切换为 Markdown 格式以支持图片', 'info');
      }
    }

    isUploading.value = true;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const pendingPlaceholder = `![上传图片中(${i + 1}/${files.length})...](asset://pending-${Date.now()}-${i})`;
      insertTextAtCursor(pendingPlaceholder);

      try {
        const result = await imageAssetService.saveImageFile(file);
        const realMarkdown = `![图片](${result.assetUrl})`;

        // 将占位符替换为真实的 asset 链接
        content.value = content.value.replace(pendingPlaceholder, realMarkdown);
        onContentChange?.();
      } catch (err) {
        console.error('[useNoteImageUpload] Upload image failed:', err);
        content.value = content.value.replace(pendingPlaceholder, '');
        onContentChange?.();
        showToast(`图片 ${file.name || ''} 存储失败`, 'error');
      }
    }

    isUploading.value = false;
    showToast(`已成功插入 ${files.length} 张图片`, 'success');
  };

  /**
   * 粘贴事件处理器
   */
  const handlePaste = async (e: ClipboardEvent) => {
    const files = getImageFilesFromEvent(e);
    if (files.length === 0) return;

    e.preventDefault();
    e.stopPropagation();
    await processImageFiles(files);
  };

  /**
   * 拖拽进入与悬停
   */
  const handleDragOver = (e: DragEvent) => {
    const hasFiles = e.dataTransfer?.types?.includes('Files');
    if (hasFiles) {
      e.preventDefault();
      e.stopPropagation();
      isDraggingOver.value = true;
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingOver.value = false;
  };

  /**
   * 放置文件处理器
   */
  const handleDrop = async (e: DragEvent) => {
    isDraggingOver.value = false;
    const files = getImageFilesFromEvent(e);
    if (files.length === 0) return;

    e.preventDefault();
    e.stopPropagation();
    await processImageFiles(files);
  };

  return {
    isDraggingOver,
    isUploading,
    handlePaste,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    processImageFiles
  };
}
