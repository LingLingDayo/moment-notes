import { defineStore } from 'pinia';
import { ref } from 'vue';
import { storage } from '@utils/storage';
import { NoteType, CategoryViewSetting, BackupData } from '@type';

export const useUiStore = defineStore('uiStore', () => {
  // 确认弹窗状态 (Promise 驱动)
  const confirmState = ref({ show: false, title: '', message: '' });
  let confirmResolve: ((val: boolean) => void) | null = null;

  const askConfirm = (title: string, message: string): Promise<boolean> => {
    confirmState.value = { show: true, title, message };
    return new Promise(resolve => {
      confirmResolve = resolve;
    });
  };

  const handleConfirmResult = (result: boolean) => {
    confirmState.value.show = false;
    if (confirmResolve) {
      confirmResolve(result);
      confirmResolve = null;
    }
  };

  // Toast 提示状态
  const toastMessage = ref<string>('');
  const toastType = ref<'success' | 'info' | 'warning' | 'error'>('success');
  const toastPosition = ref<'top' | 'bottom'>('top');
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  const showToast = (
    msg: string,
    type: 'success' | 'info' | 'warning' | 'error' = 'success',
    position: 'top' | 'bottom' = 'top'
  ) => {
    toastMessage.value = msg;
    toastType.value = type;
    toastPosition.value = position;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastMessage.value = '';
    }, 2500);
  };

  const gridColumns = ref<'auto' | 1 | 2 | 3 | 4>('auto');
  const minNoteWidth = ref<number>(260);
  const noteMaxHeight = ref<number>(300);

  // 分类独立工具栏设置选项状态
  const categoryIndependentToolbar = ref<boolean>(false);
  const categoryViewSettings = ref<Record<string, CategoryViewSetting>>({});

  const setCategoryIndependentToolbar = (val: boolean) => {
    categoryIndependentToolbar.value = val;
    storage.setItem('sticky_notes_category_independent_toolbar', val ? 'true' : 'false');
  };

  const saveCategoryViewSettings = () => {
    storage.setItem('sticky_notes_category_view_settings', JSON.stringify(categoryViewSettings.value));
  };

  const updateCategoryViewSetting = (categoryId: string, settingsPatch: CategoryViewSetting) => {
    if (!categoryViewSettings.value[categoryId]) {
      categoryViewSettings.value[categoryId] = {};
    }
    Object.assign(categoryViewSettings.value[categoryId], settingsPatch);
    saveCategoryViewSettings();
  };

  const setGridColumns = (cols: 'auto' | 1 | 2 | 3 | 4, categoryId?: string) => {
    gridColumns.value = cols;
    storage.setItem('sticky_notes_grid_columns', cols.toString());
    if (categoryIndependentToolbar.value && categoryId) {
      updateCategoryViewSetting(categoryId, { gridColumns: cols });
    }
  };

  const setMinNoteWidth = (val: number) => {
    minNoteWidth.value = Number(val) || 260;
    storage.setItem('sticky_notes_min_note_width', minNoteWidth.value.toString());
  };

  const setNoteMaxHeight = (val: number) => {
    noteMaxHeight.value = Number(val) || 320;
    storage.setItem('sticky_notes_note_max_height', noteMaxHeight.value.toString());
  };

  // 设置弹窗显示状态
  const showSettings = ref(false);

  const openSettings = () => {
    showSettings.value = true;
  };

  const closeSettings = () => {
    showSettings.value = false;
  };

  // 黑暗模式主题管理
  const isDark = ref(false);

  const applyTheme = (dark: boolean) => {
    const root = document.documentElement;
    if (dark) {
      root.classList.remove('light-theme');
      root.classList.add('dark-theme');
    } else {
      root.classList.remove('dark-theme');
      root.classList.add('light-theme');
    }
  };

  const initTheme = (isUtoolsEnv: boolean) => {
    const storedTheme = storage.getItem('sticky_notes_theme');
    if (storedTheme) {
      isDark.value = storedTheme === 'dark';
    } else if (isUtoolsEnv) {
      try {
        isDark.value = window.utools.isDarkColors();
      } catch (e) {
        console.error('Failed to get theme from uTools:', e);
        isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
    } else {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    applyTheme(isDark.value);
  };

  const toggleTheme = () => {
    isDark.value = !isDark.value;
    applyTheme(isDark.value);
    storage.setItem('sticky_notes_theme', isDark.value ? 'dark' : 'light');
  };

  const enabledActionBarButtons = ref<string[]>([
    'theme-toggle',
    'sort-select',
    'columns-select',
    'clear-notes'
  ]);

  const setEnabledActionBarButtons = (buttons: string[]) => {
    enabledActionBarButtons.value = buttons;
    storage.setItem('sticky_notes_enabled_action_bar_buttons', JSON.stringify(buttons));
  };

  const dateFormat = ref<string>('YYYY.MM.DD HH:mm');

  const setDateFormat = (val: string) => {
    dateFormat.value = val || 'YYYY.MM.DD HH:mm';
    storage.setItem('sticky_notes_date_format', dateFormat.value);
  };

  const defaultNoteColor = ref<string>('random');

  const setDefaultNoteColor = (val: string) => {
    defaultNoteColor.value = val || 'random';
    storage.setItem('sticky_notes_default_note_color', defaultNoteColor.value);
  };

  const defaultNoteType = ref<NoteType>('text');

  const setDefaultNoteType = (val: NoteType) => {
    defaultNoteType.value = val || 'text';
    storage.setItem('sticky_notes_default_note_type', defaultNoteType.value);
  };

  const defaultEditMode = ref<'inline' | 'fullscreen'>('inline');

  const setDefaultEditMode = (val: 'inline' | 'fullscreen') => {
    defaultEditMode.value = val || 'inline';
    storage.setItem('sticky_notes_default_edit_mode', defaultEditMode.value);
  };

  const superPanelDefaultCategory = ref<string>('all');

  const setSuperPanelDefaultCategory = (val: string) => {
    superPanelDefaultCategory.value = val || 'all';
    storage.setItem('sticky_notes_super_panel_default_category', superPanelDefaultCategory.value);
  };

  const startPageMode = ref<'last' | 'default'>('last');

  const setStartPageMode = (val: 'last' | 'default') => {
    startPageMode.value = val || 'last';
    storage.setItem('sticky_notes_start_page_mode', startPageMode.value);
  };

  const enableHoverAnimation = ref(true);

  const setEnableHoverAnimation = (val: boolean) => {
    enableHoverAnimation.value = val;
    storage.setItem('sticky_notes_enable_hover_animation', val ? 'true' : 'false');
  };

  const enableAutoCopySelection = ref(true);

  const setEnableAutoCopySelection = (val: boolean) => {
    enableAutoCopySelection.value = val;
    storage.setItem('sticky_notes_enable_auto_copy_selection', val ? 'true' : 'false');
  };

  const showNoteCount = ref(true);

  const setShowNoteCount = (val: boolean) => {
    showNoteCount.value = val;
    storage.setItem('sticky_notes_show_note_count', val ? 'true' : 'false');
  };

  const prefixTagWithHash = ref(true);

  const setPrefixTagWithHash = (val: boolean) => {
    prefixTagWithHash.value = val;
    storage.setItem('sticky_notes_prefix_tag_with_hash', val ? 'true' : 'false');
  };

  // 全屏便签预览状态
  const previewNoteId = ref<string | null>(null);
  const openedFullscreenForEditNoteId = ref<string | null>(null);

  const openNotePreview = (id: string) => {
    previewNoteId.value = id;
  };

  const closeNotePreview = () => {
    previewNoteId.value = null;
    openedFullscreenForEditNoteId.value = null;
  };

  const toggleNotePreview = (id: string) => {
    if (previewNoteId.value === id) {
      closeNotePreview();
    } else {
      openNotePreview(id);
    }
  };

  // 导出/导入弹窗状态
  const showExportModal = ref(false);
  const openExportModal = () => {
    showExportModal.value = true;
  };
  const closeExportModal = () => {
    showExportModal.value = false;
  };

  const showImportModal = ref(false);
  const pendingImportData = ref<BackupData | null>(null);
  const openImportModal = (data: BackupData) => {
    pendingImportData.value = data;
    showImportModal.value = true;
  };
  const closeImportModal = () => {
    showImportModal.value = false;
    pendingImportData.value = null;
  };


  return {
    confirmState,
    askConfirm,
    handleConfirmResult,
    toastMessage,
    toastType,
    toastPosition,
    showToast,
    gridColumns,
    minNoteWidth,
    setGridColumns,
    setMinNoteWidth,
    showSettings,
    openSettings,
    closeSettings,
    isDark,
    initTheme,
    toggleTheme,
    enabledActionBarButtons,
    setEnabledActionBarButtons,
    dateFormat,
    setDateFormat,
    defaultNoteColor,
    setDefaultNoteColor,
    defaultNoteType,
    setDefaultNoteType,
    defaultEditMode,
    setDefaultEditMode,
    superPanelDefaultCategory,
    setSuperPanelDefaultCategory,
    startPageMode,
    setStartPageMode,
    noteMaxHeight,
    setNoteMaxHeight,
    enableHoverAnimation,
    setEnableHoverAnimation,
    enableAutoCopySelection,
    setEnableAutoCopySelection,
    showNoteCount,
    setShowNoteCount,
    prefixTagWithHash,
    setPrefixTagWithHash,
    categoryIndependentToolbar,
    setCategoryIndependentToolbar,
    categoryViewSettings,
    updateCategoryViewSetting,
    saveCategoryViewSettings,
    previewNoteId,
    openedFullscreenForEditNoteId,
    openNotePreview,
    closeNotePreview,
    toggleNotePreview,
    showExportModal,
    openExportModal,
    closeExportModal,
    showImportModal,
    pendingImportData,
    openImportModal,
    closeImportModal
  };
});


