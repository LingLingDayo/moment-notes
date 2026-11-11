import { describe, it, expect, vi } from 'vitest';
import { eventBus } from './events/DomainEventBus';
import { commandRegistry } from './commands/CommandRegistry';
import { NoteFilterPipeline } from './pipeline/NoteFilterPipeline';
import { Note } from '@type';

describe('Domain Architecture & Bus Modules', () => {
  it('DomainEventBus 应正确发布与订阅事件', () => {
    const handler = vi.fn();
    const unsubscribe = eventBus.subscribe('NOTE_CREATED', handler);

    eventBus.emit('NOTE_CREATED', { id: 'note-1', content: 'test' });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      type: 'NOTE_CREATED',
      payload: { id: 'note-1', content: 'test' }
    }));

    unsubscribe();
    eventBus.emit('NOTE_CREATED', { id: 'note-2' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('CommandRegistry 应正确注册与分发命令，且在重复注册时警告', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    commandRegistry.registerHandler('testCommand', '测试命令1', handler1);
    commandRegistry.registerHandler('testCommand', '测试命令2', handler2);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('already registered'));
    expect(commandRegistry.has('testCommand')).toBe(true);

    const executed = commandRegistry.execute('testCommand', { foo: 'bar' });
    expect(executed).toBe(true);
    expect(handler2).toHaveBeenCalledTimes(1);
    expect(handler1).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('NoteFilterPipeline 截断阶段应生效', () => {
    const pipeline = new NoteFilterPipeline();
    const mockNotes: Note[] = Array.from({ length: 50 }, (_, i) => ({
      id: `n-${i}`,
      categoryId: 'c1',
      content: `Note ${i}`,
      color: 'yellow',
      isPinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastUsedAt: Date.now() + i
    }));

    const result = pipeline.execute({
      notes: mockNotes,
      searchQuery: '',
      searchTarget: ['all'],
      sortMode: 'date',
      sortOrder: 'desc',
      currentCategoryId: 'recent',
      categories: []
    });

    expect(result.length).toBe(30);
  });

  it('NoteFilterPipeline 分类过滤与搜索级联处理生效', () => {
    const pipeline = new NoteFilterPipeline();
    const notes: Note[] = [
      { id: '1', categoryId: 'cat-a', content: 'Vue 3 入门', color: 'yellow', isPinned: false, createdAt: 1, updatedAt: 1 },
      { id: '2', categoryId: 'cat-b', content: 'React 入门', color: 'blue', isPinned: false, createdAt: 2, updatedAt: 2 },
      { id: '3', categoryId: 'cat-sub', content: 'Vue 进阶', color: 'green', isPinned: false, createdAt: 3, updatedAt: 3 },
      { id: '4', categoryId: 'cat-a', content: '已删除的 Vue', isDeleted: true, color: 'red', isPinned: false, createdAt: 4, updatedAt: 4 }
    ];

    const result = pipeline.execute({
      notes,
      searchQuery: 'Vue',
      searchTarget: ['all'],
      sortMode: 'date',
      sortOrder: 'desc',
      currentCategoryId: 'cat-a',
      categories: [],
      descendantCategoryIds: new Set(['cat-sub'])
    });

    // 应该匹配 cat-a 和 cat-sub，且排除了已删除的 id 4
    expect(result.map(n => n.id)).toEqual(['3', '1']);
  });
});
