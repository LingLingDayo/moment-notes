<script lang="ts" setup>
import { computed } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { AlertTriangle } from 'lucide-vue-next';

const store = useStickyNotesStore();

const isVisible = computed(() => store.confirmState.show);
const title = computed(() => store.confirmState.title || '操作确认');
const message = computed(() => store.confirmState.message || '确定要进行此操作吗？');

const cancel = () => {
  store.handleConfirmResult(false);
};

const confirm = () => {
  store.handleConfirmResult(true);
};
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="isVisible" class="modal-overlay" @click="cancel">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <div class="warning-icon-wrapper">
            <AlertTriangle class="warning-icon" />
          </div>
          <h3 class="modal-title">{{ title }}</h3>
        </div>
        
        <div class="modal-body">
          <p class="modal-message">{{ message }}</p>
        </div>
        
        <div class="modal-footer">
          <button class="modal-btn cancel" @click="cancel">取消</button>
          <button class="modal-btn confirm" @click="confirm">确定</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: var(--modal-overlay-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
}

.modal-container {
  width: 90%;
  max-width: 360px;
  border-radius: 20px;
  padding: 24px;
  background: var(--popover-bg);
  border: 1px solid var(--popover-border);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: 16px;
  transform: translateY(0);
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.warning-icon-wrapper {
  padding: 8px;
  border-radius: 12px;
  background: var(--warning-bg);
  color: var(--warning-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.warning-icon {
  width: 20px;
  height: 20px;
}

.modal-title {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.modal-body {
  padding-left: 2px;
}

.modal-message {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 6px;
}

.modal-btn {
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  
  &.cancel {
    background: var(--btn-bg);
    border: 1px solid var(--btn-border);
    color: var(--text-secondary);

    &:hover {
      background: var(--btn-hover-bg);
      color: var(--btn-hover-color);
      border-color: var(--btn-hover-border);
    }
  }

  &.confirm {
    background: var(--danger-color);
    color: var(--text-on-accent);
    box-shadow: 0 4px 12px -2px var(--danger-hover-border);

    &:hover {
      opacity: 0.9;
      box-shadow: 0 6px 16px -2px var(--danger-hover-border);
    }
  }
}

// 弹窗过渡动画
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  
  .modal-container {
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  
  .modal-container {
    transform: scale(0.9) translateY(10px);
    opacity: 0;
  }
}
</style>
