<script lang="ts" setup>
import { FileText, FileCode } from '@lucide/vue';
import { NoteType } from '@type';
import BasePopover from '@components/BasePopover.vue';

defineProps<{
  isOpen: boolean;
  noteType?: NoteType;
}>();

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void;
  (e: 'select-type', type: NoteType): void;
  (e: 'toggle'): void;
}>();
</script>

<template>
  <BasePopover
    :is-open="isOpen"
    title="显示格式"
    width="120px"
    @close="emit('update:isOpen', false)"
  >
    <template #trigger>
      <button
        class="action-btn"
        :data-tooltip="noteType === 'markdown' ? '当前格式: Markdown' : '当前格式: 纯文本'"
        @click="emit('toggle')"
      >
        <FileCode v-if="noteType === 'markdown'" class="action-icon" />
        <FileText v-else class="action-icon" />
      </button>
    </template>
    <div class="format-list">
      <button
        class="format-item"
        :class="{ active: !noteType || noteType === 'text' }"
        @click="emit('select-type', 'text')"
      >
        <FileText class="item-icon" />
        <span>纯文本</span>
      </button>
      <button
        class="format-item"
        :class="{ active: noteType === 'markdown' }"
        @click="emit('select-type', 'markdown')"
      >
        <FileCode class="item-icon" />
        <span>Markdown</span>
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

.format-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.format-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 11px;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: all 0.15s ease;

  &:hover {
    background: var(--item-hover-bg);
    color: var(--text-primary);
  }

  &.active {
    background: var(--accent-light);
    color: var(--accent-color);
    font-weight: 600;
  }

  .item-icon {
    width: 12px;
    height: 12px;
  }
}
</style>
