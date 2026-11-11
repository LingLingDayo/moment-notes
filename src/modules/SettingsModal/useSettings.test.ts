import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSettings } from './useSettings';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { useUiStore } from '@stores/uiStore';
import { storage } from '@utils/storage';
import { ENABLE_AUTO_COPY_SELECTION_SETTING } from '../../domain/settings/AppSettingRegistry';

describe('useSettings 设置项双向绑定 Hook', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('读取与修改常规设置项（重点覆盖修复后的 enableAutoCopySelection）', () => {
    const { getSettingValue } = useSettings();
    const uiStore = useUiStore();

    const autoCopyRef = getSettingValue('enableAutoCopySelection');
    expect(autoCopyRef.value).toBe(true);

    // 修改为 false，不仅内存变更，必须落盘到 storage
    autoCopyRef.value = false;
    expect(uiStore.enableAutoCopySelection).toBe(false);
    expect(storage.getItem(ENABLE_AUTO_COPY_SELECTION_SETTING.storageKey)).toBe('false');

    // 修改为 true
    autoCopyRef.value = true;
    expect(uiStore.enableAutoCopySelection).toBe(true);
    expect(storage.getItem(ENABLE_AUTO_COPY_SELECTION_SETTING.storageKey)).toBe('true');
  });

  it('修改列数与主题设置正确派发 side-effects', () => {
    const { getSettingValue } = useSettings();
    const uiStore = useUiStore();

    const gridCols = getSettingValue('gridColumns');
    gridCols.value = 3;
    expect(uiStore.gridColumns).toBe(3);

    const isDark = getSettingValue('isDark');
    const initial = isDark.value;
    isDark.value = !initial;
    expect(uiStore.isDark).toBe(!initial);
  });

  it('修改排序模式和排序顺序正确派发', () => {
    const { getSettingValue } = useSettings();
    const store = useStickyNotesStore();

    const sortMode = getSettingValue('sortMode');
    sortMode.value = 'title';
    expect(store.sortMode).toBe('title');

    const sortOrder = getSettingValue('sortOrder');
    sortOrder.value = 'asc';
    expect(store.sortOrder).toBe('asc');
  });
});
