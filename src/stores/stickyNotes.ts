import { defineStore } from 'pinia';
import { toRef, computed } from 'vue';
import { useCategoryStore } from './categoryStore';
import { useNoteStore } from './noteStore';
import { useUiStore } from './uiStore';
import { COLOR_PRESETS } from './colorPresets';
import * as helpers from './stickyNotesHelpers';
import { storage, pasteTextToCursor } from '@utils/storage';
import { Note } from '@type';

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
      const storedCategories = storage.getItem('sticky_notes_categories');
      const storedNotes = storage.getItem('sticky_notes_notes');

      if (storedCategories) {
        categoryStore.categories = JSON.parse(storedCategories);
      } else {
        // 默认内置分类
        categoryStore.categories = [
          { id: '1', name: '工作备忘', createdAt: Date.now() },
          { id: '2', name: '灵感想法', createdAt: Date.now() - 1000 },
          { id: '3', name: '常用模版', createdAt: Date.now() - 2000 }
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

      if (storedNotes) {
        noteStore.notes = JSON.parse(storedNotes);
      } else {
        // 默认内置欢迎便签
        noteStore.notes = [
          {
            id: 'n1',
            categoryId: '1',
            title: '✨ 欢迎使用拾光便签',
            content:
              '你好呀！这是一个基于 uTools 平台开发的便签插件。在这里你可以分类整理你的日常工作备忘、常用快捷回复和奇思妙想。',
            color: 'yellow',
            isPinned: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            tags: ['欢迎', '指南']
          },
          {
            id: 'n2',
            categoryId: '1',
            title: '🚀 核心特色功能：双击粘贴',
            content:
              '双击本便签卡片，本插件将自动隐藏并把便签内容直接粘贴到你的光标输入位置！非常适合存储客服话术、代码模板和常用邮箱地址等。',
            color: 'blue',
            isPinned: false,
            createdAt: Date.now() - 1000,
            updatedAt: Date.now() - 1000,
            tags: ['特色', '效率']
          },
          {
            id: 'n3',
            categoryId: '2',
            title: '💡 快捷操作指南',
            content:
              '1. 点击卡片右上角大头针可以置顶便签。\n2. 点击下方调色盘图标一键切换便签主题颜色。\n3. 右侧工具栏支持一键搜索、清空分类或在当前分类下极速创建便签。',
            color: 'green',
            isPinned: false,
            createdAt: Date.now() - 2000,
            updatedAt: Date.now() - 2000,
            tags: ['操作', '快速开始']
          }
        ];
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

    // 更新属于该分类的便签为 'uncategorized'
    noteStore.notes = noteStore.notes.map(n => {
      if (n.categoryId === id) {
        return { ...n, categoryId: 'uncategorized' };
      }
      return n;
    });
    noteStore.saveNotes();

    // 如果删除的分类是当前选中的，切回“全部”
    if (noteStore.currentCategoryId === id) {
      noteStore.currentCategoryId = 'all';
    }
  };

  const addNote = (categoryId: string, content = '', title = '', color = 'yellow') => {
    let targetCategoryId = categoryId;
    if (categoryId === 'all' || categoryId === 'trash') {
      targetCategoryId =
        categoryStore.categories.length > 0 ? categoryStore.categories[0].id : 'uncategorized';
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
      result = result.filter(n => {
        const titleMatch = n.title ? n.title.toLowerCase().includes(q) : false;
        const contentMatch = n.content.toLowerCase().includes(q);
        const tagsMatch = n.tags ? n.tags.some(tag => tag.toLowerCase().includes(q)) : false;

        if (noteStore.searchTarget.includes('all')) {
          return titleMatch || contentMatch || tagsMatch;
        }

        let match = false;
        if (noteStore.searchTarget.includes('title') && titleMatch) match = true;
        if (noteStore.searchTarget.includes('content') && contentMatch) match = true;
        if (noteStore.searchTarget.includes('tag') && tagsMatch) match = true;
        return match;
      });
    }

    // 3. 排序
    return [...result].sort((a, b) => {
      // 置顶(isPinned)始终排在最前面
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

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
    content: string
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
    trashNotesCount: computed(() => noteStore.trashNotesCount),
    addNote,
    deleteNote: noteStore.deleteNote,
    restoreNote: noteStore.restoreNote,
    clearTrash: noteStore.clearTrash,
    updateNote: noteStore.updateNote,
    clearNotes,
    setSortMode: noteStore.setSortMode,
    moveNote: noteStore.moveNote,

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
    setGridColumns: uiStore.setGridColumns,
    setMaxColumns: uiStore.setMaxColumns,

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
