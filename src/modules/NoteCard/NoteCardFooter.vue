<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { Copy, Trash2, RotateCcw, Folder } from '@lucide/vue';
import { Note, NoteType } from '@type';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { copyTextToClipboard } from '../../infrastructure/platform/hostBridge';
import { formatDate } from '@utils/date';
import { getContainerSelectedText } from '@utils/selection';
import NoteColorPickerPopover from './NoteColorPickerPopover.vue';
import NoteCategoryPickerPopover from './NoteCategoryPickerPopover.vue';
import NoteFormatPickerPopover from './NoteFormatPickerPopover.vue';

const props = defineProps<{
  note: Note;
  isEditing: boolean;
}>();

const emit = defineEmits<{
  (e: 'save-edit'): void;
  (e: 'cancel-edit'): void;
  (e: 'popover-state-change', isOpen: boolean): void;
}>();

const store = useStickyNotesStore();

// 是否显示颜色选择面板
const showColorPicker = ref(false);
// 是否显示移动分类面板
const showFolderPicker = ref(false);
// 是否显示格式切换面板
const showFormatPicker = ref(false);

const closePopovers = () => {
  showColorPicker.value = false;
  showFolderPicker.value = false;
  showFormatPicker.value = false;
};

const hasActivePopover = computed(() => {
  return showColorPicker.value || showFolderPicker.value || showFormatPicker.value;
});

watch(hasActivePopover, (isOpen) => {
  emit('popover-state-change', isOpen);
});

// 暴露 closePopovers 方法给父组件调用
defineExpose({
  closePopovers
});

// 格式化时间显示
const formattedTime = computed(() => {
  return formatDate(new Date(props.note.updatedAt), store.dateFormat || 'YYYY.MM.DD HH:mm');
});

// 获取原分组名称
const originalCategoryName = computed(() => {
  if (props.note.categoryId === 'uncategorized') {
    return '全部便签';
  }
  const cat = store.categories.find(c => c.id === props.note.categoryId);
  return cat ? cat.name : '全部便签';
});

// 复制便签内容逻辑 (支持划词选中复制与全量复制)
const copyNoteContent = async (e?: MouseEvent) => {
  try {
    let textToCopy = props.note.content;
    let isSelectedText = false;

    if (e && e.currentTarget) {
      const cardEl = (e.currentTarget as HTMLElement).closest('.note-card') as HTMLElement;
      const selectedText = getContainerSelectedText(cardEl);
      if (selectedText) {
        textToCopy = selectedText;
        isSelectedText = true;
      }
    }

    if (!textToCopy.trim()) {
      store.showToast('便签内容为空，无法复制', 'warning');
      return;
    }

    await copyTextToClipboard(textToCopy);
    store.showToast(isSelectedText ? '已复制选中内容' : '已复制便签内容', 'success');
    store.updateNoteLastUsed(props.note.id);
  } catch (err) {
    console.error('Failed to copy:', err);
    store.showToast('复制失败', 'error');
  }
};

// 更改颜色
const changeColor = (colorName: string) => {
  store.updateNote(props.note.id, { color: colorName }, false);
  showColorPicker.value = false;
};

// 移动分类
const moveCategory = (catId: string) => {
  store.updateNote(props.note.id, { categoryId: catId }, false);
  showFolderPicker.value = false;
  const cat = store.categories.find(c => c.id === catId);
  store.showToast(`已移至分类 "${cat?.name || '全部便签'}"`);
};

// 切换便签格式/类型
const changeNoteType = (type: NoteType) => {
  store.updateNote(props.note.id, { type }, false);
  showFormatPicker.value = false;
  store.showToast(type === 'markdown' ? '已切换为 Markdown 格式' : '已切换为纯文本格式');
};

// 删除便签
const deleteSelf = async () => {
  if (store.skipDeleteConfirm) {
    store.deleteNote(props.note.id);
    return;
  }
  const ok = await store.askConfirm(
    props.note.isDeleted ? '确认彻底删除' : '确认删除便签',
    props.note.isDeleted
      ? '确定要彻底删除这张便签吗？此操作不可逆，数据将永久丢失。'
      : '确定要删除这张便签吗？该便签将被移动到最近删除，随时可以恢复。'
  );
  if (ok) {
    store.deleteNote(props.note.id);
  }
};
</script>

