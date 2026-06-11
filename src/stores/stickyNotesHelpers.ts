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

export const exportSingleNoteAsTxt = (note: Note, showToast: (msg: string, type?: any) => void) => {
  const title = note.title || '无标题便签';
  const tagsStr =
    note.tags && note.tags.length > 0 ? `标签: ${note.tags.map(t => `#${t}`).join(' ')}\n` : '';
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

export const devResetNotes = (
  notes: { value: Note[] },
  saveNotes: () => void,
  showToast: (msg: string, type?: any) => void
) => {
  notes.value = [
    {
      id: 'n1',
      categoryId: '1',
      title: '✨ 欢迎使用拾光便签',
      content:
        '哈喽！这是一个基于 uTools 平台开发的便签插件。在这里你可以分类整理你的日常工作备忘、常用快捷回复和奇思妙想。',
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
