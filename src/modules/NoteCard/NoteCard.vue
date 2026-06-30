<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { Note } from '@type';
import { useStickyNotesStore, COLOR_PRESETS } from '@stores/stickyNotes';
import NoteCardHeader from './NoteCardHeader.vue';
import NoteCardBody from './NoteCardBody.vue';
import NoteCardTagEditor from './NoteCardTagEditor.vue';
import NoteCardFooter from './NoteCardFooter.vue';

const props = defineProps<{
  note: Note;
}>();

const store = useStickyNotesStore();

// 是否处于编辑模式
const isEditing = ref(false);
const editTitle = ref(props.note.title || '');
const editContent = ref(props.note.content);
const editTags = ref<string[]>([]);

// 子组件 Ref 引用
const tagEditorRef = ref<InstanceType<typeof NoteCardTagEditor> | null>(null);
const footerRef = ref<InstanceType<typeof NoteCardFooter> | null>(null);

// 获取当前便签颜色的样式配置
const colorStyle = computed(() => {
  const preset = COLOR_PRESETS[props.note.color] || COLOR_PRESETS.yellow;
  return {
    '--card-bg': preset.lightBg,
    '--card-border': preset.lightBorder,
    '--card-text': preset.lightText,
    '--card-bg-dark': preset.darkBg,
    '--card-border-dark': preset.darkBorder,
    '--card-text-dark': preset.darkText,
    '--card-btn-hover-bg': preset.lightBtnHoverBg,
    '--card-btn-hover-color': preset.lightBtnHoverColor,
    '--card-btn-hover-bg-dark': preset.darkBtnHoverBg,
    '--card-btn-hover-color-dark': preset.darkBtnHoverColor
  };
});

// 进入编辑模式
const enterEditMode = () => {
  isEditing.value = true;
  editTitle.value = props.note.title || '';
  editContent.value = props.note.content;
  editTags.value = props.note.tags ? [...props.note.tags] : [];
};

// 保存编辑
const saveEdit = () => {
  tagEditorRef.value?.addTag();

  const titleChanged = editTitle.value.trim() !== (props.note.title || '').trim();
  const contentChanged = editContent.value !== props.note.content;
  const originalTags = props.note.tags || [];
  const tagsChanged =
    editTags.value.length !== originalTags.length ||
    !editTags.value.every((t, i) => t === originalTags[i]);

  if (titleChanged || contentChanged || tagsChanged) {
    store.updateNote(props.note.id, {
      title: editTitle.value.trim(),
      content: editContent.value,
      tags: editTags.value
    });
    isEditing.value = false;
  } else {
    cancelEdit();
  }
};

// 取消编辑
const cancelEdit = () => {
  isEditing.value = false;
  editTitle.value = props.note.title || '';
  editContent.value = props.note.content;
  editTags.value = [];
};

// 双击粘贴逻辑
const handleDoubleClick = () => {
  if (isEditing.value) return; // 如果在编辑中，不触发双击粘贴
  store.handlePasteNote(props.note.content);
};

// 切换置顶
const togglePin = () => {
  if (props.note.isDeleted) return;
  store.updateNote(
    props.note.id,
    {
      isPinned: !props.note.isPinned
    },
    false
  );
  store.showToast(props.note.isPinned ? '便签已置顶' : '取消置顶');
};

// 拖拽相关事件
const isDragTriggered = ref(false);

const handleGlobalMouseUp = () => {
  isDragTriggered.value = false;
};

const handleDragStart = (e: DragEvent) => {
  if (store.sortMode !== 'custom' || isEditing.value || props.note.isDeleted || !isDragTriggered.value) {
    e.preventDefault();
    return;
  }
  store.draggedNoteId = props.note.id;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', props.note.id);
  }
};

const handleDragEnter = (_e: DragEvent) => {
  if (store.sortMode !== 'custom') return;
  const draggedId = store.draggedNoteId;
  if (draggedId && draggedId !== props.note.id) {
    store.moveNote(draggedId, props.note.id);
  }
};

const handleDragEnd = () => {
  store.draggedNoteId = null;
  isDragTriggered.value = false;
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  store.draggedNoteId = null;
  isDragTriggered.value = false;
};

// 鼠标移出卡片时，自动关闭已打开的选择面板
const handleMouseLeave = () => {
  footerRef.value?.closePopovers();
};

// 用于判断外部点击的 Ref 引用
const cardRef = ref<HTMLElement | null>(null);

let mousedownTarget: Node | null = null;

const handleMousedown = (event: MouseEvent) => {
  mousedownTarget = event.target as Node;
};

const handleClickOutside = (event: MouseEvent) => {
  if (!isEditing.value || !cardRef.value) return;

  const clickTarget = event.target as Node;
  const isMousedownInside = cardRef.value.contains(mousedownTarget);
  const isClickInside = cardRef.value.contains(clickTarget);

  if (!isMousedownInside && !isClickInside) {
    saveEdit();
  }
};

