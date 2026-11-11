import { describe, it, expect } from 'vitest';
import {
  filterNotes,
  sortNotes,
  getFilteredAndSortedNotes,
  normalizeCategoryOrder,
  reorderTagList
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
});
