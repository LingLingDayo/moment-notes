<script lang="ts" setup>
import { ref, watch, nextTick } from 'vue';
import { Note } from '@type';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { useShortcutStore } from '@stores/shortcutStore';
import { isUTools } from '@utils/storage';
import { useNoteTagMeasure } from '@utils/useNoteTagMeasure';

const props = defineProps<{
  note: Note;
  isEditing: boolean;
}>();

const content = defineModel<string>('content', { default: '' });

const emit = defineEmits<{
  (e: 'cancel-edit'): void;
  (e: 'save-edit'): void;
}>();

const store = useStickyNotesStore();
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
  }
};

// 复制标签逻辑
const copyTag = async (tag: string) => {
  try {
    if (isUTools()) {
      window.utools.copyText(tag);
    } else {
      await navigator.clipboard.writeText(tag);
    }
    store.showToast(`已复制标签: ${tag}`, 'success');
  } catch (err) {
    console.error('Failed to copy tag:', err);
    store.showToast('复制失败', 'error');
  }
};

const contentInputRef = ref<HTMLTextAreaElement | null>(null);

// 自适应调整输入框高度
const adjustTextareaHeight = () => {
  const el = contentInputRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
};

// 提取的标签溢出测量 Hook
const {
  measureContainerRef,
  measureEllipsisRef,
  visibleTags,
  hasMore,
  allTagsText,
  calculateVisibleTags
} = useNoteTagMeasure(props.note);

// 监听编辑状态
watch(
  () => props.isEditing,
  async newVal => {
    if (newVal) {
      await nextTick();
      contentInputRef.value?.focus();
      adjustTextareaHeight();
    } else {
      // 退出编辑时强制重新计算一次
      calculateVisibleTags(true);
    }
  }
);
</script>

<template>
  <div class="card-body" :class="{ 'is-view-mode': !isEditing }">
    <textarea
      v-if="isEditing"
      ref="contentInputRef"
      v-model="content"
      placeholder="写点什么..."
      class="content-textarea"
      @keydown="handleKeyDown"
      @input="adjustTextareaHeight"
    ></textarea>
    <template v-else>
      <div class="card-body-content">
        <pre class="card-content">{{
          note.content || (note.isDeleted ? '无内容' : '双击粘贴，点击右上角编辑...')
        }}</pre>
      </div>
      <!-- 便签标签展示 -->
      <div v-if="note.tags && note.tags.length > 0" class="note-tags-list">
        <span
          v-for="tag in visibleTags"
          :key="tag"
          class="note-tag-badge"
          :data-tooltip="tag"
          @click.stop="copyTag(tag)"
        >
          {{ store.prefixTagWithHash ? '# ' : '' }}{{ tag }}
        </span>
        <span v-if="hasMore" class="note-tag-badge more" :data-tooltip="allTagsText"> ... </span>
      </div>
      <!-- 隐藏的便签标签测量区域 -->
      <div
        v-if="note.tags && note.tags.length > 0"
        ref="measureContainerRef"
        class="note-tags-list-measure"
      >
        <span v-for="tag in note.tags" :key="'measure-' + tag" class="note-tag-badge">
          {{ store.prefixTagWithHash ? '# ' : '' }}{{ tag }}
        </span>
        <span ref="measureEllipsisRef" class="note-tag-badge more">...</span>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.card-body {
  flex: 1;
  min-height: 32px;
  padding-top: 4px;
  padding-bottom: 8px;
  overflow-y: auto;
  overflow-y: overlay;
  position: relative;
  display: flex;
  flex-direction: column;

  &.is-view-mode {
    overflow: hidden;
  }
}

.card-body-content {
  flex: 1;
  overflow-y: auto;
  overflow-y: overlay;
  background: transparent !important;
  background-color: transparent !important;

  &::-webkit-scrollbar {
    width: 6px;
    background: transparent !important;
  }

  &::-webkit-scrollbar-track,
  &::-webkit-scrollbar-track-piece,
  &::-webkit-scrollbar-corner {
    background: transparent !important;
    background-color: transparent !important;
    box-shadow: none !important;
    border: none !important;
  }

  &:hover::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.12);
  }

  .dark-theme &:hover::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
  }

  @media (prefers-color-scheme: dark) {
    &:hover::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
    }
    .light-theme &:hover::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.12);
    }
  }

  // 1. 默认显示极其清淡淡雅的半透明颜色，既保持视觉纯净，又避开了 Chromium 隐藏滚动条不响应 hover 重绘的缺陷
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.04);
    border-radius: 4px;

    &:hover {
      background: rgba(0, 0, 0, 0.15) !important;
    }
  }

  // --- 暗色主题适配 (类切换) ---
  .dark-theme &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.04);

    &:hover {
      background: rgba(255, 255, 255, 0.18) !important;
    }
  }

  // --- 针对系统自带暗色模式偏好的处理 ---
  @media (prefers-color-scheme: dark) {
    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.04);

      &:hover {
        background: rgba(255, 255, 255, 0.18) !important;
      }
    }

    // 系统是暗色，但手动切换为了亮色主题
    .light-theme &::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.04);

      &:hover {
        background: rgba(0, 0, 0, 0.15) !important;
      }
    }
  }
}

.card-content {
  font-family: var(--font-sans);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  overflow-wrap: break-word;
}

.content-textarea {
  width: 100%;
  height: 100%;
  min-height: 100%;
  overflow-y: auto;
  overflow-y: overlay;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.6;
  color: inherit;
  resize: vertical;

  &:focus {
    background: var(--input-bg);
    border-color: var(--accent-color);
  }
}

.note-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
  flex-shrink: 0;
  max-height: 48px;
  overflow: hidden;
}

.note-tags-list-measure {
  position: absolute;
  visibility: hidden;
  pointer-events: none;
  left: 0;
  right: 0;
  top: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  z-index: -9999;
  opacity: 0;
}

.note-tag-badge {
  font-size: 10px;
  line-height: 20px;
  padding: 0 8px;
  border-radius: 99px;
  font-weight: 500;
  background: var(--badge-bg);
  border: 1px solid var(--popover-border);
  color: inherit;
  opacity: 0.85;
  cursor: pointer;
  transition: background-color 0.15s, opacity 0.15s;

  max-width: 100%;
  display: -webkit-inline-box;
  -webkit-box-orient: vertical;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-all;
  white-space: normal;

  &:hover {
    opacity: 1;
    background: var(--card-btn-hover-bg);
    color: var(--card-btn-hover-color);
  }

  &.more {
    cursor: help;
    &:hover {
      background: var(--badge-bg);
      color: inherit;
      opacity: 0.85;
    }
  }
}
</style>
