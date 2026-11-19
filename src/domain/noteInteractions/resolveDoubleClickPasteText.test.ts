import { describe, it, expect } from 'vitest';
import { resolveDoubleClickPasteText } from './resolveDoubleClickPasteText';

describe('双击粘贴文本来源决策单测', () => {
  const noteContent = '第一行\n第二行完整内容';

  it('手势前没有划词选区时应粘贴整篇便签', () => {
    expect(resolveDoubleClickPasteText('', noteContent)).toBe(noteContent);
  });

  it('手势前用户主动划词时应只粘贴划出的选区内容', () => {
    expect(resolveDoubleClickPasteText('第二行', noteContent)).toBe('第二行');
  });

  it('划词内容仅为空白字符时应回退到整篇便签', () => {
    expect(resolveDoubleClickPasteText('   \n  ', noteContent)).toBe(noteContent);
  });

  it('便签内容为空时不应凭空生成文本', () => {
    expect(resolveDoubleClickPasteText('', '')).toBe('');
  });
});
