import { describe, expect, it, vi } from 'vitest';
import type { AppSettings } from '@type';
import { applySettings } from './settingsHelper';

describe('settingsHelper', () => {
  it('应通过设置 Codec 应用合法的双击动作', () => {
    const setDoubleClickNoteAction = vi.fn();

    applySettings(
      { doubleClickNoteAction: 'fullscreen' },
      { setDoubleClickNoteAction },
      {},
      {},
      {}
    );

    expect(setDoubleClickNoteAction).toHaveBeenCalledWith('fullscreen');
  });

  it('应忽略备份中的非法双击动作', () => {
    const setDoubleClickNoteAction = vi.fn();
    const settings = { doubleClickNoteAction: 'invalid' } as unknown as AppSettings;

    applySettings(settings, { setDoubleClickNoteAction }, {}, {}, {});

    expect(setDoubleClickNoteAction).not.toHaveBeenCalled();
  });
});
