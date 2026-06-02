import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { Category, Note, NoteColorPreset } from '../types';
import { storage, pasteTextToCursor, downloadOrWriteFile } from '../utils/storage';

// 精心设计的配色方案，符合现代审美
export const COLOR_PRESETS: Record<string, NoteColorPreset> = {
  yellow: {
    name: '暖阳黄',
    lightBg: 'hsl(48, 100%, 88%, 0.75)',
    darkBg: 'hsl(48, 40%, 18%, 0.75)',
    lightBorder: 'hsl(48, 100%, 75%)',
    darkBorder: 'hsl(48, 40%, 30%)',
    lightText: 'hsl(48, 80%, 15%)',
    darkText: 'hsl(48, 100%, 85%)',
    lightBtnHoverBg: 'hsl(48, 80%, 80%)',
    lightBtnHoverColor: 'hsl(48, 90%, 12%)',
    darkBtnHoverBg: 'hsla(48, 60%, 55%, 0.13)',
    darkBtnHoverColor: 'hsl(48, 100%, 88%)',
  },
  green: {
    name: '薄荷绿',
    lightBg: 'hsl(120, 75%, 90%, 0.75)',
    darkBg: 'hsl(120, 30%, 16%, 0.75)',
    lightBorder: 'hsl(120, 75%, 80%)',
    darkBorder: 'hsl(120, 30%, 28%)',
    lightText: 'hsl(120, 70%, 15%)',
    darkText: 'hsl(120, 85%, 85%)',
    lightBtnHoverBg: 'hsl(120, 75%, 84%)',
    lightBtnHoverColor: 'hsl(120, 75%, 12%)',
    darkBtnHoverBg: 'hsla(120, 50%, 50%, 0.13)',
    darkBtnHoverColor: 'hsl(120, 85%, 88%)',
  },
  blue: {
    name: '晴空蓝',
    lightBg: 'hsl(200, 90%, 90%, 0.75)',
    darkBg: 'hsl(200, 40%, 17%, 0.75)',
    lightBorder: 'hsl(200, 90%, 80%)',
    darkBorder: 'hsl(200, 40%, 30%)',
    lightText: 'hsl(200, 75%, 15%)',
    darkText: 'hsl(200, 90%, 85%)',
    lightBtnHoverBg: 'hsl(200, 90%, 84%)',
    lightBtnHoverColor: 'hsl(200, 80%, 12%)',
    darkBtnHoverBg: 'hsla(200, 60%, 55%, 0.13)',
    darkBtnHoverColor: 'hsl(200, 90%, 88%)',
  },
  pink: {
    name: '蔷薇粉',
    lightBg: 'hsl(340, 85%, 91%, 0.75)',
    darkBg: 'hsl(340, 40%, 18%, 0.75)',
    lightBorder: 'hsl(340, 85%, 82%)',
    darkBorder: 'hsl(340, 40%, 30%)',
    lightText: 'hsl(340, 75%, 15%)',
    darkText: 'hsl(340, 90%, 85%)',
    lightBtnHoverBg: 'hsl(340, 85%, 84%)',
    lightBtnHoverColor: 'hsl(340, 80%, 12%)',
    darkBtnHoverBg: 'hsla(340, 60%, 55%, 0.13)',
    darkBtnHoverColor: 'hsl(340, 90%, 88%)',
  },
  purple: {
    name: '熏衣紫',
    lightBg: 'hsl(270, 80%, 92%, 0.75)',
    darkBg: 'hsl(270, 35%, 18%, 0.75)',
    lightBorder: 'hsl(270, 80%, 83%)',
    darkBorder: 'hsl(270, 35%, 30%)',
    lightText: 'hsl(270, 70%, 15%)',
    darkText: 'hsl(270, 90%, 85%)',
    lightBtnHoverBg: 'hsl(270, 80%, 86%)',
    lightBtnHoverColor: 'hsl(270, 75%, 12%)',
    darkBtnHoverBg: 'hsla(270, 55%, 58%, 0.13)',
    darkBtnHoverColor: 'hsl(270, 90%, 88%)',
  },
  gray: {
    name: '极简灰',
    lightBg: 'hsl(0, 0%, 93%, 0.75)',
    darkBg: 'hsl(0, 0%, 18%, 0.75)',
    lightBorder: 'hsl(0, 0%, 82%)',
    darkBorder: 'hsl(0, 0%, 30%)',
    lightText: 'hsl(0, 0%, 15%)',
    darkText: 'hsl(0, 0%, 85%)',
    lightBtnHoverBg: 'hsl(0, 0%, 84%)',
    lightBtnHoverColor: 'hsl(0, 0%, 10%)',
    darkBtnHoverBg: 'hsla(0, 0%, 70%, 0.1)',
    darkBtnHoverColor: 'hsl(0, 0%, 92%)',
  }
};

