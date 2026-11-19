import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  createSelectionAutoCopy,
  DOUBLE_CLICK_SUPPRESS_MS,
  SELECTION_AUTO_COPY_DEBOUNCE_MS
} from './selectionAutoCopy';
import { copyTextToClipboard } from '../../infrastructure/platform/hostBridge';

vi.mock('../../infrastructure/platform/hostBridge', () => ({
  copyTextToClipboard: vi.fn().mockResolvedValue(true)
}));

const copyMock = vi.mocked(copyTextToClipboard);

describe('selectionAutoCopy 划词自动复制时序单测', () => {
  const originalWindow = globalThis.window;
  const anchorNode = { nodeType: 1, parentElement: null };
  const container = {
    contains: (node: unknown) => node === anchorNode
  } as unknown as HTMLElement;

  let selectedText = '';
  const removeAllRanges = vi.fn<() => void>(() => {
    selectedText = '';
  });
  const onCopied = vi.fn<() => void>();
  let enabled = true;
  let controller: ReturnType<typeof createSelectionAutoCopy>;

  const setSelectedText = (text: string) => {
    selectedText = text;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    selectedText = '';
    enabled = true;

    (globalThis as unknown as { window: unknown }).window = {
      getSelection: () => ({
        isCollapsed: !selectedText,
        toString: () => selectedText,
        anchorNode,
        focusNode: anchorNode,
        removeAllRanges
      })
    };

    controller = createSelectionAutoCopy({
      getContainer: () => container,
      isEnabled: () => enabled,
      onCopied
    });
  });

  afterEach(() => {
    controller.dispose();
    vi.useRealTimers();
    (globalThis as unknown as { window: unknown }).window = originalWindow;
  });

  it('划词稳定 200ms 后应复制选中文本', async () => {
    setSelectedText('选中的词');
    controller.handleSelectionChange();

    await vi.advanceTimersByTimeAsync(SELECTION_AUTO_COPY_DEBOUNCE_MS);

    expect(copyMock).toHaveBeenCalledWith('选中的词');
    expect(onCopied).toHaveBeenCalledOnce();
  });

  it('双击整篇粘贴时应撤销挂起的划词复制并清除卡片内的双击选区', async () => {
    setSelectedText('单词');
    controller.handleSelectionChange();
    controller.suppressDoubleClickSelection();

    expect(removeAllRanges).toHaveBeenCalledOnce();
    expect(selectedText).toBe('');

    await vi.advanceTimersByTimeAsync(
      DOUBLE_CLICK_SUPPRESS_MS + SELECTION_AUTO_COPY_DEBOUNCE_MS
    );

    expect(copyMock).not.toHaveBeenCalled();
  });

  it('抑制窗口内晚于 dblclick 派发的 selectionchange 不应重新排队复制', async () => {
    controller.suppressDoubleClickSelection();
    setSelectedText('单词');
    controller.handleSelectionChange();

    await vi.advanceTimersByTimeAsync(
      DOUBLE_CLICK_SUPPRESS_MS + SELECTION_AUTO_COPY_DEBOUNCE_MS
    );

    expect(copyMock).not.toHaveBeenCalled();
  });

  it('抑制窗口结束后划词自动复制应恢复正常', async () => {
    controller.suppressDoubleClickSelection();
    await vi.advanceTimersByTimeAsync(DOUBLE_CLICK_SUPPRESS_MS + 1);

    setSelectedText('新的词');
    controller.handleSelectionChange();
    await vi.advanceTimersByTimeAsync(SELECTION_AUTO_COPY_DEBOUNCE_MS);

    expect(copyMock).toHaveBeenCalledWith('新的词');
  });

  it('防抖期内选区变化应以最终选中的文本为准', async () => {
    setSelectedText('第一个词');
    controller.handleSelectionChange();
    await vi.advanceTimersByTimeAsync(100);

    setSelectedText('第二个词');
    controller.handleSelectionChange();
    await vi.advanceTimersByTimeAsync(SELECTION_AUTO_COPY_DEBOUNCE_MS);

    expect(copyMock).toHaveBeenCalledTimes(1);
    expect(copyMock).toHaveBeenCalledWith('第二个词');
  });

  it('关闭划词自动复制开关后不写剪贴板', async () => {
    enabled = false;
    setSelectedText('选中的词');
    controller.handleSelectionChange();

    await vi.advanceTimersByTimeAsync(SELECTION_AUTO_COPY_DEBOUNCE_MS);

    expect(copyMock).not.toHaveBeenCalled();
  });

  it('卸载后应取消挂起的复制任务', async () => {
    setSelectedText('选中的词');
    controller.handleSelectionChange();
    controller.dispose();

    await vi.advanceTimersByTimeAsync(SELECTION_AUTO_COPY_DEBOUNCE_MS);

    expect(copyMock).not.toHaveBeenCalled();
  });
});

describe('NoteCard 双击动作链路回归护栏', () => {
  let source = '';

  beforeEach(async () => {
    source = await readFile(path.resolve('src/modules/NoteCard/NoteCard.vue'), 'utf8');
  });

  it('粘贴文本应由手势前选区决策，而非双击自动选中的词', () => {
    expect(source).toContain('resolveDoubleClickPasteText(');
    expect(source).toContain('store.handlePasteNote(textToPaste, props.note.id)');
    expect(source).not.toContain('lastSelectedText');
  });

  it('双击前应缓存划词选区并抑制双击产生的自动复制', () => {
    expect(source).toContain('@mousedown.capture="handleCardMousedown"');
    expect(source).toContain('selectionAutoCopy.suppressDoubleClickSelection()');
  });

  it('双击动作上下文应接入进入编辑，且回收站便签不可编辑', () => {
    expect(source).toContain('enterEdit: enterEditMode');
    expect(source).toContain('if (props.note.isDeleted) return;');
  });

  it('卡片交互逻辑已抽离且组件仍严格守住 600 行红线', () => {
    expect(source.split('\n').length).toBeLessThan(600);
    expect(source).not.toContain('getContainerSelectedText');
  });
});
