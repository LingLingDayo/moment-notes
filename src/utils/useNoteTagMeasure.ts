import { ref, nextTick, onMounted, onBeforeUnmount, watch, isRef, Ref } from 'vue';
import { Note } from '@type';
import { useStickyNotesStore } from '@stores/stickyNotes';

export function useNoteTagMeasure(noteOrGetter: Note | Ref<Note> | (() => Note)) {
  const store = useStickyNotesStore();

  const getNote = (): Note | undefined => {
    if (isRef(noteOrGetter)) {
      return noteOrGetter.value;
    }
    if (typeof noteOrGetter === 'function') {
      return noteOrGetter();
    }
    return noteOrGetter;
  };

  const measureContainerRef = ref<HTMLDivElement | null>(null);
  const measureEllipsisRef = ref<HTMLSpanElement | null>(null);

  // 初始化时兜底使用已有的 note.tags 全量数据，避免测量尚未完成或容器宽度为 0 导致标签呈现空白
  const initialTags = getNote()?.tags;
  const visibleTags = ref<string[]>(Array.isArray(initialTags) ? [...initialTags] : []);
  const hasMore = ref(false);
  const allTagsText = ref('');
  let resizeObserver: ResizeObserver | null = null;
  let lastWidth = 0; // 缓存宽度以防止无意义的重新计算和 DOM 更新

  // 计算可见标签的核心逻辑
  const calculateVisibleTags = (force = false) => {
    const currentNote = getNote();
    const tags = currentNote?.tags;
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
      if (!container) {
        // DOM 容器尚未挂载时保持与 tags 同步兜底展示
        visibleTags.value = [...tags];
        return;
      }

      const currentWidth = container.clientWidth;
      // 如果宽度为 0（例如处于动画进入阶段或隐藏状态），先保留 tags 兜底展示，等待尺寸恢复时 ResizeObserver 再触发精确截断
      if (currentWidth === 0) {
        const isTagsEqual =
          visibleTags.value.length === tags.length &&
          visibleTags.value.every((val, index) => val === tags[index]);
        if (!isTagsEqual) {
          visibleTags.value = [...tags];
        }
        return;
      }

      // 如果非强制且宽度未变且已有计算出的可见标签，则跳过布局计算以避免 Layout Thrashing
      if (!force && currentWidth === lastWidth && visibleTags.value.length > 0) {
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
          // 兜底：即使单项极宽导致无法容纳省略号，也至少展示首个标签，避免标签区完全空白
          nextVisibleTags = tags.length > 0 ? [tags[0]] : [];
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
    () => getNote()?.tags,
    newTags => {
      if (!newTags || newTags.length === 0) {
        visibleTags.value = [];
        hasMore.value = false;
        allTagsText.value = '';
      } else {
        const isTagsEqual =
          visibleTags.value.length === newTags.length &&
          visibleTags.value.every((val, index) => val === newTags[index]);
        if (!isTagsEqual) {
          visibleTags.value = [...newTags];
        }
      }
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

  // 监听 measureContainerRef 挂载/卸载变化（如编辑模式切换时 DOM 重建），重新绑定 ResizeObserver
  watch(measureContainerRef, (newContainer, oldContainer) => {
    if (resizeObserver) {
      if (oldContainer) {
        resizeObserver.unobserve(oldContainer);
      }
      if (newContainer) {
        resizeObserver.observe(newContainer);
        calculateVisibleTags(true);
      }
    }
  });

  onMounted(() => {
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const currentWidth = entry.contentRect.width;
          if (currentWidth === 0 || (currentWidth === lastWidth && visibleTags.value.length > 0)) {
            continue;
          }
          calculateVisibleTags();
        }
      });
      const container = measureContainerRef.value;
      if (container) {
        resizeObserver.observe(container);
      }
    }
    calculateVisibleTags(true);
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

