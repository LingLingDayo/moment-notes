import type { SettingDefinition } from '../settings/SettingDefinition';

export interface DoubleClickNoteActionContext {
  copyAndPaste(): void | Promise<unknown>;
  openFullscreen(): void;
  deleteNote(): void;
}

interface DoubleClickNoteActionDefinition {
  id: string;
  label: string;
  tooltip?: string;
  execute(context: DoubleClickNoteActionContext): void | Promise<unknown>;
}

// Extension Point: 在此注册新动作，设置选项、合法值与执行策略会同步扩展。
export const DOUBLE_CLICK_NOTE_ACTIONS = [
  {
    id: 'copyAndPaste',
    label: '双击复制并粘贴到光标处',
    execute: (context: DoubleClickNoteActionContext) => context.copyAndPaste()
  },
  {
    id: 'fullscreen',
    label: '全屏查看便签',
    execute: (context: DoubleClickNoteActionContext) => context.openFullscreen()
  },
  {
    id: 'delete',
    label: '删除便签(移入"最近删除")',
    tooltip: '如果双击的是"最近删除"的便签就直接删除',
    execute: (context: DoubleClickNoteActionContext) => context.deleteNote()
  },
  {
    id: 'none',
    label: '不执行任何操作',
    tooltip: '双击便签卡片时不触发任何操作',
    execute: () => undefined
  }
] as const satisfies readonly DoubleClickNoteActionDefinition[];

export type DoubleClickNoteAction = (typeof DOUBLE_CLICK_NOTE_ACTIONS)[number]['id'];

const doubleClickNoteActionIds = new Set<string>(
  DOUBLE_CLICK_NOTE_ACTIONS.map(action => action.id)
);

const doubleClickNoteActionRegistry = new Map<
  DoubleClickNoteAction,
  DoubleClickNoteActionDefinition
>(DOUBLE_CLICK_NOTE_ACTIONS.map(action => [action.id, action]));

export const isDoubleClickNoteAction = (value: unknown): value is DoubleClickNoteAction => {
  return typeof value === 'string' && doubleClickNoteActionIds.has(value);
};

export const DOUBLE_CLICK_NOTE_ACTION_SETTING = {
  key: 'doubleClickNoteAction',
  storageKey: 'sticky_notes_double_click_note_action',
  defaultValue: 'copyAndPaste',
  codec: {
    decode: (value: unknown) => isDoubleClickNoteAction(value) ? value : undefined,
    encode: (value: DoubleClickNoteAction) => value
  }
} satisfies SettingDefinition<'doubleClickNoteAction', DoubleClickNoteAction>;

export const executeDoubleClickNoteAction = (
  action: DoubleClickNoteAction,
  context: DoubleClickNoteActionContext
): void | Promise<unknown> => {
  return doubleClickNoteActionRegistry.get(action)?.execute(context);
};
