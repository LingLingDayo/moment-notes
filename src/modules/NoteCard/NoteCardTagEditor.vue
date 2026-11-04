<script lang="ts" setup>
import { ref, computed } from 'vue';
import { X, ChevronDown, Check } from '@lucide/vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { useShortcutStore } from '@stores/shortcutStore';
import { reorderTagList } from '@stores/stickyNotesAlgorithms';
import { hideTooltip } from '@utils/tooltip';

const tags = defineModel<string[]>('tags', { default: () => [] });

const emit = defineEmits<{
  (e: 'save-edit'): void;
  (e: 'cancel-edit'): void;
}>();

const newTagInput = ref('');
const showDropdown = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);
const editorRef = ref<HTMLElement | null>(null);
const draggedTag = ref<string | null>(null);

const store = useStickyNotesStore();
const shortcutStore = useShortcutStore();

// 获取所有已存在的标签
const allExistingTags = computed(() => {
  const tagsSet = new Set<string>();
  store.allNotes.forEach(note => {
    if (note.tags) {
      note.tags.forEach(tag => {
        if (tag.trim()) {
          tagsSet.add(tag.trim());
        }
      });
    }
  });
  return Array.from(tagsSet).sort((a, b) => a.localeCompare(b, 'zh'));
});

const addTag = () => {
  const tag = newTagInput.value.trim();
  if (tag) {
    if (!tags.value.includes(tag)) {
      tags.value.push(tag);
    }
  }
  newTagInput.value = '';
};

const removeTag = (index: number) => {
  hideTooltip();
  tags.value.splice(index, 1);
};

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
  if (showDropdown.value) {
    inputRef.value?.focus();
  }
};

const handleBlur = () => {
  addTag();
  showDropdown.value = false;
};

const selectTag = (tag: string) => {
  const index = tags.value.indexOf(tag);
  if (index > -1) {
    tags.value.splice(index, 1);
  } else {
    tags.value.push(tag);
  }
};

const handleKeydown = (e: KeyboardEvent) => {
  const keyString = shortcutStore.getEventKeyString(e);
  if (keyString) {
    const matched = shortcutStore.shortcuts.find(s => s.currentKey === keyString);
    if (matched) {
      if (matched.id === 'saveEdit') {
        e.preventDefault();
        e.stopPropagation();
        emit('save-edit');
        return;
      } else if (matched.id === 'cancelEdit') {
        e.preventDefault();
        e.stopPropagation();
        if (showDropdown.value) {
          showDropdown.value = false;
        } else {
          emit('cancel-edit');
        }
        return;
      }
    }
  }

  // 输入框无内容时按退格或删除键，静默删除上一个标签
  if (
    !e.isComposing &&
    (e.key === 'Backspace' || e.key === 'Delete') &&
    !newTagInput.value &&
    tags.value.length > 0
  ) {
    e.preventDefault();
    removeTag(tags.value.length - 1);
    return;
  }

  if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    addTag();
  } else if (e.key === 'Escape' && showDropdown.value) {
    e.preventDefault();
    e.stopPropagation();
    showDropdown.value = false;
  }
};

// 标签拖拽排序事件
const handleTagDragStart = (e: DragEvent, tag: string) => {
  const target = e.target as HTMLElement | null;
  if (target?.closest('.delete-tag-btn')) {
    e.preventDefault();
    return;
  }
  draggedTag.value = tag;
  showDropdown.value = false;
  hideTooltip();
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tag);
  }
};

