import { describe, expect, it, vi } from 'vitest';
import { decodeSettingValue } from '../settings/SettingDefinition';
import {
  DOUBLE_CLICK_NOTE_ACTIONS,
  DOUBLE_CLICK_NOTE_ACTION_SETTING,
  executeDoubleClickNoteAction
} from './DoubleClickNoteActionRegistry';

describe('DoubleClickNoteActionRegistry', () => {
  it('应保证注册动作唯一且都能通过设置 Codec 校验', () => {
    const actionIds = DOUBLE_CLICK_NOTE_ACTIONS.map(action => action.id);

    expect(new Set(actionIds).size).toBe(actionIds.length);
    expect(actionIds).toContain(DOUBLE_CLICK_NOTE_ACTION_SETTING.defaultValue);

    actionIds.forEach(actionId => {
      expect(decodeSettingValue(DOUBLE_CLICK_NOTE_ACTION_SETTING, actionId)).toBe(actionId);
    });
    expect(decodeSettingValue(DOUBLE_CLICK_NOTE_ACTION_SETTING, 'invalid')).toBeUndefined();
  });

  it('应将动作交给对应策略执行', () => {
    const context = {
      copyAndPaste: vi.fn(),
      openFullscreen: vi.fn(),
      deleteNote: vi.fn()
    };

    executeDoubleClickNoteAction('copyAndPaste', context);
    expect(context.copyAndPaste).toHaveBeenCalledOnce();

    executeDoubleClickNoteAction('fullscreen', context);
    expect(context.openFullscreen).toHaveBeenCalledOnce();

    executeDoubleClickNoteAction('delete', context);
    expect(context.deleteNote).toHaveBeenCalledOnce();

    vi.clearAllMocks();
    executeDoubleClickNoteAction('none', context);
    expect(context.copyAndPaste).not.toHaveBeenCalled();
    expect(context.openFullscreen).not.toHaveBeenCalled();
    expect(context.deleteNote).not.toHaveBeenCalled();
  });
});
