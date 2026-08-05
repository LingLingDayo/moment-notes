<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { Palette, FolderInput, Check, Copy, Trash2, RotateCcw, Folder, FileText, FileCode } from '@lucide/vue';
import { Note, NoteType } from '@type';
import { useStickyNotesStore, COLOR_PRESETS } from '@stores/stickyNotes';
import { isUTools } from '@utils/storage';
import { formatDate } from '@utils/date';
import BasePopover from '@components/BasePopover.vue';

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

watch(() => showColorPicker.value || showFolderPicker.value || showFormatPicker.value, (isOpen) => {
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

import { getContainerSelectedText } from '@utils/selection';

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

    if (isUTools()) {
      window.utools.copyText(textToCopy);
    } else {
      await navigator.clipboard.writeText(textToCopy);
    }
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
  <div v-else class="card-footer" @click.stop>
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
    <div v-else class="card-actions" :class="{ 'has-active-popover': showColorPicker || showFolderPicker || showFormatPicker }">
      <!-- 分组 -->
      <button
        v-if="['all', 'recent'].includes(store.currentCategoryId)"
        class="action-btn"
        :data-tooltip="`分组: ${originalCategoryName}`"
      >
        <Folder class="action-icon" />
      </button>

      <!-- 换色调色盘 -->
      <BasePopover
        :is-open="showColorPicker"
        width="auto"
        @close="showColorPicker = false"
      >
        <template #trigger>
          <button
            class="action-btn"
            data-tooltip="更改颜色"
            @click="
              showColorPicker = !showColorPicker;
              showFolderPicker = false;
              showFormatPicker = false;
            "
          >
            <Palette class="action-icon" />
          </button>
        </template>
        <div class="color-picker-list">
          <button
            v-for="(preset, key) in COLOR_PRESETS"
            :key="key"
            class="color-dot"
            :style="{ background: preset.lightBg, border: `1px solid ${preset.lightBorder}` }"
            :data-tooltip="preset.name"
            @click="changeColor(key.toString())"
          >
            <Check v-if="note.color === key" class="dot-check-icon" />
          </button>
        </div>
      </BasePopover>

      <!-- 移动分类 -->
      <BasePopover
        :is-open="showFolderPicker"
        title="移动至分类"
        width="130px"
        @close="showFolderPicker = false"
      >
        <template #trigger>
          <button
            class="action-btn"
            data-tooltip="移动分类"
            @click="
              showFolderPicker = !showFolderPicker;
              showColorPicker = false;
              showFormatPicker = false;
            "
          >
            <FolderInput class="action-icon" />
          </button>
        </template>
        <div class="folder-list">
          <button
            class="folder-item"
            :class="{ active: note.categoryId === 'uncategorized' }"
            @click="moveCategory('uncategorized')"
          >
            <span class="folder-name-text">全部便签</span>
          </button>
          <button
            v-for="cat in store.orderedCategories.filter(c => !c.isSystem)"
            :key="cat.id"
            class="folder-item"
            :style="{ paddingLeft: `${(Math.max((cat.level || 0) - 1, 0)) * 8 + 8}px` }"
            :class="{ active: note.categoryId === cat.id }"
            @click="moveCategory(cat.id)"
          >
            <span v-if="cat.level > 0" style="opacity: 0.5; margin-right: 4px">└</span>
            <span class="folder-name-text">{{ cat.name }}</span>
          </button>
        </div>
      </BasePopover>

      <!-- 便签格式/切换按钮及其下拉小弹窗 -->
      <BasePopover
        :is-open="showFormatPicker"
        title="显示格式"
        width="120px"
        @close="showFormatPicker = false"
      >
        <template #trigger>
          <button
            class="action-btn"
            :data-tooltip="note.type === 'markdown' ? '当前格式: Markdown' : '当前格式: 纯文本'"
            @click="
              showFormatPicker = !showFormatPicker;
              showColorPicker = false;
              showFolderPicker = false;
            "
          >
            <FileCode v-if="note.type === 'markdown'" class="action-icon" />
            <FileText v-else class="action-icon" />
          </button>
        </template>
        <div class="format-list">
          <button
            class="format-item"
            :class="{ active: !note.type || note.type === 'text' }"
            @click="changeNoteType('text')"
          >
            <FileText class="item-icon" />
            <span>纯文本</span>
          </button>
          <button
            class="format-item"
            :class="{ active: note.type === 'markdown' }"
            @click="changeNoteType('markdown')"
          >
            <FileCode class="item-icon" />
            <span>Markdown</span>
          </button>
        </div>
      </BasePopover>

      <!-- 复制 -->
      <button class="action-btn" data-tooltip="复制内容" @click="copyNoteContent">
        <Copy class="action-icon" />
      </button>

      <!-- 删除按钮 -->
      <button class="action-btn delete" data-tooltip="删除便签" @click="deleteSelf">
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
      background: var(--card-btn-hover-bg);
      color: var(--card-btn-hover-color);
      border-color: var(--card-btn-hover-bg);
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
  transition: opacity 0.25s ease;
  min-width: 0;
}

.card-meta-info {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  opacity: 0.75;
  user-select: none;
  line-height: 1;
  min-width: 0;
  flex: 1;
  cursor: default;
}


.card-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  max-width: 0;
  pointer-events: none;
  overflow: hidden;
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  white-space: nowrap;
  flex-shrink: 0;

  &.is-deleted-actions {
    opacity: 0.75;
    max-width: 140px;
    pointer-events: auto;
    overflow: hidden;

    &:hover {
      opacity: 1;
    }
  }

  &.has-active-popover {
    opacity: 1;
    max-width: 160px;
    pointer-events: auto;
    overflow: visible;
  }
}

.action-popover-wrapper {
  position: relative;
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

// 颜色选择列表样式
.color-picker-list {
  display: flex;
  gap: 4px;
  padding: 2px;
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

// 分类列表样式
.folder-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 150px;
  overflow-y: auto;
}

.folder-item {
  display: flex;
  align-items: center;
  text-align: left;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 11px;
  color: var(--text-secondary);
  min-width: 0;

  &:hover {
    background: var(--item-hover-bg);
    color: var(--text-primary);
  }

  &.active {
    background: var(--accent-light);
    color: var(--accent-color);
    font-weight: 600;
  }

  .folder-name-text {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

// 格式选择列表样式
.format-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.format-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 11px;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: all 0.15s ease;

  &:hover {
    background: var(--item-hover-bg);
    color: var(--text-primary);
  }

  &.active {
    background: var(--accent-light);
    color: var(--accent-color);
    font-weight: 600;
  }

  .item-icon {
    width: 12px;
    height: 12px;
  }
}
</style>
