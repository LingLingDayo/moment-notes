import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDoubleClickSelectionGuard } from './doubleClickSelection';

describe('doubleClickSelection 双击选区来源判定单测', () => {
  const originalWindow = globalThis.window;
  const anchorNode = { nodeType: 1, parentElement: null };
  const container = {
    contains: (node: unknown) => node === anchorNode
  } as unknown as HTMLElement;

  let selectedText = '';
  let blockable = true;
  let preventDefault: ReturnType<typeof vi.fn>;
  let guard: ReturnType<typeof createDoubleClickSelectionGuard>;

  const mouseEvent = (detail: number, target?: unknown): MouseEvent =>
    ({ detail, target, preventDefault }) as unknown as MouseEvent;

  beforeEach(() => {
    selectedText = '';
    blockable = true;
    preventDefault = vi.fn();

    (globalThis as unknown as { window: unknown }).window = {
      getSelection: () => ({
        isCollapsed: !selectedText,
        toString: () => selectedText,
        anchorNode,
        focusNode: anchorNode,
        removeAllRanges: () => {
          selectedText = '';
        }
      })
    };

    guard = createDoubleClickSelectionGuard({
      getContainer: () => container,
      canBlockNativeSelection: () => blockable
    });
  });

  afterEach(() => {
    (globalThis as unknown as { window: unknown }).window = originalWindow;
  });

  it('第一次按下时缓存用户主动划出的选区，取走后应清空', () => {
    selectedText = '划出的段落';
    guard.handleMousedown(mouseEvent(1, { closest: () => null }));

    expect(guard.consumeSelectionBeforeGesture()).toBe('划出的段落');
    expect(guard.consumeSelectionBeforeGesture()).toBe('');
  });

  it('没有预先划词时手势前选区应为空', () => {
    guard.handleMousedown(mouseEvent(1, { closest: () => null }));

    expect(guard.consumeSelectionBeforeGesture()).toBe('');
  });

  it('双击的第二次按下应阻止浏览器默认选词', () => {
    guard.handleMousedown(mouseEvent(2, { closest: () => null }));

    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it('编辑态允许阻止为 false 时应保留输入框原生双击选词', () => {
    blockable = false;
    guard.handleMousedown(mouseEvent(2, { closest: () => null }));

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('目标是输入框时不应阻止原生双击选词', () => {
    guard.handleMousedown(
      mouseEvent(2, { closest: (selector: string) => (selector.includes('textarea') ? {} : null) })
    );

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('第二次按下不得覆盖手势前缓存的划词选区', () => {
    selectedText = '划出的段落';
    guard.handleMousedown(mouseEvent(1, { closest: () => null }));
    selectedText = '双击自动选中的词';
    guard.handleMousedown(mouseEvent(2, { closest: () => null }));

    expect(guard.consumeSelectionBeforeGesture()).toBe('划出的段落');
  });
});
