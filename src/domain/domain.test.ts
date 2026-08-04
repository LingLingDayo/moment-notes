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

  it('CommandRegistry 应正确注册与分发命令', () => {
    const handler = vi.fn();
    commandRegistry.registerHandler('testCommand', '测试命令', handler);

    expect(commandRegistry.has('testCommand')).toBe(true);
    const executed = commandRegistry.execute('testCommand', { foo: 'bar' });
    expect(executed).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
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
      updatedAt: Date.now()
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
});
