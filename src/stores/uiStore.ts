import { defineStore } from 'pinia';
import { ref } from 'vue';
import { storage } from '@utils/storage';
import { NoteType, CategoryViewSetting, BackupData, DoubleClickNoteAction } from '@type';
import { eventBus, DomainEvent, ToastPayload } from '../domain/events/DomainEventBus';
import { settingRepository } from '../infrastructure/storage/SettingRepository';
import {
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
  GridColumns
} from '../domain/settings/AppSettingRegistry';

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

  // 监听领域事件，解耦业务发出 Toast 请求
  eventBus.subscribe<ToastPayload>('TOAST_REQUESTED', (event: DomainEvent<ToastPayload>) => {
    if (event.payload) {
      showToast(event.payload.message, event.payload.type, event.payload.position);
    }
  });

  const gridColumns = ref<GridColumns>(settingRepository.get(GRID_COLUMNS_SETTING));
  const minNoteWidth = ref<number>(settingRepository.get(MIN_NOTE_WIDTH_SETTING));
  const noteMaxHeight = ref<number>(settingRepository.get(NOTE_MAX_HEIGHT_SETTING));

  // 分类独立工具栏设置选项状态
  const categoryIndependentToolbar = ref<boolean>(settingRepository.get(CATEGORY_INDEPENDENT_TOOLBAR_SETTING));
  const categoryViewSettings = ref<Record<string, CategoryViewSetting>>(
    settingRepository.get(CATEGORY_VIEW_SETTINGS_SETTING)
  );

  const setCategoryIndependentToolbar = (val: boolean) => {
    categoryIndependentToolbar.value = settingRepository.set(CATEGORY_INDEPENDENT_TOOLBAR_SETTING, val);
  };

  const saveCategoryViewSettings = () => {
    settingRepository.set(CATEGORY_VIEW_SETTINGS_SETTING, categoryViewSettings.value);
  };

  const updateCategoryViewSetting = (categoryId: string, settingsPatch: CategoryViewSetting) => {
    if (!categoryViewSettings.value[categoryId]) {
      categoryViewSettings.value[categoryId] = {};
    }
    Object.assign(categoryViewSettings.value[categoryId], settingsPatch);
    saveCategoryViewSettings();
  };

  const setGridColumns = (cols: GridColumns, categoryId?: string) => {
    gridColumns.value = settingRepository.set(GRID_COLUMNS_SETTING, cols);
    if (categoryIndependentToolbar.value && categoryId) {
      updateCategoryViewSetting(categoryId, { gridColumns: cols });
    }
  };

  const setMinNoteWidth = (val: number) => {
    minNoteWidth.value = settingRepository.set(MIN_NOTE_WIDTH_SETTING, val);
  };

  const setNoteMaxHeight = (val: number) => {
    noteMaxHeight.value = settingRepository.set(NOTE_MAX_HEIGHT_SETTING, val);
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
    if (typeof document === 'undefined') return;
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
        isDark.value = window.utools?.isDarkColors?.() ?? false;
      } catch (e) {
        console.error('Failed to get theme from uTools:', e);
        isDark.value = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
      }
    } else {
      isDark.value = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    }
    applyTheme(isDark.value);
  };

  const toggleTheme = () => {
    isDark.value = !isDark.value;
    applyTheme(isDark.value);
    settingRepository.set(THEME_SETTING, isDark.value ? 'dark' : 'light');
  };

  const enabledActionBarButtons = ref<string[]>(settingRepository.get(ENABLED_ACTION_BAR_BUTTONS_SETTING));

  const setEnabledActionBarButtons = (buttons: string[]) => {
    enabledActionBarButtons.value = settingRepository.set(ENABLED_ACTION_BAR_BUTTONS_SETTING, buttons);
  };

  const dateFormat = ref<string>(settingRepository.get(DATE_FORMAT_SETTING));

  const setDateFormat = (val: string) => {
    dateFormat.value = settingRepository.set(DATE_FORMAT_SETTING, val);
  };

  const defaultNoteColor = ref<string>(settingRepository.get(DEFAULT_NOTE_COLOR_SETTING));

  const setDefaultNoteColor = (val: string) => {
    defaultNoteColor.value = settingRepository.set(DEFAULT_NOTE_COLOR_SETTING, val);
  };

  const defaultNoteType = ref<NoteType>(settingRepository.get(DEFAULT_NOTE_TYPE_SETTING));

  const setDefaultNoteType = (val: NoteType) => {
    defaultNoteType.value = settingRepository.set(DEFAULT_NOTE_TYPE_SETTING, val);
  };

  const defaultEditMode = ref<'inline' | 'fullscreen'>(settingRepository.get(DEFAULT_EDIT_MODE_SETTING));

  const setDefaultEditMode = (val: 'inline' | 'fullscreen') => {
    defaultEditMode.value = settingRepository.set(DEFAULT_EDIT_MODE_SETTING, val);
  };

  const doubleClickNoteAction = ref<DoubleClickNoteAction>(
    settingRepository.get(DOUBLE_CLICK_NOTE_ACTION_SETTING)
  );

  const setDoubleClickNoteAction = (val: DoubleClickNoteAction) => {
    doubleClickNoteAction.value = settingRepository.set(DOUBLE_CLICK_NOTE_ACTION_SETTING, val);
  };

  const superPanelDefaultCategory = ref<string>(settingRepository.get(SUPER_PANEL_DEFAULT_CATEGORY_SETTING));

  const setSuperPanelDefaultCategory = (val: string) => {
    superPanelDefaultCategory.value = settingRepository.set(SUPER_PANEL_DEFAULT_CATEGORY_SETTING, val);
  };

  const startPageMode = ref<'last' | 'default'>(settingRepository.get(START_PAGE_MODE_SETTING));

  const setStartPageMode = (val: 'last' | 'default') => {
    startPageMode.value = settingRepository.set(START_PAGE_MODE_SETTING, val);
  };

  const enableHoverAnimation = ref(settingRepository.get(ENABLE_HOVER_ANIMATION_SETTING));

  const setEnableHoverAnimation = (val: boolean) => {
    enableHoverAnimation.value = settingRepository.set(ENABLE_HOVER_ANIMATION_SETTING, val);
  };

  const enableAutoCopySelection = ref(settingRepository.get(ENABLE_AUTO_COPY_SELECTION_SETTING));

  const setEnableAutoCopySelection = (val: boolean) => {
    enableAutoCopySelection.value = settingRepository.set(ENABLE_AUTO_COPY_SELECTION_SETTING, val);
  };

  const showNoteCount = ref(settingRepository.get(SHOW_NOTE_COUNT_SETTING));

  const setShowNoteCount = (val: boolean) => {
    showNoteCount.value = settingRepository.set(SHOW_NOTE_COUNT_SETTING, val);
  };

  const prefixTagWithHash = ref(settingRepository.get(PREFIX_TAG_WITH_HASH_SETTING));

  const setPrefixTagWithHash = (val: boolean) => {
    prefixTagWithHash.value = settingRepository.set(PREFIX_TAG_WITH_HASH_SETTING, val);
  };

  const skipDeleteConfirm = ref(settingRepository.get(SKIP_DELETE_CONFIRM_SETTING));

  const setSkipDeleteConfirm = (val: boolean) => {
    skipDeleteConfirm.value = settingRepository.set(SKIP_DELETE_CONFIRM_SETTING, val);
  };

  const enableImmersiveFullscreen = ref(settingRepository.get(ENABLE_IMMERSIVE_FULLSCREEN_SETTING));

  const setEnableImmersiveFullscreen = (val: boolean) => {
    enableImmersiveFullscreen.value = settingRepository.set(ENABLE_IMMERSIVE_FULLSCREEN_SETTING, val);
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

  const loadSettings = () => {
    gridColumns.value = settingRepository.get(GRID_COLUMNS_SETTING);
    minNoteWidth.value = settingRepository.get(MIN_NOTE_WIDTH_SETTING);
    noteMaxHeight.value = settingRepository.get(NOTE_MAX_HEIGHT_SETTING);
    enabledActionBarButtons.value = settingRepository.get(ENABLED_ACTION_BAR_BUTTONS_SETTING);
    dateFormat.value = settingRepository.get(DATE_FORMAT_SETTING);
    defaultNoteColor.value = settingRepository.get(DEFAULT_NOTE_COLOR_SETTING);
    defaultNoteType.value = settingRepository.get(DEFAULT_NOTE_TYPE_SETTING);
    defaultEditMode.value = settingRepository.get(DEFAULT_EDIT_MODE_SETTING);
    doubleClickNoteAction.value = settingRepository.get(DOUBLE_CLICK_NOTE_ACTION_SETTING);
    superPanelDefaultCategory.value = settingRepository.get(SUPER_PANEL_DEFAULT_CATEGORY_SETTING);
    startPageMode.value = settingRepository.get(START_PAGE_MODE_SETTING);
    enableHoverAnimation.value = settingRepository.get(ENABLE_HOVER_ANIMATION_SETTING);
    enableAutoCopySelection.value = settingRepository.get(ENABLE_AUTO_COPY_SELECTION_SETTING);
    showNoteCount.value = settingRepository.get(SHOW_NOTE_COUNT_SETTING);
    prefixTagWithHash.value = settingRepository.get(PREFIX_TAG_WITH_HASH_SETTING);
    skipDeleteConfirm.value = settingRepository.get(SKIP_DELETE_CONFIRM_SETTING);
    enableImmersiveFullscreen.value = settingRepository.get(ENABLE_IMMERSIVE_FULLSCREEN_SETTING);
    categoryIndependentToolbar.value = settingRepository.get(CATEGORY_INDEPENDENT_TOOLBAR_SETTING);
    categoryViewSettings.value = settingRepository.get(CATEGORY_VIEW_SETTINGS_SETTING);
  };

  const setSetting = (key: string, val: unknown) => {
    switch (key) {
      case 'isDark':
        if (isDark.value !== val) toggleTheme();
        break;
      case 'theme':
        if ((isDark.value ? 'dark' : 'light') !== val) toggleTheme();
        break;
      case 'gridColumns':
        setGridColumns(val as GridColumns);
        break;
      case 'minNoteWidth':
        setMinNoteWidth(val as number);
        break;
      case 'noteMaxHeight':
        setNoteMaxHeight(val as number);
        break;
      case 'enabledActionBarButtons':
        setEnabledActionBarButtons(val as string[]);
        break;
      case 'dateFormat':
        setDateFormat(val as string);
        break;
      case 'defaultNoteColor':
        setDefaultNoteColor(val as string);
        break;
      case 'defaultNoteType':
        setDefaultNoteType(val as NoteType);
        break;
      case 'defaultEditMode':
        setDefaultEditMode(val as 'inline' | 'fullscreen');
        break;
      case 'doubleClickNoteAction':
        setDoubleClickNoteAction(val as DoubleClickNoteAction);
        break;
      case 'superPanelDefaultCategory':
        setSuperPanelDefaultCategory(val as string);
        break;
      case 'startPageMode':
        setStartPageMode(val as 'last' | 'default');
        break;
      case 'enableHoverAnimation':
        setEnableHoverAnimation(Boolean(val));
        break;
      case 'enableAutoCopySelection':
        setEnableAutoCopySelection(Boolean(val));
        break;
      case 'showNoteCount':
        setShowNoteCount(Boolean(val));
        break;
      case 'prefixTagWithHash':
        setPrefixTagWithHash(Boolean(val));
        break;
      case 'skipDeleteConfirm':
        setSkipDeleteConfirm(Boolean(val));
        break;
      case 'enableImmersiveFullscreen':
        setEnableImmersiveFullscreen(Boolean(val));
        break;
      case 'categoryIndependentToolbar':
        setCategoryIndependentToolbar(Boolean(val));
        break;
      default:
        break;
    }
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
    doubleClickNoteAction,
    setDoubleClickNoteAction,
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
    skipDeleteConfirm,
    setSkipDeleteConfirm,
    enableImmersiveFullscreen,
    setEnableImmersiveFullscreen,
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
    closeImportModal,
    loadSettings,
    setSetting
  };
});
