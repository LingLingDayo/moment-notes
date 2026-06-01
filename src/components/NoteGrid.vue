<script lang="ts" setup>
import { useStickyNotesStore } from '../stores/stickyNotes';
import NoteCard from './NoteCard.vue';
import { StickyNote, SearchX, Plus } from 'lucide-vue-next';

const store = useStickyNotesStore();

// 创建新便签
const handleAddNote = () => {
  store.addNote(store.currentCategoryId, '', '', 'yellow');
  store.showToast('已新建空便签，可以直接编辑');
};
</script>

<template>
  <div class="note-grid-container">
    <!-- 空状态 -->
    <div v-if="store.filteredNotes.length === 0" class="empty-state">
      <div class="empty-illustration-wrapper">
        <SearchX v-if="store.searchQuery" class="empty-icon animate-pulse" />
        <StickyNote v-else class="empty-icon floating" />
      </div>
      
      <h3 class="empty-title">
        {{ store.searchQuery ? '没有找到匹配的便签' : '当前分类空空如也' }}
      </h3>
      
      <p class="empty-desc">
        {{ store.searchQuery ? '尝试换个关键词搜索，或者清除搜索条件。' : '在这个分类下还没有记录任何便签。' }}
      </p>

      <button 
        v-if="!store.searchQuery" 
        class="create-first-btn"
        @click="handleAddNote"
      >
        <Plus class="btn-icon" />
        <span>添加第一张便签</span>
      </button>
    </div>

    <!-- 便签网格 -->
    <TransitionGroup v-else name="notes-list" tag="div" class="notes-grid">
      <NoteCard 
        v-for="note in store.filteredNotes" 
        :key="note.id"
        :note="note"
      />
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

  &.floating {
    animation: float 4s ease-in-out infinite;
  }
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
  border: 1px solid rgba(99, 102, 241, 0.2);

  &:hover {
    background: var(--accent-color);
    color: #ffffff;
    border-color: transparent;
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }

  .btn-icon {
    width: 15px;
    height: 15px;
  }
}

@keyframes float {
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
  100% {
    transform: translateY(0px);
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
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
</style>
