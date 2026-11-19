import { getContainerSelectedText } from '@utils/selection';

export interface DoubleClickSelectionGuardOptions {
  getContainer: () => HTMLElement | null;
  /** 编辑态下必须保留输入框原生的双击选词能力 */
  canBlockNativeSelection: () => boolean;
}

export interface DoubleClickSelectionGuard {
  handleMousedown: (event: MouseEvent) => void;
  consumeSelectionBeforeGesture: () => string;
}

/**
 * 区分「用户主动划词」与「双击手势自动选词」。
 * 第一次按下（detail=1）时浏览器默认选词尚未发生，此刻的选区只可能是上一轮划词留下的；
 * 第二次按下起 detail>=2 属于多击手势，直接阻止默认选词，避免只选中一个词。
 */
export const createDoubleClickSelectionGuard = (
  options: DoubleClickSelectionGuardOptions
): DoubleClickSelectionGuard => {
  let selectionBeforeGesture = '';

  const handleMousedown = (event: MouseEvent) => {
    if (event.detail <= 1) {
      selectionBeforeGesture = getContainerSelectedText(options.getContainer());
      return;
    }

    const target = event.target as HTMLElement | null;
    const isFormField = Boolean(target?.closest?.('input, textarea, [contenteditable]'));
    if (options.canBlockNativeSelection() && !isFormField) {
      event.preventDefault();
    }
  };

  /** 取走手势前的选区并清空，避免跨手势复用旧选区 */
  const consumeSelectionBeforeGesture = () => {
    const text = selectionBeforeGesture;
    selectionBeforeGesture = '';
    return text;
  };

  return { handleMousedown, consumeSelectionBeforeGesture };
};
