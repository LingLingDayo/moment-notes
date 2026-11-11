import type { NoteType, SortMode, SortOrder, CategoryViewSetting } from '../../types';
import {
  SettingDefinition,
  booleanSettingCodec,
  stringSettingCodec,
  numberSettingCodec,
  enumSettingCodec,
  jsonSettingCodec,
  gridColumnsSettingCodec,
  GridColumns
} from './SettingDefinition';
import { DOUBLE_CLICK_NOTE_ACTION_SETTING } from '../noteInteractions/DoubleClickNoteActionRegistry';
import { GLOBAL_TRIGGER_SETTING, HIDE_ON_BLUR_SETTING } from '../desktop/DesktopSettings';

export { DOUBLE_CLICK_NOTE_ACTION_SETTING, GLOBAL_TRIGGER_SETTING, HIDE_ON_BLUR_SETTING };
export * from './SettingDefinition';

export const THEME_SETTING: SettingDefinition<'theme', 'dark' | 'light'> = {
  key: 'theme',
  storageKey: 'sticky_notes_theme',
  defaultValue: 'light',
  codec: enumSettingCodec(['light', 'dark'] as const)
};

export const GRID_COLUMNS_SETTING: SettingDefinition<'gridColumns', GridColumns> = {
  key: 'gridColumns',
  storageKey: 'sticky_notes_grid_columns',
  defaultValue: 'auto',
  codec: gridColumnsSettingCodec
};

export const MIN_NOTE_WIDTH_SETTING: SettingDefinition<'minNoteWidth', number> = {
  key: 'minNoteWidth',
  storageKey: 'sticky_notes_min_note_width',
  defaultValue: 260,
  codec: numberSettingCodec({ min: 100, max: 1000, integer: true })
};

export const NOTE_MAX_HEIGHT_SETTING: SettingDefinition<'noteMaxHeight', number> = {
  key: 'noteMaxHeight',
  storageKey: 'sticky_notes_note_max_height',
  defaultValue: 300,
  codec: numberSettingCodec({ min: 100, max: 2000, integer: true })
};

