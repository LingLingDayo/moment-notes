<script lang="ts" setup>
import { FolderInput } from '@lucide/vue';
import BasePopover from '@components/BasePopover.vue';

defineProps<{
  isOpen: boolean;
  currentCategoryId: string;
  categories: any[];
}>();

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void;
  (e: 'select-category', catId: string): void;
  (e: 'toggle'): void;
}>();
</script>

<template>
  <BasePopover
    :is-open="isOpen"
    title="移动至分类"
    width="130px"
    @close="emit('update:isOpen', false)"
  >
    <template #trigger>
      <button
        class="action-btn"
        data-tooltip="移动分类"
        @click="emit('toggle')"
      >
        <FolderInput class="action-icon" />
      </button>
    </template>
    <div class="folder-list">
      <button
        class="folder-item"
        :class="{ active: currentCategoryId === 'uncategorized' }"
        @click="emit('select-category', 'uncategorized')"
      >
        <span class="folder-name-text">全部便签</span>
      </button>
      <button
        v-for="cat in categories.filter(c => !c.isSystem)"
        :key="cat.id"
        class="folder-item"
        :style="{ paddingLeft: `${(Math.max((cat.level || 0) - 1, 0)) * 8 + 8}px` }"
        :class="{ active: currentCategoryId === cat.id }"
        @click="emit('select-category', cat.id)"
      >
        <span v-if="cat.level > 0" style="opacity: 0.5; margin-right: 4px">└</span>
        <span class="folder-name-text">{{ cat.name }}</span>
      </button>
    </div>
  </BasePopover>
</template>

<style lang="scss" scoped>
@use '@styles/variables' as *;

.action-btn {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  color: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background-color $transition-fast,
    color $transition-fast,
    transform $transition-fast;

  &:hover {
    background: var(--card-btn-hover-bg);
    color: var(--card-btn-hover-color);
  }

  .action-icon {
    width: 12px;
    height: 12px;
  }
}

.folder-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 150px;
  overflow-y: auto;
}

.folder-item {
  display: flex;
  align-items: center;
  text-align: left;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 11px;
  color: var(--text-secondary);
  min-width: 0;
  background: transparent;
  border: none;
  cursor: pointer;

  &:hover {
    background: var(--item-hover-bg);
    color: var(--text-primary);
  }

  &.active {
    background: var(--accent-light);
    color: var(--accent-color);
    font-weight: 600;
  }

  .folder-name-text {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
