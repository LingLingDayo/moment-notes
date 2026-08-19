<script lang="ts" setup>
import { computed } from 'vue';
import { Pin, Edit2, Maximize2, Minimize2, Share2 } from '@lucide/vue';
import { Note } from '@type';
import { useShortcutStore } from '@stores/shortcutStore';
import { COLOR_PRESETS, useStickyNotesStore } from '@stores/stickyNotes';
import {
  isDetachedNoteWindow,
  openDetachedNoteWindow
} from '../../infrastructure/windows/detachedNoteWindow';

const props = defineProps<{
  note: Note;
  isEditing: boolean;
  isFullScreen?: boolean;
}>();

const title = defineModel<string>('title', { default: '' });

const emit = defineEmits<{
  (e: 'toggle-pin'): void;
  (e: 'enter-edit'): void;
  (e: 'save-edit'): void;
  (e: 'cancel-edit'): void;
  (e: 'toggle-preview'): void;
}>();

const shortcutStore = useShortcutStore();
const store = useStickyNotesStore();

const isPreviewActive = computed(() => store.previewNoteId === props.note.id);
const isFullScreenMode = computed(() => !!props.isFullScreen);
const isDetachedWindow = isDetachedNoteWindow();

const handleOpenDetachedNote = () => {
  const preset = COLOR_PRESETS[props.note.color] || COLOR_PRESETS.yellow;
  const result = openDetachedNoteWindow({
    id: props.note.id,
    title: props.note.title,
    backgroundColor: store.isDark ? preset.darkBg : preset.lightBg
  });

  if (result === 'failed') {
    store.showToast('独立便签窗口打开失败', 'error');
  }
};

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
  <!-- 卡片左上角操作按钮组 -->
  <div
    v-if="!note.isDeleted && !isDetachedWindow"
    class="header-left-actions"
    :class="{ 'is-full-screen': isFullScreenMode }"
  >
    <!-- 置顶针和大头针效果 -->
    <button
      class="pin-btn"
      :class="{ active: note.isPinned }"
      :data-tooltip="note.isPinned ? '取消置顶' : '置顶便签'"
      @click.stop="emit('toggle-pin')"
    >
      <Pin class="pin-icon" />
    </button>

    <button
      v-if="!isFullScreenMode"
      class="detach-btn"
      aria-label="在独立窗口打开"
      data-tooltip="在独立窗口打开"
      @click.stop="handleOpenDetachedNote"
    >
      <Share2 class="detach-icon" />
    </button>

    <!-- 全屏显示/收起按钮 -->
    <button
      class="preview-btn"
      :class="{ active: isPreviewActive }"
      :data-tooltip="isPreviewActive ? '收起全屏' : '全屏显示便签'"
      @click.stop="emit('toggle-preview')"
    >
      <Minimize2 v-if="isPreviewActive" class="preview-icon" />
      <Maximize2 v-else class="preview-icon" />
    </button>
  </div>

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
    <h3
      v-else-if="note.title"
      class="card-title"
      :data-tooltip="note.title"
      data-tooltip-only-overflow
    >
      {{ note.title }}
    </h3>
  </div>
</template>

<style lang="scss" scoped>
.header-left-actions {
  position: absolute;
  top: -8px;
  left: 20px;
  display: flex;
  align-items: center;
  gap: 9px;
  z-index: 2;
  transition: left 0.2s ease, gap 0.2s ease;

  &.is-full-screen {
    left: 24px;
    gap: 12px;

    .pin-btn,
    .detach-btn,
    .preview-btn {
      padding: 7px;

      .pin-icon,
      .detach-icon,
      .preview-icon {
        width: 15px;
        height: 15px;
      }
    }
  }

  .pin-btn,
  .detach-btn,
  .preview-btn {
    padding: 6px;
    border-radius: 50%;
    background: var(--card-border);
    color: var(--card-text);
    box-shadow: var(--shadow-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.2s, color 0.2s;

    .dark-theme & {
      background: var(--card-border-dark);
      color: var(--card-text-dark);
    }

    .pin-icon,
    .detach-icon,
    .preview-icon {
      width: 13px;
      height: 13px;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
  }

  .pin-btn {
    &:hover {
      transform: scale(1.1) rotate(15deg);
      background: var(--card-btn-hover-bg);
      color: var(--card-btn-hover-color);
    }
  }

  .preview-btn {
    &:hover {
      transform: scale(1.1);
      background: var(--card-btn-hover-bg);
      color: var(--card-btn-hover-color);
    }
  }

  .detach-btn {
    &:hover {
      transform: scale(1.1) rotate(-8deg);
      background: var(--card-btn-hover-bg);
      color: var(--card-btn-hover-color);
    }
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

@media (max-width: $screen-compact) {
  .absolute-edit-btn {
    top: 10px;
    right: 12px;
  }
}
</style>
