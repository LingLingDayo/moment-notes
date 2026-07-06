import { defineStore } from 'pinia';
import { ref } from 'vue';
import { storage } from '@utils/storage';
import { useStickyNotesStore } from './stickyNotes';

export interface Shortcut {
  id: string;
  name: string;
  defaultKey: string;
  currentKey: string;
  description: string;
}

export const useShortcutStore = defineStore('shortcutStore', () => {
  const isRecording = ref(false);

  const shortcuts = ref<Shortcut[]>([
    {
      id: 'addNote',
      name: '新建便签',
      defaultKey: 'Ctrl+Alt+N',
      currentKey: 'Ctrl+Alt+N',
      description: '在当前所在分类下极速新建一个空白便签'
    },
    {
      id: 'focusSearch',
      name: '聚焦搜索',
      defaultKey: 'Ctrl+F',
      currentKey: 'Ctrl+F',
      description: '一键将输入光标聚焦到顶部的搜索框中'
    },
    {
      id: 'saveEdit',
      name: '保存编辑',
      defaultKey: 'Ctrl+Enter',
      currentKey: 'Ctrl+Enter',
      description: '在编辑便签内容时，快捷保存并结束编辑状态'
    },
    {
      id: 'cancelEdit',
      name: '取消编辑',
      defaultKey: 'Escape',
      currentKey: 'Escape',
      description: '在编辑便签内容时，放弃修改并退出编辑状态'
    }
  ]);

  const loadShortcuts = () => {
    const stored = storage.getItem('sticky_notes_shortcuts');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            const match = shortcuts.value.find(s => s.id === item.id);
            if (match) {
              match.currentKey = item.currentKey !== undefined ? item.currentKey : match.defaultKey;
            }
          });
        }
      } catch (e) {
        console.error('Failed to parse stored shortcuts:', e);
      }
    }
  };

  const saveShortcuts = () => {
    const data = shortcuts.value.map(s => ({ id: s.id, currentKey: s.currentKey }));
    storage.setItem('sticky_notes_shortcuts', JSON.stringify(data));
  };

  const updateShortcut = (id: string, newKey: string) => {
    if (!newKey) {
      const match = shortcuts.value.find(s => s.id === id);
      if (match) {
        match.currentKey = '';
        saveShortcuts();
      }
      return { success: true };
    }

    // 冲突排查
    const conflict = shortcuts.value.find(s => s.id !== id && s.currentKey.toLowerCase() === newKey.toLowerCase());
    if (conflict) {
      return { success: false, message: `与 [${conflict.name}] 快捷键冲突` };
    }

    const match = shortcuts.value.find(s => s.id === id);
    if (match) {
      match.currentKey = newKey;
      saveShortcuts();
    }
    return { success: true };
  };

  const resetShortcut = (id: string) => {
    const match = shortcuts.value.find(s => s.id === id);
    if (match) {
      match.currentKey = match.defaultKey;
      saveShortcuts();
    }
  };

  const clearShortcut = (id: string) => {
    const match = shortcuts.value.find(s => s.id === id);
    if (match) {
      match.currentKey = '';
      saveShortcuts();
    }
  };

  const getEventKeyString = (e: KeyboardEvent): string | null => {
    const key = e.key;
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
      return null;
    }
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');

    let displayKey = key;
    if (key === ' ') displayKey = 'Space';
    else if (key === 'ArrowLeft') displayKey = 'Left';
    else if (key === 'ArrowRight') displayKey = 'Right';
    else if (key === 'ArrowUp') displayKey = 'Up';
    else if (key === 'ArrowDown') displayKey = 'Down';
    else if (key.length === 1) displayKey = key.toUpperCase();

    parts.push(displayKey);
    return parts.join('+');
  };

  const triggerShortcut = (id: string) => {
    const stickyNotesStore = useStickyNotesStore();
    if (id === 'addNote') {
      stickyNotesStore.addNote(stickyNotesStore.currentCategoryId, '', '');
      stickyNotesStore.showToast('已快捷新建空便签，可以直接编辑');
    } else if (id === 'focusSearch') {
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
      if (!isInput) {
        const searchInput = document.querySelector('.search-input') as HTMLInputElement | null;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    }
  };

  return {
    isRecording,
    shortcuts,
    loadShortcuts,
    saveShortcuts,
    updateShortcut,
    resetShortcut,
    clearShortcut,
    getEventKeyString,
    triggerShortcut
  };
});
