import { getContainerSelectedText } from '@utils/selection';
import { copyTextToClipboard } from '../../infrastructure/platform/hostBridge';

/** 划词结束后等待选区稳定的防抖时长 */
export const SELECTION_AUTO_COPY_DEBOUNCE_MS = 200;

/**
 * 双击后的自动复制抑制窗口。
 * 双击会由浏览器默认选中光标下的词，而 selectionchange 可能晚于 dblclick 派发，
 * 因此窗口需大于防抖时长，才能覆盖整篇粘贴之后才到达的选区变更事件。
 */
export const DOUBLE_CLICK_SUPPRESS_MS = 350;

export interface SelectionAutoCopyOptions {
  getContainer: () => HTMLElement | null;
  isEnabled: () => boolean;
  onCopied: () => void;
}

export interface SelectionAutoCopy {
  handleSelectionChange: () => void;
  suppressDoubleClickSelection: () => void;
  dispose: () => void;
}

/** 只清除落在当前便签内的选区，避免误清用户在其他输入框中的选中内容 */
const clearContainerSelection = (container: HTMLElement | null): void => {
  if (typeof window === 'undefined' || !container) return;
  if (!getContainerSelectedText(container)) return;
  window.getSelection?.()?.removeAllRanges();
};

/**
 * 便签划词自动复制控制器。
 * 与 Vue 生命周期解耦，便于在无 DOM 的 Node 单测环境中验证剪贴板写入时序。
 */
export const createSelectionAutoCopy = (
  options: SelectionAutoCopyOptions
): SelectionAutoCopy => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let suppressUntil = 0;
  let lastCopiedText = '';

  const cancelPending = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    lastCopiedText = '';
  };

  const isSuppressed = () => Date.now() < suppressUntil;

  const suppressDoubleClickSelection = () => {
    suppressUntil = Date.now() + DOUBLE_CLICK_SUPPRESS_MS;
    cancelPending();
    clearContainerSelection(options.getContainer());
  };

  const handleSelectionChange = () => {
    if (!options.isEnabled() || isSuppressed()) {
      cancelPending();
      return;
    }

    const selectedText = getContainerSelectedText(options.getContainer());
    if (!selectedText) {
      cancelPending();
      return;
    }
    if (selectedText === lastCopiedText) return;

    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(async () => {
      timer = null;
      // 复制是异步落盘，抑制窗口内即使定时器已排队也绝不覆盖剪贴板
      if (isSuppressed()) return;

      const currentText = getContainerSelectedText(options.getContainer());
      if (!currentText || currentText !== selectedText) return;

      lastCopiedText = currentText;
      try {
        await copyTextToClipboard(currentText);
        options.onCopied();
      } catch (err) {
        console.error('Auto copy failed:', err);
      }
    }, SELECTION_AUTO_COPY_DEBOUNCE_MS);
  };

  return {
    handleSelectionChange,
    suppressDoubleClickSelection,
    dispose: cancelPending
  };
};
