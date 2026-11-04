<script lang="ts" setup>
import { ref, computed } from 'vue';
import { X, ChevronDown, Check, Plus } from '@lucide/vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { reorderTagList } from '@stores/stickyNotesAlgorithms';
import { hideTooltip } from '@utils/tooltip';

const tags = defineModel<string[]>('tags', { default: () => [] });

const newTagInput = ref('');
const showDropdown = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);
const editorRef = ref<HTMLElement | null>(null);
const draggedTag = ref<string | null>(null);

const store = useStickyNotesStore();

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
  let tag = newTagInput.value.replace(/，/g, ',').trim();
  if (tag.endsWith(',')) {
    tag = tag.slice(0, -1).trim();
  }
  if (tag) {
    const tagsToAdd = tag
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    tagsToAdd.forEach(t => {
      if (!tags.value.includes(t)) {
        tags.value.push(t);
      }
    });
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
  if (e.key === ',' || e.key === '，') {
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

// 暴露 addTag 方法供父组件在保存时调用，以便在点击保存前将未按回车的文本也作为标签录入
defineExpose({
  addTag
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
      <Plus class="input-plus-icon" />
      <input
        ref="inputRef"
        v-model="newTagInput"
        type="text"
        placeholder="添加标签 (回车或逗号)"
        class="tag-input"
        @keydown.enter.prevent="addTag"
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

<style lang="scss" scoped>
.tags-editor {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px dashed var(--popover-border);
  margin-bottom: 6px;
}

.edit-tag-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 23px;
  padding: 0 4px 0 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  background: color-mix(in srgb, currentColor 7%, transparent);
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  color: inherit;
  user-select: none;
  cursor: grab;
  max-width: 180px;
  box-sizing: border-box;
  transition:
    background-color $transition-fast,
    border-color $transition-fast,
    opacity $transition-fast,
    transform $transition-fast;

  &:hover {
    background: color-mix(in srgb, currentColor 11%, transparent);
    border-color: color-mix(in srgb, currentColor 20%, transparent);
  }

  &:active {
    cursor: grabbing;
  }

  &.is-dragging {
    opacity: 0.35;
    border-style: dashed;
    transform: scale(0.96);
  }

  .tag-label {
    @include text-ellipsis;
    line-height: 1.2;
  }

  .delete-tag-btn {
    width: 15px;
    height: 15px;
    border-radius: 4px;
    border: none;
    background: transparent;
    color: inherit;
    padding: 0;
    margin-left: 1px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0.5;
    flex-shrink: 0;
    transition:
      opacity $transition-fast,
      background-color $transition-fast,
      color $transition-fast,
      transform $transition-fast;

    .delete-tag-icon {
      width: 11px;
      height: 11px;
      stroke-width: 2.25;
      display: block;
    }

    &:hover {
      opacity: 1;
      background: var(--danger-hover-bg);
      color: var(--danger-color);
    }

    &:active {
      transform: scale(0.9);
    }
  }
}

.tag-list-move {
  transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1);
}

.tag-list-enter-active,
.tag-list-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.tag-list-enter-from,
.tag-list-leave-to {
  opacity: 0;
  transform: scale(0.88);
}

.tag-input-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: 1;
  min-width: 120px;

  &:focus-within {
    .input-plus-icon {
      opacity: 0.85;
    }
  }
}

.input-plus-icon {
  position: absolute;
  left: 7px;
  width: 11px;
  height: 11px;
  opacity: 0.45;
  pointer-events: none;
  transition: opacity $transition-fast;
}

.tag-input {
  height: 23px;
  background: color-mix(in srgb, currentColor 4%, transparent);
  border: 1px dashed color-mix(in srgb, currentColor 18%, transparent);
  border-radius: 6px;
  padding: 0 22px 0 21px;
  font-size: 11px;
  line-height: 1;
  color: inherit;
  width: 100%;
  box-sizing: border-box;

  &:hover {
    background: color-mix(in srgb, currentColor 6%, transparent);
    border-color: color-mix(in srgb, currentColor 26%, transparent);
  }

  &:focus {
    border-style: solid;
    background: var(--input-bg);
    border-color: var(--card-border);
    outline: none;

    .dark-theme & {
      border-color: var(--card-border-dark);
    }
  }

  &::placeholder {
    color: inherit;
    opacity: 0.45;
  }
}

.arrow-btn {
  position: absolute;
  right: 3px;
  top: 50%;
  transform: translateY(-50%);
  width: 17px;
  height: 17px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.55;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    opacity $transition-fast,
    background-color $transition-fast;

  &:hover,
  &.active {
    opacity: 1;
    background: color-mix(in srgb, currentColor 10%, transparent);
  }

  &:active {
    transform: translateY(-50%) scale(0.92);
  }

  .arrow-icon {
    width: 12px;
    height: 12px;
    transition: transform 0.2s ease;

    &.open {
      transform: rotate(180deg);
    }
  }
}

.tags-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  width: 100%;
  min-width: 130px;
  max-width: 210px;
  max-height: 156px;
  overflow-y: auto;
  background: var(--popover-bg);
  border: 1px solid var(--popover-border);
  border-radius: 8px;
  box-shadow: var(--popover-shadow);
  z-index: $z-index-popover;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;

  .dropdown-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px 8px;
    border-radius: 6px;
    font-size: 11px;
    cursor: pointer;
    color: var(--text-secondary);
    transition:
      background-color $transition-fast,
      color $transition-fast;

    &:hover {
      background: var(--item-hover-bg);
      color: var(--text-primary);
    }

    &.selected {
      color: var(--accent-color);
      background: var(--accent-light);
      font-weight: 600;
    }

    .tag-text {
      @include text-ellipsis;
      flex: 1;
      margin-right: 6px;
    }

    .check-icon {
      width: 12px;
      height: 12px;
      flex-shrink: 0;
    }

    &.empty {
      color: var(--text-muted);
      cursor: default;
      justify-content: center;
      padding: 8px 10px;

      &:hover {
        background: transparent;
      }
    }
  }
}

.tag-dropdown-fade-enter-active,
.tag-dropdown-fade-leave-active {
  transition:
    opacity 0.15s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.tag-dropdown-fade-enter-from,
.tag-dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
}
</style>
