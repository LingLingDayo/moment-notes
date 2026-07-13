<script lang="ts" setup>
import { computed } from 'vue';
import SettingWrapper from './SettingWrapper.vue';
import { SettingItem } from '../settingsConfig';

defineOptions({
  inheritAttrs: false
});

const props = defineProps<{
  modelValue: string | number;
  item: SettingItem;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: string | number): void;
}>();

const itemProps = computed(() => (props.item.props as any) || {});

const handleInput = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const val = input.value;
  emit('update:modelValue', itemProps.value.type === 'number' ? (val === '' ? '' : Number(val)) : val);
};

// 数字输入限制
const handleKeydown = (e: KeyboardEvent) => {
  if (itemProps.value.type !== 'number') return;

  const allowedKeys = [
    'Backspace',
    'Delete',
    'ArrowLeft',
    'ArrowRight',
    'Tab',
    'Enter',
    'Home',
    'End'
  ];

  if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
    return;
  }

  if (/^[0-9]$/.test(e.key)) {
    return;
  }

  // 负号逻辑
  const min = itemProps.value.min;
  if (e.key === '-' && (min === undefined || min < 0)) {
    const input = e.target as HTMLInputElement;
    if (!input.value.includes('-') && input.selectionStart === 0) {
      return;
    }
  }

  // 小数点逻辑 (基于 step 决定是否允许小数)
  const step = itemProps.value.step;
  const isDecimalAllowed = step ? step % 1 !== 0 : true;
  if (e.key === '.' && isDecimalAllowed) {
    const input = e.target as HTMLInputElement;
    if (!input.value.includes('.')) {
      return;
    }
  }

  e.preventDefault();
};

// 失去焦点合理性验证与边界纠正
const handleBlur = (e: FocusEvent) => {
  if (itemProps.value.type !== 'number') return;

  const input = e.target as HTMLInputElement;
  const valStr = input.value.trim();
  const min = itemProps.value.min;
  const max = itemProps.value.max;

  if (valStr === '') {
    const fallback = min !== undefined ? min : 0;
    input.value = String(fallback); // 强制 DOM 拉回同步
    emit('update:modelValue', fallback);
    return;
  }

  let num = Number(valStr);
  if (isNaN(num)) {
    num = min !== undefined ? min : 0;
  }

  if (min !== undefined && num < min) {
    num = min;
  }
  if (max !== undefined && num > max) {
    num = max;
  }

  input.value = String(num); // 强制 DOM 拉回同步
  emit('update:modelValue', num);
};

// 聚焦状态下的鼠标滚轮微调
const handleWheel = (e: WheelEvent) => {
  if (itemProps.value.type !== 'number') return;

  const input = e.target as HTMLInputElement;
  if (document.activeElement !== input) return;

  let currentVal = Number(props.modelValue);
  const min = itemProps.value.min;
  const max = itemProps.value.max;
  const stepConfig = itemProps.value.step;

  if (isNaN(currentVal)) {
    currentVal = min !== undefined ? min : 0;
  }

  let step = 1;
  if (e.ctrlKey) {
    step = 100;
  } else if (e.shiftKey) {
    step = 10;
  } else if (stepConfig !== undefined) {
    step = stepConfig;
  }

  const direction = e.deltaY < 0 ? 1 : -1;
  let newVal = currentVal + direction * step;

  if (min !== undefined && newVal < min) {
    newVal = min;
  }
  if (max !== undefined && newVal > max) {
    newVal = max;
  }

  input.value = String(newVal); // 强制 DOM 拉回同步
  emit('update:modelValue', newVal);
};
</script>

<template>
  <SettingWrapper :item="item">
    <template #default="{ defaultTooltip }">
      <div class="setting-input-wrapper">
        <input
          :value="modelValue"
          :type="itemProps.type || 'text'"
          :placeholder="item.placeholder"
          :min="itemProps.min"
          :max="itemProps.max"
          :step="itemProps.step"
          :style="itemProps.style"
          class="setting-input"
          :data-tooltip="defaultTooltip"
          @input="handleInput"
          @keydown="handleKeydown"
          @blur="handleBlur"
          @wheel.prevent="handleWheel"
        />
      </div>
    </template>
  </SettingWrapper>
</template>

<style lang="scss" scoped>
.setting-input-wrapper {
  width: 100%;
}

.setting-input {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  background: var(--input-bg, rgba(0, 0, 0, 0.05));
  border: 1px solid var(--input-border, rgba(255, 255, 255, 0.08));
  color: var(--text-primary);
  font-size: 13px;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    color 0.2s ease;
  outline: none;

  &:hover:not(:disabled) {
    border-color: var(--accent-color);
  }

  &:focus {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px var(--accent-light);
  }

  &::placeholder {
    color: var(--text-muted);
    font-size: 12px;
  }
}
</style>
