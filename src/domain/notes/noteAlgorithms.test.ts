import { describe, it, expect } from 'vitest';
import {
  filterNotes,
  sortNotes,
  getFilteredAndSortedNotes,
  normalizeCategoryOrder,
  reorderTagList,
  canPinNoteInCategory,
  isNotePinnedInCategory
} from './noteAlgorithms';
import type { Note } from '../../types';

const createMockNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'note-1',
  categoryId: 'cat-1',
  title: '测试便签',
  content: '便签内容示例',
  color: 'yellow',
  isPinned: false,
  createdAt: 1000,
  updatedAt: 1000,
  tags: ['工作', '会议'],
  useCount: 0,
  ...overrides
});

describe('domain/notes/noteAlgorithms 领域层纯算法单测', () => {
  it('filterNotes 与 sortNotes 正常工作', () => {
    const notes = [
      createMockNote({ id: '1', title: 'Beta', updatedAt: 200 }),
      createMockNote({ id: '2', title: 'Alpha', updatedAt: 300 })
    ];
    const filtered = filterNotes(notes, 'Alpha');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('2');

    const sorted = sortNotes(notes, 'title', 'asc');
    expect(sorted[0].title).toBe('Alpha');

    const combined = getFilteredAndSortedNotes(notes, 'Alpha', ['all'], 'title', 'asc');
    expect(combined).toHaveLength(1);
    expect(combined[0].id).toBe('2');
  });

  it('normalizeCategoryOrder 补齐与去重', () => {
    const cats = [{ id: 'c1', name: '分类1', createdAt: 1 }];
    const order = normalizeCategoryOrder(['c1'], cats);
    expect(order).toEqual(['all', 'c1']);
  });

  it('reorderTagList 标签重排序', () => {
    const result = reorderTagList(['a', 'b', 'c'], 'c', 'a');
    expect(result).toEqual(['c', 'a', 'b']);
  });

  it('canPinNoteInCategory 与 isNotePinnedInCategory 仅在所属分组生效', () => {
    const note = createMockNote({ id: 'n1', categoryId: 'cat-a', isPinned: true });
    const uncategorized = createMockNote({ id: 'n2', categoryId: 'uncategorized', isPinned: true });
    const deleted = createMockNote({ id: 'n3', categoryId: 'cat-a', isPinned: true, isDeleted: true });

    expect(canPinNoteInCategory(note, 'cat-a')).toBe(true);
    expect(canPinNoteInCategory(note, 'cat-b')).toBe(false);
    expect(canPinNoteInCategory(note, 'all')).toBe(false);
    expect(canPinNoteInCategory(note, 'recent')).toBe(false);
    expect(canPinNoteInCategory(note, 'trash')).toBe(false);
    expect(canPinNoteInCategory(uncategorized, 'all')).toBe(false);
    expect(canPinNoteInCategory(deleted, 'cat-a')).toBe(false);

    expect(isNotePinnedInCategory(note, 'cat-a')).toBe(true);
    expect(isNotePinnedInCategory(note, 'cat-b')).toBe(false);
    expect(isNotePinnedInCategory(note, 'all')).toBe(false);
    expect(isNotePinnedInCategory(note, 'recent')).toBe(false);
    expect(isNotePinnedInCategory(uncategorized, 'all')).toBe(false);
    expect(isNotePinnedInCategory(deleted, 'cat-a')).toBe(false);
  });

  it('sortNotes 置顶仅在所属分组生效，在全部便签、最近使用和其他分组中不置顶', () => {
    const notes = [
      createMockNote({ id: '1', categoryId: 'cat-a', isPinned: false, updatedAt: 3000, lastUsedAt: 3000 }),
      createMockNote({ id: '2', categoryId: 'cat-a', isPinned: true, updatedAt: 1000, lastUsedAt: 1000 }),
      createMockNote({ id: '3', categoryId: 'cat-b', isPinned: true, updatedAt: 2000, lastUsedAt: 2000 })
    ];

    // 在 cat-a 中，仅归属 cat-a 的置顶便签(2)排在最前
    expect(sortNotes(notes, 'date', 'desc', 'cat-a').map(n => n.id)).toEqual(['2', '1', '3']);
    // 在 cat-b 中，仅归属 cat-b 的置顶便签(3)排在最前
    expect(sortNotes(notes, 'date', 'desc', 'cat-b').map(n => n.id)).toEqual(['3', '1', '2']);
    // 在 all 中，置顶不生效，严格按更新时间降序
    expect(sortNotes(notes, 'date', 'desc', 'all').map(n => n.id)).toEqual(['1', '3', '2']);
    // 在 recent 中，置顶不生效，严格按 lastUsedAt 降序
    expect(sortNotes(notes, 'date', 'desc', 'recent').map(n => n.id)).toEqual(['1', '3', '2']);
    // 在父分组(或无关分组 cat-parent)中，子分组置顶便签也不置顶
    expect(sortNotes(notes, 'date', 'desc', 'cat-parent').map(n => n.id)).toEqual(['1', '3', '2']);
  });
});
