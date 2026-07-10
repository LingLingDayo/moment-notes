import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { useShortcutStore } from '@stores/shortcutStore';
import { storage } from '@utils/storage';

export function useSettings() {
  const store = useStickyNotesStore();
  const shortcutStore = useShortcutStore();
  const activeTab = ref<string>('general');
  const fileInputRef = ref<HTMLInputElement | null>(null);

  // 双向绑定映射器，负责 Setter 拦截与 Pinia Store 的 side-effects 同步
  const getSettingValue = (key: string) => {
    return computed({
      get() {
        const shortcut = shortcutStore.shortcuts.find(s => s.id === key);
        if (shortcut) {
          return shortcut.currentKey;
        }
        return (store as any)[key];
      },
      set(val) {
        const shortcut = shortcutStore.shortcuts.find(s => s.id === key);
        if (shortcut) {
          shortcutStore.updateShortcut(key, val);
          return;
        }
        if (key === 'isDark') {
          if (store.isDark !== val) {
            store.toggleTheme();
          }
        } else if (key === 'gridColumns') {
          store.setGridColumns(val);
        } else if (key === 'minNoteWidth') {
          store.setMinNoteWidth(val);
        } else if (key === 'noteMaxHeight') {
          store.setNoteMaxHeight(val);
        } else if (key === 'enabledActionBarButtons') {
          store.setEnabledActionBarButtons(val);
        } else if (key === 'sortMode') {
          store.setSortMode(val);
        } else if (key === 'sortOrder') {
          store.sortOrder = val;
          storage.setItem('sticky_notes_sort_order', val);
        } else if (key === 'dateFormat') {
          store.setDateFormat(val);
        } else if (key === 'defaultNoteColor') {
          store.setDefaultNoteColor(val);
        } else if (key === 'superPanelDefaultCategory') {
          store.setSuperPanelDefaultCategory(val);
        } else if (key === 'enableHoverAnimation') {
          store.setEnableHoverAnimation(val);
        } else {
          (store as any)[key] = val;
        }
      }
    });
  };

  // 备份与恢复操作
  const triggerFileInput = () => {
    fileInputRef.value?.click();
  };

  const handleFileImport = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      if (text) {
        const ok = store.importBackup(text);
        if (ok) {
          store.showToast('备份恢复成功', 'success');
        }
      }
      target.value = '';
    };
    reader.readAsText(file);
  };

  const exportBackup = () => {
    store.exportBackup();
  };

  // 快捷操作逻辑
  const handleClear = async () => {
    if (store.currentCategoryId === 'trash') {
      const ok = await store.askConfirm(
        '确认清空便签吗？',
        '⚠️ 警告：清空便签将彻底从设备删除其中所有的便签，此操作不可逆，数据无法找回！'
      );
      if (ok) {
        store.clearTrash();
      }
      return;
    }

    const currentCat = store.categories.find(c => c.id === store.currentCategoryId);
    const catName = store.currentCategoryId === 'all'
      ? '"全部便签"'
      : (currentCat ? `"${currentCat.name}"` : '当前分类');

    const ok = await store.askConfirm(
      '确认删除便签',
      `⚠️ 警告：确定要清空 ${catName} 下的所有便签吗？这些便签将被移动到最近删除。`
    );
    if (ok) {
      store.clearNotes(store.currentCategoryId);
      store.showToast('已将所有便签移至最近删除');
    }
  };

  const handleAddNote = () => {
    store.addNote(store.currentCategoryId, '', '');
    store.showToast('已新建空便签，可以直接编辑');
  };

  const close = () => {
    store.closeSettings();
  };

  // 按键关闭弹窗生命周期逻辑
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && store.showSettings) {
      close();
    }
  };

  onMounted(() => window.addEventListener('keydown', handleKeyDown));
  onUnmounted(() => window.removeEventListener('keydown', handleKeyDown));

  return {
    store,
    activeTab,
    fileInputRef,
    getSettingValue,
    triggerFileInput,
    handleFileImport,
    exportBackup,
    handleClear,
    handleAddNote,
    close
  };
}
export type UseSettingsReturn = ReturnType<typeof useSettings>;
