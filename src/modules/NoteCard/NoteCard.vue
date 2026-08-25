<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { Note } from '@type';
import { useStickyNotesStore, COLOR_PRESETS } from '@stores/stickyNotes';
import NoteCardHeader from './NoteCardHeader.vue';
import NoteCardBody from './NoteCardBody.vue';
import NoteCardTagEditor from './NoteCardTagEditor.vue';
import NoteCardFooter from './NoteCardFooter.vue';
import { getContainerSelectedText } from '@utils/selection';
import { isUTools } from '@utils/storage';
import { executeDoubleClickNoteAction } from '../../domain/noteInteractions/DoubleClickNoteActionRegistry';

const props = withDefaults(
  defineProps<{
    note: Note;
    isFullScreen?: boolean;
  }>(),
  {
    isFullScreen: false
  }
);

const store = useStickyNotesStore();

// 是否处于编辑模式
const isEditing = ref(false);
const editTitle = ref(props.note.title || '');
const editContent = ref(props.note.content);
const editTags = ref<string[]>([]);

// 子组件 Ref 引用
const tagEditorRef = ref<InstanceType<typeof NoteCardTagEditor> | null>(null);
const footerRef = ref<InstanceType<typeof NoteCardFooter> | null>(null);

// 是否有处于激活状态的下拉面板 (如颜色选择、分类移动等)
const hasActivePopover = ref(false);
const handlePopoverStateChange = (isOpen: boolean) => {
  hasActivePopover.value = isOpen;
};

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
  if (!props.isFullScreen && store.defaultEditMode === 'fullscreen') {
    store.editingNoteId = props.note.id;
    store.openedFullscreenForEditNoteId = props.note.id;
    store.openNotePreview(props.note.id);
    return;
  }
  isEditing.value = true;
  editTitle.value = props.note.title || '';
  editContent.value = props.note.content;
  editTags.value = props.note.tags ? [...props.note.tags] : [];
  if (store.editingNoteId === props.note.id) {
    store.editingNoteId = null;
  }
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
    return;
  }

  if (store.openedFullscreenForEditNoteId === props.note.id) {
    store.closeNotePreview();
  }
};

// 取消编辑
const cancelEdit = () => {
  isEditing.value = false;
  editTitle.value = props.note.title || '';
  editContent.value = props.note.content;
  editTags.value = [];

  if (store.openedFullscreenForEditNoteId === props.note.id) {
    store.closeNotePreview();
  }
};

// 切换全屏显示/收起 (若处于编辑状态则先保存当前编辑)
const handleTogglePreview = () => {
  const wasOpenedForEdit = store.openedFullscreenForEditNoteId === props.note.id;
  if (isEditing.value) {
    saveEdit();
  }
  if (!wasOpenedForEdit) {
    store.toggleNotePreview(props.note.id);
  }
};

// 划词结束 200ms 防抖自动复制逻辑
let autoCopyTimer: number | null = null;
let lastAutoCopiedText = '';

const handleSelectionChange = () => {
  if (!store.enableAutoCopySelection || isEditing.value || props.note.isDeleted) return;

  const selectedText = getContainerSelectedText(cardRef.value);

  if (!selectedText) {
    if (autoCopyTimer) {
      clearTimeout(autoCopyTimer);
      autoCopyTimer = null;
    }
    lastAutoCopiedText = '';
    return;
  }

  if (selectedText === lastAutoCopiedText) return;

  if (autoCopyTimer) {
    clearTimeout(autoCopyTimer);
  }

  autoCopyTimer = window.setTimeout(async () => {
    autoCopyTimer = null;
    const currentText = getContainerSelectedText(cardRef.value);
    if (!currentText || currentText !== selectedText) return;

    lastAutoCopiedText = currentText;
    try {
      if (isUTools()) {
        window.utools.copyText(currentText);
      } else {
        await navigator.clipboard.writeText(currentText);
      }
      store.updateNoteLastUsed(props.note.id);
    } catch (err) {
      console.error('Auto copy failed:', err);
    }
  }, 200);
};

