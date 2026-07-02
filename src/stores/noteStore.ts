import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { Note } from '@type';
import { storage } from '@utils/storage';
import { useUiStore } from './uiStore';

export const useNoteStore = defineStore('noteStore', () => {
  const notes = ref<Note[]>([]);
  const currentCategoryId = ref<string>('all');
  const searchQuery = ref<string>('');
  const searchTarget = ref<Array<'all' | 'title' | 'content' | 'tag'>>(['all']);
  const sortMode = ref<'date' | 'title' | 'tag' | 'custom'>('date');
  const sortOrder = ref<'asc' | 'desc'>('desc');
  const draggedNoteId = ref<string | null>(null);
  const editingNoteId = ref<string | null>(null);

  const saveNotes = () => {
    storage.setItem('sticky_notes_notes', JSON.stringify(notes.value));
  };

  const addNote = (categoryId: string, content = '', title = '', color = 'yellow') => {
    const newNote: Note = {
      id: Date.now().toString(),
      categoryId,
      title: title.trim(),
      content: content,
      color,
      isPinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: []
    };

    notes.value.unshift(newNote);
    saveNotes();

    editingNoteId.value = newNote.id;
    return newNote;
  };

  const deleteNote = (id: string) => {
    const note = notes.value.find(n => n.id === id);
    if (!note) return;

    const uiStore = useUiStore();
    if (note.isDeleted) {
      notes.value = notes.value.filter(n => n.id !== id);
      uiStore.showToast('已彻底删除便签', 'success');
    } else {
      note.isDeleted = true;
      note.deletedAt = Date.now();
      note.isPinned = false;
      uiStore.showToast('已将便签移至回收站', 'success');
    }
    saveNotes();
  };

  const restoreNote = (id: string) => {
    const note = notes.value.find(n => n.id === id);
    if (note) {
      note.isDeleted = false;
      delete note.deletedAt;
      note.updatedAt = Date.now();
      saveNotes();
      const uiStore = useUiStore();
      uiStore.showToast('已成功恢复便签', 'success');
    }
  };

  const clearTrash = () => {
    notes.value = notes.value.filter(n => n.isDeleted !== true);
    saveNotes();
    const uiStore = useUiStore();
    uiStore.showToast('已清空回收站的所有便签', 'success');
  };

  const trashNotesCount = computed(() => {
    return notes.value.filter(n => n.isDeleted === true).length;
  });

  const updateNote = (
    id: string,
    fields: Partial<Omit<Note, 'id' | 'createdAt'>>,
    updateTimestamp = true
  ) => {
    const note = notes.value.find(n => n.id === id);
    if (note) {
      Object.assign(note, fields);
      if (updateTimestamp) {
        note.updatedAt = Date.now();
      }
      saveNotes();
    }
  };

  const clearNotes = (categoryId: string, descendants?: Set<string>) => {
    const uiStore = useUiStore();
    if (categoryId === 'all') {
      notes.value.forEach(n => {
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
      notes.value.forEach(n => {
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
          }
        }
        const [movedNote] = notes.value.splice(fromIndex, 1);
        notes.value.splice(toIndex, 0, movedNote);
        saveNotes();
      }
    }
  };

  return {
    notes,
    currentCategoryId,
    searchQuery,
    searchTarget,
    sortMode,
    sortOrder,
    draggedNoteId,
    editingNoteId,
    saveNotes,
    addNote,
    deleteNote,
    restoreNote,
    clearTrash,
    trashNotesCount,
    updateNote,
    clearNotes,
    setSortMode,
    moveNote
  };
});
