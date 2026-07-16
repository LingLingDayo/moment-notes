<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import NoteCard from './NoteCard/NoteCard.vue';
import { StickyNote, SearchX, Plus } from '@lucide/vue';
import { useDragAutoScroll } from '@utils/useDragAutoScroll';

const store = useStickyNotesStore();

const containerRef = ref<HTMLElement | null>(null);

const { handleDragOver: handleDragScroll, stopScroll: stopDragScroll } = useDragAutoScroll(containerRef);

watch(() => store.draggedNoteId, (newId) => {
  if (!newId) {
    stopDragScroll();
  }
});

// 计算出应该应用的列数
const actualColumns = computed(() => {
  if (store.gridColumns === 'auto') {
    return 'auto';
  }
  // 固定列数：严格按用户设置，不因容器宽度 / 最小宽度再裁剪
  return store.gridColumns;
});

// 动态网格样式
const gridStyle = computed(() => {
  if (actualColumns.value === 'auto') {
    const minWidth = Math.max(100, Math.min(1000, store.minNoteWidth || 240));
    return {
      gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${minWidth}px), 1fr))`,
      // 自适应列数未知，离场动画宽度回退为近似值
      '--leave-card-width': `${minWidth}px`
    } as Record<string, string>;
  }
  // 固定列数：在容器宽度内等分（minmax(0, 1fr) 允许压缩，忽略内容 min-content / 最小宽度）
  const cols = actualColumns.value;
  return {
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    // 离场 absolute 时按列数均分，保持与网格轨道一致
    '--leave-card-width': `calc((100% - (var(--grid-gap, 20px) * ${cols - 1})) / ${cols})`
  } as Record<string, string>;
});

// 创建新便签
const handleAddNote = () => {
  store.addNote(store.currentCategoryId, '', '');
  store.showToast('已新建空便签，可以直接编辑');
};
</script>

<template>
  <div
    ref="containerRef"
    class="note-grid-container"
    @dragover="handleDragScroll"
  >
    <!-- 空状态 -->
    <div v-if="store.filteredNotes.length === 0 && !store.isLoadingNotes" class="empty-state">
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

      <button v-if="!store.searchQuery && store.currentCategoryId !== 'trash' && store.currentCategoryId !== 'recent'" class="create-first-btn" @click="handleAddNote">
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
  --grid-gap: 20px;
  align-content: start;
  width: 100%;
  box-sizing: border-box;
  position: relative;

  // 允许网格项收缩，避免内容 min-content 把个别列撑宽
  > * {
    min-width: 0;
    max-width: 100%;
  }
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
  transition:
    opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.notes-list-enter-from,
.notes-list-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(15px);
}

.notes-list-leave-active {
  position: absolute;
  pointer-events: none;
  // 与当前网格轨道同宽，防止 absolute 时宽度坍缩或撑破等列布局
  width: var(--leave-card-width, 250px);
  max-width: 100%;
  box-sizing: border-box;
}

@media (max-width: 1049px) {
  .note-grid-container {
    padding: 16px;
    height: calc(100% - 59px); // 减去更窄的头部工具栏高度 (12px * 2 + 34px + 1px)
  }

  .notes-grid {
    gap: 12px;
    --grid-gap: 12px;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}
</style>
