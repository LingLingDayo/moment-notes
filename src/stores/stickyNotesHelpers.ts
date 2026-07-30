import { Category, Note, AppSettings } from '@type';
import { storage, downloadOrWriteFile, isUTools } from '@utils/storage';
import { getDefaultNotes } from './defaultData';

export { getDefaultNotes };

/**
 * 构造统一规范的备份数据结构对象
 */
export const createBackupData = (
  categories: Category[],
  notes: Note[],
  settings?: AppSettings,
  versionOverride?: string
) => {
  return {
    version: versionOverride || __APP_VERSION__,
    timestamp: Date.now(),
    categories,
    notes,
    ...(settings ? { settings } : {})
  };
};

export const checkAndAutoBackupPreUpdate = (
  categories: Category[],
  notes: Note[],
  settings?: AppSettings
) => {
  if (!isUTools()) return;

  const currentVersion = __APP_VERSION__;
  const storedVersion = storage.getItem('sticky_notes_app_version');

  if (storedVersion && storedVersion !== currentVersion) {
    try {
      const backupData = createBackupData(categories, notes, settings, storedVersion);
      storage.setItem('sticky_notes_pre_update_backup', JSON.stringify(backupData));
      console.log(`[AutoBackup] 检测到版本更新 (${storedVersion} -> ${currentVersion})，已保存更新前数据备份至 sticky_notes_pre_update_backup`);
    } catch (e) {
      console.error('[AutoBackup] 自动备份更新前数据失败:', e);
    }
  }

  storage.setItem('sticky_notes_app_version', currentVersion);
};

export const exportBackup = (
  categories: Category[],
  notes: Note[],
  settings: AppSettings,
  showToast: (msg: string, type?: any) => void
) => {
  const backupData = createBackupData(categories, notes, settings);

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
  showToast: (msg: string, type?: any) => void,
  applySettings?: (settings: AppSettings) => void
): boolean => {
  try {
    const data = JSON.parse(jsonStr);

    if (!data || typeof data !== 'object') return false;

    const hasCategories = Array.isArray(data.categories);
    const hasNotes = Array.isArray(data.notes);
    const hasSettings = !!(data.settings && typeof data.settings === 'object');

    if (!hasCategories && !hasNotes && !hasSettings) {
      showToast('导入失败：备份文件不包含有效的数据', 'error');
      return false;
    }

    const validCategories = hasCategories
      ? data.categories.filter((c: any) => c && typeof c.id === 'string' && typeof c.name === 'string')
      : [];

    const validNotes = hasNotes
      ? data.notes.filter((n: any) => {
          return (
            n &&
            typeof n.id === 'string' &&
            typeof n.categoryId === 'string' &&
            typeof n.content === 'string' &&
            typeof n.color === 'string'
          );
        })
      : [];

    if (validCategories.length === 0 && validNotes.length === 0 && !hasSettings) {
      showToast('导入失败：备份文件不包含有效的分类、便签或设置数据', 'error');
      return false;
    }

    if (validCategories.length > 0) {
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
      saveCategories();
    }

    if (validNotes.length > 0) {
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
          tags: Array.isArray(n.tags) ? n.tags.filter((t: any) => typeof t === 'string') : [],
          type: n.type || 'text',
          images: Array.isArray(n.images) ? n.images : undefined,
          isDeleted: !!n.isDeleted,
          deletedAt: n.deletedAt,
          lastUsedAt: n.lastUsedAt,
          useCount: n.useCount
        });
      });
      notes.value = Array.from(noteMap.values());
      saveNotes();
    }

    if (validCategories.length > 0) {
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
    }

    if (hasSettings && applySettings) {
      applySettings(data.settings);
    }

    let toastMessage = `成功导入 ${validCategories.length} 个分类和 ${validNotes.length} 张便签！`;
    if (hasSettings) {
      toastMessage = `成功导入 ${validCategories.length} 个分类、${validNotes.length} 张便签及系统设置！`;
    }

    showToast(toastMessage, 'success');
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
