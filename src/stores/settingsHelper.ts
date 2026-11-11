import { AppSettings } from '@type';
import {
  APP_SETTING_DEFINITIONS,
  decodeSettingValue
} from '../domain/settings/AppSettingRegistry';
import { applyDesktopSettings, getDesktopSettings } from './desktopSettingsHelper';

export const getCurrentSettings = (
  uiStore: any,
  noteStore: any,
  shortcutStore: any,
  categoryStore: any
): AppSettings => {
  return {
    theme: uiStore.isDark ? 'dark' : 'light',
    gridColumns: uiStore.gridColumns,
    minNoteWidth: uiStore.minNoteWidth,
    noteMaxHeight: uiStore.noteMaxHeight,
    enabledActionBarButtons: uiStore.enabledActionBarButtons,
    dateFormat: uiStore.dateFormat,
    defaultNoteColor: uiStore.defaultNoteColor,
    defaultNoteType: uiStore.defaultNoteType,
    defaultEditMode: uiStore.defaultEditMode,
    doubleClickNoteAction: uiStore.doubleClickNoteAction,
    superPanelDefaultCategory: uiStore.superPanelDefaultCategory,
    startPageMode: uiStore.startPageMode,
    enableHoverAnimation: uiStore.enableHoverAnimation,
    enableAutoCopySelection: uiStore.enableAutoCopySelection,
    showNoteCount: uiStore.showNoteCount,
    prefixTagWithHash: uiStore.prefixTagWithHash,
    skipDeleteConfirm: uiStore.skipDeleteConfirm,
    enableImmersiveFullscreen: uiStore.enableImmersiveFullscreen,
    sortMode: noteStore.sortMode,
    sortOrder: noteStore.sortOrder,
    categoryIndependentToolbar: uiStore.categoryIndependentToolbar,
    categoryViewSettings: uiStore.categoryViewSettings,
    shortcuts: shortcutStore.shortcuts.map((s: any) => ({ id: s.id, currentKey: s.currentKey })),
    collapsedCategoryIds: categoryStore.collapsedCategoryIds,
    ...getDesktopSettings()
  };
};

export const applySettings = (
  settings: AppSettings,
  uiStore: any,
  noteStore: any,
  shortcutStore: any,
  categoryStore: any
) => {
  if (!settings || typeof settings !== 'object') return;

  // 1. 遍历应用设置注册表驱动解码与赋值
  for (const def of APP_SETTING_DEFINITIONS) {
    const rawVal = (settings as any)[def.key];
    if (rawVal === undefined) continue;

    const decoded = decodeSettingValue(def as any, rawVal);
    if (decoded === undefined) continue;

    if (def.key === 'sortMode') {
      noteStore.setSortMode(decoded);
    } else if (def.key === 'sortOrder') {
      if (typeof noteStore.setSortOrder === 'function') {
        noteStore.setSortOrder(decoded);
      } else {
        noteStore.sortOrder = decoded;
      }
    } else if (def.key === 'collapsedCategoryIds') {
      categoryStore.collapsedCategoryIds = decoded;
      if (categoryStore.saveCollapsed) {
        categoryStore.saveCollapsed();
      }
    } else if (def.key === 'categoryViewSettings') {
      uiStore.categoryViewSettings = decoded;
      uiStore.saveCategoryViewSettings();
    } else if (def.key === 'theme') {
      const isDarkTarget = decoded === 'dark';
      if (isDarkTarget !== uiStore.isDark) {
        uiStore.toggleTheme();
      }
    } else {
      const setterName = `set${def.key.charAt(0).toUpperCase()}${def.key.slice(1)}`;
      if (typeof uiStore[setterName] === 'function') {
        uiStore[setterName](decoded);
      } else if (typeof uiStore.setSetting === 'function') {
        uiStore.setSetting(def.key, decoded);
      }
    }
  }

  // 2. 快捷键列表恢复
  if (Array.isArray(settings.shortcuts)) {
    settings.shortcuts.forEach(item => {
      if (item && typeof item.id === 'string' && typeof item.currentKey === 'string') {
        shortcutStore.updateShortcut(item.id, item.currentKey);
      }
    });
  }

  // 3. 桌面专属设置恢复
  applyDesktopSettings(settings);

  // 4. 当前分类视图更新
  if (typeof noteStore.applyCategoryViewSettings === 'function' && noteStore.currentCategoryId) {
    noteStore.applyCategoryViewSettings(noteStore.currentCategoryId);
  }
};
