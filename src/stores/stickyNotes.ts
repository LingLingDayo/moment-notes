import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { Category, Note } from '@type';
import { storage, pasteTextToCursor } from '@utils/storage';
import { COLOR_PRESETS } from './colorPresets';
import * as helpers from './stickyNotesHelpers';

export { COLOR_PRESETS };

export const useStickyNotesStore = defineStore('stickyNotes', () => {
  const categories = ref<Category[]>([]);
  const categoryOrder = ref<string[]>([]);
  const notes = ref<Note[]>([]);
  const currentCategoryId = ref<string>('all');
  const collapsedCategoryIds = ref<string[]>([]);
  const addingSubParentId = ref<string | null>(null);
  const newSubCategoryName = ref('');

  const saveCategoryOrder = () => {
    storage.setItem('sticky_notes_category_order', JSON.stringify(categoryOrder.value));
  };

  const saveCollapsedCategories = () => {
    storage.setItem('sticky_notes_collapsed_categories', JSON.stringify(collapsedCategoryIds.value));
  };

  const toggleCategoryCollapse = (id: string) => {
    const idx = collapsedCategoryIds.value.indexOf(id);
    if (idx === -1) {
      collapsedCategoryIds.value.push(id);
    } else {
      collapsedCategoryIds.value.splice(idx, 1);
    }
    saveCollapsedCategories();
  };

  const isCategoryCollapsed = (id: string) => {
    return collapsedCategoryIds.value.includes(id);
  };

  const getCategoryDescendants = (categoryId: string): Set<string> => {
    const descendants = new Set<string>();
    const childrenMap = new Map<string, string[]>();

    categories.value.forEach(c => {
      if (c.parentId) {
        if (!childrenMap.has(c.parentId)) {
          childrenMap.set(c.parentId, []);
        }
        childrenMap.get(c.parentId)!.push(c.id);
      }
    });

    const queue = [categoryId];
    let head = 0;
    while (head < queue.length) {
      const current = queue[head++];
      const children = childrenMap.get(current) || [];
      children.forEach(childId => {
        if (!descendants.has(childId)) {
          descendants.add(childId);
          queue.push(childId);
        }
      });
    }
    return descendants;
  };



  const orderedCategories = computed(() => {
    const catMap = new Map(categories.value.map(c => [c.id, c]));
    const childrenMap = new Map<string, Category[]>();
    const rootCategories: Category[] = [];

    categories.value.forEach(c => {
      if (c.parentId && catMap.has(c.parentId)) {
        if (!childrenMap.has(c.parentId)) {
          childrenMap.set(c.parentId, []);
        }
        childrenMap.get(c.parentId)!.push(c);
      } else {
        rootCategories.push(c);
      }
    });

    const getOrderIndex = (id: string) => {
      const idx = categoryOrder.value.indexOf(id);
      return idx === -1 ? Infinity : idx;
    };
    const sortFn = (a: Category, b: Category) => {
      return getOrderIndex(a.id) - getOrderIndex(b.id);
    };

    rootCategories.sort(sortFn);
    childrenMap.forEach(list => list.sort(sortFn));

    const result: Array<Category & { isSystem: boolean; level: number; hasChildren: boolean; isCollapsed: boolean; isVirtualAdd?: boolean }> = [];

    result.push({
      id: 'all',
      name: '全部便签',
      createdAt: 0,
      isSystem: true,
      level: 0,
      hasChildren: false,
      isCollapsed: false
    });

    const traverse = (cat: Category, level: number) => {
      const children = childrenMap.get(cat.id) || [];
      const hasChildren = children.length > 0;
      const isCollapsed = collapsedCategoryIds.value.includes(cat.id);

      result.push({
        ...cat,
        isSystem: false,
        level,
        hasChildren,
        isCollapsed
      });

      // If this category is currently adding a sub-category, insert a virtual element at the start of its list of children
      if (addingSubParentId.value === cat.id && !isCollapsed) {
        result.push({
          id: `sub-add-${cat.id}`,
          name: '',
          createdAt: Date.now(),
          parentId: cat.id,
          isSystem: false,
          level: level + 1,
          hasChildren: false,
          isCollapsed: false,
          isVirtualAdd: true
        });
      }

      if (hasChildren && !isCollapsed) {
        children.forEach(child => {
          traverse(child, level + 1);
        });
      }
    };

    rootCategories.forEach(cat => {
      traverse(cat, 0);
    });

    return result;
  });

  const reorderCategories = (fromIndex: number, toIndex: number) => {
    const fromCat = orderedCategories.value[fromIndex];
    const toCat = orderedCategories.value[toIndex];
    if (!fromCat || !toCat) return;

    const fromId = fromCat.id;
    const toId = toCat.id;

    const order = [...categoryOrder.value];
    const fromIdx = order.indexOf(fromId);
    const toIdx = order.indexOf(toId);

    if (fromIdx !== -1 && toIdx !== -1) {
      const [moved] = order.splice(fromIdx, 1);
      order.splice(toIdx, 0, moved);
      categoryOrder.value = order;
      saveCategoryOrder();
    }
  };

  const moveCategory = (
    categoryId: string,
    targetParentId: string | undefined,
    targetSiblingId: string | undefined,
    position: 'before' | 'after' | 'inside'
  ) => {
    const cat = categories.value.find(c => c.id === categoryId);
    if (!cat) return;

    if (targetParentId === categoryId) return;
    const descendants = getCategoryDescendants(categoryId);
    if (targetParentId && descendants.has(targetParentId)) {
      showToast('无法将分类移动到其子分类下', 'error');
      return;
    }

    cat.parentId = targetParentId;
    saveCategories();

    const order = [...categoryOrder.value];
    const currentIdx = order.indexOf(categoryId);
    if (currentIdx !== -1) {
      order.splice(currentIdx, 1);
    }

    if (position === 'inside') {
      const parentIdx = order.indexOf(targetParentId || '');
      if (parentIdx !== -1) {
        order.splice(parentIdx + 1, 0, categoryId);
      } else {
        order.push(categoryId);
      }
      
      if (targetParentId && collapsedCategoryIds.value.includes(targetParentId)) {
        collapsedCategoryIds.value = collapsedCategoryIds.value.filter(id => id !== targetParentId);
        saveCollapsedCategories();
      }
    } else {
      const siblingIdx = order.indexOf(targetSiblingId || '');
      if (siblingIdx !== -1) {
        const insertIdx = position === 'before' ? siblingIdx : siblingIdx + 1;
        order.splice(insertIdx, 0, categoryId);
      } else {
        order.push(categoryId);
      }
    }

    categoryOrder.value = order;
    saveCategoryOrder();
  };

  const searchQuery = ref<string>('');
  const searchTarget = ref<Array<'all' | 'title' | 'content' | 'tag'>>(['all']);
  const sortMode = ref<'date' | 'title' | 'tag' | 'custom'>('date');
  const sortOrder = ref<'asc' | 'desc'>('desc');
  const draggedNoteId = ref<string | null>(null);
  const editingNoteId = ref<string | null>(null);
  const gridColumns = ref<'auto' | 1 | 2 | 3 | 4>('auto');
  const maxColumns = ref<1 | 2 | 3 | 4>(4);

  // 确认弹窗状态 (Promise 驱动)
  const confirmState = ref({ show: false, title: '', message: '' });
  let confirmResolve: ((val: boolean) => void) | null = null;

  const askConfirm = (title: string, message: string): Promise<boolean> => {
    confirmState.value = { show: true, title, message };
    return new Promise((resolve) => {
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

  // 初始化加载数据
  const loadData = () => {
    try {
      const storedCategories = storage.getItem('sticky_notes_categories');
      const storedNotes = storage.getItem('sticky_notes_notes');

      if (storedCategories) {
        categories.value = JSON.parse(storedCategories);
      } else {
        // 默认内置分类
        categories.value = [
          { id: '1', name: '工作备忘', createdAt: Date.now() },
          { id: '2', name: '灵感想法', createdAt: Date.now() - 1000 },
          { id: '3', name: '常用模版', createdAt: Date.now() - 2000 }
        ];
        saveCategories();
      }

      const storedCollapsed = storage.getItem('sticky_notes_collapsed_categories');
      if (storedCollapsed) {
        try {
          collapsedCategoryIds.value = JSON.parse(storedCollapsed);
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
      
      const currentIds = new Set(categories.value.map(c => c.id));
      currentIds.add('all');
      
      let finalOrder = loadedOrder.filter(id => currentIds.has(id));
      categories.value.forEach(c => {
        if (!finalOrder.includes(c.id)) {
          finalOrder.push(c.id);
        }
      });
      if (!finalOrder.includes('all')) {
        finalOrder.unshift('all');
      }
      
      categoryOrder.value = finalOrder;
      if (!storedOrder) {
        saveCategoryOrder();
      }

      const storedSortMode = storage.getItem('sticky_notes_sort_mode');
      if (storedSortMode && ['date', 'title', 'tag', 'custom'].includes(storedSortMode)) {
        sortMode.value = storedSortMode as 'date' | 'title' | 'tag' | 'custom';
      }

      const storedSortOrder = storage.getItem('sticky_notes_sort_order');
      if (storedSortOrder && ['asc', 'desc'].includes(storedSortOrder)) {
        sortOrder.value = storedSortOrder as 'asc' | 'desc';
      }

      const storedGridColumns = storage.getItem('sticky_notes_grid_columns');
      if (storedGridColumns) {
        if (storedGridColumns === 'auto') {
          gridColumns.value = 'auto';
        } else {
          const cols = parseInt(storedGridColumns, 10);
          if ([1, 2, 3, 4].includes(cols)) {
            gridColumns.value = cols as 1 | 2 | 3 | 4;
          }
        }
      }

      if (storedNotes) {
        notes.value = JSON.parse(storedNotes);
      } else {
        // 默认内置欢迎便签
        notes.value = [
          {
            id: 'n1',
            categoryId: '1',
            title: '✨ 欢迎使用拾光便签',
            content: '你好呀！这是一个基于 uTools 平台开发的便签插件。在这里你可以分类整理你的日常工作备忘、常用快捷回复和奇思妙想。',
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
            content: '双击本便签卡片，本插件将自动隐藏并把便签内容直接粘贴到你的光标输入位置！非常适合存储客服话术、代码模板和常用邮箱地址等。',
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
            content: '1. 点击卡片右上角大头针可以置顶便签。\n2. 点击下方调色盘图标一键切换便签主题颜色。\n3. 右侧工具栏支持一键搜索、清空分类或在当前分类下极速创建便签。',
            color: 'green',
            isPinned: false,
            createdAt: Date.now() - 2000,
            updatedAt: Date.now() - 2000,
            tags: ['操作', '快速开始']
          }
        ];
        saveNotes();
      }
    } catch (e) {
      console.error('Failed to load sticky notes data:', e);
    }
  };

  // 保存分类
  const saveCategories = () => {
    storage.setItem('sticky_notes_categories', JSON.stringify(categories.value));
  };

  // 保存便签
  const saveNotes = () => {
    storage.setItem('sticky_notes_notes', JSON.stringify(notes.value));
  };

  // --- 分类操作 ---
  const addCategory = (name: string, parentId?: string) => {
    if (!name.trim()) return;
    const newCategory: Category = {
      id: Date.now().toString(),
      name: name.trim(),
      createdAt: Date.now(),
      parentId
    };
    categories.value.push(newCategory);
    saveCategories();
    
    // 同步更新分类顺序
    categoryOrder.value.push(newCategory.id);
    saveCategoryOrder();

    // 自动切换到新分类
    currentCategoryId.value = newCategory.id;
  };

  const deleteCategory = (id: string) => {
    const targetParentId = categories.value.find(c => c.id === id)?.parentId;
    categories.value = categories.value.map(c => {
      if (c.parentId === id) {
        return { ...c, parentId: targetParentId };
      }
      return c;
    }).filter(c => c.id !== id);
    saveCategories();
    
    // 从分类顺序中移除
    categoryOrder.value = categoryOrder.value.filter(itemId => itemId !== id);
    saveCategoryOrder();
    
    // 删除分类时，该分类下的便签会变成“未分类”或者直接删除？
    notes.value = notes.value.map(n => {
      if (n.categoryId === id) {
        return { ...n, categoryId: 'uncategorized' };
      }
      return n;
    });
    saveNotes();

    // 如果删除的分类是当前选中的，切回“全部”
    if (currentCategoryId.value === id) {
      currentCategoryId.value = 'all';
    }
  };

  const updateCategory = (id: string, name: string) => {
    if (!name.trim()) return;
    const category = categories.value.find(c => c.id === id);
    if (category) {
      category.name = name.trim();
      saveCategories();
    }
  };



  // --- 便签操作 ---
  const addNote = (categoryId: string, content = '', title = '', color = 'yellow') => {
    let targetCategoryId = categoryId;
    if (categoryId === 'all' || categoryId === 'trash') {
      targetCategoryId = categories.value.length > 0 ? categories.value[0].id : 'uncategorized';
    }

    const newNote: Note = {
      id: Date.now().toString(),
      categoryId: targetCategoryId,
      title: title.trim(),
      content: content,
      color,
      isPinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: []
    };

    notes.value.unshift(newNote); // 新增便签放在最前面
    saveNotes();

    // 记录新建的便签 ID，用于在组件渲染时自动触发编辑模式
    editingNoteId.value = newNote.id;

    return newNote;
  };

  const deleteNote = (id: string) => {
    const note = notes.value.find(n => n.id === id);
    if (!note) return;

    if (note.isDeleted) {
      // 已经在回收站中，物理删除
      notes.value = notes.value.filter(n => n.id !== id);
      showToast('已彻底删除便签', 'success');
    } else {
      // 逻辑删除
      note.isDeleted = true;
      note.deletedAt = Date.now();
      note.isPinned = false; // 被删除后自动取消置顶
      showToast('已将便签移至回收站', 'success');
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
      showToast('已成功恢复便签', 'success');
    }
  };

  const clearTrash = () => {
    notes.value = notes.value.filter(n => n.isDeleted !== true);
    saveNotes();
    showToast('已清空回收站的所有便签', 'success');
  };

  const trashNotesCount = computed(() => {
    return notes.value.filter(n => n.isDeleted === true).length;
  });

  const updateNote = (id: string, fields: Partial<Omit<Note, 'id' | 'createdAt'>>, updateTimestamp = true) => {
    const note = notes.value.find(n => n.id === id);
    if (note) {
      Object.assign(note, fields);
      if (updateTimestamp) {
        note.updatedAt = Date.now();
      }
      saveNotes();
    }
  };

  const clearNotes = (categoryId: string) => {
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
      const descendants = getCategoryDescendants(categoryId);
      notes.value.forEach(n => {
        if ((n.categoryId === categoryId || descendants.has(n.categoryId)) && !n.isDeleted) {
          n.isDeleted = true;
          n.deletedAt = Date.now();
          n.isPinned = false;
        }
      });
    }
    saveNotes();
  };

  // --- 过滤逻辑 ---
  const filteredNotes = computed(() => {
    let result = notes.value;

    // 1. 分类与逻辑删除过滤
    if (currentCategoryId.value === 'trash') {
      result = result.filter(n => n.isDeleted === true);
    } else {
      result = result.filter(n => n.isDeleted !== true);
      if (currentCategoryId.value !== 'all') {
        const descendants = getCategoryDescendants(currentCategoryId.value);
        result = result.filter(n => n.categoryId === currentCategoryId.value || descendants.has(n.categoryId));
      }
    }

    // 2. 搜索词过滤 (支持根据不同目标过滤)
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim();
      result = result.filter(n => {
        const titleMatch = n.title ? n.title.toLowerCase().includes(q) : false;
        const contentMatch = n.content.toLowerCase().includes(q);
        const tagsMatch = n.tags ? n.tags.some(tag => tag.toLowerCase().includes(q)) : false;

        if (searchTarget.value.includes('all')) {
          return titleMatch || contentMatch || tagsMatch;
        }

        let match = false;
        if (searchTarget.value.includes('title') && titleMatch) match = true;
        if (searchTarget.value.includes('content') && contentMatch) match = true;
        if (searchTarget.value.includes('tag') && tagsMatch) match = true;
        return match;
      });
    }

    // 3. 排序
    return [...result].sort((a, b) => {
      // 置顶(isPinned)始终排在最前面
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (sortMode.value === 'title') {
        const titleA = a.title || '';
        const titleB = b.title || '';
        if (!titleA && titleB) return 1;
        if (titleA && !titleB) return -1;
        if (!titleA && !titleB) {
          return sortOrder.value === 'asc' ? a.updatedAt - b.updatedAt : b.updatedAt - a.updatedAt;
        }
        
        const cmp = titleA.localeCompare(titleB, 'zh');
        if (cmp !== 0) {
          return sortOrder.value === 'asc' ? cmp : -cmp;
        }
        return sortOrder.value === 'asc' ? a.updatedAt - b.updatedAt : b.updatedAt - a.updatedAt;
      } else if (sortMode.value === 'tag') {
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
          return sortOrder.value === 'asc' ? cmp : -cmp;
        }
        return sortOrder.value === 'asc' ? a.updatedAt - b.updatedAt : b.updatedAt - a.updatedAt;
      } else if (sortMode.value === 'custom') {
        const indexA = notes.value.findIndex(n => n.id === a.id);
        const indexB = notes.value.findIndex(n => n.id === b.id);
        return indexA - indexB;
      } else {
        return sortOrder.value === 'desc' 
          ? b.updatedAt - a.updatedAt 
          : a.updatedAt - b.updatedAt;
      }
    });
  });

  // --- 数据导入与导出 (开发者效率与安全增强) ---
  const exportBackup = () => {
    helpers.exportBackup(categories.value, notes.value, showToast);
  };

  const importBackup = (jsonStr: string): boolean => {
    return helpers.importBackup(
      jsonStr,
      categories,
      notes,
      categoryOrder,
      saveCategories,
      saveNotes,
      saveCategoryOrder,
      showToast
    );
  };

  const exportSingleNoteAsTxt = (note: Note) => {
    helpers.exportSingleNoteAsTxt(note, showToast);
  };

  // --- 粘贴与复制 ---
  const handlePasteNote = async (content: string): Promise<{ success: boolean; isNative: boolean }> => {
    if (!content.trim()) {
      showToast('便签内容为空，无法复制粘贴', 'warning');
      return { success: false, isNative: false };
    }
    const isNative = await pasteTextToCursor(content);
    if (isNative) {
      showToast('已隐藏并粘贴到目标光标处！', 'success');
    } else {
      showToast('已复制到剪贴板，请到目标位置粘贴', 'info');
    }
    return { success: true, isNative };
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

  const setGridColumns = (cols: 'auto' | 1 | 2 | 3 | 4) => {
    gridColumns.value = cols;
    storage.setItem('sticky_notes_grid_columns', cols.toString());
  };

  const setMaxColumns = (val: 1 | 2 | 3 | 4) => {
    maxColumns.value = val;
  };

  const moveNote = (draggedId: string, targetId: string) => {
    const fromIndex = notes.value.findIndex(n => n.id === draggedId);
    const toIndex = notes.value.findIndex(n => n.id === targetId);
    if (fromIndex !== -1 && toIndex !== -1) {
      const fromNote = notes.value[fromIndex];
      const toNote = notes.value[toIndex];
      if (fromNote.isPinned === toNote.isPinned) {
        const [movedNote] = notes.value.splice(fromIndex, 1);
        notes.value.splice(toIndex, 0, movedNote);
        saveNotes();
      }
    }
  };

  const devResetNotes = () => {
    helpers.devResetNotes(notes, saveNotes, showToast);
  };

  const devResetTags = () => {
    helpers.devResetTags(notes, saveNotes, showToast);
  };

  const devResetAllData = () => {
    helpers.devResetAllData(loadData, gridColumns, showToast);
  };

  return {
    categories,
    categoryOrder,
    collapsedCategoryIds,
    addingSubParentId,
    newSubCategoryName,
    toggleCategoryCollapse,
    isCategoryCollapsed,
    getCategoryDescendants,
    orderedCategories,
    saveCategoryOrder,
    reorderCategories,
    moveCategory,
    notes,
    currentCategoryId,
    searchQuery,
    searchTarget,
    filteredNotes,
    toastMessage,
    toastType,
    toastPosition,
    showToast,
    confirmState,
    askConfirm,
    handleConfirmResult,
    loadData,
    addCategory,
    deleteCategory,
    updateCategory,
    addNote,
    deleteNote,
    restoreNote,
    clearTrash,
    trashNotesCount,
    updateNote,
    clearNotes,
    handlePasteNote,
    exportBackup,
    importBackup,
    exportSingleNoteAsTxt,
    sortMode,
    sortOrder,
    draggedNoteId,
    editingNoteId,
    setSortMode,
    moveNote,
    gridColumns,
    setGridColumns,
    maxColumns,
    setMaxColumns,
    devResetNotes,
    devResetTags,
    devResetAllData
  };
});
