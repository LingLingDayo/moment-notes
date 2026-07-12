import { ref, nextTick, onMounted, onBeforeUnmount, watch } from 'vue';
import { Note } from '@type';
import { useStickyNotesStore } from '@stores/stickyNotes';

export function useNoteTagMeasure(note: Note) {
  const store = useStickyNotesStore();

  const measureContainerRef = ref<HTMLDivElement | null>(null);
  const measureEllipsisRef = ref<HTMLSpanElement | null>(null);
  const visibleTags = ref<string[]>([]);
  const hasMore = ref(false);
  const allTagsText = ref('');
  let resizeObserver: ResizeObserver | null = null;
  let lastWidth = 0; // 缓存宽度以防止无意义的重新计算和 DOM 更新

  // 计算可见标签的核心逻辑
  const calculateVisibleTags = (force = false) => {
    const tags = note.tags;
    if (!tags || tags.length === 0) {
      if (visibleTags.value.length > 0) visibleTags.value = [];
      if (hasMore.value !== false) hasMore.value = false;
      if (allTagsText.value !== '') allTagsText.value = '';
      lastWidth = 0;
      return;
    }

    const newAllTagsText = tags.map(t => store.prefixTagWithHash ? `#${t}` : t).join(' ');
    if (allTagsText.value !== newAllTagsText) {
      allTagsText.value = newAllTagsText;
    }

    nextTick(() => {
      const container = measureContainerRef.value;
      if (!container) return;

      const currentWidth = container.clientWidth;
      // 如果宽度为 0 或者是没有变化且非强制重新计算，则跳过布局计算以避免 Layout Thrashing
      if (currentWidth === 0 || (!force && currentWidth === lastWidth)) {
        return;
      }
      lastWidth = currentWidth;

      const children = container.children;
      if (children.length < 2) {
        if (visibleTags.value.length !== tags.length || !visibleTags.value.every((val, index) => val === tags[index])) {
          visibleTags.value = [...tags];
        }
        if (hasMore.value !== false) {
          hasMore.value = false;
        }
        return;
      }

      const ellipsisEl = measureEllipsisRef.value;
      const ellipsisWidth = ellipsisEl ? ellipsisEl.offsetWidth : 30;
      const gap = 6;

      const lineTops: number[] = [];
      const elementsInfo: {
        index: number;
        offsetLeft: number;
        offsetWidth: number;
        offsetTop: number;
      }[] = [];
      const tagsCount = tags.length;

      for (let i = 0; i < tagsCount; i++) {
        const el = children[i] as HTMLElement;
        if (!el) continue;
        const offsetTop = el.offsetTop;
        const offsetLeft = el.offsetLeft;
        const offsetWidth = el.offsetWidth;

        let lineIndex = lineTops.findIndex(top => Math.abs(top - offsetTop) < 5);
        if (lineIndex === -1) {
          lineTops.push(offsetTop);
          lineTops.sort((a, b) => a - b);
          lineIndex = lineTops.indexOf(offsetTop);
        }

        elementsInfo.push({
          index: i,
          offsetLeft,
          offsetWidth,
          offsetTop
        });
      }

      const containerWidth = container.clientWidth;
      const rows: (typeof elementsInfo)[] = lineTops.map(() => []);
      elementsInfo.forEach(info => {
        const lineIndex = lineTops.findIndex(top => Math.abs(top - info.offsetTop) < 5);
        if (lineIndex !== -1) {
          rows[lineIndex].push(info);
        }
      });

      const totalLines = rows.length;
      let nextVisibleTags: string[] = [];
      let nextHasMore = false;

      if (totalLines <= 2) {
        nextVisibleTags = [...tags];
        nextHasMore = false;
      } else {
        nextHasMore = true;
        let cutoffIndex = -1;
        const secondRow = rows[1];

        if (secondRow && secondRow.length > 0) {
          for (let i = secondRow.length - 1; i >= 0; i--) {
            const item = secondRow[i];
            const remainingSpace = containerWidth - (item.offsetLeft + item.offsetWidth);
            if (remainingSpace >= gap + ellipsisWidth) {
              cutoffIndex = item.index;
              break;
            }
          }
        }

        if (cutoffIndex === -1) {
          const firstRow = rows[0];
          if (firstRow && firstRow.length > 0) {
            for (let i = firstRow.length - 1; i >= 0; i--) {
              const item = firstRow[i];
              const remainingSpace = containerWidth - (item.offsetLeft + item.offsetWidth);
              if (remainingSpace >= gap + ellipsisWidth) {
                cutoffIndex = item.index;
                break;
              }
            }
          }
        }

        if (cutoffIndex === -1) {
          nextVisibleTags = [];
        } else {
          nextVisibleTags = tags.slice(0, cutoffIndex + 1);
        }
      }

      // 只有当计算结果和当前不同时才给响应式 Ref 赋新值，避免触发无意义的 DOM diff-patch
      const isTagsEqual =
        visibleTags.value.length === nextVisibleTags.length &&
        visibleTags.value.every((val, index) => val === nextVisibleTags[index]);

      if (!isTagsEqual) {
        visibleTags.value = nextVisibleTags;
      }
      if (hasMore.value !== nextHasMore) {
        hasMore.value = nextHasMore;
      }
    });
  };

  // 监听标签及偏好设置的变化
  watch(
    () => note.tags,
    () => {
      calculateVisibleTags(true);
    },
    { deep: true, immediate: true }
  );

  watch(
    () => store.prefixTagWithHash,
    () => {
      calculateVisibleTags(true);
    }
  );

  onMounted(() => {
    calculateVisibleTags();
    const container = measureContainerRef.value;
    if (container && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          // 直接在 ResizeObserver 回调中检测宽度是否发生实质变化，若无变化则直接过滤
          const currentWidth = entry.contentRect.width;
          if (currentWidth === 0 || currentWidth === lastWidth) {
            continue;
          }
          calculateVisibleTags();
        }
      });
      resizeObserver.observe(container);
    }
  });

  onBeforeUnmount(() => {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
  });

  return {
    measureContainerRef,
    measureEllipsisRef,
    visibleTags,
    hasMore,
    allTagsText,
    calculateVisibleTags
  };
}
