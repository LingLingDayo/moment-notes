<script lang="ts" setup>
import { ref, computed, nextTick } from 'vue';
import { Note } from '../types';
import { useStickyNotesStore, COLOR_PRESETS } from '../stores/stickyNotes';
import { Pin, Trash2, Palette, FolderInput, Check, Edit2, FileText } from 'lucide-vue-next';

const props = defineProps<{
  note: Note;
}>();

const store = useStickyNotesStore();

// 是否处于编辑模式
const isEditing = ref(false);
const editTitle = ref(props.note.title || '');
const editContent = ref(props.note.content);

const titleInputRef = ref<HTMLInputElement | null>(null);
const contentInputRef = ref<HTMLTextAreaElement | null>(null);

// 是否显示颜色选择面板
const showColorPicker = ref(false);
// 是否显示移动分类面板
const showFolderPicker = ref(false);

// 获取当前便签颜色的样式配置
const colorStyle = computed(() => {
  const preset = COLOR_PRESETS[props.note.color] || COLOR_PRESETS.yellow;
  return {
    '--card-bg': preset.lightBg,
    '--card-border': preset.lightBorder,
    '--card-text': preset.lightText,
    '--card-bg-dark': preset.darkBg,
    '--card-border-dark': preset.darkBorder,
    '--card-text-dark': preset.darkText,
  };
});

// 自适应调整输入框高度
const adjustTextareaHeight = (e?: Event) => {
  const el = e ? (e.target as HTMLTextAreaElement) : contentInputRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
};

// 进入编辑模式
const enterEditMode = async () => {
  isEditing.value = true;
  editTitle.value = props.note.title || '';
  editContent.value = props.note.content;
  await nextTick();
  contentInputRef.value?.focus();
  adjustTextareaHeight();
};

// 保存编辑
const saveEdit = () => {
  store.updateNote(props.note.id, {
    title: editTitle.value.trim(),
    content: editContent.value
  });
  isEditing.value = false;
};

// 取消编辑
const cancelEdit = () => {
  isEditing.value = false;
  editTitle.value = props.note.title || '';
  editContent.value = props.note.content;
};

// 双击粘贴逻辑
const handleDoubleClick = () => {
  if (isEditing.value) return; // 如果在编辑中，不触发双击粘贴
  store.handlePasteNote(props.note.content);
};

