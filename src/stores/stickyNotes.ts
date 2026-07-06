import { defineStore } from 'pinia';
import { toRef, computed } from 'vue';
import { useCategoryStore } from './categoryStore';
import { useNoteStore } from './noteStore';
import { useUiStore } from './uiStore';
import { COLOR_PRESETS } from './colorPresets';
import * as helpers from './stickyNotesHelpers';
import { storage, pasteTextToCursor } from '@utils/storage';
import { Note } from '@type';
import { useShortcutStore } from './shortcutStore';

export { COLOR_PRESETS };

export const useStickyNotesStore = defineStore('stickyNotes', () => {
  const categoryStore = useCategoryStore();
  const noteStore = useNoteStore();
  const uiStore = useUiStore();

  // 为 helpers 获取带有 .value 引用性质的 Ref 代理
  const categoriesRef = toRef(categoryStore, 'categories');
  const notesRef = toRef(noteStore, 'notes');
  const categoryOrderRef = toRef(categoryStore, 'categoryOrder');
  const gridColumnsRef = toRef(uiStore, 'gridColumns');

  // 集中式数据加载
  const loadData = () => {
    try {
      const shortcutStore = useShortcutStore();
      shortcutStore.loadShortcuts();

      const storedCategories = storage.getItem('sticky_notes_categories');
      const storedNotes = storage.getItem('sticky_notes_notes');

      if (storedCategories) {
        categoryStore.categories = JSON.parse(storedCategories);
      } else {
        // 默认内置分类
        categoryStore.categories = [
          { id: '1', name: '常用模版', createdAt: Date.now() },
          { id: '2', name: '工作备忘', createdAt: Date.now() - 1000 },
          { id: '3', name: '灵感想法', createdAt: Date.now() - 2000 }
        ];
        categoryStore.saveCategories();
      }

      const storedCollapsed = storage.getItem('sticky_notes_collapsed_categories');
      if (storedCollapsed) {
        try {
          categoryStore.collapsedCategoryIds = JSON.parse(storedCollapsed);
        } catch (e) {
          console.error(e);
        }
      }

      // 初始化或加载分类顺序
      const storedOrder = storage.getItem('sticky_notes_category_order');
      let loadedOrder: string[] = [];
      if (storedOrder) {
        try {
          loadedOrder = JSON.parse(storedOrder);
        } catch (e) {
          console.error('Failed to parse category order:', e);
        }
      }

      const currentIds = new Set(categoryStore.categories.map(c => c.id));
      currentIds.add('all');

      let finalOrder = loadedOrder.filter(id => currentIds.has(id));
      categoryStore.categories.forEach(c => {
        if (!finalOrder.includes(c.id)) {
          finalOrder.push(c.id);
        }
      });
      if (!finalOrder.includes('all')) {
        finalOrder.unshift('all');
      }

      categoryStore.categoryOrder = finalOrder;
      if (!storedOrder) {
        categoryStore.saveCategoryOrder();
      }

      const storedSortMode = storage.getItem('sticky_notes_sort_mode');
      if (storedSortMode && ['date', 'title', 'tag', 'custom'].includes(storedSortMode)) {
        noteStore.sortMode = storedSortMode as 'date' | 'title' | 'tag' | 'custom';
      }

      const storedSortOrder = storage.getItem('sticky_notes_sort_order');
      if (storedSortOrder && ['asc', 'desc'].includes(storedSortOrder)) {
        noteStore.sortOrder = storedSortOrder as 'asc' | 'desc';
      }

      const storedGridColumns = storage.getItem('sticky_notes_grid_columns');
      if (storedGridColumns) {
        if (storedGridColumns === 'auto') {
          uiStore.gridColumns = 'auto';
        } else {
          const cols = parseInt(storedGridColumns, 10);
          if ([1, 2, 3, 4].includes(cols)) {
            uiStore.gridColumns = cols as 1 | 2 | 3 | 4;
          }
        }
      }

      const storedMinNoteWidth = storage.getItem('sticky_notes_min_note_width');
      if (storedMinNoteWidth) {
        const width = parseInt(storedMinNoteWidth, 10);
        if (!isNaN(width)) {
          uiStore.minNoteWidth = width;
        }
      }

      const storedEnabledButtons = storage.getItem('sticky_notes_enabled_action_bar_buttons');
      if (storedEnabledButtons) {
        try {
          uiStore.enabledActionBarButtons = JSON.parse(storedEnabledButtons);
        } catch (e) {
          console.error('Failed to parse enabled action bar buttons:', e);
        }
      }

      const storedDateFormat = storage.getItem('sticky_notes_date_format');
      if (storedDateFormat) {
        uiStore.dateFormat = storedDateFormat;
      }

      const storedDefaultNoteColor = storage.getItem('sticky_notes_default_note_color');
      if (storedDefaultNoteColor) {
        uiStore.defaultNoteColor = storedDefaultNoteColor;
      }

      if (storedNotes) {
        noteStore.notes = JSON.parse(storedNotes);
      } else {
        noteStore.notes = helpers.getDefaultNotes();
        noteStore.saveNotes();
      }
    } catch (e) {
      console.error('Failed to load sticky notes data:', e);
    }
  };

  // 跨 Store 协调的 Action 方法包装
  const addCategory = (name: string, parentId?: string) => {
    const newCategory = categoryStore.addCategory(name, parentId);
    if (newCategory) {
      noteStore.currentCategoryId = newCategory.id;
    }
    return newCategory;
  };

  const deleteCategory = (id: string) => {
    categoryStore.deleteCategory(id);

    // 将属于该被删除分类的所有便签移至最近删除
    noteStore.notes = noteStore.notes.map(n => {
      if (n.categoryId === id) {
        return {
          ...n,
          isDeleted: true,
          deletedAt: Date.now(),
          isPinned: false
        };
      }
      return n;
    });
    noteStore.saveNotes();

    // 如果删除的分类是当前选中的，切回“全部”
    if (noteStore.currentCategoryId === id) {
      noteStore.currentCategoryId = 'all';
    }
  };

  const addNote = (categoryId: string, content = '', title = '', color?: string) => {
    let targetCategoryId = categoryId;
    if (categoryId === 'all' || categoryId === 'trash' || categoryId === 'recent') {
      targetCategoryId = 'uncategorized';
    }
    return noteStore.addNote(targetCategoryId, content, title, color);
  };

  const clearNotes = (categoryId: string) => {
    const descendants = categoryStore.getCategoryDescendants(categoryId);
    noteStore.clearNotes(categoryId, descendants);
  };

  // 协调便签的检索排序过滤算法 (原为 noteStore.filteredNotes)
  const filteredNotes = computed(() => {
    let result = noteStore.notes;

    // 1. 分类与逻辑删除过滤
    if (noteStore.currentCategoryId === 'trash') {
      result = result.filter(n => n.isDeleted === true);
    } else if (noteStore.currentCategoryId === 'recent') {
      result = result.filter(n => n.isDeleted !== true && n.lastUsedAt !== undefined);
    } else {
      result = result.filter(n => n.isDeleted !== true);
      if (noteStore.currentCategoryId !== 'all') {
        const descendants = categoryStore.getCategoryDescendants(noteStore.currentCategoryId);
        result = result.filter(
          n => n.categoryId === noteStore.currentCategoryId || descendants.has(n.categoryId)
        );
      }
    }

    // 2. 搜索词过滤 (支持根据不同目标过滤)
    if (noteStore.searchQuery.trim()) {
      const q = noteStore.searchQuery.toLowerCase().trim();
      const keywords = q.split(/\s+/).filter(k => k.length > 0);
      if (keywords.length > 0) {
        result = result.filter(n => {
          return keywords.every(kw => {
            const term = kw.toLowerCase();
            const noteTitle = (n.title || '').toLowerCase();
            const noteContent = (n.content || '').toLowerCase();

            const titleMatch = noteTitle.includes(term);
            const contentMatch = noteContent.includes(term);
            const tagsMatch = Array.isArray(n.tags)
              ? n.tags.some(tag => typeof tag === 'string' && tag.toLowerCase().includes(term))
              : false;

            if (noteStore.searchTarget.includes('all')) {
              return titleMatch || contentMatch || tagsMatch;
            }

            let match = false;
            if (noteStore.searchTarget.includes('title') && titleMatch) match = true;
            if (noteStore.searchTarget.includes('content') && contentMatch) match = true;
            if (noteStore.searchTarget.includes('tag') && tagsMatch) match = true;
            return match;
          });
        });
      }
    }

    // 3. 排序
    const sortedResult = [...result].sort((a, b) => {
      // 置顶(isPinned)始终排在最前面
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (noteStore.currentCategoryId === 'recent') {
        const timeA = a.lastUsedAt || 0;
        const timeB = b.lastUsedAt || 0;
        return timeB - timeA;
      }

      if (noteStore.sortMode === 'title') {
        const titleA = a.title || '';
        const titleB = b.title || '';
        if (!titleA && titleB) return 1;
        if (titleA && !titleB) return -1;
        if (!titleA && !titleB) {
          return noteStore.sortOrder === 'asc'
            ? a.updatedAt - b.updatedAt
            : b.updatedAt - a.updatedAt;
        }

        const cmp = titleA.localeCompare(titleB, 'zh');
        if (cmp !== 0) {
          return noteStore.sortOrder === 'asc' ? cmp : -cmp;
        }
        return noteStore.sortOrder === 'asc'
          ? a.updatedAt - b.updatedAt
          : b.updatedAt - a.updatedAt;
      } else if (noteStore.sortMode === 'tag') {
        const getRepresentTag = (note: Note): string => {
          if (!note.tags || note.tags.length === 0) return '';
          const sorted = [...note.tags].sort((t1, t2) => t1.localeCompare(t2, 'zh'));
          return sorted[0] || '';
        };

        const tagA = getRepresentTag(a);
        const tagB = getRepresentTag(b);

        if (!tagA && tagB) return 1;
        if (tagA && !tagB) return -1;
        if (!tagA && !tagB) {
          return b.updatedAt - a.updatedAt;
        }

        const cmp = tagA.localeCompare(tagB, 'zh');
        if (cmp !== 0) {
          return noteStore.sortOrder === 'asc' ? cmp : -cmp;
        }
        return noteStore.sortOrder === 'asc'
          ? a.updatedAt - b.updatedAt
          : b.updatedAt - a.updatedAt;
      } else if (noteStore.sortMode === 'custom') {
        const currentId = noteStore.currentCategoryId;
        if (currentId !== 'all' && currentId !== 'trash') {
          const isOwnA = a.categoryId === currentId;
          const isOwnB = b.categoryId === currentId;
          if (isOwnA && !isOwnB) return -1;
          if (!isOwnA && isOwnB) return 1;
        }
        const indexA = noteStore.notes.findIndex(n => n.id === a.id);
        const indexB = noteStore.notes.findIndex(n => n.id === b.id);
        return indexA - indexB;
      } else {
        return noteStore.sortOrder === 'desc'
          ? b.updatedAt - a.updatedAt
          : a.updatedAt - b.updatedAt;
      }
    });

    if (noteStore.currentCategoryId === 'recent') {
      return sortedResult.slice(0, 30);
    }
    return sortedResult;
  });

  // 备份与粘贴代理方法
  const exportBackup = () => {
    helpers.exportBackup(categoryStore.categories, noteStore.notes, uiStore.showToast);
  };

  const importBackup = (jsonStr: string): boolean => {
    return helpers.importBackup(
      jsonStr,
      categoriesRef,
      notesRef,
      categoryOrderRef,
      categoryStore.saveCategories,
      noteStore.saveNotes,
      categoryStore.saveCategoryOrder,
      uiStore.showToast
    );
  };

  const exportSingleNoteAsTxt = (note: Note) => {
    helpers.exportSingleNoteAsTxt(note, uiStore.showToast);
  };

  const handlePasteNote = async (
    content: string,
    noteId?: string
  ): Promise<{ success: boolean; isNative: boolean }> => {
    if (!content.trim()) {
      uiStore.showToast('便签内容为空，无法复制粘贴', 'warning');
      return { success: false, isNative: false };
    }
    const isNative = await pasteTextToCursor(content);
    if (isNative) {
      uiStore.showToast('已隐藏并粘贴到目标光标处！', 'success');
    } else {
      uiStore.showToast('已复制到剪贴板，请到目标位置粘贴', 'info');
    }
    if (noteId) {
      noteStore.updateNoteLastUsed(noteId);
    }
    return { success: true, isNative };
  };

  const devResetNotes = () => {
    helpers.devResetNotes(notesRef, noteStore.saveNotes, uiStore.showToast);
  };

  const devResetTags = () => {
    helpers.devResetTags(notesRef, noteStore.saveNotes, uiStore.showToast);
  };

  const devResetAllData = () => {
    helpers.devResetAllData(loadData, gridColumnsRef, uiStore.showToast);
  };

  return {
    // 分类状态与方法 (Category Store 代理)
    categories: categoriesRef,
    categoryOrder: categoryOrderRef,
    collapsedCategoryIds: toRef(categoryStore, 'collapsedCategoryIds'),
    addingSubParentId: toRef(categoryStore, 'addingSubParentId'),
    newSubCategoryName: toRef(categoryStore, 'newSubCategoryName'),
    orderedCategories: computed(() => categoryStore.orderedCategories),
    toggleCategoryCollapse: categoryStore.toggleCategoryCollapse,
    isCategoryCollapsed: categoryStore.isCategoryCollapsed,
    getCategoryDescendants: categoryStore.getCategoryDescendants,
    saveCategoryOrder: categoryStore.saveCategoryOrder,
    reorderCategories: categoryStore.reorderCategories,
    moveCategory: categoryStore.moveCategory,
    addCategory,
    deleteCategory,
    updateCategory: categoryStore.updateCategory,

    // 便签状态与方法 (Note Store 代理)
    notes: notesRef,
    currentCategoryId: toRef(noteStore, 'currentCategoryId'),
    searchQuery: toRef(noteStore, 'searchQuery'),
    searchTarget: toRef(noteStore, 'searchTarget'),
    sortMode: toRef(noteStore, 'sortMode'),
    sortOrder: toRef(noteStore, 'sortOrder'),
    draggedNoteId: toRef(noteStore, 'draggedNoteId'),
    editingNoteId: toRef(noteStore, 'editingNoteId'),
    filteredNotes,
    recentNotesCount: computed(() => {
      return noteStore.notes.filter(n => n.isDeleted !== true && n.lastUsedAt !== undefined).length;
    }),
    trashNotesCount: computed(() => noteStore.trashNotesCount),
    addNote,
    deleteNote: noteStore.deleteNote,
    restoreNote: noteStore.restoreNote,
    clearTrash: noteStore.clearTrash,
    updateNote: noteStore.updateNote,
    clearNotes,
    setSortMode: noteStore.setSortMode,
    moveNote: noteStore.moveNote,
    updateNoteLastUsed: noteStore.updateNoteLastUsed,

    // UI 状态与方法 (UI Store 代理)
    toastMessage: toRef(uiStore, 'toastMessage'),
    toastType: toRef(uiStore, 'toastType'),
    toastPosition: toRef(uiStore, 'toastPosition'),
    showToast: uiStore.showToast,
    confirmState: toRef(uiStore, 'confirmState'),
    askConfirm: uiStore.askConfirm,
    handleConfirmResult: uiStore.handleConfirmResult,
    gridColumns: gridColumnsRef,
    maxColumns: toRef(uiStore, 'maxColumns'),
    minNoteWidth: toRef(uiStore, 'minNoteWidth'),
    setGridColumns: uiStore.setGridColumns,
    setMaxColumns: uiStore.setMaxColumns,
    setMinNoteWidth: uiStore.setMinNoteWidth,
    showSettings: toRef(uiStore, 'showSettings'),
    openSettings: uiStore.openSettings,
    closeSettings: uiStore.closeSettings,
    isDark: toRef(uiStore, 'isDark'),
    initTheme: uiStore.initTheme,
    toggleTheme: uiStore.toggleTheme,
    enabledActionBarButtons: toRef(uiStore, 'enabledActionBarButtons'),
    setEnabledActionBarButtons: uiStore.setEnabledActionBarButtons,
    dateFormat: toRef(uiStore, 'dateFormat'),
    setDateFormat: uiStore.setDateFormat,
    defaultNoteColor: toRef(uiStore, 'defaultNoteColor'),
    setDefaultNoteColor: uiStore.setDefaultNoteColor,

    // 初始化与备份代理
    loadData,
    exportBackup,
    importBackup,
    exportSingleNoteAsTxt,
    handlePasteNote,
    devResetNotes,
    devResetTags,
    devResetAllData
  };
});
