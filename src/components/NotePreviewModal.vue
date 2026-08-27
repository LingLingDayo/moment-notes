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
      <div
        v-if="isVisible && note"
        class="note-preview-overlay"
        :class="{ 'is-immersive': store.enableImmersiveFullscreen }"
        @click="close"
      >
        <!-- 页面右上角圆形的灰色背景关闭按钮 -->
        <button
          class="page-close-btn"
          data-tooltip="关闭全屏 (Esc)"
          @click.stop="close"
        >
          <X class="close-icon" />
        </button>

        <div
          class="note-preview-content"
          :class="{ 'is-immersive': store.enableImmersiveFullscreen }"
          @click.stop
        >
          <NoteCard
            :note="note"
            :is-full-screen="true"
            :is-immersive-full-screen="store.enableImmersiveFullscreen"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
.note-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: $z-index-modal-level1;
  background: var(--modal-overlay-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: text;

  &.is-immersive {
    background: transparent;
  }
}

.page-close-btn {
  @include overlay-close-btn;
}

.note-preview-content {
  display: flex;
  align-items: center;
  justify-content: center;

  &.is-immersive {
    width: 100%;
    height: 100%;
  }
}

.preview-modal-fade-enter-active,
.preview-modal-fade-leave-active {
  transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: opacity;

  .note-preview-content {
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
    will-change: transform, opacity;
  }
}

.preview-modal-fade-enter-from,
.preview-modal-fade-leave-to {
  opacity: 0;

  .note-preview-content {
    transform: scale(0.92) translate3d(0, 12px, 0);
    opacity: 0;
  }
}
</style>