// 切换置顶
const togglePin = () => {
  store.updateNote(props.note.id, {
    isPinned: !props.note.isPinned
  });
  store.showToast(props.note.isPinned ? '便签已置顶' : '取消置顶');
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

// 格式化时间显示
const formattedTime = computed(() => {
  const date = new Date(props.note.updatedAt);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
});
</script>

<template>
  <div 
    class="note-card"
    :class="{ pinned: note.isPinned, editing: isEditing }"
    :style="colorStyle"
    @dblclick="handleDoubleClick"
  >
    <!-- 置顶针和大头针效果 -->
    <button 
      class="pin-btn" 
      :class="{ active: note.isPinned }"
      title="置顶便签" 
      @click.stop="togglePin"
    >
      <Pin class="pin-icon" />
    </button>

    <!-- 卡片头部 (标题 / 编辑态) -->
    <div class="card-header">
      <input 
        v-if="isEditing"
        ref="titleInputRef"
        v-model="editTitle"
        type="text"
        placeholder="标题 (可选)..."
        class="title-input"
        @keyup.enter="saveEdit"
        @keyup.esc="cancelEdit"
      />
      <h3 v-else-if="note.title" class="card-title">{{ note.title }}</h3>
      <div v-else class="title-placeholder"></div>
      
      <button 
        v-if="!isEditing" 
        class="edit-trigger-btn" 
        title="编辑便签"
        @click.stop="enterEditMode"
      >
        <Edit2 class="edit-icon" />
      </button>
    </div>

    <!-- 卡片主体内容 (编辑态 / 文本预览) -->
    <div class="card-body">
      <textarea 
        v-if="isEditing"
        ref="contentInputRef"
        v-model="editContent"
        placeholder="写点什么..."
        class="content-textarea"
        @keydown.esc="cancelEdit"
        @keydown.ctrl.enter="saveEdit"
        @input="adjustTextareaHeight"
      ></textarea>
      <pre v-else class="card-content">{{ note.content || '双击粘贴，点击右上角或卡片空白处编辑...' }}</pre>
    </div>

    <!-- 编辑态底部的保存/取消按钮 -->
    <div v-if="isEditing" class="edit-footer" @click.stop>
      <button class="edit-btn cancel" @click="cancelEdit">取消</button>
      <button class="edit-btn save" @click="saveEdit">保存</button>
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

        <!-- 导出为 TXT 文件 -->
        <button class="action-btn" title="导出为文本文件" @click="store.exportSingleNoteAsTxt(note)">
          <FileText class="action-icon" />
        </button>

        <!-- 删除按钮 -->
        <button class="action-btn delete" title="删除便签" @click="deleteSelf">
          <Trash2 class="action-icon" />
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.note-card {
  --card-bg: hsl(48, 100%, 88%, 0.75);
  --card-border: hsl(48, 100%, 75%);
  --card-text: hsl(48, 80%, 15%);
  --card-bg-dark: hsl(48, 40%, 18%, 0.75);
  --card-border-dark: hsl(48, 40%, 30%);
  --card-text-dark: hsl(48, 100%, 85%);

  display: flex;
  flex-direction: column;
  border-radius: $radius-xl;
  padding: 18px 20px 14px 20px;
  position: relative;
  min-height: 160px;
  max-height: 320px;
  user-select: none;

  @include glass-panel(var(--card-bg), var(--card-border));
  color: var(--card-text);
  @include hover-lift(-4px, 0 12px 24px -10px rgba(0, 0, 0, 0.12));

  .dark-theme & {
    background: var(--card-bg-dark);
    border-color: var(--card-border-dark);
    color: var(--card-text-dark);
  }

  &:hover {
    .edit-trigger-btn {
      opacity: 1;
    }

    .card-footer .card-actions {
      opacity: 1;
      transform: translateY(0);
    }
  }

  &.pinned {
    box-shadow: 0 8px 20px -8px rgba(99, 102, 241, 0.15);
    border-width: 1.5px;
    
    .pin-icon {
      transform: rotate(45deg);
      fill: currentColor;
    }
  }

  &.editing {
    transform: none !important;
    box-shadow: var(--shadow-md) !important;
    max-height: none;
    min-height: 220px;
    z-index: 10;
  }
}

.pin-btn {
  position: absolute;
  top: -8px;
  left: 20px;
  padding: 6px;
  border-radius: 50%;
  background: var(--card-border);
  color: var(--card-text);
  box-shadow: 0 2px 6px -1px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;

  .dark-theme & {
    background: var(--card-border-dark);
    color: var(--card-text-dark);
  }

  &:hover {
    transform: scale(1.1) rotate(15deg);
    background: var(--card-text);
    color: var(--card-bg);

    .dark-theme & {
      background: var(--card-text-dark);
      color: var(--card-bg-dark);
    }
  }

  .pin-icon {
    width: 13px;
    height: 13px;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  margin-top: 6px;
  min-height: 24px;
}

.card-title {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.title-placeholder {
  flex: 1;
}

.title-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 13px;
  font-weight: 600;
  color: inherit;
  width: 100%;

  .dark-theme & {
    background: rgba(0, 0, 0, 0.25);
    border-color: rgba(255, 255, 255, 0.1);
  }

  &:focus {
    background: rgba(255, 255, 255, 0.4);
    border-color: var(--card-text);

    .dark-theme & {
      background: rgba(0, 0, 0, 0.4);
      border-color: var(--card-text-dark);
    }
  }
}

.edit-trigger-btn {
  opacity: 0;
  padding: 4px;
  border-radius: 6px;
  color: inherit;
  margin-left: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s, background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    .dark-theme & {
      background: rgba(0, 0, 0, 0.2);
    }
  }

  .edit-icon {
    width: 13px;
    height: 13px;
  }
}

.card-body {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 8px;
  min-height: 60px;
}

.card-content {
  font-family: var(--font-sans);
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  overflow-wrap: break-word;
}

.content-textarea {
  width: 100%;
  height: 100%;
  min-height: 100px;
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.6;
  color: inherit;
  resize: vertical;

  .dark-theme & {
    background: rgba(0, 0, 0, 0.25);
    border-color: rgba(255, 255, 255, 0.1);
  }

  &:focus {
    background: rgba(255, 255, 255, 0.4);
    border-color: var(--card-text);

    .dark-theme & {
      background: rgba(0, 0, 0, 0.4);
      border-color: var(--card-text-dark);
    }
  }
}

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
    background: rgba(255, 255, 255, 0.2);
    color: inherit;
    border: 1px solid rgba(255, 255, 255, 0.3);
    
    .dark-theme & {
      background: rgba(0, 0, 0, 0.2);
      border-color: rgba(255, 255, 255, 0.08);
    }

    &:hover {
      background: rgba(255, 255, 255, 0.35);
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
  border-top: 1px dashed rgba(0, 0, 0, 0.06);
  padding-top: 8px;
  font-size: 10px;
  color: inherit;
  opacity: 0.8;

  .dark-theme & {
    border-color: rgba(255, 255, 255, 0.06);
  }
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
    background: rgba(255, 255, 255, 0.3);
    .dark-theme & {
      background: rgba(0, 0, 0, 0.2);
    }
  }

  &.delete:hover {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
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
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  padding: 6px;
  border-radius: 10px;
  display: flex;
  gap: 4px;
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(10px);
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
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  padding: 8px;
  border-radius: 12px;
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(10px);
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
    background: rgba(255, 255, 255, 0.1);
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
