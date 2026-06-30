<script lang="ts" setup>
import { ref, nextTick } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { Plus, Check, X } from 'lucide-vue-next';

const store = useStickyNotesStore();

// 是否处于新增分类的编辑状态
const isAdding = defineModel<boolean>('isAdding', { default: false });
const newCategoryName = ref('');
const addInputRef = ref<HTMLInputElement | null>(null);

// 开启新增
const startAdd = async () => {
  isAdding.value = true;
  newCategoryName.value = '分类';
  await nextTick();
  if (addInputRef.value) {
    addInputRef.value.focus();
    addInputRef.value.select();
  }
};

// 取消新增
const cancelAdd = () => {
  isAdding.value = false;
  newCategoryName.value = '';
};

// 提交新增
const submitAdd = () => {
  if (!isAdding.value) return;
  const name = newCategoryName.value.trim();
  if (name) {
    store.addCategory(name);
    store.showToast(`已成功创建分类 "${name}"`);
    isAdding.value = false;
    newCategoryName.value = '';
  } else {
    cancelAdd();
  }
};
</script>

<template>
  <div class="category-add-container">
    <div v-if="isAdding" class="add-category-input-wrapper">
      <input
        ref="addInputRef"
        v-model="newCategoryName"
        type="text"
        placeholder="分类名称..."
        class="add-input"
        @keyup.enter="submitAdd"
        @keyup.esc="cancelAdd"
        @blur="submitAdd"
      />
      <div class="add-actions">
        <button class="add-confirm-btn" @mousedown.prevent @click="submitAdd">
          <Check class="btn-icon" />
        </button>
        <button class="add-cancel-btn" @mousedown.prevent @click="cancelAdd">
          <X class="btn-icon" />
        </button>
      </div>
    </div>

    <button v-else class="add-category-btn" @click="startAdd">
      <Plus class="add-icon" />
      <span>添加新分类</span>
    </button>
  </div>
</template>

<style lang="scss" scoped>
.category-add-container {
  width: 100%;
  height: 36px;

  @media (max-width: 1049px) {
    height: 34px;
  }
}

.add-category-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 100%;
  padding: 0 10px;
  border-radius: 10px;
  background: var(--accent-light);
  color: var(--accent-color);
  font-size: 13px;
  font-weight: 600;
  border: 1px dashed var(--accent-border-dashed);
  transition: all 0.2s ease;

  &:hover {
    background: var(--accent-color);
    color: var(--text-on-accent);
    border-color: transparent;
  }

  .add-icon {
    width: 15px;
    height: 15px;
  }
}

.add-category-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 100%;
}

.add-input {
  flex: 1;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 8px;
  height: 100%;
  padding: 0 12px;
  font-size: 13px;
  color: var(--text-primary);
  width: 100%;

  &:focus {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px var(--accent-light);
  }
}

.add-actions {
  display: flex;
  gap: 4px;
  height: 100%;
}

.add-confirm-btn,
.add-cancel-btn {
  height: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  .btn-icon {
    width: 14px;
    height: 14px;
  }
}

.add-confirm-btn {
  background: var(--accent-color);
  color: var(--text-on-accent);
  &:hover {
    background: var(--accent-hover);
  }
}

.add-cancel-btn {
  background: var(--btn-bg);
  color: var(--text-secondary);
  border: 1px solid var(--btn-border);
  &:hover {
    background: var(--btn-hover-bg);
    color: var(--btn-hover-color);
    border-color: var(--btn-hover-border);
  }
}
</style>
