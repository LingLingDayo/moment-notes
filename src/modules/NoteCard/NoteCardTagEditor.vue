<script lang="ts" setup>
import { ref, computed } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';

const tags = defineModel<string[]>('tags', { default: () => [] });

const newTagInput = ref('');
const showDropdown = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

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
  }
};

// 暴露 addTag 方法供父组件在保存时调用，以便在点击保存前将未按回车的文本也作为标签录入
defineExpose({
  addTag
});
</script>

<template>
  <div class="tags-editor" @click.stop>
    <div v-for="(tag, idx) in tags" :key="idx" class="edit-tag-badge">
      <span>{{ tag }}</span>
      <button class="delete-tag-btn" data-tooltip="删除标签" @click.stop="removeTag(idx)">
        ×
      </button>
    </div>
    <div class="tag-input-wrapper">
      <input
        ref="inputRef"
        v-model="newTagInput"
        type="text"
        placeholder="+ 添加标签 (按回车或逗号)"
        class="tag-input"
        @keydown.enter.prevent="addTag"
        @keydown="handleKeydown"
        @blur="handleBlur"
      />
      <button
        class="arrow-btn"
        type="button"
        data-tooltip="选择已有标签"
        @mousedown.prevent
        @click="toggleDropdown"
      >
        <svg
          class="arrow-icon"
          :class="{ open: showDropdown }"
          viewBox="0 0 24 24"
          width="12"
          height="12"
        >
          <path fill="currentColor" d="M7 10l5 5 5-5z" />
        </svg>
      </button>

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
          @click="selectTag(tag)"
        >
          <span class="tag-text">{{ tag }}</span>
          <span v-if="tags.includes(tag)" class="check-icon">✓</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.tags-editor {
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
  gap: 4px;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--badge-bg);
  border: 1px solid var(--popover-border);
  color: inherit;

  .delete-tag-btn {
    border: none;
    background: transparent;
    color: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 2px;
    opacity: 0.6;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;
    }
  }
}

.tag-input-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: 1;
  min-width: 100px;
}

.tag-input {
  border: none;
  background: var(--badge-bg);
  border: 1px dashed var(--popover-border);
  border-radius: 6px;
  padding: 3px 22px 3px 8px;
  font-size: 11px;
  color: inherit;
  width: 100%;

  &:focus {
    border-style: solid;
    border-color: var(--accent-color);
    outline: none;
  }

  &::placeholder {
    color: inherit;
    opacity: 0.5;
  }
}

.arrow-btn {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    opacity 0.2s,
    transform 0.2s;

  &:hover {
    opacity: 1;
  }

  .arrow-icon {
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
  min-width: 120px;
  max-width: 200px;
  max-height: 150px;
  overflow-y: auto;
  background: var(--popover-bg);
  border: 1px solid var(--popover-border);
  border-radius: 6px;
  box-shadow: var(--popover-shadow);
  z-index: 100;
  padding: 4px 0;

  .dropdown-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    font-size: 11px;
    cursor: pointer;
    color: var(--text-secondary);
    transition:
      background-color 0.2s ease,
      color 0.2s ease,
      transform 0.2s ease;

    &:hover {
      background: var(--item-hover-bg);
      color: var(--text-primary);
    }

    &.selected {
      color: var(--accent-color);
      background: var(--accent-light);
      font-weight: 500;
    }

    .tag-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      margin-right: 8px;
    }

    .check-icon {
      font-size: 10px;
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
</style>
