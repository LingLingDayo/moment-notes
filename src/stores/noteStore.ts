import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { Note } from '@type';
import { storage } from '@utils/storage';
import { useUiStore } from './uiStore';
import { useCategoryStore } from './categoryStore';

export const useNoteStore = defineStore('noteStore', () => {
  const allNotes = ref<Note[]>([]);
  const notes = ref<Note[]>([]);
  const currentCategoryId = ref<string>('all');
  const searchQuery = ref<string>('');
  const searchTarget = ref<Array<'all' | 'title' | 'content' | 'tag'>>(['all']);
  const sortMode = ref<'date' | 'title' | 'tag' | 'custom'>('date');
  const sortOrder = ref<'asc' | 'desc'>('desc');
  const draggedNoteId = ref<string | null>(null);
  const editingNoteId = ref<string | null>(null);
  const isLoadingNotes = ref(false);

  const syncCurrentCategoryNotes = () => {
    const categoryId = currentCategoryId.value;
    const allNotesList = allNotes.value;
    const categoryStore = useCategoryStore();

    let result = allNotesList;
    if (categoryId === 'trash') {
      result = result.filter(n => n.isDeleted === true);
    } else if (categoryId === 'recent') {
      result = result.filter(n => n.isDeleted !== true && n.lastUsedAt !== undefined);
    } else {
      result = result.filter(n => n.isDeleted !== true);
      if (categoryId !== 'all') {
        const descendants = categoryStore.getCategoryDescendants(categoryId);
        result = result.filter(
          n => n.categoryId === categoryId || descendants.has(n.categoryId)
        );
      }
    }
    notes.value = result;
  };

  const loadNotesForCurrentCategory = () => {
    isLoadingNotes.value = true;
    notes.value = [];

    setTimeout(() => {
      syncCurrentCategoryNotes();
      isLoadingNotes.value = false;
    }, 0);
  };

  watch(currentCategoryId, (newId) => {
    if (newId) {
      storage.setItem('sticky_notes_last_category_id', newId);
      loadNotesForCurrentCategory();
    }
  });

  const saveNotes = () => {
    storage.setItem('sticky_notes_notes', JSON.stringify(allNotes.value));
  };

  const addNote = (categoryId: string, content = '', title = '', color?: string) => {
    const uiStore = useUiStore();
    const finalColor = color || uiStore.defaultNoteColor || 'yellow';
    const newNote: Note = {
      id: Date.now().toString(),
      categoryId,
      title: title.trim(),
      content: content,
      color: finalColor,
      isPinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: []
    };

    allNotes.value.unshift(newNote);
    saveNotes();
    syncCurrentCategoryNotes();

    editingNoteId.value = newNote.id;
    return newNote;
  };

  const deleteNote = (id: string) => {
    const note = allNotes.value.find(n => n.id === id);
    if (!note) return;

    const uiStore = useUiStore();
    if (note.isDeleted) {
      allNotes.value = allNotes.value.filter(n => n.id !== id);
      uiStore.showToast('已彻底删除便签', 'success');
    } else {
      note.isDeleted = true;
      note.deletedAt = Date.now();
      note.isPinned = false;
      uiStore.showToast('已将便签移至最近删除', 'success');
    }
    saveNotes();
    syncCurrentCategoryNotes();
  };

  const restoreNote = (id: string) => {
    const note = allNotes.value.find(n => n.id === id);
    if (note) {
      note.isDeleted = false;
      delete note.deletedAt;
      note.updatedAt = Date.now();
      saveNotes();
      syncCurrentCategoryNotes();
      const uiStore = useUiStore();
      uiStore.showToast('已成功恢复便签', 'success');
    }
  };

  const clearTrash = () => {
    allNotes.value = allNotes.value.filter(n => n.isDeleted !== true);
    saveNotes();
    syncCurrentCategoryNotes();
    const uiStore = useUiStore();
    uiStore.showToast('已清空最近删除的所有便签', 'success');
  };

  const trashNotesCount = computed(() => {
    return allNotes.value.filter(n => n.isDeleted === true).length;
  });

  const updateNote = (
    id: string,
    fields: Partial<Omit<Note, 'id' | 'createdAt'>>,
    updateTimestamp = true
  ) => {
    const note = allNotes.value.find(n => n.id === id);
    if (note) {
      Object.assign(note, fields);
      if (updateTimestamp) {
        note.updatedAt = Date.now();
      }
      saveNotes();
      syncCurrentCategoryNotes();
    }
  };

  const clearNotes = (categoryId: string, descendants?: Set<string>) => {
    const uiStore = useUiStore();
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
    uiStore.showToast('已清空当前分类下的便签', 'success');
  };

  const setSortMode = (mode: 'date' | 'title' | 'tag' | 'custom') => {
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
      }
    }
    storage.setItem('sticky_notes_sort_mode', sortMode.value);
    storage.setItem('sticky_notes_sort_order', sortOrder.value);
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
      saveNotes();
      syncCurrentCategoryNotes();
    }
  };

  return {
    allNotes,
    notes,
    currentCategoryId,
    searchQuery,
    searchTarget,
    sortMode,
    sortOrder,
    draggedNoteId,
    editingNoteId,
    isLoadingNotes,
    saveNotes,
    addNote,
    deleteNote,
    restoreNote,
    clearTrash,
    trashNotesCount,
    updateNote,
    clearNotes,
    setSortMode,
    moveNote,
    updateNoteLastUsed,
    loadNotesForCurrentCategory,
    syncCurrentCategoryNotes
  };
});