export const useStickyNotesStore = defineStore('stickyNotes', () => {
  const categories = ref<Category[]>([]);
  const notes = ref<Note[]>([]);
  const currentCategoryId = ref<string>('all');
  const searchQuery = ref<string>('');
  const searchTarget = ref<'all' | 'title' | 'content' | 'tag'>('all');
  const sortMode = ref<'date' | 'title' | 'custom'>('date');
  const sortOrder = ref<'asc' | 'desc'>('desc');
  const draggedNoteId = ref<string | null>(null);
  const editingNoteId = ref<string | null>(null);

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
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  const showToast = (msg: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    toastMessage.value = msg;
    toastType.value = type;
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
          { id: '1', name: '📌 工作备忘', createdAt: Date.now() },
          { id: '2', name: '💡 灵感想法', createdAt: Date.now() - 1000 },
          { id: '3', name: '📝 常用模版', createdAt: Date.now() - 2000 }
        ];
        saveCategories();
      }

      const storedSortMode = storage.getItem('sticky_notes_sort_mode');
      if (storedSortMode && ['date', 'title', 'custom'].includes(storedSortMode)) {
        sortMode.value = storedSortMode as 'date' | 'title' | 'custom';
      }

      const storedSortOrder = storage.getItem('sticky_notes_sort_order');
      if (storedSortOrder && ['asc', 'desc'].includes(storedSortOrder)) {
        sortOrder.value = storedSortOrder as 'asc' | 'desc';
      }

      if (storedNotes) {
        notes.value = JSON.parse(storedNotes);
      } else {
        // 默认内置欢迎便签
        notes.value = [
          {
            id: 'n1',
            categoryId: '1',
            title: '✨ 欢迎使用智能便签',
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
    // 自动切换到新分类
    currentCategoryId.value = newCategory.id;
  };

  const deleteCategory = (id: string) => {
    categories.value = categories.value.filter(c => c.id !== id);
    saveCategories();
    
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
    // 如果 categoryId 是 'all'，则默认创建在第一个分类下，如果没有分类，创建在 'uncategorized' 下
    let targetCategoryId = categoryId;
    if (categoryId === 'all') {
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
    notes.value = notes.value.filter(n => n.id !== id);
    saveNotes();
  };

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
      notes.value = [];
    } else {
      notes.value = notes.value.filter(n => n.categoryId !== categoryId);
    }
    saveNotes();
  };

  // --- 过滤逻辑 ---
  const filteredNotes = computed(() => {
    let result = notes.value;

    // 1. 分类过滤
    if (currentCategoryId.value !== 'all') {
      result = result.filter(n => n.categoryId === currentCategoryId.value);
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
    const filename = `sticky-notes-backup-${Date.now()}.json`;
    
    const isNative = downloadOrWriteFile(jsonStr, filename, 'application/json');
    if (isNative) {
      showToast('备份已成功导出至下载目录', 'success');
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
    
    const isNative = downloadOrWriteFile(content, filename, 'text/plain;charset=utf-8');
    if (isNative) {
      showToast('便签已导出至下载目录', 'success');
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

  const setSortMode = (mode: 'date' | 'title' | 'custom') => {
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
        const [movedNote] = notes.value.splice(fromIndex, 1);
        notes.value.splice(toIndex, 0, movedNote);
        saveNotes();
      }
    }
  };

  return {
    categories,
    notes,
    currentCategoryId,
    searchQuery,
    searchTarget,
    filteredNotes,
    toastMessage,
    toastType,
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
    moveNote
  };
});
