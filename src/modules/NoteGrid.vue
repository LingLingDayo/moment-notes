<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import NoteCard from './NoteCard/NoteCard.vue';
import { StickyNote, SearchX, Plus } from 'lucide-vue-next';

const store = useStickyNotesStore();

const containerRef = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;

// 根据容器的净宽度（contentRect.width）来计算允许的最大列数
const updateMaxColumns = (width: number) => {
  let maxCols: 1 | 2 | 3 | 4 = 1;
  if (width >= 760) {
    maxCols = 4;
  } else if (width >= 540) {
    maxCols = 3;
  } else if (width >= 320) {
    maxCols = 2;
  } else {
    maxCols = 1;
  }
  store.setMaxColumns(maxCols);
};

onMounted(() => {
  if (containerRef.value) {
    // 初始计算一次
    updateMaxColumns(containerRef.value.clientWidth);

    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          updateMaxColumns(entry.contentRect.width);
        }
      });
      resizeObserver.observe(containerRef.value);
    }
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});

// 计算出应该应用的列数限制
const actualColumns = computed(() => {
  if (store.gridColumns === 'auto') {
    return 'auto';
  }
  return Math.min(store.gridColumns, store.maxColumns);
});

// 动态网格样式
const gridStyle = computed(() => {
  if (actualColumns.value === 'auto') {
    const minWidth = Math.max(100, Math.min(1000, store.minNoteWidth || 240));
    return {
      gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${minWidth}px), 1fr))`
    };
  }
  return {
    gridTemplateColumns: `repeat(${actualColumns.value}, 1fr)`
  };
});

// 创建新便签
const handleAddNote = () => {
  store.addNote(store.currentCategoryId, '', '', 'yellow');
  store.showToast('已新建空便签，可以直接编辑');
};
</script>

<template>
  <div ref="containerRef" class="note-grid-container">
    <!-- 空状态 -->
    <div v-if="store.filteredNotes.length === 0" class="empty-state">
      <div class="empty-illustration-wrapper">
        <SearchX v-if="store.searchQuery" class="empty-icon animate-pulse" />
        <StickyNote v-else class="empty-icon" />
      </div>

      <h3 class="empty-title">
        {{ store.searchQuery ? '没有找到匹配的便签' : '当前分类空空如也' }}
      </h3>

      <p class="empty-desc">
        {{
          store.searchQuery
            ? '尝试换个关键词搜索，或者清除搜索条件。'
            : '在这个分类下还没有记录任何便签。'
        }}
      </p>

      <button v-if="!store.searchQuery && store.currentCategoryId !== 'trash'" class="create-first-btn" @click="handleAddNote">
        <Plus class="btn-icon" />
        <span>添加第一张便签</span>
      </button>
    </div>

    <!-- 便签网格 -->
    <TransitionGroup v-else name="notes-list" tag="div" class="notes-grid" :style="gridStyle">
      <NoteCard v-for="note in store.filteredNotes" :key="note.id" :note="note" />
    </TransitionGroup>
  </div>
</template>

<style lang="scss" scoped>
.note-grid-container {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  height: calc(100% - 71px); // 减去头部工具栏的高度
}

.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
  align-content: start;
}

.empty-state {
  height: 80%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
}

.empty-illustration-wrapper {
  margin-bottom: 20px;
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: var(--text-muted);
  opacity: 0.35;
}

.empty-title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 24px;
  max-width: 320px;
  line-height: 1.5;
}

.create-first-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 12px;
  background: var(--accent-light);
  color: var(--accent-color);
  font-size: 13px;
  font-weight: 600;
  border: 1px solid var(--accent-border-dashed);

  &:hover {
    background: var(--accent-color);
    color: var(--text-on-accent);
    border-color: transparent;
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }

  .btn-icon {
    width: 15px;
    height: 15px;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 0.15;
  }
}

/* 便签列表 FLIP 过渡动画效果 */
.notes-list-move {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.notes-list-enter-active,
.notes-list-leave-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.notes-list-enter-from,
.notes-list-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(15px);
}

.notes-list-leave-active {
  position: absolute;
  pointer-events: none;
  // 保持卡片大致宽度，防止 absolute 时宽度坍缩
  width: 250px;
}

@media (max-width: 1049px) {
  .note-grid-container {
    padding: 16px;
    height: calc(100% - 59px); // 减去更窄的头部工具栏高度 (12px * 2 + 34px + 1px)
  }

  .notes-grid {
    gap: 12px;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}
</style>
