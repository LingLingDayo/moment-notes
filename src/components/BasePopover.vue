<script lang="ts" setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    title?: string;
    width?: string;
    placement?: 'top' | 'bottom' | 'auto';
    align?: 'left' | 'right';
  }>(),
  {
    title: '',
    width: '140px',
    placement: 'auto',
    align: 'right'
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const wrapperRef = ref<HTMLElement | null>(null);
const popoverPlacement = ref<'top' | 'bottom'>('top');

// 计算智能反转方向
const updatePlacement = () => {
  if (props.placement !== 'auto') {
    popoverPlacement.value = props.placement;
    return;
  }

  if (wrapperRef.value) {
    const rect = wrapperRef.value.getBoundingClientRect();
    // 如果上方可用距离小于 200px，自动在下方显示
    if (rect.top < 200) {
      popoverPlacement.value = 'bottom';
    } else {
      popoverPlacement.value = 'top';
    }
  }
};

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      updatePlacement();
    }
  }
);

const handleDocumentClick = (e: MouseEvent) => {
  if (!props.isOpen) return;
  const target = e.target as HTMLElement;
  if (wrapperRef.value && !wrapperRef.value.contains(target)) {
    emit('close');
  }
};

onMounted(() => {
  document.addEventListener('click', handleDocumentClick, true);
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick, true);
});
</script>

<template>
  <div ref="wrapperRef" class="base-popover-wrapper" @click.stop>
    <!-- 触发目标按钮区域插槽 -->
    <slot name="trigger"></slot>

    <!-- Popover 浮层内容 -->
    <Transition name="popover-fade">
      <div
        v-if="isOpen"
        class="base-popover-panel"
        :class="[
          `placement-${popoverPlacement}`,
          `align-${align}`
        ]"
        :style="{ width }"
      >
        <div v-if="title || $slots.header" class="popover-header">
          <slot name="header">
            <span class="popover-title-text">{{ title }}</span>
          </slot>
        </div>

        <div class="popover-content">
          <slot></slot>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
.base-popover-wrapper {
  position: relative;
  display: inline-block;
}

.base-popover-panel {
  position: absolute;
  background: var(--popover-bg);
  border: 1px solid var(--popover-border);
  padding: 8px;
  border-radius: 12px;
  box-shadow: var(--popover-shadow);
  z-index: $z-index-popover;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);

  &.align-right {
    right: 0;
  }

  &.align-left {
    left: 0;
  }

  &.placement-top {
    bottom: calc(100% + 8px);
  }

  &.placement-bottom {
    top: calc(100% + 8px);
  }
}

.popover-header {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  margin-bottom: 6px;
  padding: 0 4px;
}

.popover-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

// 动效
.popover-fade-enter-active,
.popover-fade-leave-active {
  transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

.placement-top.popover-fade-enter-from,
.placement-top.popover-fade-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.95);
}

.placement-bottom.popover-fade-enter-from,
.placement-bottom.popover-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}
</style>
