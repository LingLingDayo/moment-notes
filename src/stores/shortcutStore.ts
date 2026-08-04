import { defineStore } from 'pinia';
import { ref } from 'vue';
import { storage } from '@utils/storage';
import { commandRegistry } from '../domain/commands/CommandRegistry';
import { parseKeyboardEvent } from '../domain/shortcuts/KeyCombo';
import { defaultContextService } from '../domain/shortcuts/KeybindingContextService';
import { defaultKeybindingRegistry } from '../domain/shortcuts/KeybindingRegistry';
import { ShortcutPipeline } from '../domain/shortcuts/ShortcutPipeline';

export interface Shortcut {
  id: string;
  name: string;
  defaultKey: string;
  currentKey: string;
  description: string;
}

export const useShortcutStore = defineStore('shortcutStore', () => {
  const isRecording = ref(false);
  const shortcuts = ref<Shortcut[]>(defaultKeybindingRegistry.getAll());

  // 基础快捷键处理管线
  const pipeline = new ShortcutPipeline({
    keybindingRegistry: defaultKeybindingRegistry,
    contextService: defaultContextService,
    isRecordingGetter: () => isRecording.value,
    onExecuteCommand: (commandId: string) => {
      triggerShortcut(commandId);
    }
  });

  const syncShortcuts = () => {
    shortcuts.value = defaultKeybindingRegistry.getAll().map(b => ({
      id: b.id,
      name: b.name,
      defaultKey: b.defaultKey,
      currentKey: b.currentKey,
      description: b.description
    }));
  };

  const loadShortcuts = () => {
    const stored = storage.getItem('sticky_notes_shortcuts');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: { id: string; currentKey: string }) => {
            if (item.id && item.currentKey !== undefined) {
              defaultKeybindingRegistry.updateKeybinding(item.id, item.currentKey);
            }
          });
        }
      } catch (e) {
        console.error('Failed to parse stored shortcuts:', e);
      }
    }
    syncShortcuts();
  };

  const saveShortcuts = () => {
    const data = shortcuts.value.map(s => ({ id: s.id, currentKey: s.currentKey }));
    storage.setItem('sticky_notes_shortcuts', JSON.stringify(data));
  };

  const updateShortcut = (id: string, newKey: string) => {
    const res = defaultKeybindingRegistry.updateKeybinding(id, newKey);
    if (res.success) {
      syncShortcuts();
      saveShortcuts();
    }
    return res;
  };

  const resetShortcut = (id: string) => {
    defaultKeybindingRegistry.resetKeybinding(id);
    syncShortcuts();
    saveShortcuts();
  };

  const clearShortcut = (id: string) => {
    defaultKeybindingRegistry.clearKeybinding(id);
    syncShortcuts();
    saveShortcuts();
  };

  const getEventKeyString = (e: KeyboardEvent): string | null => {
    const combo = parseKeyboardEvent(e);
    return combo ? combo.rawString : null;
  };

  const triggerShortcut = (id: string) => {
    if (commandRegistry.has(id)) {
      commandRegistry.execute(id);
      return;
    }

    if (id === 'focusSearch') {
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

  /**
   * 动态更新上下文标识 (如 inEditor, searchFocused, modalOpen)
   */
  const setContext = (key: string, value: boolean) => {
    defaultContextService.setContext(key, value);
  };

  /**
   * 处理键盘事件主逻辑，交由领域管线安全调度
   */
  const handleKeyDown = (e: KeyboardEvent) => {
    return pipeline.handleEvent(e);
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
    triggerShortcut,
    setContext,
    handleKeyDown
  };
});
