<script lang="ts" setup>
import { Pin, Edit2 } from 'lucide-vue-next';
import { Note } from '@type';
import { useShortcutStore } from '@stores/shortcutStore';

defineProps<{
  note: Note;
  isEditing: boolean;
}>();

const title = defineModel<string>('title', { default: '' });

const emit = defineEmits<{
  (e: 'toggle-pin'): void;
  (e: 'enter-edit'): void;
  (e: 'save-edit'): void;
  (e: 'cancel-edit'): void;
}>();

const shortcutStore = useShortcutStore();

const handleKeyDown = (e: KeyboardEvent) => {
  const keyString = shortcutStore.getEventKeyString(e);
  if (!keyString) return;

  const matched = shortcutStore.shortcuts.find(s => s.currentKey === keyString);
  if (matched) {
    if (matched.id === 'saveEdit') {
      e.preventDefault();
      e.stopPropagation();
      emit('save-edit');
    } else if (matched.id === 'cancelEdit') {
      e.preventDefault();
      e.stopPropagation();
      emit('cancel-edit');
    }
  } else if (e.key === 'Enter') {
    // 兼容默认回车保存单行标题
    e.preventDefault();
    e.stopPropagation();
    emit('save-edit');
  }
};
</script>

<template>
  <!-- 置顶针和大头针效果 -->
  <button
    v-if="!note.isDeleted"
    class="pin-btn"
    :class="{ active: note.isPinned }"
    :data-tooltip="note.isPinned ? '取消置顶' : '置顶便签'"
    @click.stop="emit('toggle-pin')"
  >
    <Pin class="pin-icon" />
  </button>

  <!-- 只读时，编辑按钮作为绝对定位元素在右上角展示 -->
  <button
    v-if="!isEditing && !note.isDeleted"
    class="edit-trigger-btn absolute-edit-btn"
    data-tooltip="编辑便签"
    @click.stop="emit('enter-edit')"
  >
    <Edit2 class="edit-icon" />
  </button>

  <!-- 卡片头部 (标题 / 编辑态) -->
  <div v-if="isEditing || note.title" class="card-header">
    <input
      v-if="isEditing"
      v-model="title"
      type="text"
      placeholder="标题 (可选)..."
      class="title-input"
      @keydown="handleKeyDown"
    />
    <h3 v-else-if="note.title" class="card-title">
      {{ note.title }}
    </h3>
  </div>
</template>

<style lang="scss" scoped>
.pin-btn {
  position: absolute;
  top: -8px;
  left: 20px;
  padding: 6px;
  border-radius: 50%;
  background: var(--card-border);
  color: var(--card-text);
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;

  .dark-theme & {
    background: var(--card-border-dark);
    color: var(--card-text-dark);
  }

  &:hover {
    transform: scale(1.1) rotate(15deg);
    background: var(--card-btn-hover-bg);
    color: var(--card-btn-hover-color);
  }

  .pin-icon {
    width: 13px;
    height: 13px;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
  min-height: 24px;
}

.card-title {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  padding-right: 24px;
}

.title-input {
  flex: 1;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 13px;
  font-weight: 600;
  color: inherit;
  width: 100%;

  &:focus {
    background: var(--input-bg);
    border-color: var(--accent-color);
  }
}

.edit-trigger-btn {
  opacity: 0;
  padding: 6px;
  border-radius: 6px;
  color: inherit;
  margin-left: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card-bg);
  transition:
    opacity 0.2s,
    background 0.2s;

  .dark-theme & {
    background: var(--card-bg-dark);
  }

  &:hover {
    background: var(--card-btn-hover-bg);
    color: var(--card-btn-hover-color);
  }

  .edit-icon {
    width: 13px;
    height: 13px;
  }
}

.absolute-edit-btn {
  position: absolute;
  top: 12px;
  right: 16px;
  margin-left: 0;
  z-index: 2;
}

@media (max-width: 1049px) {
  .absolute-edit-btn {
    top: 10px;
    right: 12px;
  }
}
</style>