<template>
  <!-- 编辑态底部的保存/取消按钮 -->
  <div v-if="isEditing" class="edit-footer" @click.stop>
    <button class="edit-btn cancel" @click="emit('cancel-edit')">
      取消
    </button>
    <button class="edit-btn save" @click="emit('save-edit')">
      保存
    </button>
  </div>

  <!-- 卡片底部信息及悬浮工具栏 (非编辑态) -->
  <div
    v-else
    class="card-footer"
    :class="{ 'has-active-popover': hasActivePopover }"
    @click.stop
  >
    <div class="card-meta-info" :data-tooltip="`更新时间: ${formattedTime} · 总字数: ${note.content.length} 字`">
      {{ formattedTime }} · {{ note.content.length }} 字
    </div>

    <!-- 垃圾箱中卡片的专属操作栏：永久显示 -->
    <div v-if="note.isDeleted" class="card-actions is-deleted-actions">
      <!-- 原分组 -->
      <button class="action-btn" :data-tooltip="`原分组: ${originalCategoryName}`">
        <Folder class="action-icon" />
      </button>

      <!-- 复制 -->
      <button class="action-btn" data-tooltip="复制内容" @click="copyNoteContent">
        <Copy class="action-icon" />
      </button>

      <!-- 恢复 -->
      <button class="action-btn" data-tooltip="恢复便签" @click="store.restoreNote(note.id)">
        <RotateCcw class="action-icon" />
      </button>

      <!-- 彻底删除 -->
      <button class="action-btn delete" data-tooltip="彻底删除" @click="deleteSelf">
        <Trash2 class="action-icon" />
      </button>
    </div>

    <!-- 正常卡片操作栏 -->
    <div v-else class="card-actions" :class="{ 'has-active-popover': hasActivePopover }">
      <!-- 分组 -->
      <button
        v-if="['all', 'recent'].includes(store.currentCategoryId)"
        class="action-btn"
        :data-tooltip="`分组: ${originalCategoryName}`"
      >
        <Folder class="action-icon" />
      </button>

      <!-- 换色调色盘 -->
      <NoteColorPickerPopover
        v-model:is-open="showColorPicker"
        :current-color="note.color"
        @select-color="changeColor"
        @toggle="
          showColorPicker = !showColorPicker;
          showFolderPicker = false;
          showFormatPicker = false;
        "
      />

      <!-- 移动分类 -->
      <NoteCategoryPickerPopover
        v-model:is-open="showFolderPicker"
        :current-category-id="note.categoryId"
        :categories="store.orderedCategories"
        @select-category="moveCategory"
        @toggle="
          showFolderPicker = !showFolderPicker;
          showColorPicker = false;
          showFormatPicker = false;
        "
      />

      <!-- 便签格式/切换按钮及其下拉小弹窗 -->
      <NoteFormatPickerPopover
        v-model:is-open="showFormatPicker"
        :note-type="note.type"
        @select-type="changeNoteType"
        @toggle="
          showFormatPicker = !showFormatPicker;
          showColorPicker = false;
          showFolderPicker = false;
        "
      />

      <!-- 复制 -->
      <button class="action-btn" data-tooltip="复制便签 (划词可复制局部)" @click="copyNoteContent">
        <Copy class="action-icon" />
      </button>

      <!-- 删除便签 -->
      <button class="action-btn delete" data-tooltip="删除便签" @click="deleteSelf">
        <Trash2 class="action-icon" />
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@styles/variables' as *;

.edit-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 8px;
  margin-top: 4px;

  .edit-btn {
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all $transition-fast;

    &.cancel {
      background: var(--input-border);
      color: var(--text-secondary);

      &:hover {
        background: var(--item-hover-bg);
        color: var(--text-primary);
      }
    }

    &.save {
      background: var(--accent-color);
      color: #fff;

      &:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }
    }
  }
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  min-height: 20px;
  padding-top: 2px;
  margin-top: 2px;
  z-index: 20;

  &.has-active-popover {
    z-index: 21;
  }
}

.card-meta-info {
  font-size: 11px;
  color: var(--card-footer-text);
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  user-select: none;
  pointer-events: auto;
  line-height: 20px;
  min-width: 0;
  transition: opacity $transition-fast;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  max-width: 0;
  transform: translateX(10px);
  pointer-events: none;
  overflow: hidden;
  transition:
    opacity $transition-fast,
    transform $transition-fast,
    max-width 0s 0.2s;

  &.is-deleted-actions {
    opacity: 0.85;
    max-width: 160px;
    transform: none;
    pointer-events: auto;
    overflow: hidden;
    transition: opacity $transition-fast;

    &:hover {
      opacity: 1;
    }
  }

  &.has-active-popover {
    opacity: 1;
    max-width: 160px;
    transform: none;
    pointer-events: auto;
    overflow: visible;
    z-index: 21;
    transition:
      opacity $transition-fast,
      transform $transition-fast,
      max-width 0s;
  }
}

.action-btn {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  color: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background-color $transition-fast,
    color $transition-fast,
    transform $transition-fast;

  &:hover {
    background: var(--card-btn-hover-bg);
    color: var(--card-btn-hover-color);
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
</style>
