import { describe, it, expect } from 'vitest';
import {
  NoteSearchIndex,
  parseSearchKeywords,
  buildCategoryPathMapLower
} from './NoteSearchIndex';
import type { Note, Category } from '../../types';

describe('NoteSearchIndex 领域搜索索引与匹配', () => {
  it('parseSearchKeywords 能规范化拆分多词并过滤空格', () => {
    expect(parseSearchKeywords('')).toEqual([]);
    expect(parseSearchKeywords('   ')).toEqual([]);
    expect(parseSearchKeywords('  Hello   WORLD   vue  ')).toEqual(['hello', 'world', 'vue']);
  });

  it('buildCategoryPathMapLower 能正确构建小写层级路径', () => {
    const categories: Category[] = [
      { id: 'c1', name: 'WORK', createdAt: 0 },
      { id: 'c2', name: 'Project A', parentId: 'c1', createdAt: 0 },
      { id: 'c3', name: 'Sub Task', parentId: 'c2', createdAt: 0 }
    ];
    const pathMap = buildCategoryPathMapLower(categories);
    expect(pathMap.get('c1')).toBe('work');
    expect(pathMap.get('c2')).toBe('work / project a');
    expect(pathMap.get('c3')).toBe('work / project a / sub task');
  });

  it('getOrCreateEntry 能够在数据不变时复用条目，在更新时刷新条目', () => {
    const index = new NoteSearchIndex();
    const note: Note = {
      id: 'n1',
      categoryId: 'c1',
      title: 'Vue 3 Guide',
      content: 'Pinia and Vite',
      color: 'yellow',
      isPinned: false,
      createdAt: 100,
      updatedAt: 100,
      tags: ['Frontend', 'VUE']
    };

    const entry1 = index.getOrCreateEntry(note);
    expect(entry1.titleLower).toBe('vue 3 guide');
    expect(entry1.contentLower).toBe('pinia and vite');
    expect(entry1.tagsLower).toEqual(['frontend', 'vue']);

    // 再次获取应直接命中缓存引用
    const entry2 = index.getOrCreateEntry(note);
    expect(entry2).toBe(entry1);

    // 修改内容后应感知失效并生成新 entry
    note.content = 'Updated Vite info';
    const entry3 = index.getOrCreateEntry(note);
    expect(entry3).not.toBe(entry1);
    expect(entry3.contentLower).toBe('updated vite info');
  });

  it('matchNote 针对不同目标正确生效短路求值', () => {
    const index = new NoteSearchIndex();
    const note: Note = {
      id: 'n1',
      categoryId: 'c1',
      title: 'Meeting Notes',
      content: 'Project roadmap review',
      color: 'yellow',
      isPinned: false,
      createdAt: 100,
      updatedAt: 100,
      tags: ['Design']
    };

    // all 模式
    expect(index.matchNote(note, ['meet'], ['all'])).toBe(true);
    expect(index.matchNote(note, ['roadmap'], ['all'])).toBe(true);
    expect(index.matchNote(note, ['design'], ['all'])).toBe(true);
    expect(index.matchNote(note, ['meet', 'design'], ['all'])).toBe(true);
    expect(index.matchNote(note, ['meet', 'unknown'], ['all'])).toBe(false);

    // 指定目标模式
    expect(index.matchNote(note, ['meet'], ['content'])).toBe(false);
    expect(index.matchNote(note, ['meet'], ['title'])).toBe(true);
    expect(index.matchNote(note, ['design'], ['title'])).toBe(false);
    expect(index.matchNote(note, ['design'], ['tag'])).toBe(true);

    // 分类匹配
    expect(index.matchNote(note, ['frontend'], ['category'], 'frontend / dev')).toBe(true);
    expect(index.matchNote(note, ['backend'], ['category'], 'frontend / dev')).toBe(false);
  });

  it('filterNotes 对便签集合按关键词进行正确过滤', () => {
    const index = new NoteSearchIndex();
    const notes: Note[] = [
      {
        id: '1',
        categoryId: 'c1',
        title: 'Alpha',
        content: 'Text one',
        color: 'yellow',
        isPinned: false,
        createdAt: 1,
        updatedAt: 1
      },
      {
        id: '2',
        categoryId: 'c2',
        title: 'Beta',
        content: 'Text two',
        color: 'yellow',
        isPinned: false,
        createdAt: 2,
        updatedAt: 2
      }
    ];

    expect(index.filterNotes(notes, '').length).toBe(2);
    expect(index.filterNotes(notes, 'alpha').length).toBe(1);
    expect(index.filterNotes(notes, 'alpha')[0].id).toBe('1');
    expect(index.filterNotes(notes, 'text').length).toBe(2);
    expect(index.filterNotes(notes, 'none').length).toBe(0);
  });
});
