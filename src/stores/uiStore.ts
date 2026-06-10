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

  const setGridColumns = (cols: 'auto' | 1 | 2 | 3 | 4) => {
    gridColumns.value = cols;
    storage.setItem('sticky_notes_grid_columns', cols.toString());
  };

  const setMaxColumns = (val: 1 | 2 | 3 | 4) => {
    maxColumns.value = val;
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
    setGridColumns,
    setMaxColumns
  };
});
