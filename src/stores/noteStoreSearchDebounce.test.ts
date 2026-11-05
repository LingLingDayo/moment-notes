import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useNoteStore } from './noteStore';
import { nextTick } from 'vue';

describe('noteStore 搜索自适应防抖逻辑', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useRealTimers();
  });

  it('便签总量较少 (<= 300) 时，输入搜索词立即同步应用', async () => {
    const store = useNoteStore();
    store.notes = Array.from({ length: 5 }, (_, i) => ({
      id: String(i),
      categoryId: 'all',
      content: `Note ${i}`,
      color: 'yellow',
      isPinned: false,
      createdAt: 1,
      updatedAt: 1
    }));

    store.searchQuery = 'test';
    await nextTick();
    expect(store.appliedSearchQuery).toBe('test');
  });

  it('清空搜索词时，无论便签多少均立即同步清空', async () => {
    const store = useNoteStore();
    store.notes = Array.from({ length: 500 }, (_, i) => ({
      id: String(i),
      categoryId: 'all',
      content: `Note ${i}`,
      color: 'yellow',
      isPinned: false,
      createdAt: 1,
      updatedAt: 1
    }));

    // 先有输入词并进入防抖待更新状态
    store.searchQuery = 'old-keyword';
    await nextTick();
    // 立即清空
    store.searchQuery = '';
    await nextTick();
    expect(store.appliedSearchQuery).toBe('');
  });

  it('大数据量 (> 300) 时，执行 150ms 防抖更新', async () => {
    vi.useFakeTimers();
    const store = useNoteStore();
    store.notes = Array.from({ length: 350 }, (_, i) => ({
      id: String(i),
      categoryId: 'all',
      content: `Note ${i}`,
      color: 'yellow',
      isPinned: false,
      createdAt: 1,
      updatedAt: 1
    }));

    store.searchQuery = 'typing';
    await nextTick();
    // 尚未触发定时器，仍为旧值
    expect(store.appliedSearchQuery).toBe('');

    // 快进 100ms，仍不应更新
    vi.advanceTimersByTime(100);
    expect(store.appliedSearchQuery).toBe('');

    // 快进到 150ms 触发
    vi.advanceTimersByTime(50);
    expect(store.appliedSearchQuery).toBe('typing');
  });
});
