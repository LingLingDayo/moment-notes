<script lang="ts" setup>
import { ref, watch, nextTick } from 'vue';
import { Note } from '../../types';

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
  <div class="card-body">
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
      <pre class="card-content">{{ note.content || '双击粘贴，点击右上角编辑...' }}</pre>
      <!-- 便签标签展示 -->
      <div v-if="note.tags && note.tags.length > 0" class="note-tags-list">
        <span v-for="tag in note.tags" :key="tag" class="note-tag-badge">
          # {{ tag }}
        </span>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.card-body {
  flex: 1;
  overflow-y: auto;
  min-height: 60px;
  padding-top: 4px;
  padding-bottom: 8px;
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
  margin-top: 4px;
}

.note-tag-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 99px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  background: var(--badge-bg);
  border: 1px solid var(--popover-border);
  color: inherit;
  opacity: 0.85;
}
</style>
