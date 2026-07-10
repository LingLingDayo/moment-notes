<script lang="ts" setup>
import { computed } from 'vue';
import SettingWrapper from './SettingWrapper.vue';
import { SettingItem } from '../settingsConfig';

defineOptions({
  inheritAttrs: false
});

const props = defineProps<{
  modelValue: string;
  item: SettingItem;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void;
}>();

const value = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const itemProps = computed(() => (props.item.props as any) || {});
</script>

<template>
  <SettingWrapper :item="item">
    <template #default="{ defaultTooltip }">
      <div class="setting-textarea-wrapper">
        <textarea
          v-model="value"
          :placeholder="item.placeholder"
          :rows="itemProps.rows || 3"
          :style="itemProps.style"
          class="setting-textarea"
          :data-tooltip="defaultTooltip"
        ></textarea>
      </div>
    </template>
  </SettingWrapper>
</template>

<style lang="scss" scoped>
.setting-textarea-wrapper {
  width: 100%;
}

.setting-textarea {
  width: 100%;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--input-bg, rgba(0, 0, 0, 0.05));
  border: 1px solid var(--input-border, rgba(255, 255, 255, 0.08));
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.5;
  transition: all 0.2s ease;
  outline: none;
  resize: vertical;
  min-height: 60px;
  font-family: inherit;

  &:hover:not(:disabled) {
    border-color: var(--accent-color);
  }

  &:focus {
    border-color: var(--accent-color);
    background: var(--input-focus-bg, rgba(0, 0, 0, 0.08));
    box-shadow: 0 0 0 2px var(--accent-light);
  }

  &::placeholder {
    color: var(--text-muted);
    font-size: 12px;
  }
}
</style>
