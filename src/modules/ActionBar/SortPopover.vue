<script lang="ts" setup>
import { useStickyNotesStore } from '@stores/stickyNotes';
import { ArrowUpDown } from 'lucide-vue-next';

const store = useStickyNotesStore();

defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle'): void;
  (e: 'close'): void;
}>();

// 切换排序方式
const changeSortMode = (mode: 'date' | 'title' | 'tag' | 'custom') => {
  store.setSortMode(mode);
  emit('close');

  let modeName = '';
  if (mode === 'date') {
    modeName = store.sortOrder === 'desc' ? '日期 (从新到旧)' : '日期 (从旧到新)';
  } else if (mode === 'title') {
    modeName = store.sortOrder === 'asc' ? '标题首字母 (A-Z)' : '标题首字母 (Z-A)';
  } else if (mode === 'tag') {
    modeName = store.sortOrder === 'asc' ? '标签首字母 (A-Z)' : '标签首字母 (Z-A)';
  } else {
    modeName = '自定义 (拖拽)';
  }
  store.showToast(`已切换排序方式为：${modeName}`, 'success');
};
</script>

<template>
  <div class="action-popover-wrapper" @click.stop>
    <button
      class="icon-btn"
      :class="{ active: isOpen }"
      data-tooltip="排序方式"
      @click="emit('toggle')"
    >
      <ArrowUpDown class="btn-icon" />
    </button>

    <div v-if="isOpen" class="sort-popover">
      <div class="popover-title">
        排序方式
      </div>
      <div class="sort-list">
        <button
          class="sort-item"
          :class="{ active: store.sortMode === 'date' }"
          @click="changeSortMode('date')"
        >
          <span class="sort-item-icon">📅</span>
          <span>按日期排序</span>
          <span v-if="store.sortMode === 'date'" class="sort-direction">
            {{ store.sortOrder === 'desc' ? '↓' : '↑' }}
          </span>
        </button>
        <button
          class="sort-item"
          :class="{ active: store.sortMode === 'title' }"
          @click="changeSortMode('title')"
        >
          <span class="sort-item-icon">🔤</span>
          <span>按标题首字母</span>
          <span v-if="store.sortMode === 'title'" class="sort-direction">
            {{ store.sortOrder === 'asc' ? '↓' : '↑' }}
          </span>
        </button>
        <button
          class="sort-item"
          :class="{ active: store.sortMode === 'tag' }"
          @click="changeSortMode('tag')"
        >
          <span class="sort-item-icon">🏷️</span>
          <span>按标签排序</span>
          <span v-if="store.sortMode === 'tag'" class="sort-direction">
            {{ store.sortOrder === 'asc' ? '↓' : '↑' }}
          </span>
        </button>
        <button
          class="sort-item"
          :class="{ active: store.sortMode === 'custom' }"
          @click="changeSortMode('custom')"
        >
          <span class="sort-item-icon">✍️</span>
          <span>自定义排序 (拖拽)</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.action-popover-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: var(--btn-bg);
  border: 1px solid var(--btn-border);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  background-clip: padding-box;

  &:hover:not(:disabled) {
    background: var(--btn-hover-bg);
    color: var(--btn-hover-color);
    border-color: var(--btn-hover-border);
  }

  .btn-icon {
    width: 16px;
    height: 16px;
  }

  &.active {
    color: var(--accent-color);
    border-color: rgba(99, 102, 241, 0.25);
    background: var(--accent-light);
  }
}

.sort-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--popover-bg);
  border: 1px solid var(--popover-border);
  padding: 8px;
  border-radius: 12px;
  box-shadow: var(--popover-shadow);
  z-index: 100;
  min-width: 150px;
  animation: popoverFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  .popover-title {
    font-size: 10px;
    font-weight: 700;
    color: var(--text-muted);
    margin-bottom: 6px;
    padding: 0 4px;
  }
}

.sort-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sort-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 11px;
  color: var(--text-secondary);
  cursor: pointer;
  background: transparent;
  border: none;

  &:hover {
    background: var(--item-hover-bg);
    color: var(--text-primary);
  }

  &.active {
    background: var(--accent-light);
    color: var(--accent-color);
    font-weight: 600;
  }

  .sort-item-icon {
    font-size: 12px;
  }

  .sort-direction {
    margin-left: auto;
    font-size: 11px;
    font-weight: bold;
    opacity: 0.85;
  }
}

@keyframes popoverFadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 1049px) {
  .icon-btn {
    width: 34px;
    height: 34px;
    border-radius: 10px;
  }
}
</style>
