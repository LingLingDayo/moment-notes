<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Pin, X } from '@lucide/vue';
import NoteCard from '@modules/NoteCard/NoteCard.vue';
import Toast from '@components/Toast.vue';
import ConfirmModal from '@components/ConfirmModal.vue';
import ImagePreviewModal from '@components/ImagePreviewModal.vue';
import { COLOR_PRESETS, useStickyNotesStore } from '@stores/stickyNotes';
import { isUTools } from '@utils/storage';
import { eventBus } from '../domain/events/DomainEventBus';
import { getDetachedNoteId } from '../infrastructure/windows/detachedNoteWindow';
import type { Note } from '@type';

const store = useStickyNotesStore();
const noteId = getDetachedNoteId();
const isReady = ref(false);
const isAlwaysOnTop = ref(false);
const unsubscribeCallbacks: Array<() => void> = [];

const note = computed(() => {
  if (!noteId) return null;
  return store.allNotes.find(item => item.id === noteId && !item.isDeleted) || null;
});

const windowColorStyle = computed(() => {
  const preset = COLOR_PRESETS[note.value?.color || 'yellow'] || COLOR_PRESETS.yellow;
  return {
    '--detached-note-bg': preset.lightBg,
    '--detached-note-bg-dark': preset.darkBg,
    '--detached-note-border': preset.lightBorder,
    '--detached-note-border-dark': preset.darkBorder,
    '--detached-note-text': preset.lightText,
    '--detached-note-text-dark': preset.darkText,
    '--detached-note-btn-hover-bg': preset.lightBtnHoverBg,
    '--detached-note-btn-hover-color': preset.lightBtnHoverColor,
    '--detached-note-btn-hover-bg-dark': preset.darkBtnHoverBg,
    '--detached-note-btn-hover-color-dark': preset.darkBtnHoverColor
  };
});

const closeWindow = () => {
  window.close();
};

const toggleAlwaysOnTop = () => {
  if (!noteId || !isUTools() || !window.services?.detachedNote) return;
  isAlwaysOnTop.value = !isAlwaysOnTop.value;
  window.services.detachedNote.requestAlwaysOnTop(noteId, isAlwaysOnTop.value);
};

const notifyParentChanged = () => {
  if (!noteId || !isUTools() || !window.services?.detachedNote) return;
  window.services.detachedNote.notifyParentChanged(noteId);
};

onMounted(() => {
  document.documentElement.classList.add('detached-note-window');
  document.body.classList.add('detached-note-window');

  store.loadData();
  store.initTheme(isUTools());
  isReady.value = true;

  if (isUTools() && window.services?.detachedNote && noteId) {
    // 挂载后触发一次瞬时置顶属性重置，强迫 Windows DWM 在页面加载后重算并剥离系统默认灰色边框
    window.services.detachedNote.requestAlwaysOnTop(noteId, true);
    window.setTimeout(() => {
      if (!isAlwaysOnTop.value && window.services?.detachedNote && noteId) {
        window.services.detachedNote.requestAlwaysOnTop(noteId, false);
      }
    }, 50);
  }

  if (isUTools() && window.services?.detachedNote) {
    unsubscribeCallbacks.push(
      window.services.detachedNote.onRefreshRequested(() => {
        store.reloadNotes();
      })
    );
  } else {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'sticky_notes_notes') {
        store.reloadNotes();
      }
    };
    window.addEventListener('storage', handleStorage);
    unsubscribeCallbacks.push(() => window.removeEventListener('storage', handleStorage));
  }

  unsubscribeCallbacks.push(
    eventBus.subscribe<Note>('NOTE_UPDATED', event => {
      if (event.payload.id === noteId) {
        notifyParentChanged();
      }
    }),
    eventBus.subscribe<string>('NOTE_DELETED', event => {
      if (event.payload !== noteId) return;
      notifyParentChanged();
      window.setTimeout(closeWindow, 0);
    })
  );
});

onUnmounted(() => {
  unsubscribeCallbacks.splice(0).forEach(unsubscribe => unsubscribe());
  document.documentElement.classList.remove('detached-note-window');
  document.body.classList.remove('detached-note-window');
});
</script>