const handleTagDragOver = (e: DragEvent, targetTag: string) => {
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
  const currentDragged = draggedTag.value;
  if (!currentDragged || currentDragged === targetTag) return;
  if (e.clientX === 0 && e.clientY === 0) return;

  const dragIndex = tags.value.indexOf(currentDragged);
  const hoverIndex = tags.value.indexOf(targetTag);
  if (dragIndex === -1 || hoverIndex === -1 || dragIndex === hoverIndex) return;

  const container = editorRef.value;
  const targetEl = e.currentTarget as HTMLElement | null;
  if (!container || !targetEl) return;

  const containerRect = container.getBoundingClientRect();
  const draggedEl = container.querySelector('.edit-tag-badge.is-dragging') as HTMLElement | null;

  // 基于 offsetLeft / offsetTop 获取不受 FLIP transform 影响的布局坐标，防止过渡动画期间发生反复换位抖动
  const targetLeft = containerRect.left + targetEl.offsetLeft;
  const targetTop = containerRect.top + targetEl.offsetTop;
  const targetWidth = targetEl.offsetWidth;
  const targetHeight = targetEl.offsetHeight;

  const draggedTop = draggedEl ? containerRect.top + draggedEl.offsetTop : targetTop;
  const draggedHeight = draggedEl ? draggedEl.offsetHeight : targetHeight;

  const isSameRow = Math.abs(draggedTop - targetTop) < Math.min(draggedHeight, targetHeight) / 2;

  let shouldMove = false;
  if (isSameRow) {
    const midX = targetLeft + targetWidth / 2;
    shouldMove = dragIndex < hoverIndex ? e.clientX > midX : e.clientX < midX;
  } else {
    const midY = targetTop + targetHeight / 2;
    shouldMove = dragIndex < hoverIndex ? e.clientY > midY : e.clientY < midY;
  }

  if (shouldMove) {
    tags.value = reorderTagList(tags.value, currentDragged, targetTag);
  }
};

const handleInputDragOver = (e: DragEvent) => {
  const currentDragged = draggedTag.value;
  if (!currentDragged) return;
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
  const lastTag = tags.value[tags.value.length - 1];
  if (lastTag && lastTag !== currentDragged) {
    tags.value = reorderTagList(tags.value, currentDragged, lastTag);
  }
};

const handleContainerDragOver = (e: DragEvent) => {
  if (!draggedTag.value) return;
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
};

const handleTagDragEnd = () => {
  draggedTag.value = null;
};

const closeDropdownIfOpen = (): boolean => {
  if (showDropdown.value) {
    showDropdown.value = false;
    return true;
  }
  return false;
};

// 暴露方法供父组件在保存或响应快捷键时调用
defineExpose({
  addTag,
  closeDropdownIfOpen
});
</script>

<template>
  <div
    ref="editorRef"
    class="tags-editor"
    :class="{ 'is-sorting': draggedTag !== null }"
    @click.stop
    @dragover.stop.prevent="handleContainerDragOver"
    @drop.stop.prevent="handleTagDragEnd"
  >
    <TransitionGroup name="tag-list">
      <div
        v-for="(tag, idx) in tags"
        :key="tag"
        class="edit-tag-badge"
        :class="{ 'is-dragging': draggedTag === tag }"
        draggable="true"
        data-tooltip="拖动调整顺序"
        @dragstart.stop="handleTagDragStart($event, tag)"
        @dragover.stop.prevent="handleTagDragOver($event, tag)"
        @dragend.stop="handleTagDragEnd"
        @drop.stop.prevent="handleTagDragEnd"
      >
        <span class="tag-label">{{ tag }}</span>
        <button
          type="button"
          class="delete-tag-btn"
          draggable="false"
          aria-label="删除标签"
          data-tooltip="删除标签"
          @mousedown.stop
          @click.stop="removeTag(idx)"
        >
          <X class="delete-tag-icon" />
        </button>
      </div>
    </TransitionGroup>

    <div
      class="tag-input-wrapper"
      @dragover.stop.prevent="handleInputDragOver"
      @drop.stop.prevent="handleTagDragEnd"
    >
      <input
        ref="inputRef"
        v-model="newTagInput"
        type="text"
        placeholder="+ 添加标签"
        class="tag-input"
        @keydown="handleKeydown"
        @blur="handleBlur"
      />
      <button
        class="arrow-btn"
        type="button"
        :class="{ active: showDropdown }"
        data-tooltip="选择已有标签"
        @mousedown.prevent
        @click="toggleDropdown"
      >
        <ChevronDown class="arrow-icon" :class="{ open: showDropdown }" />
      </button>

      <Transition name="tag-dropdown-fade">
        <div v-if="showDropdown" class="tags-dropdown" @mousedown.prevent>
          <div v-if="allExistingTags.length === 0" class="dropdown-item empty">
            暂无已有标签
          </div>
          <div
            v-for="tag in allExistingTags"
            v-else
            :key="tag"
            class="dropdown-item"
            :class="{ selected: tags.includes(tag) }"
            :data-tooltip="tag"
            data-tooltip-only-overflow
            @click="selectTag(tag)"
          >
            <span class="tag-text">{{ tag }}</span>
            <Check v-if="tags.includes(tag)" class="check-icon" />
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style lang="scss" scoped src="./NoteCardTagEditor.scss"></style>
