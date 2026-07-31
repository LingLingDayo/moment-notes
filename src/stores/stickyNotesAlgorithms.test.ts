import { describe, it, expect } from 'vitest';
import {
  filterNotes,
  sortNotes,
  getFilteredAndSortedNotes,
  normalizeCategoryOrder
} from './stickyNotesAlgorithms';
import type { Note, Category } from '@type';

// 基础便签 Mock 数据工厂函数
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

describe('stickyNotesAlgorithms 纯算法单测套件', () => {
  describe('filterNotes 检索过滤算法', () => {
    it('空搜索词返回全部便签', () => {
      const notes = [createMockNote({ id: '1' }), createMockNote({ id: '2' })];
      const result = filterNotes(notes, '');
      expect(result).toHaveLength(2);
    });

    it('支持空格多关键字全目标匹配', () => {
      const notes = [
        createMockNote({ id: '1', title: 'Vue3 学习指南', content: '使用 Vite 构建', tags: ['前端'] }),
        createMockNote({ id: '2', title: 'React 进阶', content: '使用 Next.js 构建', tags: ['前端'] }),
        createMockNote({ id: '3', title: 'Python 脚本', content: '爬虫开发', tags: ['后端'] })
      ];

      const result = filterNotes(notes, '前端 Vue', ['all']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('支持按指定目标 (仅标题/仅标签) 过滤', () => {
      const notes = [
        createMockNote({ id: '1', title: '项目会议记录', content: '讨论需求', tags: ['重要'] }),
        createMockNote({ id: '2', title: '日记', content: '今天开了一场会议', tags: ['生活'] })
      ];

      const titleResult = filterNotes(notes, '会议', ['title']);
      expect(titleResult).toHaveLength(1);
      expect(titleResult[0].id).toBe('1');

      const tagResult = filterNotes(notes, '重要', ['tag']);
      expect(tagResult).toHaveLength(1);
      expect(tagResult[0].id).toBe('1');
    });
  });

  describe('sortNotes 多维排序算法', () => {
    it('置顶便签 isPinned 始终优先置顶', () => {
      const notes = [
        createMockNote({ id: '1', isPinned: false, updatedAt: 2000 }),
        createMockNote({ id: '2', isPinned: true, updatedAt: 1000 })
      ];

      const sorted = sortNotes(notes, 'date', 'desc');
      expect(sorted[0].id).toBe('2');
    });

    it('按 title 拼音字典序进行升降序', () => {
      const notes = [
        createMockNote({ id: '1', title: '苹果', updatedAt: 1000 }),
        createMockNote({ id: '2', title: '香蕉', updatedAt: 1000 }),
        createMockNote({ id: '3', title: '鸭梨', updatedAt: 1000 })
      ];

      const ascSorted = sortNotes(notes, 'title', 'asc');
      expect(ascSorted[0].title).toBe('苹果');
      expect(ascSorted[1].title).toBe('香蕉');
      expect(ascSorted[2].title).toBe('鸭梨');

      const descSorted = sortNotes(notes, 'title', 'desc');
      expect(descSorted[0].title).toBe('鸭梨');
    });

    it('按 tag 分组、代表标签拼音字典序与标签数量优先排序', () => {
      const notes = [
        createMockNote({ id: '1', tags: [], updatedAt: 3000 }),
        createMockNote({ id: '2', tags: ['工作', '紧急'], updatedAt: 1000 }),
        createMockNote({ id: '3', tags: ['工作'], updatedAt: 2000 })
      ];

      const sorted = sortNotes(notes, 'tag', 'asc');
      expect(sorted[0].id).toBe('2'); // 多标签优先
      expect(sorted[1].id).toBe('3');
      expect(sorted[2].id).toBe('1'); // 无标签垫底
    });

    it('按 useCount 使用次数降序', () => {
      const notes = [
        createMockNote({ id: '1', useCount: 5, updatedAt: 1000 }),
        createMockNote({ id: '2', useCount: 20, updatedAt: 2000 })
      ];

      const sorted = sortNotes(notes, 'useCount', 'desc');
      expect(sorted[0].id).toBe('2');
      expect(sorted[1].id).toBe('1');
    });
  });

  describe('getFilteredAndSortedNotes 组合策略', () => {
    it('recent 模式下截取最多 30 条', () => {
      const notes: Note[] = [];
      for (let i = 1; i <= 50; i++) {
        notes.push(createMockNote({ id: `note-${i}`, lastUsedAt: i * 100 }));
      }

      const result = getFilteredAndSortedNotes(notes, '', ['all'], 'date', 'desc', 'recent');
      expect(result).toHaveLength(30);
      expect(result[0].id).toBe('note-50');
    });
  });

  describe('normalizeCategoryOrder 分类顺序规范化算法', () => {
    it('维护全分类与 all 顺序、补全缺失全量分类', () => {
      const categories: Category[] = [
        { id: 'cat-1', name: '工作', createdAt: 100 },
        { id: 'cat-2', name: '生活', createdAt: 200 }
      ];

      const loadedOrder1 = ['cat-1', 'cat-2'];
      const order1 = normalizeCategoryOrder(loadedOrder1, categories);
      expect(order1).toEqual(['all', 'cat-1', 'cat-2']);

      const loadedOrder2 = ['all', 'deleted-cat', 'cat-2'];
      const order2 = normalizeCategoryOrder(loadedOrder2, categories);
      expect(order2).toEqual(['all', 'cat-2', 'cat-1']);
    });
  });
});
