import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { Category, Note } from '@type';
import { storage, pasteTextToCursor, downloadOrWriteFile } from '@utils/storage';
import { COLOR_PRESETS } from './colorPresets';

export { COLOR_PRESETS };

export const useStickyNotesStore = defineStore('stickyNotes', () => {
  const categories = ref<Category[]>([]);
  const categoryOrder = ref<string[]>([]);
  const notes = ref<Note[]>([]);
  const currentCategoryId = ref<string>('all');

  const saveCategoryOrder = () => {
    storage.setItem('sticky_notes_category_order', JSON.stringify(categoryOrder.value));
  };

  const orderedCategories = computed(() => {
    const catMap = new Map(categories.value.map(c => [c.id, c]));
    return categoryOrder.value.map(id => {
      if (id === 'all') {
        return { id: 'all', name: '全部便签', isSystem: true };
      }
      const cat = catMap.get(id);
      return cat ? { ...cat, isSystem: false } : null;
    }).filter(Boolean) as Array<Category & { isSystem: boolean }>;
  });

  const reorderCategories = (fromIndex: number, toIndex: number) => {
    const order = [...categoryOrder.value];
    const [moved] = order.splice(fromIndex, 1);
    order.splice(toIndex, 0, moved);
    categoryOrder.value = order;
    saveCategoryOrder();
  };
  const searchQuery = ref<string>('');
  const searchTarget = ref<'all' | 'title' | 'content' | 'tag'>('all');
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
  const addCategory = (name: string) => {
    if (!name.trim()) return;
    const newCategory: Category = {
      id: Date.now().toString(),
      name: name.trim(),
      createdAt: Date.now()
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
    categories.value = categories.value.filter(c => c.id !== id);
    saveCategories();
    
    // 从分类顺序中移除
    categoryOrder.value = categoryOrder.value.filter(itemId => itemId !== id);
    saveCategoryOrder();
    
    // 删除分类时，该分类下的便签会变成“未分类”或者直接删除？
    // 这里我们将该分类下的便签的 categoryId 设为 'all' 或者是直接移至未分类，但为了用户体验，我们把该分类下便签的 categoryId 改成 'uncategorized'
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
    // 如果 categoryId 是 'all' 或者是 'trash'，则默认创建在第一个分类下，如果没有分类，创建在 'uncategorized' 下
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
      notes.value.forEach(n => {
        if (n.categoryId === categoryId && !n.isDeleted) {
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
        result = result.filter(n => n.categoryId === currentCategoryId.value);
      }
    }

    // 2. 搜索词过滤 (支持根据不同目标过滤)
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim();
      result = result.filter(n => {
        const titleMatch = n.title ? n.title.toLowerCase().includes(q) : false;
        const contentMatch = n.content.toLowerCase().includes(q);
        const tagsMatch = n.tags ? n.tags.some(tag => tag.toLowerCase().includes(q)) : false;

        if (searchTarget.value === 'title') {
          return titleMatch;
        } else if (searchTarget.value === 'content') {
          return contentMatch;
        } else if (searchTarget.value === 'tag') {
          return tagsMatch;
        } else {
          // 'all'
          return titleMatch || contentMatch || tagsMatch;
        }
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
        // 按标签排序：提取首个标签（按拼音首字母排序）
        const getRepresentTag = (note: Note): string => {
          if (!note.tags || note.tags.length === 0) return '';
          const sorted = [...note.tags].sort((t1, t2) => t1.localeCompare(t2, 'zh'));
          return sorted[0] || '';
        };

        const tagA = getRepresentTag(a);
        const tagB = getRepresentTag(b);

        // 无标签的排在有标签的后面
        if (!tagA && tagB) return 1;
        if (tagA && !tagB) return -1;
        if (!tagA && !tagB) {
          return b.updatedAt - a.updatedAt; // 都无标签时，按更新时间倒序
        }

        const cmp = tagA.localeCompare(tagB, 'zh');
        if (cmp !== 0) {
          return sortOrder.value === 'asc' ? cmp : -cmp;
        }
        // 同一标签下，按更新时间排序（与当前排序方向一致）
        return sortOrder.value === 'asc' ? a.updatedAt - b.updatedAt : b.updatedAt - a.updatedAt;
      } else if (sortMode.value === 'custom') {
        // 自定义排序：保持在原 notes 数组中的相对顺序
        const indexA = notes.value.findIndex(n => n.id === a.id);
        const indexB = notes.value.findIndex(n => n.id === b.id);
        return indexA - indexB;
      } else {
        // 默认按日期更新时间倒序
        return sortOrder.value === 'desc' 
          ? b.updatedAt - a.updatedAt 
          : a.updatedAt - b.updatedAt;
      }
    });
  });

  // --- 数据导入与导出 (开发者效率与安全增强) ---
  const exportBackup = () => {
    const backupData = {
      version: '1.0.0',
      timestamp: Date.now(),
      categories: categories.value,
      notes: notes.value
    };
    
    const jsonStr = JSON.stringify(backupData, null, 2);
    const pad = (n: number) => String(n).padStart(2, '0');
    const now = new Date();
    const timeStr = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;
    const filename = `sticky-notes-backup-${timeStr}.json`;
    
    const result = downloadOrWriteFile(jsonStr, filename, 'application/json');
    if (result === 'success') {
      showToast('备份已成功导出', 'success');
    } else if (result === 'canceled') {
      showToast('已取消备份导出', 'info');
    } else {
      showToast('备份已导出为 JSON 文件下载', 'success');
    }
  };

  const importBackup = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      
      // 字段校验，防止损坏的 JSON 或恶意输入导致运行崩溃 (安全增强)
      if (!data || typeof data !== 'object') return false;
      if (!Array.isArray(data.categories) || !Array.isArray(data.notes)) return false;

      // 验证并过滤分类
      const validCategories = data.categories.filter((c: any) => {
        return c && typeof c.id === 'string' && typeof c.name === 'string';
      });

      // 验证并过滤便签
      const validNotes = data.notes.filter((n: any) => {
        return n && typeof n.id === 'string' && 
               typeof n.categoryId === 'string' && 
               typeof n.content === 'string' &&
               typeof n.color === 'string';
      });

      if (validCategories.length === 0 && validNotes.length === 0) {
        showToast('导入失败：备份文件不包含有效的分类或便签数据', 'error');
        return false;
      }

      // 合并逻辑：如果导入的 ID 与现有重复，以导入的覆盖现有的，否则新增
      const catMap = new Map(categories.value.map(c => [c.id, c]));
      validCategories.forEach((c: any) => {
        catMap.set(c.id, {
          id: c.id,
          name: c.name,
          createdAt: c.createdAt || Date.now()
        });
      });
      categories.value = Array.from(catMap.values());

      const noteMap = new Map(notes.value.map(n => [n.id, n]));
      validNotes.forEach((n: any) => {
        noteMap.set(n.id, {
          id: n.id,
          categoryId: n.categoryId,
          title: n.title || '',
          content: n.content,
          color: n.color,
          isPinned: !!n.isPinned,
          createdAt: n.createdAt || Date.now(),
          updatedAt: n.updatedAt || Date.now(),
          tags: Array.isArray(n.tags) ? n.tags.filter((t: any) => typeof t === 'string') : []
        });
      });
      notes.value = Array.from(noteMap.values());

      saveCategories();
      saveNotes();

      // 重建并保存导入后的分类顺序
      const currentIds = new Set(categories.value.map(c => c.id));
      currentIds.add('all');
      let newOrder = categoryOrder.value.filter(id => currentIds.has(id));
      categories.value.forEach(c => {
        if (!newOrder.includes(c.id)) {
          newOrder.push(c.id);
        }
      });
      if (!newOrder.includes('all')) {
        newOrder.unshift('all');
      }
      categoryOrder.value = newOrder;
      saveCategoryOrder();

      showToast(`成功导入 ${validCategories.length} 个分类和 ${validNotes.length} 张便签！`, 'success');
      return true;
    } catch (e) {
      console.error('Import backup failed:', e);
      showToast('导入失败：JSON 文件解析错误', 'error');
      return false;
    }
  };

  // 导出单个便签为 TXT 文件
  const exportSingleNoteAsTxt = (note: Note) => {
    const title = note.title || '无标题便签';
    const tagsStr = note.tags && note.tags.length > 0 ? `标签: ${note.tags.map(t => `#${t}`).join(' ')}\n` : '';
    const content = `${title}\n创建时间: ${new Date(note.createdAt).toLocaleString()}\n${tagsStr}---------------------------\n\n${note.content}`;
    const filename = `${title.replace(/[\\/:*?"<>|]/g, '_')}.txt`;
    
    const result = downloadOrWriteFile(content, filename, 'text/plain;charset=utf-8');
    if (result === 'success') {
      showToast('便签已成功导出', 'success');
    } else if (result === 'canceled') {
      showToast('已取消导出', 'info');
    } else {
      showToast('便签已导出为 TXT 文本下载', 'success');
    }
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
      // 切换新模式时，设置其默认排序方向
      if (mode === 'date') {
        sortOrder.value = 'desc'; // 默认按最新优先
      } else if (mode === 'title') {
        sortOrder.value = 'asc'; // 默认按首字母升序
      } else if (mode === 'tag') {
        sortOrder.value = 'asc'; // 默认按标签首字母升序
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

  // --- 仅开发环境可用的重置方法 ---
  const devResetNotes = () => {
    notes.value = [
      {
        id: 'n1',
        categoryId: '1',
        title: '✨ 欢迎使用拾光便签',
        content: '👋 你好！这是一个基于 uTools 平台开发的便签插件。在这里你可以分类整理你的日常工作备忘、常用快捷回复和奇思妙想。',
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
    showToast('已重置所有便签(Notes)', 'success');
    console.log('StickyNotes Dev: 已重置所有便签(Notes)为默认便签。');
  };

  const devResetTags = () => {
    notes.value = notes.value.map(n => ({ ...n, tags: [] }));
    saveNotes();
    showToast('已重置所有便签的标签(Tags)', 'success');
    console.log('StickyNotes Dev: 已清空所有便签的标签(Tags)。');
  };

  const devResetAllData = () => {
    storage.removeItem('sticky_notes_categories');
    storage.removeItem('sticky_notes_category_order');
    storage.removeItem('sticky_notes_notes');
    storage.removeItem('sticky_notes_grid_columns');
    gridColumns.value = 'auto';
    loadData();
    showToast('已重置所有数据(便签和分类)', 'success');
    console.log('StickyNotes Dev: 已重置所有便签与分类数据。');
  };

  return {
    categories,
    categoryOrder,
    orderedCategories,
    saveCategoryOrder,
    reorderCategories,
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
