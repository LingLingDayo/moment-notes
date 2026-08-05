import { AppSettings } from '@type';
import { storage } from '@utils/storage';
import { DOUBLE_CLICK_NOTE_ACTION_SETTING } from '../domain/noteInteractions/DoubleClickNoteActionRegistry';
import { decodeSettingValue } from '../domain/settings/SettingDefinition';

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
    sortMode: noteStore.sortMode,
    sortOrder: noteStore.sortOrder,
    categoryIndependentToolbar: uiStore.categoryIndependentToolbar,
    categoryViewSettings: uiStore.categoryViewSettings,
    shortcuts: shortcutStore.shortcuts.map((s: any) => ({ id: s.id, currentKey: s.currentKey })),
    collapsedCategoryIds: categoryStore.collapsedCategoryIds
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

  if (settings.theme === 'dark' || settings.theme === 'light') {
    const isDarkTarget = settings.theme === 'dark';
    if (isDarkTarget !== uiStore.isDark) {
      uiStore.toggleTheme();
    }
  }
  if (settings.gridColumns && ['auto', 1, 2, 3, 4].includes(settings.gridColumns)) {
    uiStore.setGridColumns(settings.gridColumns);
  }
  if (typeof settings.minNoteWidth === 'number' && !isNaN(settings.minNoteWidth)) {
    uiStore.setMinNoteWidth(settings.minNoteWidth);
  }
  if (typeof settings.noteMaxHeight === 'number' && !isNaN(settings.noteMaxHeight)) {
    uiStore.setNoteMaxHeight(settings.noteMaxHeight);
  }
  if (Array.isArray(settings.enabledActionBarButtons)) {
    uiStore.setEnabledActionBarButtons(settings.enabledActionBarButtons);
  }
  if (typeof settings.dateFormat === 'string') {
    uiStore.setDateFormat(settings.dateFormat);
  }
  if (typeof settings.defaultNoteColor === 'string') {
    uiStore.setDefaultNoteColor(settings.defaultNoteColor);
  }
  if (settings.defaultNoteType && ['text', 'markdown'].includes(settings.defaultNoteType)) {
    uiStore.setDefaultNoteType(settings.defaultNoteType);
  }
  if (settings.defaultEditMode && ['inline', 'fullscreen'].includes(settings.defaultEditMode)) {
    uiStore.setDefaultEditMode(settings.defaultEditMode);
  }
  const doubleClickNoteAction = decodeSettingValue(
    DOUBLE_CLICK_NOTE_ACTION_SETTING,
    settings.doubleClickNoteAction
  );
  if (doubleClickNoteAction) {
    uiStore.setDoubleClickNoteAction(doubleClickNoteAction);
  }
  if (typeof settings.superPanelDefaultCategory === 'string') {
    uiStore.setSuperPanelDefaultCategory(settings.superPanelDefaultCategory);
  }
  if (settings.startPageMode && ['last', 'default'].includes(settings.startPageMode)) {
    uiStore.setStartPageMode(settings.startPageMode);
  }
  if (typeof settings.enableHoverAnimation === 'boolean') {
    uiStore.setEnableHoverAnimation(settings.enableHoverAnimation);
  }
  if (typeof settings.enableAutoCopySelection === 'boolean') {
    uiStore.setEnableAutoCopySelection(settings.enableAutoCopySelection);
  }
  if (typeof settings.showNoteCount === 'boolean') {
    uiStore.setShowNoteCount(settings.showNoteCount);
  }
  if (typeof settings.prefixTagWithHash === 'boolean') {
    uiStore.setPrefixTagWithHash(settings.prefixTagWithHash);
  }
  if (typeof settings.skipDeleteConfirm === 'boolean') {
    uiStore.setSkipDeleteConfirm(settings.skipDeleteConfirm);
  }
  if (typeof settings.categoryIndependentToolbar === 'boolean') {
    uiStore.setCategoryIndependentToolbar(settings.categoryIndependentToolbar);
  }
  if (settings.categoryViewSettings && typeof settings.categoryViewSettings === 'object') {
    uiStore.categoryViewSettings = settings.categoryViewSettings;
    uiStore.saveCategoryViewSettings();
  }
  if (settings.sortMode && ['date', 'title', 'tag', 'custom', 'useCount'].includes(settings.sortMode)) {
    noteStore.setSortMode(settings.sortMode);
  }
  if (settings.sortOrder && ['asc', 'desc'].includes(settings.sortOrder)) {
    noteStore.sortOrder = settings.sortOrder;
    storage.setItem('sticky_notes_sort_order', settings.sortOrder);
  }
  if (Array.isArray(settings.shortcuts)) {
    settings.shortcuts.forEach(item => {
      if (item && typeof item.id === 'string' && typeof item.currentKey === 'string') {
        shortcutStore.updateShortcut(item.id, item.currentKey);
      }
    });
  }
  if (Array.isArray(settings.collapsedCategoryIds)) {
    categoryStore.collapsedCategoryIds = settings.collapsedCategoryIds;
    storage.setItem('sticky_notes_collapsed_categories', JSON.stringify(settings.collapsedCategoryIds));
  }
  if (typeof noteStore.applyCategoryViewSettings === 'function' && noteStore.currentCategoryId) {
    noteStore.applyCategoryViewSettings(noteStore.currentCategoryId);
  }
};
