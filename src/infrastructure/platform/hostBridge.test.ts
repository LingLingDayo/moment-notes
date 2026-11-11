import { describe, it, expect, vi, beforeEach } from 'vitest';
import { copyTextToClipboard, openExternalUrl } from './hostBridge';
import { getRuntimePlatform, isUTools, isElectron, isBrowser } from './platform';

describe('platform & hostBridge 基础设施测试', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getRuntimePlatform 应准确识别当前运行形态', () => {
    expect(getRuntimePlatform()).toBe('browser');
    expect(isBrowser()).toBe(true);
    expect(isUTools()).toBe(false);
    expect(isElectron()).toBe(false);
  });

  it('copyTextToClipboard 降级使用 clipboard 或 execCommand', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    if (typeof navigator === 'undefined') {
      vi.stubGlobal('navigator', { clipboard: { writeText: writeTextMock } });
    } else {
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock
        }
      });
    }

    const success = await copyTextToClipboard('hello moment');
    expect(success).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith('hello moment');
  });

  it('openExternalUrl 在浏览器环境下调用 window.open', () => {
    const openMock = vi.fn();
    if (typeof window === 'undefined') {
      vi.stubGlobal('window', { open: openMock });
    } else {
      window.open = openMock;
    }

    openExternalUrl('https://example.com');
    expect(openMock).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');
  });
});
