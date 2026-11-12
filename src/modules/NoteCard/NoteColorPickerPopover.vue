<script lang="ts" setup>
import { Palette, Check } from '@lucide/vue';
import { COLOR_PRESETS } from '@stores/stickyNotes';
import BasePopover from '@components/BasePopover.vue';

defineProps<{
  isOpen: boolean;
  currentColor: string;
}>();

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void;
  (e: 'select-color', colorKey: string): void;
  (e: 'toggle'): void;
}>();
</script>

<template>
  <BasePopover
    :is-open="isOpen"
    width="auto"
    @close="emit('update:isOpen', false)"
  >
    <template #trigger>
      <button
        class="action-btn"
        data-tooltip="更改颜色"
        @click="emit('toggle')"
      >
        <Palette class="action-icon" />
      </button>
    </template>
    <div class="color-picker-list">
      <button
        v-for="(preset, key) in COLOR_PRESETS"
        :key="key"
        class="color-dot"
        :style="{ background: preset.lightBg, border: `1px solid ${preset.lightBorder}` }"
        :data-tooltip="preset.name"
        @click="emit('select-color', key.toString())"
      >
        <Check v-if="currentColor === key" class="dot-check-icon" />
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

.color-picker-list {
  display: flex;
  gap: 4px;
  padding: 2px;
}

.color-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  .dot-check-icon {
    width: 10px;
    height: 10px;
    color: var(--text-primary);
  }
}
</style>
