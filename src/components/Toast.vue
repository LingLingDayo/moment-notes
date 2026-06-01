<script lang="ts" setup>
import { computed } from 'vue';
import { useStickyNotesStore } from '../stores/stickyNotes';
import { CheckCircle2, Info, AlertTriangle, XCircle } from 'lucide-vue-next';

const store = useStickyNotesStore();

const isVisible = computed(() => !!store.toastMessage);
const message = computed(() => store.toastMessage);
const type = computed(() => store.toastType);

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
  <Transition name="toast">
    <div v-if="isVisible" class="toast-container" :class="[`toast-${type}`]">
      <component :is="iconComponent" class="toast-icon" />
      <span class="toast-text">{{ message }}</span>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.toast-container {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  max-width: 90%;
  pointer-events: none;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.toast-text {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.2px;
}

// 各种类型的样式定义
.toast-success {
  background: rgba(16, 185, 129, 0.85); // Emerald 500
  color: #ffffff;
  .toast-icon {
    color: #ffffff;
  }
}

.toast-info {
  background: rgba(59, 130, 246, 0.85); // Blue 500
  color: #ffffff;
  .toast-icon {
    color: #ffffff;
  }
}

.toast-warning {
  background: rgba(245, 158, 11, 0.85); // Amber 500
  color: #ffffff;
  .toast-icon {
    color: #ffffff;
  }
}

.toast-error {
  background: rgba(239, 68, 68, 0.85); // Red 500
  color: #ffffff;
  .toast-icon {
    color: #ffffff;
  }
}
</style>
