import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, nextTick } from 'vue';
import { useVirtualGrid } from './useVirtualGrid';

describe('useVirtualGrid 虚拟网格 Hook 单元测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('数据量小于阈值时，isVirtualGrid 应为 false；超过阈值时为 true', () => {
    const items = ref([{ id: '1' }, { id: '2' }]);
    const containerRef = ref<HTMLElement | null>(null);
    const gridColumns = ref<'auto' | number>('auto');
    const minItemWidth = ref(260);

    const { isVirtualGrid } = useVirtualGrid({
      items,
      containerRef,
      gridColumns,
      minItemWidth,
      threshold: 5
    });

    expect(isVirtualGrid.value).toBe(false);

    items.value = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }));
    expect(isVirtualGrid.value).toBe(true);
  });

  it('固定列数时，effectiveCols 应严格等于指定列数', () => {
    const items = ref(Array.from({ length: 12 }, (_, i) => ({ id: String(i) })));
    const containerRef = ref<HTMLElement | null>(null);
    const gridColumns = ref<'auto' | number>(3);
    const minItemWidth = ref(260);

    const { effectiveCols, rows } = useVirtualGrid({
      items,
      containerRef,
      gridColumns,
      minItemWidth
    });

    expect(effectiveCols.value).toBe(3);
    expect(rows.value.length).toBe(4);
    expect(rows.value[0].items.length).toBe(3);
  });

  it('总虚拟高度计算应准确反映行数、预估行高与行间距', () => {
    const items = ref(Array.from({ length: 10 }, (_, i) => ({ id: String(i) })));
    const containerRef = ref<HTMLElement | null>(null);
    const gridColumns = ref<'auto' | number>(2);
    const minItemWidth = ref(260);
    const estimatedItemHeight = ref(180);
    const gap = ref(20);

    const { rows, totalVirtualHeight } = useVirtualGrid({
      items,
      containerRef,
      gridColumns,
      minItemWidth,
      estimatedItemHeight,
      gap
    });

    // 10 条数据，每行 2 列，共 5 行
    expect(rows.value.length).toBe(5);
    // 5 行高度为 5 * 180 = 900，4 个间距 4 * 20 = 80，总高度为 980
    expect(totalVirtualHeight.value).toBe(5 * 180 + 4 * 20);
  });

  it('注册行元素并记录实测高度后，总虚拟高度能精准更新', async () => {
    const items = ref(Array.from({ length: 4 }, (_, i) => ({ id: String(i) })));
    const containerRef = ref<HTMLElement | null>(null);
    const gridColumns = ref<'auto' | number>(2);
    const minItemWidth = ref(260);
    const estimatedItemHeight = ref(100);
    const gap = ref(10);

    const { totalVirtualHeight, registerRowElement } = useVirtualGrid({
      items,
      containerRef,
      gridColumns,
      minItemWidth,
      estimatedItemHeight,
      gap
    });

    // 4 条数据，2 行，初始总高度：2 * 100 + 1 * 10 = 210
    expect(totalVirtualHeight.value).toBe(210);

    // 模拟第 0 行渲染后实测高度为 150px
    const mockEl = {
      offsetHeight: 150,
      setAttribute: vi.fn()
    } as unknown as HTMLElement;

    registerRowElement(0, mockEl);
    await nextTick();

    // 更新后总高度：150 + 100 + 10 = 260
    expect(totalVirtualHeight.value).toBe(260);
  });

  it('单行网格样式应包含正确的 gridTemplateColumns 与 gap', () => {
    const items = ref([{ id: '1' }]);
    const containerRef = ref<HTMLElement | null>(null);
    const gridColumns = ref<'auto' | number>(4);
    const minItemWidth = ref(260);
    const gap = ref(16);

    const { rowGridStyle } = useVirtualGrid({
      items,
      containerRef,
      gridColumns,
      minItemWidth,
      gap
    });

    expect(rowGridStyle.value.gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))');
    expect(rowGridStyle.value.gap).toBe('16px');
    expect(rowGridStyle.value.marginBottom).toBe('16px');
  });
});
