<script lang="ts" setup>
import { computed } from 'vue';
import SettingWrapper from './SettingWrapper.vue';
import { SettingItem } from '../settingsConfig';

const props = defineProps<{
  modelValue: number;
  item: SettingItem;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: number): void;
}>();

const itemProps = computed(() => (props.item.props as any) || {});
const min = computed(() => itemProps.value.min !== undefined ? itemProps.value.min : 0);
const max = computed(() => itemProps.value.max !== undefined ? itemProps.value.max : 100);
const step = computed(() => itemProps.value.step !== undefined ? itemProps.value.step : 1);

const handleInput = (e: Event) => {
  const input = e.target as HTMLInputElement;
  emit('update:modelValue', Number(input.value));
};

const handleWheel = (e: WheelEvent) => {
  const input = e.target as HTMLInputElement;
  if (document.activeElement !== input) return;

  const currentVal = Number(props.modelValue);
  const direction = e.deltaY < 0 ? 1 : -1;
  const stepVal = step.value;
  let newVal = currentVal + direction * stepVal;

  if (newVal < min.value) newVal = min.value;
  if (newVal > max.value) newVal = max.value;

  emit('update:modelValue', newVal);
};
</script>

<template>
  <SettingWrapper :item="item">
    <template #default="{ defaultTooltip }">
      <div class="setting-slider-container">
        <input
          type="range"
          :value="modelValue"
          :min="min"
          :max="max"
          :step="step"
          class="setting-range-input"
          :data-tooltip="defaultTooltip"
          @input="handleInput"
          @wheel.prevent="handleWheel"
        />
        <span class="setting-slider-value">{{ modelValue }}</span>
      </div>
    </template>
  </SettingWrapper>
</template>

<style lang="scss" scoped>
.setting-slider-container {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.setting-range-input {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.06);
  outline: none;
  transition: background 0.2s ease;
  margin: 0;
  padding: 0;

  :global(.dark-theme) & {
    background: rgba(255, 255, 255, 0.22);
  }

  &:hover {
    background: rgba(0, 0, 0, 0.08);

    :global(.dark-theme) & {
      background: rgba(255, 255, 255, 0.25);
    }
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--accent-color, #6366f1);
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    transition: transform 0.1s ease, background-color 0.2s ease;
    border: 2px solid var(--popover-bg, #fff);

    &:hover {
      transform: scale(1.15);
      background: var(--accent-hover, #4f46e5);
    }
  }

  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--accent-color, #6366f1);
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    transition: transform 0.1s ease, background-color 0.2s ease;
    border: 2px solid var(--popover-bg, #fff);

    &:hover {
      transform: scale(1.15);
      background: var(--accent-hover, #4f46e5);
    }
  }

  &:focus {
    &::-webkit-slider-thumb {
      box-shadow: 0 0 0 4px var(--accent-light, rgba(99, 102, 241, 0.2));
    }
    &::-moz-range-thumb {
      box-shadow: 0 0 0 4px var(--accent-light, rgba(99, 102, 241, 0.2));
    }
  }
}

.setting-slider-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 36px;
  text-align: right;
  font-family: monospace;
}
</style>