<template>
  <main class="detached-note-shell" :style="windowColorStyle">
    <div class="window-drag-region" aria-hidden="true"></div>

    <div class="window-controls">
      <button
        v-if="isUTools()"
        class="window-control pin-btn"
        :class="{ active: isAlwaysOnTop }"
        :aria-label="isAlwaysOnTop ? '取消窗口置顶' : '窗口置顶'"
        :data-tooltip="isAlwaysOnTop ? '取消窗口置顶' : '窗口置顶'"
        @click="toggleAlwaysOnTop"
      >
        <Pin class="window-control-icon pin-icon" />
      </button>
      <button
        class="window-control close-btn"
        aria-label="关闭便签"
        data-tooltip="关闭便签"
        @click="closeWindow"
      >
        <X class="window-control-icon" />
      </button>
    </div>

    <div v-if="isReady && note" class="note-window-content">
      <NoteCard :note="note" :is-full-screen="true" />
    </div>

    <div v-else-if="isReady" class="note-missing-state">
      <p>便签不存在或已被删除</p>
      <button class="close-missing-btn" @click="closeWindow">
        关闭
      </button>
    </div>

    <Toast />
    <ConfirmModal />
    <ImagePreviewModal />
  </main>
</template>

<style lang="scss" scoped>
:global(html.detached-note-window),
:global(body.detached-note-window) {
  background: transparent !important;
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: none !important;
}

.detached-note-shell {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  border-radius: $radius-xl;
  box-sizing: border-box;
  background: var(--detached-note-bg);
  border: 1px solid var(--detached-note-border);
  color: var(--text-primary);
  box-shadow: none;

  .dark-theme &,
  &.dark-theme {
    background: var(--detached-note-bg-dark);
    border-color: var(--detached-note-border-dark);
    box-shadow: none;
  }
}

.window-drag-region {
  position: absolute;
  inset: 0 84px auto 0;
  height: 42px;
  z-index: 120;
  -webkit-app-region: drag;
}

.window-controls {
  position: absolute;
  top: 10px;
  right: 12px;
  z-index: 130;
  display: flex;
  align-items: center;
  gap: 8px;
  -webkit-app-region: no-drag;
}

.window-control {
  width: 28px;
  height: 28px;
  padding: 6px;
  border-radius: $radius-round;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--detached-note-border);
  color: var(--detached-note-text);
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.2s, color 0.2s;

  .dark-theme & {
    background: var(--detached-note-border-dark);
    color: var(--detached-note-text-dark);
  }

  &.pin-btn {
    &:hover {
      transform: scale(1.1) rotate(15deg);
      background: var(--detached-note-btn-hover-bg);
      color: var(--detached-note-btn-hover-color);

      .dark-theme & {
        background: var(--detached-note-btn-hover-bg-dark);
        color: var(--detached-note-btn-hover-color-dark);
      }
    }

    &.active {
      transform: scale(1.05);
      background: var(--detached-note-btn-hover-bg);
      color: var(--detached-note-btn-hover-color);

      .dark-theme & {
        background: var(--detached-note-btn-hover-bg-dark);
        color: var(--detached-note-btn-hover-color-dark);
      }

      .pin-icon {
        transform: rotate(45deg);
        fill: currentColor;
      }
    }
  }

  &.close-btn {
    &:hover {
      transform: scale(1.1);
      background: var(--danger-hover-bg);
      color: var(--danger-color);
    }
  }
}

.window-control-icon {
  width: 14px;
  height: 14px;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.note-window-content {
  width: 100%;
  height: 100%;
}

.note-window-content :deep(.note-card.is-full-screen) {
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding-top: 48px;
}

.note-window-content :deep(.absolute-edit-btn) {
  top: 46px;
}

.note-missing-state {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-secondary);
}

.close-missing-btn {
  padding: 7px 16px;
  border-radius: 7px;
  background: var(--btn-bg);
  border: 1px solid var(--btn-border);
  color: var(--text-primary);

  &:hover {
    background: var(--btn-hover-bg);
    border-color: var(--btn-hover-border);
  }
}
</style>
