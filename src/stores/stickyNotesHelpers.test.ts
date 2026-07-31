import { describe, it, expect, vi } from 'vitest';
import { exportSelectedBackup, importSelectedBackup } from './stickyNotesHelpers';
import { Category, Note, AppSettings, BackupData } from '@type';

describe('stickyNotesHelpers Data Export & Import', () => {
  const mockCategories: Category[] = [
    { id: 'cat-1', name: '工作', createdAt: 1000 },
    { id: 'cat-2', name: '生活', createdAt: 2000 }
  ];

  const mockNotes: Note[] = [
    {
      id: 'note-1',
      categoryId: 'cat-1',
      title: '工作事项1',
      content: '完成报告',
      color: '#ffffff',
      isPinned: false,
      createdAt: 1000,
      updatedAt: 1000
    },
    {
      id: 'note-2',
      categoryId: 'cat-2',
      title: '买菜',
      content: '买水果',
      color: '#ffffff',
      isPinned: false,
      createdAt: 2000,
      updatedAt: 2000
    },
    {
      id: 'note-3',
      categoryId: 'all',
      title: '未分类灵感',
      content: '无分类笔记',
      color: '#ffffff',
      isPinned: false,
      createdAt: 3000,
      updatedAt: 3000
    }
  ];

  const mockSettings: AppSettings = {
    theme: 'dark',
    gridColumns: 3
  };

  it('exportSelectedBackup 应仅筛选选中的分类与便签', () => {
    const showToast = vi.fn();
    exportSelectedBackup(
      mockCategories,
      mockNotes,
      mockSettings,
      {
        categoryIds: ['cat-1'],
        includeSettings: true,
        includeTrash: false
      },
      showToast
    );

    expect(showToast).toHaveBeenCalled();
  });

  it('importSelectedBackup 增量合并模式 (merge)', () => {
    const categoriesRef = { value: [...mockCategories] };
    const notesRef = { value: [mockNotes[0]] };
    const categoryOrderRef = { value: ['all', 'cat-1', 'cat-2'] };
    const showToast = vi.fn();

    const backup: BackupData = {
      version: '1.0.0',
      timestamp: Date.now(),
      categories: [{ id: 'cat-3', name: '学习', createdAt: 3000 }],
      notes: [
        {
          id: 'note-4',
          categoryId: 'cat-3',
          title: '读书',
          content: '看书',
          color: '#ffffff',
          isPinned: false,
          createdAt: 4000,
          updatedAt: 4000
        }
      ]
    };

    const success = importSelectedBackup(
      backup,
      {
        mode: 'merge',
        categoryIds: ['cat-3'],
        importUncategorized: false,
        importSettings: false
      },
      categoriesRef,
      notesRef,
      categoryOrderRef,
      vi.fn(),
      vi.fn(),
      vi.fn(),
      showToast
    );

    expect(success).toBe(true);
    expect(categoriesRef.value.length).toBe(3); // cat-1, cat-2, cat-3
    expect(notesRef.value.length).toBe(2); // note-1, note-4
  });

  it('importSelectedBackup 覆盖已有模式 (overwrite)', () => {
    const categoriesRef = { value: [...mockCategories] };
    const notesRef = { value: [...mockNotes] };
    const categoryOrderRef = { value: ['all', 'cat-1', 'cat-2'] };
    const showToast = vi.fn();

    const backup: BackupData = {
      version: '1.0.0',
      timestamp: Date.now(),
      categories: [{ id: 'cat-new', name: '全新分类', createdAt: 5000 }],
      notes: [
        {
          id: 'note-new',
          categoryId: 'cat-new',
          title: '全新便签',
          content: '替换后的内容',
          color: '#ffffff',
          isPinned: false,
          createdAt: 5000,
          updatedAt: 5000
        }
      ]
    };

    const success = importSelectedBackup(
      backup,
      {
        mode: 'overwrite',
        categoryIds: ['cat-new'],
        importUncategorized: false,
        importSettings: false
      },
      categoriesRef,
      notesRef,
      categoryOrderRef,
      vi.fn(),
      vi.fn(),
      vi.fn(),
      showToast
    );

    expect(success).toBe(true);
    expect(categoriesRef.value).toEqual([
      { id: 'cat-new', name: '全新分类', createdAt: 5000, parentId: undefined }
    ]);
    expect(notesRef.value.length).toBe(1);
    expect(notesRef.value[0].id).toBe('note-new');
  });
});
