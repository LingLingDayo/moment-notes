<script lang="ts" setup>
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    width?: string;
    minWidth?: string;
    variant?: 'primary' | 'danger' | 'secondary';
    disabled?: boolean;
    color?: string; // 自定义颜色主题，如 '#6366f1', 'rgb(239, 68, 68)' 等
  }>(),
  {
    variant: 'primary',
    disabled: false,
    width: undefined,
    minWidth: undefined,
    color: undefined
  }
);

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

const buttonStyle = computed(() => {
  const style: Record<string, string> = {};
  if (props.width) {
    style.width = props.width;
  }
  if (props.minWidth) {
    style.minWidth = props.minWidth;
  }
  if (props.color) {
    style['--custom-btn-color'] = props.color;
  }
  return style;
});
</script>

<template>
  <button
    class="setting-btn"
    :class="[
      `variant-${variant}`,
      { 'has-custom-color': !!color }
    ]"
    :style="buttonStyle"
    :disabled="disabled"
    @click="emit('click', $event)"
  >
    <slot></slot>
  </button>
</template>

<style lang="scss" scoped>
.setting-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.2s ease, filter 0.2s ease, background-color 0.2s ease;
  cursor: pointer;
  box-sizing: border-box;

  /* Primary 风格 */
  &.variant-primary {
    background: var(--accent-color);
    color: #ffffff;
    box-shadow: 0 4px 10px -2px rgba(99, 102, 241, 0.25);

    &:hover:not(:disabled) {
      background: var(--accent-hover);
      transform: translateY(-1px);
      box-shadow: 0 6px 14px -2px rgba(99, 102, 241, 0.35);
    }
  }

  /* Danger 风格 */
  &.variant-danger {
    background: var(--danger-color, #ff4d4f);
    color: #ffffff;
    box-shadow: 0 4px 10px -2px rgba(255, 77, 79, 0.2);

    &:hover:not(:disabled) {
      background: #ff7875;
      transform: translateY(-1px);
      box-shadow: 0 6px 14px -2px rgba(255, 77, 79, 0.3);
    }
  }

  /* Secondary 风格 */
  &.variant-secondary {
    background: var(--btn-bg, rgba(255, 255, 255, 0.03));
    border-color: var(--btn-border, rgba(255, 255, 255, 0.05));
    color: var(--text-secondary);

    &:hover:not(:disabled) {
      background: var(--btn-hover-bg, rgba(255, 255, 255, 0.08));
      color: var(--text-primary);
      border-color: var(--btn-hover-border, rgba(255, 255, 255, 0.1));
      transform: translateY(-1px);
    }
  }

  /* 自定义颜色主题 */
  &.has-custom-color {
    background: var(--custom-btn-color) !important;
    border-color: transparent !important;
    color: #ffffff !important;
    /* 利用 drop-shadow 或简单的半透明阴影，在 CSS 中用 drop-shadow 能让阴影自动贴合元素 */
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.15));

    &:hover:not(:disabled) {
      filter: brightness(1.1) drop-shadow(0 6px 10px rgba(0, 0, 0, 0.2));
      transform: translateY(-1px);
    }

    &:active:not(:disabled) {
      filter: brightness(0.9) drop-shadow(0 3px 5px rgba(0, 0, 0, 0.15));
      transform: translateY(0);
    }
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none !important;
    filter: none !important;
  }

  /* 统一处理插槽内图标的尺寸 */
  :deep(.control-icon) {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
}
</style>
