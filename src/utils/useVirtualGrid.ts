import { ref, computed, watch, onMounted, onBeforeUnmount, Ref, ComputedRef, triggerRef, getCurrentInstance } from 'vue';

export interface VirtualGridRow<T> {
  rowIndex: number;
  items: T[];
  key: string;
}

export interface UseVirtualGridOptions<T> {
  /** 全部数据列表（响应式） */
  items: Ref<T[]> | ComputedRef<T[]>;
  /** 滚动容器元素引用 */
  containerRef: Ref<HTMLElement | null>;
  /** 列数配置：'auto' | number */
  gridColumns: Ref<'auto' | number> | ComputedRef<'auto' | number>;
  /** 卡片最小宽度（自适应列时使用） */
  minItemWidth: Ref<number> | ComputedRef<number>;
  /** 卡片/行的预估高度（默认约 200px） */
  estimatedItemHeight?: Ref<number> | ComputedRef<number>;
  /** 网格间距（px） */
  gap?: Ref<number> | ComputedRef<number>;
  /** 上下缓冲区行数（默认 2 行） */
  bufferRows?: number;
  /** 启用虚拟滚动的条数阈值（默认 15 条） */
  threshold?: number;
}

export function useVirtualGrid<T extends { id?: string | number }>(options: UseVirtualGridOptions<T>) {
  const {
    items,
    containerRef,
    gridColumns,
    minItemWidth,
    estimatedItemHeight,
    gap: customGap,
    bufferRows = 2,
    threshold = 15
  } = options;

  // 容器宽高及滚动状态
  const containerWidth = ref(800);
  const containerHeight = ref(600);
  const scrollTop = ref(0);

  // 是否满足启用虚拟滚动的阈值
  const isVirtualGrid = computed(() => items.value.length > threshold);

  // 响应式判断紧凑屏幕 (<= 640px)
  const isCompact = computed(() => containerWidth.value <= 640);

  // 容器内边距（对应 SCSS 中 padding: 24px 或 16px）
  const paddingX = computed(() => (isCompact.value ? 32 : 48));

  // 有效可用内容宽度
  const availableWidth = computed(() => Math.max(100, containerWidth.value - paddingX.value));

  // 有效网格间隙
  const effectiveGap = computed(() => {
    if (customGap && customGap.value !== undefined) {
      return customGap.value;
    }
    return isCompact.value ? 12 : 20;
  });

  // 动态计算出的实际有效列数
  const effectiveCols = computed(() => {
    if (gridColumns.value !== 'auto') {
      return Math.max(1, Math.min(6, Number(gridColumns.value) || 1));
    }
    const minW = Math.max(100, Math.min(1000, minItemWidth.value || 260));
    const g = effectiveGap.value;
    return Math.max(1, Math.floor((availableWidth.value + g) / (minW + g)));
  });

  // 将扁平便签列表按当前列数划分为二维行结构
  const rows = computed<VirtualGridRow<T>[]>(() => {
    const list = items.value;
    const cols = effectiveCols.value;
    const result: VirtualGridRow<T>[] = [];
    for (let i = 0; i < list.length; i += cols) {
      const rowItems = list.slice(i, i + cols);
      const rowIndex = Math.floor(i / cols);
      const firstId = rowItems[0]?.id ?? i;
      result.push({
        rowIndex,
        items: rowItems,
        key: `row-${rowIndex}-${firstId}`
      });
    }
    return result;
  });

  // 默认单行预估高度（未测量时使用）
  const defaultRowHeight = computed(() => estimatedItemHeight?.value || 200);

  // 实测行高缓存表：rowIndex -> actualHeight
  const measuredHeights = ref(new Map<number, number>());

  // 观察行元素高度变动的 ResizeObserver
  let rowResizeObserver: ResizeObserver | null = null;
  const registeredRowElements = new Map<number, HTMLElement>();

  const initRowResizeObserver = () => {
    if (typeof ResizeObserver === 'undefined') return;
    rowResizeObserver = new ResizeObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        const target = entry.target as HTMLElement;
        const rowIndexAttr = target.getAttribute('data-row-index');
        if (rowIndexAttr !== null) {
          const rowIndex = parseInt(rowIndexAttr, 10);
          const height = Math.round(entry.borderBoxSize?.[0]?.blockSize || target.offsetHeight);
          if (height > 0 && measuredHeights.value.get(rowIndex) !== height) {
            measuredHeights.value.set(rowIndex, height);
            changed = true;
          }
        }
      }
      if (changed) {
        triggerRef(measuredHeights);
      }
    });
  };

  // 注册或注销行 DOM 元素
  const registerRowElement = (rowIndex: number, el: HTMLElement | null) => {
    if (el) {
      el.setAttribute('data-row-index', String(rowIndex));
      registeredRowElements.set(rowIndex, el);
      rowResizeObserver?.observe(el);
      const initialHeight = Math.round(el.offsetHeight);
      if (initialHeight > 0 && measuredHeights.value.get(rowIndex) !== initialHeight) {
        measuredHeights.value.set(rowIndex, initialHeight);
      }
    } else {
      const prevEl = registeredRowElements.get(rowIndex);
      if (prevEl) {
        rowResizeObserver?.unobserve(prevEl);
        registeredRowElements.delete(rowIndex);
      }
    }
  };

  // 当列数改变或数据大范围变动时，重置高度缓存
  watch([effectiveCols, () => items.value.length], () => {
    measuredHeights.value.clear();
    triggerRef(measuredHeights);
  });

  // 计算行级垂直偏移量和总高度（前缀和缓存）
  const rowLayout = computed(() => {
    const rowList = rows.value;
    const count = rowList.length;
    const g = effectiveGap.value;
    const defaultH = defaultRowHeight.value;
    const heights = measuredHeights.value;

    const offsets = new Array<number>(count);
    let currentOffset = 0;

    for (let i = 0; i < count; i++) {
      offsets[i] = currentOffset;
      const h = heights.get(i) ?? defaultH;
      currentOffset += h + g;
    }

    const totalHeight = count > 0 ? currentOffset - g : 0;
    return { offsets, totalHeight };
  });

  // 虚拟总高度，直接作用于外部占位容器，撑开真实滚动条
  const totalVirtualHeight = computed(() => rowLayout.value.totalHeight);

  // 二分查找当前视口内的可见行范围
  const visibleRange = computed(() => {
    const count = rows.value.length;
    if (count === 0) {
      return { startRow: 0, endRow: 0 };
    }

    const { offsets } = rowLayout.value;
    const heights = measuredHeights.value;
    const defaultH = defaultRowHeight.value;
    const g = effectiveGap.value;

    const bufferPx = bufferRows * (defaultH + g);
    const viewTop = Math.max(0, scrollTop.value - bufferPx);
    const viewBottom = scrollTop.value + containerHeight.value + bufferPx;

    // 二分查找 startRow: 第一个满足 offset + height >= viewTop 的行
    let low = 0;
    let high = count - 1;
    let startRow = 0;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const midHeight = heights.get(mid) ?? defaultH;
      const midBottom = offsets[mid] + midHeight;
      if (midBottom >= viewTop) {
        startRow = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    // 二分查找 endRow: 最后一个满足 offset <= viewBottom 的行
    low = startRow;
    high = count - 1;
    let endRow = count - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (offsets[mid] <= viewBottom) {
        endRow = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return {
      startRow: Math.max(0, Math.min(startRow, count - 1)),
      endRow: Math.max(startRow, Math.min(endRow, count - 1))
    };
  });

  // 实际渲染到 DOM 中的行切片
  const visibleRows = computed(() => {
    if (!isVirtualGrid.value) {
      return rows.value;
    }
    const { startRow, endRow } = visibleRange.value;
    return rows.value.slice(startRow, endRow + 1);
  });

  // 虚拟网格可视区绝对偏移量
  const startOffsetY = computed(() => {
    if (!isVirtualGrid.value || rows.value.length === 0) return 0;
    return rowLayout.value.offsets[visibleRange.value.startRow] || 0;
  });

  // 滚动事件节流与同步
  let scrollRafId: number | null = null;
  const handleScroll = () => {
    if (scrollRafId !== null) return;
    scrollRafId = requestAnimationFrame(() => {
      scrollRafId = null;
      if (containerRef.value) {
        scrollTop.value = containerRef.value.scrollTop;
        containerHeight.value = containerRef.value.clientHeight;
      }
    });
  };

  // 容器尺寸观察器
  let containerResizeObserver: ResizeObserver | null = null;

  const updateContainerDimensions = () => {
    if (containerRef.value) {
      containerWidth.value = containerRef.value.clientWidth;
      containerHeight.value = containerRef.value.clientHeight;
      scrollTop.value = containerRef.value.scrollTop;
    }
  };

  if (getCurrentInstance()) {
    onMounted(() => {
      initRowResizeObserver();
      updateContainerDimensions();

      if (containerRef.value) {
        containerRef.value.addEventListener('scroll', handleScroll, { passive: true });
        if (typeof ResizeObserver !== 'undefined') {
          containerResizeObserver = new ResizeObserver(() => {
            updateContainerDimensions();
          });
          containerResizeObserver.observe(containerRef.value);
        }
      }
    });

    onBeforeUnmount(() => {
      if (scrollRafId !== null) {
        cancelAnimationFrame(scrollRafId);
        scrollRafId = null;
      }
      if (containerRef.value) {
        containerRef.value.removeEventListener('scroll', handleScroll);
      }
      containerResizeObserver?.disconnect();
      rowResizeObserver?.disconnect();
      registeredRowElements.clear();
    });
  }

  // 单行网格样式
  const rowGridStyle = computed(() => {
    const cols = effectiveCols.value;
    const g = effectiveGap.value;
    return {
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      gap: `${g}px`,
      marginBottom: `${g}px`
    } as Record<string, string>;
  });

  return {
    isVirtualGrid,
    effectiveCols,
    effectiveGap,
    rows,
    visibleRows,
    totalVirtualHeight,
    startOffsetY,
    handleScroll,
    registerRowElement,
    rowGridStyle,
    updateContainerDimensions
  };
}
