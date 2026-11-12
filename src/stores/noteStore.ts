import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { Note, NoteType } from '@type';
import { storage } from '@utils/storage';
import { useUiStore } from './uiStore';
import { useCategoryStore } from './categoryStore';
import { COLOR_PRESETS } from './colorPresets';
import { SearchTarget, SortMode, SortOrder } from '@type';
import { filterNotesByCategory } from '../domain/notes/noteAlgorithms';
import { resolveNoteCreationCategoryId } from '../domain/category/categoryRules';
import { settingRepository } from '../infrastructure/storage/SettingRepository';
import { SORT_MODE_SETTING, SORT_ORDER_SETTING } from '../domain/settings/AppSettingRegistry';
import {
  SEARCH_DEBOUNCE_THRESHOLD,
  SEARCH_DEBOUNCE_MS
} from '../domain/search/NoteSearchIndex';
import { noteRepository } from '../infrastructure/storage/Repository';
import { eventBus } from '../domain/events/DomainEventBus';

export const useNoteStore = defineStore('noteStore', () => {
  const allNotes = ref<Note[]>([]);
  const notes = ref<Note[]>([]);
  const currentCategoryId = ref<string>('all');
  const searchQuery = ref<string>('');
  const appliedSearchQuery = ref<string>('');
  const searchTarget = ref<SearchTarget[]>(['all']);
  const sortMode = ref<SortMode>(settingRepository.get(SORT_MODE_SETTING));
  const sortOrder = ref<SortOrder>(settingRepository.get(SORT_ORDER_SETTING));
  const draggedNoteId = ref<string | null>(null);
  const editingNoteId = ref<string | null>(null);
  const isLoadingNotes = ref(false);

  let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // 监听原始搜索输入，按数据量自适应防抖或立即生效
  watch(searchQuery, (newQuery) => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = null;
    }

    const trimmed = newQuery.trim();
    // 清空搜索或便签总量较少时立即应用，避免界面交互延迟
    if (!trimmed || notes.value.length <= SEARCH_DEBOUNCE_THRESHOLD) {
      appliedSearchQuery.value = newQuery;
      return;
    }

    // 大数据量且持续输入时引入平滑防抖，大幅降低频繁计算重绘
    searchDebounceTimer = setTimeout(() => {
      appliedSearchQuery.value = newQuery;
      searchDebounceTimer = null;
    }, SEARCH_DEBOUNCE_MS);
  });

  const syncCurrentCategoryNotes = () => {
    const categoryId = currentCategoryId.value;
    const allNotesList = allNotes.value;
    const categoryStore = useCategoryStore();
    const descendants =
      categoryId !== 'all' && categoryId !== 'trash' && categoryId !== 'recent'
        ? categoryStore.getCategoryDescendants(categoryId)
        : undefined;

    notes.value = filterNotesByCategory(allNotesList, categoryId, descendants);
  };

  const loadNotesForCurrentCategory = (_immediate = false) => {
    syncCurrentCategoryNotes();
    isLoadingNotes.value = false;
  };

  const applyCategoryViewSettings = (categoryId: string) => {
    const uiStore = useUiStore();
    if (!uiStore.categoryIndependentToolbar) return;

    const setting = uiStore.categoryViewSettings[categoryId];
    if (setting) {
      if (setting.sortMode) {
        sortMode.value = setting.sortMode;
      }
      if (setting.sortOrder) {
        sortOrder.value = setting.sortOrder;
      }
      if (setting.gridColumns) {
        uiStore.gridColumns = setting.gridColumns;
      }
    }
  };

  watch(currentCategoryId, (newId) => {
    if (newId) {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = null;
        appliedSearchQuery.value = searchQuery.value;
      }
      storage.setItem('sticky_notes_last_category_id', newId);
      applyCategoryViewSettings(newId);
      loadNotesForCurrentCategory();
    }
  });

  watch(sortOrder, (newOrder) => {
    const uiStore = useUiStore();
    if (uiStore.categoryIndependentToolbar && currentCategoryId.value) {
      uiStore.updateCategoryViewSetting(currentCategoryId.value, {
        sortOrder: newOrder
      });
    }
  });

  watch(sortMode, (newMode) => {
    const uiStore = useUiStore();
    if (uiStore.categoryIndependentToolbar && currentCategoryId.value) {
      uiStore.updateCategoryViewSetting(currentCategoryId.value, {
        sortMode: newMode
      });
    }
  });

  const saveNotes = () => {
    noteRepository.saveAll(allNotes.value);
  };

  let lastRandomColor = '';
  const newlyCreatedNoteIds = ref<Set<string>>(new Set());

  const isNewlyCreatedNote = (id: string) => newlyCreatedNoteIds.value.has(id);

  const markNoteAsSaved = (id: string) => {
    newlyCreatedNoteIds.value.delete(id);
  };

  const discardNewNote = (id: string) => {
    newlyCreatedNoteIds.value.delete(id);
    if (editingNoteId.value === id) {
      editingNoteId.value = null;
    }
    const index = allNotes.value.findIndex(n => n.id === id);
    if (index !== -1) {
      allNotes.value.splice(index, 1);
      saveNotes();
      syncCurrentCategoryNotes();
      eventBus.emit('NOTE_DELETED', id);
    }
  };

  const addNote = (categoryId: string, content = '', title = '', color?: string, type?: NoteType) => {
    const uiStore = useUiStore();
    const targetCategoryId = resolveNoteCreationCategoryId(categoryId);
    let finalColor = color || uiStore.defaultNoteColor || 'random';
    if (finalColor === 'random') {
      const presetKeys = Object.keys(COLOR_PRESETS);
      const availableKeys = presetKeys.length > 1
        ? presetKeys.filter(k => k !== lastRandomColor)
        : presetKeys;
      finalColor = availableKeys[Math.floor(Math.random() * availableKeys.length)];
      lastRandomColor = finalColor;
    }
    const finalType = type || uiStore.defaultNoteType || 'text';
    const newNote: Note = {
      id: Date.now().toString(),
      categoryId: targetCategoryId,
      title: title.trim(),
      content: content,
      type: finalType,
      color: finalColor,
      isPinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: []
    };

    allNotes.value.unshift(newNote);
    newlyCreatedNoteIds.value.add(newNote.id);
    saveNotes();
    syncCurrentCategoryNotes();

    editingNoteId.value = newNote.id;
    eventBus.emit('NOTE_CREATED', newNote);
    return newNote;
  };

  const deleteNote = (id: string) => {
    newlyCreatedNoteIds.value.delete(id);
    const note = allNotes.value.find(n => n.id === id);
    if (!note) return;

    if (note.isDeleted) {
      allNotes.value = allNotes.value.filter(n => n.id !== id);
      eventBus.requestToast('已彻底删除便签', 'success');
    } else {
      note.isDeleted = true;
      note.deletedAt = Date.now();
      note.isPinned = false;
      eventBus.requestToast('已将便签移至最近删除', 'success');
    }
    saveNotes();
    syncCurrentCategoryNotes();
    eventBus.emit('NOTE_DELETED', id);
  };

  const restoreNote = (id: string) => {
    const note = allNotes.value.find(n => n.id === id);
    if (note) {
      note.isDeleted = false;
      delete note.deletedAt;
      note.updatedAt = Date.now();
      saveNotes();
      syncCurrentCategoryNotes();
      eventBus.requestToast('已成功恢复便签', 'success');
      eventBus.emit('NOTE_RESTORED', id);
    }
  };

  const clearTrash = () => {
    allNotes.value = allNotes.value.filter(n => n.isDeleted !== true);
    saveNotes();
    syncCurrentCategoryNotes();
    eventBus.requestToast('已清空最近删除的所有便签', 'success');
  };

  const trashNotesCount = ref(0);
  watch(
    () => allNotes.value,
    (notesList) => {
      trashNotesCount.value = notesList.filter(n => n.isDeleted === true).length;
    },
    { deep: true, immediate: true }
  );

  const updateNote = (
    id: string,
    fields: Partial<Omit<Note, 'id' | 'createdAt'>>,
    updateTimestamp = true
  ) => {
    newlyCreatedNoteIds.value.delete(id);
    const note = allNotes.value.find(n => n.id === id);
    if (note) {
      Object.assign(note, fields);
      if (updateTimestamp) {
        note.updatedAt = Date.now();
      }
      saveNotes();
      syncCurrentCategoryNotes();
      eventBus.emit('NOTE_UPDATED', note);
    }
  };

  const clearNotes = (categoryId: string, descendants?: Set<string>) => {
    if (categoryId === 'all') {
      allNotes.value.forEach(n => {
        if (!n.isDeleted) {
          n.isDeleted = true;
          n.deletedAt = Date.now();
          n.isPinned = false;
        }
      });
    } else if (categoryId === 'trash') {
      clearTrash();
      return;
    } else {
      allNotes.value.forEach(n => {
        if (
          (n.categoryId === categoryId || (descendants && descendants.has(n.categoryId))) &&
          !n.isDeleted
        ) {
          n.isDeleted = true;
          n.deletedAt = Date.now();
          n.isPinned = false;
        }
      });
    }
    saveNotes();
    syncCurrentCategoryNotes();
    eventBus.requestToast('已清空当前分类下的便签', 'success');
  };

  const setSortMode = (mode: SortMode) => {
    if (mode === sortMode.value) {
      if (mode !== 'custom') {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
      }
    } else {
      sortMode.value = mode;
      if (mode === 'date') {
        sortOrder.value = 'desc';
      } else if (mode === 'title') {
        sortOrder.value = 'asc';
      } else if (mode === 'tag') {
        sortOrder.value = 'asc';
      } else if (mode === 'useCount') {
        sortOrder.value = 'desc';
      }
    }
    settingRepository.set(SORT_MODE_SETTING, sortMode.value);
    settingRepository.set(SORT_ORDER_SETTING, sortOrder.value);
  };

  const setSortOrder = (order: SortOrder) => {
    sortOrder.value = settingRepository.set(SORT_ORDER_SETTING, order);
  };

  const loadSettings = () => {
    sortMode.value = settingRepository.get(SORT_MODE_SETTING);
    sortOrder.value = settingRepository.get(SORT_ORDER_SETTING);
  };

  const moveNote = (draggedId: string, targetId: string) => {
    const fromIndex = notes.value.findIndex(n => n.id === draggedId);
    const toIndex = notes.value.findIndex(n => n.id === targetId);
    if (fromIndex !== -1 && toIndex !== -1) {
      const fromNote = notes.value[fromIndex];
      const toNote = notes.value[toIndex];
      if (fromNote.isPinned === toNote.isPinned) {
        if (currentCategoryId.value !== 'all' && currentCategoryId.value !== 'trash') {
          if (fromNote.categoryId !== toNote.categoryId) {
            fromNote.categoryId = toNote.categoryId;
            fromNote.updatedAt = Date.now();
            const allFrom = allNotes.value.find(n => n.id === draggedId);
            if (allFrom) {
              allFrom.categoryId = toNote.categoryId;
              allFrom.updatedAt = Date.now();
            }
          }
        }
        const [movedNote] = notes.value.splice(fromIndex, 1);
        notes.value.splice(toIndex, 0, movedNote);

        const allFromIndex = allNotes.value.findIndex(n => n.id === draggedId);
        const allToIndex = allNotes.value.findIndex(n => n.id === targetId);
        if (allFromIndex !== -1 && allToIndex !== -1) {
          const [movedAllNote] = allNotes.value.splice(allFromIndex, 1);
          allNotes.value.splice(allToIndex, 0, movedAllNote);
        }
        saveNotes();
      }
    }
  };

  const updateNoteLastUsed = (id: string) => {
    const note = allNotes.value.find(n => n.id === id);
    if (note) {
      note.lastUsedAt = Date.now();
      note.useCount = (note.useCount || 0) + 1;
      saveNotes();
      syncCurrentCategoryNotes();
    }
  };

  return {
    allNotes,
    notes,
    currentCategoryId,
    searchQuery,
    appliedSearchQuery,
    searchTarget,
    sortMode,
    sortOrder,
    draggedNoteId,
    editingNoteId,
    isLoadingNotes,
    saveNotes,
    addNote,
    deleteNote,
    discardNewNote,
    isNewlyCreatedNote,
    markNoteAsSaved,
    newlyCreatedNoteIds,
    restoreNote,
    clearTrash,
    trashNotesCount,
    updateNote,
    clearNotes,
    setSortMode,
    setSortOrder,
    loadSettings,
    moveNote,
    updateNoteLastUsed,
    loadNotesForCurrentCategory,
    syncCurrentCategoryNotes,
    applyCategoryViewSettings
  };
});
