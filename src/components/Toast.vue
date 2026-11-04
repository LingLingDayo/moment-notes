<script lang="ts" setup>
import { computed } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { CheckCircle2, Info, AlertTriangle, XCircle } from '@lucide/vue';

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
      <div class="toast-icon-wrapper">
        <component :is="iconComponent" class="toast-icon" :size="14" :stroke-width="2.2" />
      </div>
      <span class="toast-text">{{ message }}</span>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.toast-container {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px 6px 12px;
  border-radius: 9999px;
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  box-shadow: var(--toast-shadow, var(--shadow-md));
  z-index: $z-index-toast;
  border: 1px solid transparent;
  max-width: min(90vw, 420px);
  pointer-events: none;
  user-select: none;
  line-height: 1.4;

  &.position-top {
    top: 58px;
  }

  &.position-bottom {
    bottom: 24px;
  }
}

.toast-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.toast-icon {
  width: 14px;
  height: 14px;
  display: block;
}

.toast-text {
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: 0.15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

// 各种类型的样式定义
.toast-success {
  background: var(--toast-success-bg);
  border-color: var(--toast-success-border);
  color: var(--toast-success-text);
  .toast-icon {
    color: var(--toast-success-icon, var(--toast-success-text));
  }
}

.toast-info {
  background: var(--toast-info-bg);
  border-color: var(--toast-info-border);
  color: var(--toast-info-text);
  .toast-icon {
    color: var(--toast-info-icon, var(--toast-info-text));
  }
}

.toast-warning {
  background: var(--toast-warning-bg);
  border-color: var(--toast-warning-border);
  color: var(--toast-warning-text);
  .toast-icon {
    color: var(--toast-warning-icon, var(--toast-warning-text));
  }
}

.toast-error {
  background: var(--toast-error-bg);
  border-color: var(--toast-error-border);
  color: var(--toast-error-text);
  .toast-icon {
    color: var(--toast-error-icon, var(--toast-error-text));
  }
}

// 顶部 Toast 过渡动效
.toast-container.toast-top-enter-active {
  transition:
    opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.22s cubic-bezier(0.16, 1, 0.3, 1),
    filter 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-container.toast-top-leave-active {
  transition:
    opacity 0.18s cubic-bezier(0.4, 0, 1, 1),
    transform 0.18s cubic-bezier(0.4, 0, 1, 1),
    filter 0.18s cubic-bezier(0.4, 0, 1, 1);
}
.toast-container.toast-top-enter-from {
  transform: translate(-50%, -10px) scale(0.96);
  opacity: 0;
  filter: blur(2px);
}
.toast-container.toast-top-leave-to {
  transform: translate(-50%, -6px) scale(0.98);
  opacity: 0;
  filter: blur(2px);
}

// 底部 Toast 过渡动效
.toast-container.toast-bottom-enter-active {
  transition:
    opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.22s cubic-bezier(0.16, 1, 0.3, 1),
    filter 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-container.toast-bottom-leave-active {
  transition:
    opacity 0.18s cubic-bezier(0.4, 0, 1, 1),
    transform 0.18s cubic-bezier(0.4, 0, 1, 1),
    filter 0.18s cubic-bezier(0.4, 0, 1, 1);
}
.toast-container.toast-bottom-enter-from {
  transform: translate(-50%, 10px) scale(0.96);
  opacity: 0;
  filter: blur(2px);
}
.toast-container.toast-bottom-leave-to {
  transform: translate(-50%, 6px) scale(0.98);
  opacity: 0;
  filter: blur(2px);
}
</style>
