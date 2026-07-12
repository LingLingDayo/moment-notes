import { Category, Note } from '@type';
import { storage, downloadOrWriteFile } from '@utils/storage';

export const exportBackup = (
  categories: Category[],
  notes: Note[],
  showToast: (msg: string, type?: any) => void
) => {
  const backupData = {
    version: '1.0.0',
    timestamp: Date.now(),
    categories,
    notes
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const timeStr = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;
  const filename = `moment-notes-backup-${timeStr}.json`;

  const result = downloadOrWriteFile(jsonStr, filename, 'application/json');
  if (result === 'success') {
    showToast('备份已成功导出', 'success');
  } else if (result === 'canceled') {
    showToast('已取消备份导出', 'info');
  } else {
    showToast('备份已导出为 JSON 文件下载', 'success');
  }
};

export const importBackup = (
  jsonStr: string,
  categories: { value: Category[] },
  notes: { value: Note[] },
  categoryOrder: { value: string[] },
  saveCategories: () => void,
  saveNotes: () => void,
  saveCategoryOrder: () => void,
  showToast: (msg: string, type?: any) => void
): boolean => {
  try {
    const data = JSON.parse(jsonStr);

    if (!data || typeof data !== 'object') return false;
    if (!Array.isArray(data.categories) || !Array.isArray(data.notes)) return false;

    const validCategories = data.categories.filter((c: any) => {
      return c && typeof c.id === 'string' && typeof c.name === 'string';
    });

    const validNotes = data.notes.filter((n: any) => {
      return (
        n &&
        typeof n.id === 'string' &&
        typeof n.categoryId === 'string' &&
        typeof n.content === 'string' &&
        typeof n.color === 'string'
      );
    });

    if (validCategories.length === 0 && validNotes.length === 0) {
      showToast('导入失败：备份文件不包含有效的分类或便签数据', 'error');
      return false;
    }

    const catMap = new Map(categories.value.map(c => [c.id, c]));
    validCategories.forEach((c: any) => {
      catMap.set(c.id, {
        id: c.id,
        name: c.name,
        createdAt: c.createdAt || Date.now(),
        parentId: typeof c.parentId === 'string' ? c.parentId : undefined
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

    showToast(
      `成功导入 ${validCategories.length} 个分类和 ${validNotes.length} 张便签！`,
      'success'
    );
    return true;
  } catch (e) {
    console.error('Import backup failed:', e);
    showToast('导入失败：JSON 文件解析错误', 'error');
    return false;
  }
};

export const exportSingleNoteAsTxt = (
  note: Note,
  showToast: (msg: string, type?: any) => void,
  prefixTagWithHash = true
) => {
  const title = note.title || '无标题便签';
  const tagsStr =
    note.tags && note.tags.length > 0
      ? `标签: ${note.tags.map(t => (prefixTagWithHash ? `#${t}` : t)).join(' ')}\n`
      : '';
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

export const getDefaultNotes = (): Note[] => [
  {
    id: 'n1',
    categoryId: 'uncategorized',
    title: '✨ 欢迎使用拾光便签',
    content:
      '嗨喽！这是一个基于 uTools 平台开发的便签插件。在这里你可以分类整理你的日常工作备忘、常用快捷回复和奇思妙想！！',
    color: 'yellow',
    isPinned: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: ['欢迎', '指南']
  },
  {
    id: 'n2',
    categoryId: '1',
    title: '🌈 核心特色功能',
    content:
      `1. 双击快捷粘贴：双击便签卡片，将自动隐藏并把内容直接粘贴到你的光标输入位置，适合常用回复或模版。
2. 多级分类管理：支持无限层级的子分类与自由重排。分类项右侧工具栏可快速进行添加子分类、重命名与删除操作。`,
    color: 'blue',
    isPinned: false,
    createdAt: Date.now() - 1000,
    updatedAt: Date.now() - 1000,
    tags: ['特色', '效率']
  },
  {
    id: 'n3',
    categoryId: '1',
    title: '🎯 快捷操作指南',
    content:
      `支持丰富的个性化与管理操作：
1. 点击左上角大头针可置顶。
2. 卡片底部的工具栏可修改卡片颜色或移动分类。
3. 顶部操作栏支持切换深浅主题、调整布局与排序。
4. 在「自定义排序」下支持鼠标拖拽重排卡片。`,
    color: 'green',
    isPinned: false,
    createdAt: Date.now() - 2000,
    updatedAt: Date.now() - 2000,
    tags: ['操作', '快速开始']
  },
  {
    id: 'n4',
    categoryId: '2',
    title: '⌨️ 快捷键指南',
    content:
      `1. 极速新建：【Ctrl + Alt + N】可在当前分类下快速创建空白便签。
2. 快速搜索：【Ctrl + F】可使光标自动聚焦到搜索框，输入关键字直接过滤。
3. 保存编辑：在内容编辑框内，按【Ctrl + Enter】可以直接保存内容。
4. 放弃编辑：在编辑标题或内容时，按【Esc】可以放弃修改并退出。`,
    color: 'purple',
    isPinned: false,
    createdAt: Date.now() - 3000,
    updatedAt: Date.now() - 3000,
    tags: ['快捷键', '效率']
  }
];

export const devResetNotes = (
  notes: { value: Note[] },
  saveNotes: () => void,
  showToast: (msg: string, type?: any) => void
) => {
  notes.value = getDefaultNotes();
  saveNotes();
  showToast('已重置所有便签(Notes)', 'success');
};

export const devResetTags = (
  notes: { value: Note[] },
  saveNotes: () => void,
  showToast: (msg: string, type?: any) => void
) => {
  notes.value = notes.value.map(n => ({ ...n, tags: [] }));
  saveNotes();
  showToast('已重置所有便签的标签(Tags)', 'success');
};

export const devResetAllData = (
  loadData: () => void,
  gridColumns: { value: any },
  showToast: (msg: string, type?: any) => void
) => {
  storage.removeItem('sticky_notes_categories');
  storage.removeItem('sticky_notes_category_order');
  storage.removeItem('sticky_notes_notes');
  storage.removeItem('sticky_notes_grid_columns');
  gridColumns.value = 'auto';
  loadData();
  showToast('已重置所有数据(便签和分类)', 'success');
};
