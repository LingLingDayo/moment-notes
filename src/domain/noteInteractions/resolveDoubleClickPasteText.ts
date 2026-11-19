/**
 * 双击粘贴的文本来源决策。
 * 仅允许「双击手势开始前用户主动划出的选区」参与局部粘贴；
 * 双击手势自身由浏览器默认选中的词不得参与，避免只粘贴一个词。
 */
export const resolveDoubleClickPasteText = (
  selectedTextBeforeGesture: string,
  noteContent: string
): string => (selectedTextBeforeGesture.trim() ? selectedTextBeforeGesture : noteContent);
