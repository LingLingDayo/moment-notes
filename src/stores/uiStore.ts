import { defineStore } from 'pinia';
import { ref } from 'vue';
import { storage } from '@utils/storage';

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
  const maxColumns = ref<1 | 2 | 3 | 4>(4);
  const minNoteWidth = ref<number>(240);

  const setGridColumns = (cols: 'auto' | 1 | 2 | 3 | 4) => {
    gridColumns.value = cols;
    storage.setItem('sticky_notes_grid_columns', cols.toString());
  };

  const setMaxColumns = (val: 1 | 2 | 3 | 4) => {
    maxColumns.value = val;
  };

  const setMinNoteWidth = (val: number) => {
    minNoteWidth.value = Number(val) || 240;
    storage.setItem('sticky_notes_min_note_width', minNoteWidth.value.toString());
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
    if (isUtoolsEnv) {
      try {
        isDark.value = window.utools.isDarkColors();
        applyTheme(isDark.value);
        return;
      } catch (e) {
        console.error('Failed to get theme from uTools:', e);
      }
    }

    const storedTheme = storage.getItem('sticky_notes_theme');
    if (storedTheme) {
      isDark.value = storedTheme === 'dark';
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

  const defaultNoteColor = ref<string>('yellow');

  const setDefaultNoteColor = (val: string) => {
    defaultNoteColor.value = val || 'yellow';
    storage.setItem('sticky_notes_default_note_color', defaultNoteColor.value);
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
    maxColumns,
    minNoteWidth,
    setGridColumns,
    setMaxColumns,
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
    setDefaultNoteColor
  };
});

