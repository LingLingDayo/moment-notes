import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ref, nextTick } from 'vue';
import { useNoteTagMeasure } from './useNoteTagMeasure';
import { Note } from '@type';

describe('useNoteTagMeasure 标签测量与截断 Hook 单测', () => {
  let storeMap: Map<string, string>;

  beforeEach(() => {
    setActivePinia(createPinia());
    storeMap = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (key: string) => storeMap.get(key) || null,
      setItem: (key: string, value: string) => storeMap.set(key, value),
      removeItem: (key: string) => storeMap.delete(key),
      clear: () => storeMap.clear(),
      length: 0,
      key: () => null
    } as any;
  });

  const createMockNote = (tags: string[] = []): Note => ({
    id: 'test-1',
    categoryId: 'all',
    title: '测试便签',
    content: '测试内容',
    color: 'yellow',
    type: 'text',
    isPinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags
  });

  it('初始化时如果便签有标签，应同步兜底初始化 visibleTags 避免渲染空白', () => {
    const note = createMockNote(['Vue3', 'TypeScript']);
    const { visibleTags } = useNoteTagMeasure(note);

    expect(visibleTags.value).toEqual(['Vue3', 'TypeScript']);
  });

  it('无标签时 visibleTags 和 allTagsText 应为空', () => {
    const note = createMockNote([]);
    const { visibleTags, hasMore, allTagsText } = useNoteTagMeasure(note);

    expect(visibleTags.value).toEqual([]);
    expect(hasMore.value).toBe(false);
    expect(allTagsText.value).toBe('');
  });

  it('支持传入响应式 ref 或 getter 函数，并动态感知标签变化', async () => {
    const noteRef = ref(createMockNote(['TagA']));
    const { visibleTags, calculateVisibleTags } = useNoteTagMeasure(() => noteRef.value);

    expect(visibleTags.value).toEqual(['TagA']);

    noteRef.value = createMockNote(['TagA', 'TagB', 'TagC']);
    calculateVisibleTags(true);
    await nextTick();

    expect(visibleTags.value).toEqual(['TagA', 'TagB', 'TagC']);
  });

  it('当测量容器宽度为 0 时（如动画入场中），应保持 tags 兜底展示不归零', async () => {
    const note = createMockNote(['Tag1', 'Tag2']);
    const { measureContainerRef, visibleTags, calculateVisibleTags } = useNoteTagMeasure(note);

    // 模拟容器已挂载但 width 为 0
    const mockContainer = {
      clientWidth: 0,
      children: []
    } as unknown as HTMLDivElement;

    measureContainerRef.value = mockContainer;
    calculateVisibleTags(true);
    await nextTick();

    expect(visibleTags.value).toEqual(['Tag1', 'Tag2']);
  });

  it('原已有旧标签，在添加新标签后退出编辑（容器宽度首帧为 0 时），应正确同步展示所有新标签', async () => {
    const noteRef = ref(createMockNote(['旧标签']));
    const { measureContainerRef, visibleTags, calculateVisibleTags } = useNoteTagMeasure(() => noteRef.value);

    expect(visibleTags.value).toEqual(['旧标签']);

    // 模拟容器已挂载但 width 暂时为 0
    measureContainerRef.value = {
      clientWidth: 0,
      children: []
    } as unknown as HTMLDivElement;

    // 更新便签标签（例如自动保存新增了标签）
    noteRef.value = createMockNote(['旧标签', '新标签']);
    calculateVisibleTags(true);
    await nextTick();

    expect(visibleTags.value).toEqual(['旧标签', '新标签']);
  });
});
