<script lang="ts" setup>
import { ref, computed } from 'vue';
import { Palette, FolderInput, Check, Copy, Trash2 } from 'lucide-vue-next';
import { Note } from '../../types';
import { useStickyNotesStore, COLOR_PRESETS } from '../../stores/stickyNotes';
import { isUTools } from '../../utils/storage';

const props = defineProps<{
  note: Note;
  isEditing: boolean;
}>();

const emit = defineEmits<{
  (e: 'save-edit'): void;
  (e: 'cancel-edit'): void;
}>();

const store = useStickyNotesStore();

// 是否显示颜色选择面板
const showColorPicker = ref(false);
// 是否显示移动分类面板
const showFolderPicker = ref(false);

const closePopovers = () => {
  showColorPicker.value = false;
  showFolderPicker.value = false;
};

// 暴露 closePopovers 方法给父组件调用
defineExpose({
  closePopovers
});

// 格式化时间显示
const formattedTime = computed(() => {
  const date = new Date(props.note.updatedAt);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
});

// 复制便签内容逻辑
const copyNoteContent = async () => {
  try {
    if (isUTools()) {
      window.utools.copyText(props.note.content);
    } else {
      await navigator.clipboard.writeText(props.note.content);
    }
    store.showToast('已复制便签内容', 'success');
  } catch (err) {
    console.error('Failed to copy:', err);
    store.showToast('复制失败', 'error');
  }
};

// 更改颜色
const changeColor = (colorName: string) => {
  store.updateNote(props.note.id, { color: colorName });
  showColorPicker.value = false;
};

// 移动分类
const moveCategory = (catId: string) => {
  store.updateNote(props.note.id, { categoryId: catId });
  showFolderPicker.value = false;
  const cat = store.categories.find(c => c.id === catId);
  store.showToast(`已移至分类 "${cat?.name || '默认'}"`);
};

// 删除便签
const deleteSelf = async () => {
  const ok = await store.askConfirm(
    '确认删除便签',
    '确定要删除这张便签吗？此操作无法撤销。'
  );
  if (ok) {
    store.deleteNote(props.note.id);
    store.showToast('便签已删除');
  }
};
</script>

<template>
  <!-- 编辑态底部的保存/取消按钮 -->
  <div v-if="isEditing" class="edit-footer" @click.stop>
    <button class="edit-btn cancel" @click="emit('cancel-edit')">取消</button>
    <button class="edit-btn save" @click="emit('save-edit')">保存</button>
  </div>

  <!-- 卡片底部信息及悬浮工具栏 (非编辑态) -->
  <div v-else class="card-footer" @click.stop>
    <span class="updated-time">{{ formattedTime }} · {{ note.content.length }} 字</span>
    
    <div class="card-actions">
      <!-- 换色调色盘 -->
      <div class="action-popover-wrapper">
        <button class="action-btn" title="更改颜色" @click="showColorPicker = !showColorPicker; showFolderPicker = false">
          <Palette class="action-icon" />
        </button>
        
        <div v-if="showColorPicker" class="color-picker-popover">
          <button 
            v-for="(preset, key) in COLOR_PRESETS" 
            :key="key"
            class="color-dot"
            :style="{ background: preset.lightBg, border: `1px solid ${preset.lightBorder}` }"
            :title="preset.name"
            @click="changeColor(key.toString())"
          >
            <Check v-if="note.color === key" class="dot-check-icon" />
          </button>
        </div>
      </div>

      <!-- 移动分类 -->
      <div class="action-popover-wrapper">
        <button class="action-btn" title="移动分类" @click="showFolderPicker = !showFolderPicker; showColorPicker = false">
          <FolderInput class="action-icon" />
        </button>
        
        <div v-if="showFolderPicker" class="folder-picker-popover">
          <div class="popover-title">移动至分类</div>
          <div class="folder-list">
            <button 
              class="folder-item" 
              :class="{ active: note.categoryId === 'uncategorized' }"
              @click="moveCategory('uncategorized')"
            >
              未分类
            </button>
            <button 
              v-for="cat in store.categories" 
              :key="cat.id"
              class="folder-item"
              :class="{ active: note.categoryId === cat.id }"
              @click="moveCategory(cat.id)"
            >
              {{ cat.name }}
            </button>
          </div>
        </div>
      </div>

      <!-- 复制 -->
      <button class="action-btn" title="复制" @click="copyNoteContent">
        <Copy class="action-icon" />
      </button>

      <!-- 删除按钮 -->
      <button class="action-btn delete" title="删除便签" @click="deleteSelf">
        <Trash2 class="action-icon" />
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.edit-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 6px;
}

.edit-btn {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;

  &.cancel {
    background: var(--btn-bg);
    color: inherit;
    border: 1px solid var(--btn-border);
    
    &:hover {
      background: var(--btn-hover-bg);
      color: var(--btn-hover-color);
      border-color: var(--btn-hover-border);
    }
  }

  &.save {
    background: var(--card-text);
    color: var(--card-bg);

    .dark-theme & {
      background: var(--card-text-dark);
      color: var(--card-bg-dark);
    }

    &:hover {
      opacity: 0.9;
    }
  }
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px dashed var(--popover-border);
  padding-top: 8px;
  font-size: 10px;
  color: inherit;
  opacity: 0.8;
}

.updated-time {
  font-size: 10px;
  opacity: 0.6;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  transform: translateY(4px);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.action-popover-wrapper {
  position: relative;
}

.action-btn {
  padding: 4px;
  border-radius: 6px;
  color: inherit;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: var(--btn-hover-bg);
    color: var(--btn-hover-color);
  }

  &.delete:hover {
    background: var(--danger-hover-bg);
    color: var(--danger-color);
  }

  .action-icon {
    width: 12px;
    height: 12px;
  }
}

// 颜色选择面板样式
.color-picker-popover {
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  background: var(--popover-bg);
  border: 1px solid var(--popover-border);
  padding: 6px;
  border-radius: 10px;
  display: flex;
  gap: 4px;
  box-shadow: var(--popover-shadow);
  z-index: 3;
  animation: popoverFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.color-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  .dot-check-icon {
    width: 10px;
    height: 10px;
    color: var(--text-primary);
  }
}

// 移动分类面板样式
.folder-picker-popover {
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  background: var(--popover-bg);
  border: 1px solid var(--popover-border);
  padding: 8px;
  border-radius: 12px;
  box-shadow: var(--popover-shadow);
  z-index: 3;
  min-width: 120px;
  animation: popoverFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  .popover-title {
    font-size: 10px;
    font-weight: 700;
    color: var(--text-muted);
    margin-bottom: 6px;
    padding: 0 4px;
  }
}

.folder-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 150px;
  overflow-y: auto;
}

.folder-item {
  text-align: left;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    background: var(--item-hover-bg);
    color: var(--text-primary);
  }

  &.active {
    background: var(--accent-light);
    color: var(--accent-color);
    font-weight: 600;
  }
}

@keyframes popoverFadeIn {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