const handleDoubleClick = () => {
  if (isEditing.value) return;

  executeDoubleClickNoteAction(store.doubleClickNoteAction, {
    copyAndPaste: () => store.handlePasteNote(props.note.content, props.note.id),
    openFullscreen: handleTogglePreview,
    deleteNote: () => store.deleteNote(props.note.id)
  });
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

const handleHandleMouseEnter = () => {
  if (
    store.sortMode !== 'custom' ||
    isEditing.value ||
    props.note.isDeleted ||
    store.currentCategoryId === 'recent'
  ) return;
  isDragTriggered.value = true;
};

const handleHandleMouseLeave = () => {
  if (store.draggedNoteId === props.note.id) return;
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

const handleDragOver = (e: DragEvent) => {
  if (store.sortMode !== 'custom') return;
  const draggedId = store.draggedNoteId;
  if (!draggedId || draggedId === props.note.id) return;
  if (e.clientX === 0 && e.clientY === 0) return;

  const dragIndex = store.filteredNotes.findIndex(n => n.id === draggedId);
  const hoverIndex = store.filteredNotes.findIndex(n => n.id === props.note.id);
  if (dragIndex === -1 || hoverIndex === -1) return;

  if (!cardRef.value) return;
  const targetRect = cardRef.value.getBoundingClientRect();

  const draggedElement = document.querySelector('.note-card.dragging');
  if (!draggedElement) return;
  const draggedRect = draggedElement.getBoundingClientRect();

  const isSameRow = Math.abs(draggedRect.top - targetRect.top) < 20;

  let shouldSwap = false;
  if (isSameRow) {
    if (dragIndex < hoverIndex) {
      shouldSwap = e.clientX > targetRect.left + targetRect.width / 2;
    } else {
      shouldSwap = e.clientX < targetRect.left + targetRect.width / 2;
    }
  } else {
    if (dragIndex < hoverIndex) {
      shouldSwap = e.clientY > targetRect.top + targetRect.height / 2;
    } else {
      shouldSwap = e.clientY < targetRect.top + targetRect.height / 2;
    }
  }

  if (shouldSwap) {
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

// 点击卡片其他区域时，马上收起已打开的选择面板
const handleCardClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (target && !target.closest('.base-popover-wrapper') && !target.closest('.action-popover-wrapper')) {
    footerRef.value?.closePopovers();
  }
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
  if (autoCopyTimer) {
    clearTimeout(autoCopyTimer);
    autoCopyTimer = null;
  }
  if (isEditing.value) {
    saveEdit();
  }
  document.removeEventListener('mousedown', handleMousedown, true);
  document.removeEventListener('click', handleClickOutside, true);
  window.removeEventListener('mouseup', handleGlobalMouseUp);
  document.removeEventListener('selectionchange', handleSelectionChange);
});

const cardMaxHeightStyle = computed(() => {
  return {
    '--card-max-height': `${store.noteMaxHeight}px`
  };
});

onMounted(() => {
  window.addEventListener('mouseup', handleGlobalMouseUp);
  document.addEventListener('selectionchange', handleSelectionChange);
  if (store.editingNoteId === props.note.id) {
    enterEditMode();
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
      'is-in-trash': note.isDeleted,
      'has-active-popover': hasActivePopover,
      'enable-hover-anim': store.enableHoverAnimation && !isFullScreen,
      'is-full-screen': isFullScreen
    }"
    :style="[colorStyle, cardMaxHeightStyle]"
    :draggable="store.sortMode === 'custom' && !isEditing && !note.isDeleted && isDragTriggered"
    @dblclick="handleDoubleClick"
    @dragstart="handleDragStart"
    @dragover.prevent="handleDragOver"
    @dragend="handleDragEnd"
    @drop="handleDrop"
    @mouseleave="handleMouseLeave"
    @click.capture="handleCardClick"
  >
    <!-- 拖拽手柄区域 -->
    <div
      v-if="store.sortMode === 'custom' && !isEditing && !note.isDeleted && !isFullScreen"
      class="note-drag-handle"
      data-tooltip="按住拖动调整位置"
      @mouseenter="handleHandleMouseEnter"
      @mouseleave="handleHandleMouseLeave"
      @dblclick.stop
    ></div>

    <NoteCardHeader
      v-model:title="editTitle"
      :note="note"
      :is-editing="isEditing"
      :is-full-screen="isFullScreen"
      @toggle-pin="togglePin"
      @enter-edit="enterEditMode"
      @save-edit="saveEdit"
      @cancel-edit="cancelEdit"
      @toggle-preview="handleTogglePreview"
    />

    <NoteCardBody
      v-model:content="editContent"
      :note="note"
      :is-editing="isEditing"
      :is-full-screen="isFullScreen"
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
      @popover-state-change="handlePopoverStateChange"
    />
  </div>
</template>

<style lang="scss" scoped src="./NoteCard.scss"></style>
