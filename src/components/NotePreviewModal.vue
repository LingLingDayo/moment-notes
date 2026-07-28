<script lang="ts" setup>
import { computed, onMounted, onUnmounted } from 'vue';
import { X } from '@lucide/vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import NoteCard from '@modules/NoteCard/NoteCard.vue';

const store = useStickyNotesStore();

const note = computed(() => {
  if (!store.previewNoteId) return null;
  return store.allNotes.find(n => n.id === store.previewNoteId) || null;
});

const isVisible = computed(() => !!note.value);

const close = () => {
  store.closeNotePreview();
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (!isVisible.value) return;
  if (e.key === 'Escape') {
    close();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="preview-modal-fade">
      <div v-if="isVisible && note" class="note-preview-overlay" @click="close">
        <!-- 页面右上角圆形的灰色背景关闭按钮 -->
        <button
          class="page-close-btn"
          data-tooltip="关闭全屏 (Esc)"
          @click.stop="close"
        >
          <X class="close-icon" />
        </button>

        <div class="note-preview-content" @click.stop>
          <NoteCard :note="note" :is-full-screen="true" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
.note-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 9990;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: text;
}

// 页面右上角的圆形灰色关闭按钮
.page-close-btn {
  position: fixed;
  top: 24px;
  right: 28px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  .light-theme & {
    background: rgba(0, 0, 0, 0.25);
    border-color: rgba(0, 0, 0, 0.1);
  }

  &:hover {
    background: rgba(239, 68, 68, 0.9);
    border-color: rgba(239, 68, 68, 0.9);
    color: #ffffff;
    transform: scale(1.1);
  }

  .close-icon {
    width: 18px;
    height: 18px;
  }
}

.note-preview-content {
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-modal-fade-enter-active,
.preview-modal-fade-leave-active {
  transition: opacity 0.22s ease;

  .note-preview-content {
    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  }
}

.preview-modal-fade-enter-from,
.preview-modal-fade-leave-to {
  opacity: 0;

  .note-preview-content {
    transform: scale(0.96);
  }
}
</style>
