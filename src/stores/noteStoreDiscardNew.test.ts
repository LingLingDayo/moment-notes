import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useNoteStore } from './noteStore';

describe('noteStore 新建便签取消与丢弃机制', () => {
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

  it('addNote 创建的新便签会被标记为新建状态', () => {
    const store = useNoteStore();
    const newNote = store.addNote('all', '', '');

    expect(store.isNewlyCreatedNote(newNote.id)).toBe(true);
    expect(store.editingNoteId).toBe(newNote.id);
  });

  it('新建便签未保存直接取消时，discardNewNote 会直接彻底移除且不移入回收站', () => {
    const store = useNoteStore();
    const newNote = store.addNote('all', '', '');
    expect(store.allNotes.some(n => n.id === newNote.id)).toBe(true);

    store.discardNewNote(newNote.id);

    // 彻底从所有便签移除，且不在回收站
    expect(store.allNotes.some(n => n.id === newNote.id)).toBe(false);
    expect(store.trashNotesCount).toBe(0);
    expect(store.isNewlyCreatedNote(newNote.id)).toBe(false);
    expect(store.editingNoteId).toBeNull();
  });

  it('新建便签执行 updateNote 保存后，自动退出新建状态', () => {
    const store = useNoteStore();
    const newNote = store.addNote('all', '', '');
    expect(store.isNewlyCreatedNote(newNote.id)).toBe(true);

    store.updateNote(newNote.id, { content: 'hello world' });

    expect(store.isNewlyCreatedNote(newNote.id)).toBe(false);
    expect(store.allNotes.some(n => n.id === newNote.id)).toBe(true);
  });

  it('新建便签执行 markNoteAsSaved 后，即便无内容改动也转为正常便签状态', () => {
    const store = useNoteStore();
    const newNote = store.addNote('all', '', '');
    expect(store.isNewlyCreatedNote(newNote.id)).toBe(true);

    store.markNoteAsSaved(newNote.id);

    expect(store.isNewlyCreatedNote(newNote.id)).toBe(false);
    expect(store.allNotes.some(n => n.id === newNote.id)).toBe(true);
  });

  it('历史已有便签默认不处于新建状态', () => {
    const store = useNoteStore();
    store.allNotes = [
      {
        id: 'existing-1',
        categoryId: 'all',
        content: 'existing content',
        color: 'yellow',
        isPinned: false,
        createdAt: 1,
        updatedAt: 1
      }
    ];

    expect(store.isNewlyCreatedNote('existing-1')).toBe(false);
  });
});