export const ENABLED_ACTION_BAR_BUTTONS_SETTING: SettingDefinition<'enabledActionBarButtons', string[]> = {
  key: 'enabledActionBarButtons',
  storageKey: 'sticky_notes_enabled_action_bar_buttons',
  defaultValue: ['theme-toggle', 'sort-select', 'columns-select', 'clear-notes'],
  codec: jsonSettingCodec<string[]>((v): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string'))
};

export const DATE_FORMAT_SETTING: SettingDefinition<'dateFormat', string> = {
  key: 'dateFormat',
  storageKey: 'sticky_notes_date_format',
  defaultValue: 'YYYY.MM.DD HH:mm',
  codec: stringSettingCodec({ nonEmpty: true })
};

export const DEFAULT_NOTE_COLOR_SETTING: SettingDefinition<'defaultNoteColor', string> = {
  key: 'defaultNoteColor',
  storageKey: 'sticky_notes_default_note_color',
  defaultValue: 'random',
  codec: stringSettingCodec({ nonEmpty: true })
};

export const DEFAULT_NOTE_TYPE_SETTING: SettingDefinition<'defaultNoteType', NoteType> = {
  key: 'defaultNoteType',
  storageKey: 'sticky_notes_default_note_type',
  defaultValue: 'text',
  codec: enumSettingCodec(['text', 'markdown'] as const)
};

export const DEFAULT_EDIT_MODE_SETTING: SettingDefinition<'defaultEditMode', 'inline' | 'fullscreen'> = {
  key: 'defaultEditMode',
  storageKey: 'sticky_notes_default_edit_mode',
  defaultValue: 'inline',
  codec: enumSettingCodec(['inline', 'fullscreen'] as const)
};

export const SUPER_PANEL_DEFAULT_CATEGORY_SETTING: SettingDefinition<'superPanelDefaultCategory', string> = {
  key: 'superPanelDefaultCategory',
  storageKey: 'sticky_notes_super_panel_default_category',
  defaultValue: 'all',
  codec: stringSettingCodec({ nonEmpty: true })
};

export const START_PAGE_MODE_SETTING: SettingDefinition<'startPageMode', 'last' | 'default'> = {
  key: 'startPageMode',
  storageKey: 'sticky_notes_start_page_mode',
  defaultValue: 'last',
  codec: enumSettingCodec(['last', 'default'] as const)
};

export const ENABLE_HOVER_ANIMATION_SETTING: SettingDefinition<'enableHoverAnimation', boolean> = {
  key: 'enableHoverAnimation',
  storageKey: 'sticky_notes_enable_hover_animation',
  defaultValue: true,
  codec: booleanSettingCodec
};

export const ENABLE_AUTO_COPY_SELECTION_SETTING: SettingDefinition<'enableAutoCopySelection', boolean> = {
  key: 'enableAutoCopySelection',
  storageKey: 'sticky_notes_enable_auto_copy_selection',
  defaultValue: true,
  codec: booleanSettingCodec
};

export const SHOW_NOTE_COUNT_SETTING: SettingDefinition<'showNoteCount', boolean> = {
  key: 'showNoteCount',
  storageKey: 'sticky_notes_show_note_count',
  defaultValue: true,
  codec: booleanSettingCodec
};

export const PREFIX_TAG_WITH_HASH_SETTING: SettingDefinition<'prefixTagWithHash', boolean> = {
  key: 'prefixTagWithHash',
  storageKey: 'sticky_notes_prefix_tag_with_hash',
  defaultValue: true,
  codec: booleanSettingCodec
};

export const SKIP_DELETE_CONFIRM_SETTING: SettingDefinition<'skipDeleteConfirm', boolean> = {
  key: 'skipDeleteConfirm',
  storageKey: 'sticky_notes_skip_delete_confirm',
  defaultValue: false,
  codec: booleanSettingCodec
};

export const ENABLE_IMMERSIVE_FULLSCREEN_SETTING: SettingDefinition<'enableImmersiveFullscreen', boolean> = {
  key: 'enableImmersiveFullscreen',
  storageKey: 'sticky_notes_enable_immersive_fullscreen',
  defaultValue: false,
  codec: booleanSettingCodec
};

export const CATEGORY_INDEPENDENT_TOOLBAR_SETTING: SettingDefinition<'categoryIndependentToolbar', boolean> = {
  key: 'categoryIndependentToolbar',
  storageKey: 'sticky_notes_category_independent_toolbar',
  defaultValue: false,
  codec: booleanSettingCodec
};

export const CATEGORY_VIEW_SETTINGS_SETTING: SettingDefinition<'categoryViewSettings', Record<string, CategoryViewSetting>> = {
  key: 'categoryViewSettings',
  storageKey: 'sticky_notes_category_view_settings',
  defaultValue: {},
  codec: jsonSettingCodec<Record<string, CategoryViewSetting>>(
    (v): v is Record<string, CategoryViewSetting> => typeof v === 'object' && v !== null && !Array.isArray(v)
  )
};

export const SORT_MODE_SETTING: SettingDefinition<'sortMode', SortMode> = {
  key: 'sortMode',
  storageKey: 'sticky_notes_sort_mode',
  defaultValue: 'date',
  codec: enumSettingCodec(['date', 'title', 'tag', 'custom', 'useCount'] as const)
};

export const SORT_ORDER_SETTING: SettingDefinition<'sortOrder', SortOrder> = {
  key: 'sortOrder',
  storageKey: 'sticky_notes_sort_order',
  defaultValue: 'desc',
  codec: enumSettingCodec(['asc', 'desc'] as const)
};

export const COLLAPSED_CATEGORIES_SETTING: SettingDefinition<'collapsedCategoryIds', string[]> = {
  key: 'collapsedCategoryIds',
  storageKey: 'sticky_notes_collapsed_categories',
  defaultValue: [],
  codec: jsonSettingCodec<string[]>((v): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string'))
};

export const APP_SETTING_DEFINITIONS = [
  THEME_SETTING,
  GRID_COLUMNS_SETTING,
  MIN_NOTE_WIDTH_SETTING,
  NOTE_MAX_HEIGHT_SETTING,
  ENABLED_ACTION_BAR_BUTTONS_SETTING,
  DATE_FORMAT_SETTING,
  DEFAULT_NOTE_COLOR_SETTING,
  DEFAULT_NOTE_TYPE_SETTING,
  DEFAULT_EDIT_MODE_SETTING,
  DOUBLE_CLICK_NOTE_ACTION_SETTING,
  SUPER_PANEL_DEFAULT_CATEGORY_SETTING,
  START_PAGE_MODE_SETTING,
  ENABLE_HOVER_ANIMATION_SETTING,
  ENABLE_AUTO_COPY_SELECTION_SETTING,
  SHOW_NOTE_COUNT_SETTING,
  PREFIX_TAG_WITH_HASH_SETTING,
  SKIP_DELETE_CONFIRM_SETTING,
  ENABLE_IMMERSIVE_FULLSCREEN_SETTING,
  CATEGORY_INDEPENDENT_TOOLBAR_SETTING,
  CATEGORY_VIEW_SETTINGS_SETTING,
  SORT_MODE_SETTING,
  SORT_ORDER_SETTING,
  COLLAPSED_CATEGORIES_SETTING,
  GLOBAL_TRIGGER_SETTING,
  HIDE_ON_BLUR_SETTING
] as const;

export const APP_SETTINGS_MAP = new Map<string, SettingDefinition<string, any>>(
  APP_SETTING_DEFINITIONS.map(def => [def.key, def])
);

export const getSettingDefinition = (key: string): SettingDefinition<string, any> | undefined => {
  return APP_SETTINGS_MAP.get(key);
};
