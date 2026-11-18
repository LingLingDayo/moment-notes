import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useNoteStore } from './noteStore';
import { useCategoryStore } from './categoryStore';

describe('noteStore 分组作用域置顶行为', () => {
  let storeMap: Map<string, string>;

  beforeEach(() => {
    setActivePinia(createPinia());
    storeMap = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (key: string) => storeMap.get(key) || null,
      setItem: (key: string, value: string) => {
        storeMap.set(key, value);
      },
      removeItem: (key: string) => {
        storeMap.delete(key);
      },
      clear: () => storeMap.clear(),
      length: 0,
      key: () => null
    } as any;
  });

  it('跨分组移动便签时应自动取消原分组的置顶状态', () => {
    const noteStore = useNoteStore();
    noteStore.allNotes = [
      {
        id: 'n1',
        categoryId: 'cat-a',
        content: 'Note A',
        color: 'yellow',
        isPinned: true,
        createdAt: 1000,
        updatedAt: 1000
      }
    ];

    // 同分组更新非分类字段，保留置顶状态
    noteStore.updateNote('n1', { content: 'Note A updated' }, false);
    expect(noteStore.allNotes[0].isPinned).toBe(true);

    // 移动到其他分组时，自动取消置顶
    noteStore.updateNote('n1', { categoryId: 'cat-b' }, false);
    expect(noteStore.allNotes[0].categoryId).toBe('cat-b');
    expect(noteStore.allNotes[0].isPinned).toBe(false);
  });

  it('在全部便签视图下，原分组合法置顶的便签与未置顶便签可自由拖拽换序', () => {
    const noteStore = useNoteStore();
    noteStore.allNotes = [
      {
        id: 'n1',
        categoryId: 'cat-a',
        content: 'Pinned in A',
        color: 'yellow',
        isPinned: true,
        createdAt: 1000,
        updatedAt: 1000
      },
      {
        id: 'n2',
        categoryId: 'cat-b',
        content: 'Normal in B',
        color: 'blue',
        isPinned: false,
        createdAt: 2000,
        updatedAt: 2000
      }
    ];

    noteStore.currentCategoryId = 'all';
    noteStore.syncCurrentCategoryNotes();
    noteStore.moveNote('n1', 'n2');

    expect(noteStore.notes.map(n => n.id)).toEqual(['n2', 'n1']);
    // 仍保留各自原分组归属及原分组置顶属性
    expect(noteStore.allNotes.find(n => n.id === 'n1')?.isPinned).toBe(true);
  });

  it('在所属分组内，置顶与未置顶便签之间不可跨区拖拽换序', () => {
    const noteStore = useNoteStore();
    noteStore.allNotes = [
      {
        id: 'n1',
        categoryId: 'cat-a',
        content: 'Pinned in A',
        color: 'yellow',
        isPinned: true,
        createdAt: 1000,
        updatedAt: 1000
      },
      {
        id: 'n2',
        categoryId: 'cat-a',
        content: 'Normal in A',
        color: 'blue',
        isPinned: false,
        createdAt: 2000,
        updatedAt: 2000
      }
    ];

    noteStore.currentCategoryId = 'cat-a';
    noteStore.syncCurrentCategoryNotes();
    noteStore.moveNote('n1', 'n2');

    expect(noteStore.notes.map(n => n.id)).toEqual(['n1', 'n2']);
  });

  it('在父分组下跨子分组拖拽迁移便签时，应重置原分组置顶状态', () => {
    const categoryStore = useCategoryStore();
    categoryStore.categories = [
      { id: 'cat-parent', name: '父分组', createdAt: 100 },
      { id: 'cat-a', name: '子分组A', parentId: 'cat-parent', createdAt: 200 },
      { id: 'cat-b', name: '子分组B', parentId: 'cat-parent', createdAt: 300 }
    ];

    const noteStore = useNoteStore();
    noteStore.allNotes = [
      {
        id: 'n1',
        categoryId: 'cat-a',
        content: 'Pinned in A',
        color: 'yellow',
        isPinned: true,
        createdAt: 1000,
        updatedAt: 1000
      },
      {
        id: 'n2',
        categoryId: 'cat-b',
        content: 'Normal in B',
        color: 'blue',
        isPinned: false,
        createdAt: 2000,
        updatedAt: 2000
      }
    ];

    noteStore.currentCategoryId = 'cat-parent';
    noteStore.syncCurrentCategoryNotes();
    noteStore.moveNote('n1', 'n2');

    const moved = noteStore.allNotes.find(n => n.id === 'n1');
    expect(moved?.categoryId).toBe('cat-b');
    expect(moved?.isPinned).toBe(false);
  });
});
