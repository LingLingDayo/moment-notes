<script lang="ts" setup>
import { ref } from 'vue';

const tags = defineModel<string[]>('tags', { default: () => [] });

const newTagInput = ref('');

const addTag = () => {
  let tag = newTagInput.value.replace(/，/g, ',').trim();
  if (tag.endsWith(',')) {
    tag = tag.slice(0, -1).trim();
  }
  if (tag) {
    const tagsToAdd = tag.split(',').map(t => t.trim()).filter(Boolean);
    tagsToAdd.forEach(t => {
      if (!tags.value.includes(t)) {
        tags.value.push(t);
      }
    });
  }
  newTagInput.value = '';
};

const removeTag = (index: number) => {
  tags.value.splice(index, 1);
};

// 暴露 addTag 方法供父组件在保存时调用，以便在点击保存前将未按回车的文本也作为标签录入
defineExpose({
  addTag
});
</script>

<template>
  <div class="tags-editor" @click.stop>
    <div v-for="(tag, idx) in tags" :key="idx" class="edit-tag-badge">
      <span>{{ tag }}</span>
      <button class="delete-tag-btn" title="删除标签" @click.stop="removeTag(idx)">×</button>
    </div>
    <input 
      v-model="newTagInput"
      type="text"
      placeholder="+ 添加标签 (按回车或逗号键)"
      class="tag-input"
      @keydown.enter.prevent="addTag"
      @keydown.comma.prevent="addTag"
      @blur="addTag"
    />
  </div>
</template>

<style lang="scss" scoped>
.tags-editor {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px dashed var(--popover-border);
  margin-bottom: 6px;
}

.edit-tag-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--badge-bg);
  border: 1px solid var(--popover-border);
  color: inherit;

  .delete-tag-btn {
    border: none;
    background: transparent;
    color: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 2px;
    opacity: 0.6;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;
    }
  }
}

.tag-input {
  border: none;
  background: var(--badge-bg);
  border: 1px dashed var(--popover-border);
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 11px;
  color: inherit;
  flex: 1;
  min-width: 80px;

  &:focus {
    border-style: solid;
    border-color: var(--card-text);
    outline: none;

    .dark-theme & {
      border-color: var(--card-text-dark);
    }
  }

  &::placeholder {
    color: inherit;
    opacity: 0.5;
  }
}
</style>
