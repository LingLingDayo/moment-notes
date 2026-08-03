import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getContainerSelectedText } from './selection';

describe('selection 划词选中工具单测', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    (globalThis as unknown as { window: unknown }).window = {
      getSelection: () => null
    };
  });

  afterEach(() => {
    (globalThis as unknown as { window: unknown }).window = originalWindow;
  });

  it('容器为空时应返回空字符串', () => {
    expect(getContainerSelectedText(null)).toBe('');
  });

  it('没有选中文本时应返回空字符串', () => {
    const mockContainer = {} as HTMLElement;
    (globalThis as unknown as { window: { getSelection: () => null } }).window = {
      getSelection: () => null
    };

    expect(getContainerSelectedText(mockContainer)).toBe('');
  });

  it('当划词选中的起点与终点节点都在容器内时，应正确提取选中文本', () => {
    const mockAnchorNode = {
      nodeType: 1,
      parentElement: null
    };

    const mockContainer = {
      contains: (node: unknown) => node === mockAnchorNode
    } as unknown as HTMLElement;

    (globalThis as unknown as { window: { getSelection: () => unknown } }).window = {
      getSelection: () => ({
        isCollapsed: false,
        toString: () => 'Hello',
        anchorNode: mockAnchorNode,
        focusNode: mockAnchorNode
      })
    };

    expect(getContainerSelectedText(mockContainer)).toBe('Hello');
  });

  it('当划词选中的节点不在容器内时，应返回空字符串', () => {
    const mockOutsideNode = {
      nodeType: 1,
      parentElement: null
    };

    const mockContainer = {
      contains: () => false
    } as unknown as HTMLElement;

    (globalThis as unknown as { window: { getSelection: () => unknown } }).window = {
      getSelection: () => ({
        isCollapsed: false,
        toString: () => 'Other',
        anchorNode: mockOutsideNode,
        focusNode: mockOutsideNode
      })
    };

    expect(getContainerSelectedText(mockContainer)).toBe('');
  });

  it('当划词选中的节点跨容器 (起点在内，终点在外) 时，应返回空字符串', () => {
    const mockInsideNode = { nodeType: 1, parentElement: null };
    const mockOutsideNode = { nodeType: 1, parentElement: null };

    const mockContainer = {
      contains: (node: unknown) => node === mockInsideNode
    } as unknown as HTMLElement;

    (globalThis as unknown as { window: { getSelection: () => unknown } }).window = {
      getSelection: () => ({
        isCollapsed: false,
        toString: () => 'Cross Container Text',
        anchorNode: mockInsideNode,
        focusNode: mockOutsideNode
      })
    };

    expect(getContainerSelectedText(mockContainer)).toBe('');
  });
});
