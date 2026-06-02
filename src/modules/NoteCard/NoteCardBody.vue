<script lang="ts" setup>
import { ref, watch, nextTick } from 'vue';
import { Note } from '@type';

const props = defineProps<{
  note: Note;
  isEditing: boolean;
}>();

const content = defineModel<string>('content', { default: '' });

const emit = defineEmits<{
  (e: 'cancel-edit'): void;
  (e: 'save-edit'): void;
}>();

const contentInputRef = ref<HTMLTextAreaElement | null>(null);

// 自适应调整输入框高度
const adjustTextareaHeight = () => {
  const el = contentInputRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
};

// 监听编辑状态，自动聚焦并调整高度
watch(() => props.isEditing, async (newVal) => {
  if (newVal) {
    await nextTick();
    contentInputRef.value?.focus();
    adjustTextareaHeight();
  }
});
</script>

<template>
  <div class="card-body" :class="{ 'is-view-mode': !isEditing }">
    <textarea 
      v-if="isEditing"
      ref="contentInputRef"
      v-model="content"
      placeholder="写点什么..."
      class="content-textarea"
      @keydown.esc="emit('cancel-edit')"
      @keydown.ctrl.enter="emit('save-edit')"
      @input="adjustTextareaHeight"
    ></textarea>
    <template v-else>
      <div class="card-body-content">
        <pre class="card-content">{{ note.content || '双击粘贴，点击右上角编辑...' }}</pre>
      </div>
      <!-- 便签标签展示 -->
      <div v-if="note.tags && note.tags.length > 0" class="note-tags-list">
        <span 
          v-for="tag in note.tags" 
          :key="tag" 
          class="note-tag-badge"
          :data-tooltip="tag"
        >
          # {{ tag }}
        </span>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.card-body {
  flex: 1;
  min-height: 32px;
  padding-top: 4px;
  padding-bottom: 8px;
  overflow-y: auto;

  &.is-view-mode {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
}

.card-body-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

.card-content {
  font-family: var(--font-sans);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  overflow-wrap: break-word;
}

.content-textarea {
  width: 100%;
  height: 100%;
  min-height: 100px;
  max-height: 260px;
  overflow-y: auto;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.6;
  color: inherit;
  resize: vertical;

  &:focus {
    background: var(--input-bg);
    border-color: var(--card-text);

    .dark-theme & {
      border-color: var(--card-text-dark);
    }
  }
}

.note-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
  flex-shrink: 0;
  max-height: 48px;
  overflow: hidden;
}

.note-tag-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 99px;
  font-weight: 500;
  background: var(--badge-bg);
  border: 1px solid var(--popover-border);
  color: inherit;
  opacity: 0.85;

  max-width: 100%;
  display: -webkit-inline-box;
  -webkit-box-orient: vertical;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-all;
  white-space: normal;
}
</style>
