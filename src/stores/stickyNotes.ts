import { defineStore } from 'pinia';
import { ref, toRef, computed, readonly } from 'vue';
import { useCategoryStore } from './categoryStore';
import { useNoteStore } from './noteStore';
import { useUiStore } from './uiStore';
import { COLOR_PRESETS } from './colorPresets';
import * as helpers from './stickyNotesHelpers';
import { storage, pasteTextToCursor } from '@utils/storage';
import { Note, NoteType, ExportOptions, ImportOptions } from '@type';
import { useShortcutStore } from './shortcutStore';
import { getDefaultCategories } from './defaultData';
import { getCurrentSettings, applySettings } from './settingsHelper';
import { getFilteredAndSortedNotes, normalizeCategoryOrder } from './stickyNotesAlgorithms';
import { commandRegistry } from '../domain/commands/CommandRegistry';
import { categoryRepository, noteRepository } from '../infrastructure/storage/Repository';

export { COLOR_PRESETS };

export const useStickyNotesStore = defineStore('stickyNotes', () => {
  const categoryStore = useCategoryStore();
  const noteStore = useNoteStore();
  const uiStore = useUiStore();

  // 为 helpers 获取带有 .value 引用性质的 Ref 代理
  const categoriesRef = toRef(categoryStore, 'categories');
  const notesRef = toRef(noteStore, 'notes');
  const categoryOrderRef = toRef(categoryStore, 'categoryOrder');
  const gridColumnsRef = toRef(uiStore, 'gridColumns');

  // 记录数据是否完成初始化加载
  const isInitialized = ref(false);

  // 注册全局命令处理函数
  commandRegistry.registerHandler('addNote', '新建便签', () => {
    let targetCat = noteStore.currentCategoryId;
    if (targetCat === 'all' || targetCat === 'trash' || targetCat === 'recent') {
      targetCat = 'uncategorized';
    }
    noteStore.addNote(targetCat, '', '');
    uiStore.showToast('已快捷新建空便签，可以直接编辑');
  });

  // 集中式数据加载
  const loadData = () => {
    try {
      const shortcutStore = useShortcutStore();
      shortcutStore.loadShortcuts();

      const storedCategories = categoryRepository.getAll();
      if (storedCategories && storedCategories.length > 0) {
        categoryStore.categories = storedCategories;
      } else {
        categoryStore.categories = getDefaultCategories();
        categoryStore.saveCategories();
      }

      categoryStore.collapsedCategoryIds = categoryRepository.getCollapsed();

      // 初始化或加载分类顺序
      const loadedOrder = categoryRepository.getOrder();
      categoryStore.categoryOrder = normalizeCategoryOrder(loadedOrder, categoryStore.categories);
      if (loadedOrder.length === 0) {
        categoryStore.saveCategoryOrder();
      }

      const storedSortMode = storage.getItem('sticky_notes_sort_mode');
      if (storedSortMode && ['date', 'title', 'tag', 'custom', 'useCount'].includes(storedSortMode)) {
        noteStore.sortMode = storedSortMode as 'date' | 'title' | 'tag' | 'custom' | 'useCount';
      }

      const storedSortOrder = storage.getItem('sticky_notes_sort_order');
      if (storedSortOrder && ['asc', 'desc'].includes(storedSortOrder)) {
        noteStore.sortOrder = storedSortOrder as 'asc' | 'desc';
      }

      const storedGridColumns = storage.getItem('sticky_notes_grid_columns');
      if (storedGridColumns) {
        if (storedGridColumns === 'auto') {
          uiStore.gridColumns = 'auto';
        } else {
          const cols = parseInt(storedGridColumns, 10);
          if ([1, 2, 3, 4].includes(cols)) {
            uiStore.gridColumns = cols as 1 | 2 | 3 | 4;
          }
        }
      }

      const storedMinNoteWidth = storage.getItem('sticky_notes_min_note_width');
      if (storedMinNoteWidth) {
        const width = parseInt(storedMinNoteWidth, 10);
        if (!isNaN(width)) {
          uiStore.minNoteWidth = width;
        }
      }

      const storedNoteMaxHeight = storage.getItem('sticky_notes_note_max_height');
      if (storedNoteMaxHeight) {
        const height = parseInt(storedNoteMaxHeight, 10);
        if (!isNaN(height)) {
          uiStore.noteMaxHeight = height;
        }
      }

      const storedEnabledButtons = storage.getItem('sticky_notes_enabled_action_bar_buttons');
      if (storedEnabledButtons) {
        try {
          uiStore.enabledActionBarButtons = JSON.parse(storedEnabledButtons);
        } catch (e) {
          console.error('Failed to parse enabled action bar buttons:', e);
        }
      }

      const storedDateFormat = storage.getItem('sticky_notes_date_format');
      if (storedDateFormat) {
        uiStore.dateFormat = storedDateFormat;
      }

      const storedDefaultNoteColor = storage.getItem('sticky_notes_default_note_color');
      if (storedDefaultNoteColor) {
        uiStore.defaultNoteColor = storedDefaultNoteColor;
      }

      const storedDefaultNoteType = storage.getItem('sticky_notes_default_note_type');
      if (storedDefaultNoteType && ['text', 'markdown'].includes(storedDefaultNoteType)) {
        uiStore.defaultNoteType = storedDefaultNoteType as any;
      }

      const storedDefaultEditMode = storage.getItem('sticky_notes_default_edit_mode');
      if (storedDefaultEditMode && ['inline', 'fullscreen'].includes(storedDefaultEditMode)) {
        uiStore.defaultEditMode = storedDefaultEditMode as 'inline' | 'fullscreen';
      }

      const storedSuperPanelCat = storage.getItem('sticky_notes_super_panel_default_category');
      if (storedSuperPanelCat) {
        uiStore.superPanelDefaultCategory = storedSuperPanelCat;
      }

      const storedStartPageMode = storage.getItem('sticky_notes_start_page_mode');
      if (storedStartPageMode && ['last', 'default'].includes(storedStartPageMode)) {
        uiStore.startPageMode = storedStartPageMode as 'last' | 'default';
      }

      const storedEnableHoverAnimation = storage.getItem('sticky_notes_enable_hover_animation');
      if (storedEnableHoverAnimation !== null) {
        uiStore.enableHoverAnimation = storedEnableHoverAnimation === 'true';
      }

      const storedEnableAutoCopySelection = storage.getItem('sticky_notes_enable_auto_copy_selection');
      if (storedEnableAutoCopySelection !== null) {
        uiStore.enableAutoCopySelection = storedEnableAutoCopySelection === 'true';
      }

      const storedShowNoteCount = storage.getItem('sticky_notes_show_note_count');
      if (storedShowNoteCount !== null) {
        uiStore.showNoteCount = storedShowNoteCount === 'true';
      }

      const storedPrefixTagWithHash = storage.getItem('sticky_notes_prefix_tag_with_hash');
      if (storedPrefixTagWithHash !== null) {
        uiStore.prefixTagWithHash = storedPrefixTagWithHash === 'true';
      }

      const storedSkipDeleteConfirm = storage.getItem('sticky_notes_skip_delete_confirm');
      if (storedSkipDeleteConfirm !== null) {
        uiStore.skipDeleteConfirm = storedSkipDeleteConfirm === 'true';
      }

      const storedCategoryIndependentToolbar = storage.getItem('sticky_notes_category_independent_toolbar');
      if (storedCategoryIndependentToolbar !== null) {
        uiStore.categoryIndependentToolbar = storedCategoryIndependentToolbar === 'true';
      }

      const storedCategoryViewSettings = storage.getItem('sticky_notes_category_view_settings');
      if (storedCategoryViewSettings) {
        try {
          uiStore.categoryViewSettings = JSON.parse(storedCategoryViewSettings);
        } catch (e) {
          console.error('Failed to parse category view settings:', e);
        }
      }

      const storedNotes = noteRepository.getAll();
      if (storedNotes && storedNotes.length > 0) {
        noteStore.allNotes = storedNotes;
      } else {
        noteStore.allNotes = helpers.getDefaultNotes();
        noteStore.saveNotes();
      }

      // 初始化启动时的默认页面或上次分类页面
      const mode = uiStore.startPageMode;
      if (mode === 'default') {
        const targetCategory = uiStore.superPanelDefaultCategory || 'all';
        const isSystemCat = ['all', 'recent', 'trash'].includes(targetCategory);
        const exists = isSystemCat || categoryStore.categories.some(c => c.id === targetCategory);
        noteStore.currentCategoryId = exists ? targetCategory : 'all';
      } else {
        const lastCategoryId = storage.getItem('sticky_notes_last_category_id') || 'all';
        const isSystemCat = ['all', 'recent', 'trash'].includes(lastCategoryId);
        const exists = isSystemCat || categoryStore.categories.some(c => c.id === lastCategoryId);
        noteStore.currentCategoryId = exists ? lastCategoryId : 'all';
      }

      noteStore.loadNotesForCurrentCategory(true);
      isInitialized.value = true;

      helpers.checkAndAutoBackupPreUpdate(
        categoryStore.categories,
        noteStore.allNotes,
        getCurrentSettings(uiStore, noteStore, useShortcutStore(), categoryStore)
      );
    } catch (e) {
      console.error('Failed to load sticky notes data:', e);
    }
  };

  const reloadNotes = () => {
    noteStore.allNotes = noteRepository.getAll();
    noteStore.syncCurrentCategoryNotes();
  };

  // 跨 Store 协调的 Action 方法包装
  const addCategory = (name: string, parentId?: string) => {
    const newCategory = categoryStore.addCategory(name, parentId);
    if (newCategory) {
      noteStore.currentCategoryId = newCategory.id;
    }
    return newCategory;
  };

  const deleteCategory = (id: string) => {
    categoryStore.deleteCategory(id);

    noteStore.allNotes = noteStore.allNotes.map(n => {
      if (n.categoryId === id) {
        return {
          ...n,
          isDeleted: true,
          deletedAt: Date.now(),
          isPinned: false
        };
      }
      return n;
    });
    noteStore.saveNotes();
    noteStore.syncCurrentCategoryNotes();

    if (noteStore.currentCategoryId === id) {
      noteStore.currentCategoryId = 'all';
    }
  };

  const addNote = (categoryId: string, content = '', title = '', color?: string, type?: NoteType) => {
    let targetCategoryId = categoryId;
    if (categoryId === 'all' || categoryId === 'trash' || categoryId === 'recent') {
      targetCategoryId = 'uncategorized';
    }
    return noteStore.addNote(targetCategoryId, content, title, color, type);
  };

  const clearNotes = (categoryId: string) => {
    const descendants = categoryStore.getCategoryDescendants(categoryId);
    noteStore.clearNotes(categoryId, descendants);
  };

  // 协调便签的检索排序过滤算法
  const filteredNotes = computed(() => {
    return getFilteredAndSortedNotes(
      noteStore.notes,
      noteStore.searchQuery,
      noteStore.searchTarget,
      noteStore.sortMode,
      noteStore.sortOrder,
      noteStore.currentCategoryId,
      categoryStore.categories
    );
  });

  // 备份与粘贴代理方法
  const exportBackup = () => {
    const shortcutStore = useShortcutStore();
    const settings = getCurrentSettings(uiStore, noteStore, shortcutStore, categoryStore);
    helpers.exportBackup(categoryStore.categories, noteStore.allNotes, settings, uiStore.showToast);
  };

  const exportSelectedBackup = (options: ExportOptions) => {
    const shortcutStore = useShortcutStore();
    const settings = getCurrentSettings(uiStore, noteStore, shortcutStore, categoryStore);
    helpers.exportSelectedBackup(
      categoryStore.categories,
      noteStore.allNotes,
      settings,
      options,
      uiStore.showToast
    );
  };

  const importBackup = (jsonStr: string): boolean => {
    const shortcutStore = useShortcutStore();
    const ok = helpers.importBackup(
      jsonStr,
      categoriesRef,
      toRef(noteStore, 'allNotes'),
      categoryOrderRef,
      categoryStore.saveCategories,
      noteStore.saveNotes,
      categoryStore.saveCategoryOrder,
      uiStore.showToast,
      (settings) => applySettings(settings, uiStore, noteStore, shortcutStore, categoryStore)
    );
    if (ok) {
      noteStore.loadNotesForCurrentCategory();
    }
    return ok;
  };

  const importSelectedBackup = (options: ImportOptions): boolean => {
    if (!uiStore.pendingImportData) {
      uiStore.showToast('导入失败：找不到解析的备份数据', 'error');
      return false;
    }
    const shortcutStore = useShortcutStore();
    const ok = helpers.importSelectedBackup(
      uiStore.pendingImportData,
      options,
      categoriesRef,
      toRef(noteStore, 'allNotes'),
      categoryOrderRef,
      categoryStore.saveCategories,
      noteStore.saveNotes,
      categoryStore.saveCategoryOrder,
      uiStore.showToast,
      (settings) => applySettings(settings, uiStore, noteStore, shortcutStore, categoryStore)
    );
    if (ok) {
      noteStore.loadNotesForCurrentCategory();
      uiStore.closeImportModal();
    }
    return ok;
  };

  const prepareImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      if (text) {
        try {
          const data = JSON.parse(text);
          if (!data || typeof data !== 'object') {
            uiStore.showToast('导入失败：无效的 JSON 备份格式', 'error');
            return;
          }
          uiStore.openImportModal(data);
        } catch (err) {
          console.error('Failed to parse backup JSON file:', err);
          uiStore.showToast('导入失败：JSON 文件解析失败', 'error');
        }
      }
    };
    reader.readAsText(file);
  };

  const exportSingleNoteAsTxt = (note: Note) => {
    helpers.exportSingleNoteAsTxt(note, uiStore.showToast, uiStore.prefixTagWithHash);
  };

  const handlePasteNote = async (
    content: string,
    noteId?: string
  ): Promise<{ success: boolean; isNative: boolean }> => {
    if (!content.trim()) {
      uiStore.showToast('便签内容为空，无法复制粘贴', 'warning');
      return { success: false, isNative: false };
    }
    const isNative = await pasteTextToCursor(content);
    if (isNative) {
      uiStore.showToast('已隐藏并粘贴到目标光标处！', 'success');
    } else {
      uiStore.showToast('已复制到剪贴板，请到目标位置粘贴', 'info');
    }
    if (noteId) {
      noteStore.updateNoteLastUsed(noteId);
    }
    return { success: true, isNative };
  };

  const devResetNotes = () => {
    helpers.devResetNotes(toRef(noteStore, 'allNotes'), noteStore.saveNotes, uiStore.showToast);
    noteStore.loadNotesForCurrentCategory();
  };

  const devResetTags = () => {
    helpers.devResetTags(toRef(noteStore, 'allNotes'), noteStore.saveNotes, uiStore.showToast);
    noteStore.loadNotesForCurrentCategory();
  };

  const devResetAllData = () => {
    helpers.devResetAllData(loadData, gridColumnsRef, uiStore.showToast);
  };

  return {
    categories: categoriesRef,
    categoryOrder: categoryOrderRef,
    collapsedCategoryIds: toRef(categoryStore, 'collapsedCategoryIds'),
    addingSubParentId: toRef(categoryStore, 'addingSubParentId'),
    newSubCategoryName: toRef(categoryStore, 'newSubCategoryName'),
    orderedCategories: computed(() => categoryStore.orderedCategories),
    categoryOptions: computed(() => categoryStore.categoryOptions),
    toggleCategoryCollapse: categoryStore.toggleCategoryCollapse,
    isCategoryCollapsed: categoryStore.isCategoryCollapsed,
    getCategoryDescendants: categoryStore.getCategoryDescendants,
    saveCategoryOrder: categoryStore.saveCategoryOrder,
    reorderCategories: categoryStore.reorderCategories,
    moveCategory: categoryStore.moveCategory,
    addCategory,
    deleteCategory,
    updateCategory: categoryStore.updateCategory,

    allNotes: toRef(noteStore, 'allNotes'),
    notes: notesRef,
    isLoadingNotes: toRef(noteStore, 'isLoadingNotes'),
    currentCategoryId: toRef(noteStore, 'currentCategoryId'),
    searchQuery: toRef(noteStore, 'searchQuery'),
    searchTarget: toRef(noteStore, 'searchTarget'),
    sortMode: toRef(noteStore, 'sortMode'),
    sortOrder: toRef(noteStore, 'sortOrder'),
    draggedNoteId: toRef(noteStore, 'draggedNoteId'),
    editingNoteId: toRef(noteStore, 'editingNoteId'),
    filteredNotes,
    recentNotesCount: computed(() => {
      return noteStore.allNotes.filter(n => n.isDeleted !== true && n.lastUsedAt !== undefined).length;
    }),
    trashNotesCount: computed(() => noteStore.trashNotesCount),
    addNote,
    deleteNote: noteStore.deleteNote,
    restoreNote: noteStore.restoreNote,
    clearTrash: noteStore.clearTrash,
    updateNote: noteStore.updateNote,
    clearNotes,
    setSortMode: noteStore.setSortMode,
    moveNote: noteStore.moveNote,
    updateNoteLastUsed: noteStore.updateNoteLastUsed,

    toastMessage: toRef(uiStore, 'toastMessage'),
    toastType: toRef(uiStore, 'toastType'),
    toastPosition: toRef(uiStore, 'toastPosition'),
    showToast: uiStore.showToast,
    confirmState: toRef(uiStore, 'confirmState'),
    askConfirm: uiStore.askConfirm,
    handleConfirmResult: uiStore.handleConfirmResult,
    gridColumns: gridColumnsRef,
    minNoteWidth: toRef(uiStore, 'minNoteWidth'),
    noteMaxHeight: toRef(uiStore, 'noteMaxHeight'),
    setGridColumns: (cols: 'auto' | 1 | 2 | 3 | 4) => uiStore.setGridColumns(cols, noteStore.currentCategoryId),
    setMinNoteWidth: uiStore.setMinNoteWidth,
    setNoteMaxHeight: uiStore.setNoteMaxHeight,
    categoryIndependentToolbar: toRef(uiStore, 'categoryIndependentToolbar'),
    setCategoryIndependentToolbar: uiStore.setCategoryIndependentToolbar,
    categoryViewSettings: toRef(uiStore, 'categoryViewSettings'),
    showSettings: toRef(uiStore, 'showSettings'),
    openSettings: uiStore.openSettings,
    closeSettings: uiStore.closeSettings,
    isDark: toRef(uiStore, 'isDark'),
    initTheme: uiStore.initTheme,
    toggleTheme: uiStore.toggleTheme,
    enabledActionBarButtons: toRef(uiStore, 'enabledActionBarButtons'),
    setEnabledActionBarButtons: uiStore.setEnabledActionBarButtons,
    dateFormat: toRef(uiStore, 'dateFormat'),
    setDateFormat: uiStore.setDateFormat,
    defaultNoteColor: toRef(uiStore, 'defaultNoteColor'),
    setDefaultNoteColor: uiStore.setDefaultNoteColor,
    defaultNoteType: toRef(uiStore, 'defaultNoteType'),
    setDefaultNoteType: uiStore.setDefaultNoteType,
    defaultEditMode: toRef(uiStore, 'defaultEditMode'),
    setDefaultEditMode: uiStore.setDefaultEditMode,
    doubleClickNoteAction: toRef(uiStore, 'doubleClickNoteAction'),
    setDoubleClickNoteAction: uiStore.setDoubleClickNoteAction,
    superPanelDefaultCategory: toRef(uiStore, 'superPanelDefaultCategory'),
    setSuperPanelDefaultCategory: uiStore.setSuperPanelDefaultCategory,
    startPageMode: toRef(uiStore, 'startPageMode'),
    setStartPageMode: uiStore.setStartPageMode,
    enableHoverAnimation: toRef(uiStore, 'enableHoverAnimation'),
    setEnableHoverAnimation: uiStore.setEnableHoverAnimation,
    enableAutoCopySelection: toRef(uiStore, 'enableAutoCopySelection'),
    setEnableAutoCopySelection: uiStore.setEnableAutoCopySelection,
    showNoteCount: toRef(uiStore, 'showNoteCount'),
    setShowNoteCount: uiStore.setShowNoteCount,
    prefixTagWithHash: toRef(uiStore, 'prefixTagWithHash'),
    setPrefixTagWithHash: uiStore.setPrefixTagWithHash,
    skipDeleteConfirm: toRef(uiStore, 'skipDeleteConfirm'),
    setSkipDeleteConfirm: uiStore.setSkipDeleteConfirm,
    previewNoteId: toRef(uiStore, 'previewNoteId'),
    openedFullscreenForEditNoteId: toRef(uiStore, 'openedFullscreenForEditNoteId'),
    openNotePreview: uiStore.openNotePreview,
    closeNotePreview: uiStore.closeNotePreview,
    toggleNotePreview: uiStore.toggleNotePreview,

    showExportModal: toRef(uiStore, 'showExportModal'),
    openExportModal: uiStore.openExportModal,
    closeExportModal: uiStore.closeExportModal,
    showImportModal: toRef(uiStore, 'showImportModal'),
    pendingImportData: toRef(uiStore, 'pendingImportData'),
    openImportModal: uiStore.openImportModal,
    closeImportModal: uiStore.closeImportModal,

    isInitialized: readonly(isInitialized),
    loadData,
    reloadNotes,
    exportBackup,
    exportSelectedBackup,
    importBackup,
    importSelectedBackup,
    prepareImportFile,
    exportSingleNoteAsTxt,
    handlePasteNote,
    devResetNotes,
    devResetTags,
    devResetAllData
  };
});
