<script lang="ts" setup>
import { computed } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { CheckCircle2, Info, AlertTriangle, XCircle } from 'lucide-vue-next';

const store = useStickyNotesStore();

const isVisible = computed(() => !!store.toastMessage);
const message = computed(() => store.toastMessage);
const type = computed(() => store.toastType);
const position = computed(() => store.toastPosition);

const iconComponent = computed(() => {
  switch (type.value) {
    case 'success':
      return CheckCircle2;
    case 'info':
      return Info;
    case 'warning':
      return AlertTriangle;
    case 'error':
      return XCircle;
    default:
      return Info;
  }
});
</script>

<template>
  <Transition :name="`toast-${position}`">
    <div
      v-if="isVisible"
      class="toast-container"
      :class="[`toast-${type}`, `position-${position}`]"
    >
      <component :is="iconComponent" class="toast-icon" />
      <span class="toast-text">{{ message }}</span>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.toast-container {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-radius: 12px;
  box-shadow: var(--popover-shadow);
  z-index: 9999;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid transparent;
  max-width: 90%;
  pointer-events: none;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  &.position-top {
    top: 64px;
  }

  &.position-bottom {
    bottom: 24px;
  }
}

.toast-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.toast-text {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

// 各种类型的样式定义
.toast-success {
  background: var(--toast-success-bg);
  border-color: var(--toast-success-border);
  color: var(--toast-success-text);
  .toast-icon {
    color: var(--toast-success-text);
  }
}

.toast-info {
  background: var(--toast-info-bg);
  border-color: var(--toast-info-border);
  color: var(--toast-info-text);
  .toast-icon {
    color: var(--toast-info-text);
  }
}

.toast-warning {
  background: var(--toast-warning-bg);
  border-color: var(--toast-warning-border);
  color: var(--toast-warning-text);
  .toast-icon {
    color: var(--toast-warning-text);
  }
}

.toast-error {
  background: var(--toast-error-bg);
  border-color: var(--toast-error-border);
  color: var(--toast-error-text);
  .toast-icon {
    color: var(--toast-error-text);
  }
}

// 顶部 Toast 过渡动效
.toast-container.toast-top-enter-active,
.toast-container.toast-top-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-container.toast-top-enter-from {
  transform: translate(-50%, -30px) scale(0.9);
  opacity: 0;
}
.toast-container.toast-top-leave-to {
  transform: translate(-50%, -20px) scale(0.95);
  opacity: 0;
}

// 底部 Toast 过渡动效
.toast-container.toast-bottom-enter-active,
.toast-container.toast-bottom-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-container.toast-bottom-enter-from {
  transform: translate(-50%, 30px) scale(0.9);
  opacity: 0;
}
.toast-container.toast-bottom-leave-to {
  transform: translate(-50%, 20px) scale(0.95);
  opacity: 0;
}
</style>