watch(isEditing, editing => {
  if (editing) {
    nextTick(() => {
      document.addEventListener('mousedown', handleMousedown, true);
      document.addEventListener('click', handleClickOutside, true);
    });
  } else {
    document.removeEventListener('mousedown', handleMousedown, true);
    document.removeEventListener('click', handleClickOutside, true);
    mousedownTarget = null;
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleMousedown, true);
  document.removeEventListener('click', handleClickOutside, true);
  window.removeEventListener('mouseup', handleGlobalMouseUp);
});

onMounted(() => {
  window.addEventListener('mouseup', handleGlobalMouseUp);
  if (store.editingNoteId === props.note.id) {
    enterEditMode();
    store.editingNoteId = null;
  }
});
</script>

<template>
  <div
    ref="cardRef"
    class="note-card"
    :class="{
      pinned: note.isPinned,
      editing: isEditing,
      dragging: store.draggedNoteId === note.id,
      'is-in-trash': note.isDeleted
    }"
    :style="colorStyle"
    :draggable="store.sortMode === 'custom' && !isEditing && !note.isDeleted && isDragTriggered"
    @dblclick="handleDoubleClick"
    @dragstart="handleDragStart"
    @dragover.prevent
    @dragenter="handleDragEnter"
    @dragend="handleDragEnd"
    @drop="handleDrop"
    @mouseleave="handleMouseLeave"
  >
    <!-- 拖拽手柄区域 -->
    <div
      v-if="store.sortMode === 'custom' && !isEditing && !note.isDeleted"
      class="note-drag-handle"
      @mousedown="isDragTriggered = true"
      @dblclick.stop
    ></div>

    <NoteCardHeader
      v-model:title="editTitle"
      :note="note"
      :is-editing="isEditing"
      @toggle-pin="togglePin"
      @enter-edit="enterEditMode"
      @save-edit="saveEdit"
      @cancel-edit="cancelEdit"
    />

    <NoteCardBody
      v-model:content="editContent"
      :note="note"
      :is-editing="isEditing"
      @cancel-edit="cancelEdit"
      @save-edit="saveEdit"
    />

    <NoteCardTagEditor v-if="isEditing" ref="tagEditorRef" v-model:tags="editTags" />

    <NoteCardFooter
      ref="footerRef"
      :note="note"
      :is-editing="isEditing"
      @save-edit="saveEdit"
      @cancel-edit="cancelEdit"
    />
  </div>
</template>

<style lang="scss" scoped>
.note-card {
  --card-bg: hsl(48, 100%, 88%, 0.75);
  --card-border: hsl(48, 100%, 75%);
  --card-text: hsl(48, 80%, 15%);
  --card-bg-dark: hsl(48, 40%, 18%, 0.75);
  --card-border-dark: hsl(48, 40%, 30%);
  --card-text-dark: hsl(48, 100%, 85%);

  display: flex;
  flex-direction: column;
  border-radius: $radius-xl;
  padding: 18px 20px 14px 20px;
  position: relative;
  min-height: 90px;
  max-height: 320px;
  cursor: default;
  // user-select: none;

  @include glass-panel(var(--card-bg), var(--card-border));
  color: var(--card-text);
  @include hover-lift(-4px, var(--shadow-md));

  .dark-theme & {
    background: var(--card-bg-dark);
    border-color: var(--card-border-dark);
    color: var(--card-text-dark);
    --card-btn-hover-bg: var(--card-btn-hover-bg-dark);
    --card-btn-hover-color: var(--card-btn-hover-color-dark);
  }

  &:hover {
    :deep(.edit-trigger-btn) {
      opacity: 1;
    }

    :deep(.card-footer) {
      opacity: 1;

      .card-actions {
        opacity: 1;
        transform: translateY(0);
      }
    }
  }

  &.pinned {
    box-shadow: 0 8px 20px -8px var(--accent-light);
    border-width: 1.5px;

    :deep(.pin-icon) {
      transform: rotate(45deg);
      fill: currentColor;
    }
  }

  &.editing {
    transform: none !important;
    box-shadow: var(--shadow-md) !important;
    max-height: none;
    min-height: 220px;
    z-index: 10;
    cursor: default;
  }

  &.dragging {
    opacity: 0.35;
    border-style: dashed !important;
    transform: scale(0.98);
    box-shadow: none !important;
  }

  &[draggable='true'] {
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  .note-drag-handle {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 18px;
    z-index: 1;
    cursor: grab;
    border-radius: $radius-xl $radius-xl 0 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;

    &::after {
      content: '';
      width: 24px;
      height: 3px;
      border-radius: 1.5px;
      background: currentColor;
      opacity: 0;
      transition: opacity 0.2s;
    }

    &:hover {
      background-color: rgba(0, 0, 0, 0.03);
      &::after {
        opacity: 0.2;
      }
      
      .dark-theme & {
        background-color: rgba(255, 255, 255, 0.03);
        &::after {
          opacity: 0.3;
        }
      }
    }

    &:active {
      cursor: grabbing;
    }
  }


}

@media (max-width: 1049px) {
  .note-card {
    padding: 14px 16px 10px 16px;
    min-height: 80px;
  }
}
</style>
