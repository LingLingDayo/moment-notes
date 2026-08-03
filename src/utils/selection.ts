/**
 * 获取指定 DOM 容器元素内部当前被划词选中的文本
 * @param containerEl 目标 DOM 容器元素 (如便签卡片容器 .note-card)
 * @returns 选中的文本，无选中则返回空字符串
 */
export const getContainerSelectedText = (containerEl: HTMLElement | null): string => {
  if (!containerEl) return '';
  if (typeof window === 'undefined') return '';
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return '';

  const text = selection.toString();
  if (!text || !text.trim()) return '';

  const anchorNode = selection.anchorNode;
  const focusNode = selection.focusNode;

  if (!anchorNode && !focusNode) return '';

  const isElementNode = (node: Node | null | undefined): boolean => {
    if (!node) return false;
    const ELEMENT_NODE_TYPE = typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1;
    return node.nodeType === ELEMENT_NODE_TYPE;
  };

  const anchorEl = isElementNode(anchorNode)
    ? (anchorNode as Element)
    : anchorNode?.parentElement;
  const focusEl = isElementNode(focusNode)
    ? (focusNode as Element)
    : focusNode?.parentElement;

  if (
    anchorEl &&
    focusEl &&
    containerEl.contains(anchorEl) &&
    containerEl.contains(focusEl)
  ) {
    return text;
  }

  return '';
};
