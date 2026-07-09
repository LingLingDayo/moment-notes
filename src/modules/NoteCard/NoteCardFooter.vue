<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { Palette, FolderInput, Check, Copy, Trash2, RotateCcw, Folder } from 'lucide-vue-next';
import { Note } from '@type';
import { useStickyNotesStore, COLOR_PRESETS } from '@stores/stickyNotes';
import { isUTools } from '@utils/storage';
import { formatDate } from '@utils/date';

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
// 下拉面板的位置 ('top' | 'bottom')
const popoverPlacement = ref<'top' | 'bottom'>('top');
// 移动分类包装器的 DOM 引用
const folderWrapperRef = ref<HTMLElement | null>(null);

const toggleFolderPicker = () => {
  if (showFolderPicker.value) {
    showFolderPicker.value = false;
  } else {
    showFolderPicker.value = true;
    showColorPicker.value = false;

    if (folderWrapperRef.value) {
      const rect = folderWrapperRef.value.getBoundingClientRect();
      // 如果上方空间小于 200px，则在下方显示
      if (rect.top < 200) {
        popoverPlacement.value = 'bottom';
      } else {
        popoverPlacement.value = 'top';
      }
    }
  }
};

const closePopovers = () => {
  showColorPicker.value = false;
  showFolderPicker.value = false;
};

watch(() => showColorPicker.value || showFolderPicker.value, (isOpen) => {
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

// 复制便签内容逻辑
const copyNoteContent = async () => {
  try {
    if (isUTools()) {
      window.utools.copyText(props.note.content);
    } else {
      await navigator.clipboard.writeText(props.note.content);
    }
    store.showToast('已复制便签内容', 'success');
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

// 删除便签
const deleteSelf = async () => {
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
    <span class="updated-time">{{ formattedTime }} · {{ note.content.length }} 字</span>

    <!-- 垃圾箱中卡片的专属操作栏：永久显示 -->
    <div v-if="note.isDeleted" class="card-actions is-deleted-actions">
      <!-- 原分组 -->
      <button class="action-btn" :data-tooltip="`原分组: ${originalCategoryName}`">
        <Folder class="action-icon" />
      </button>

      <!-- 复制 -->
      <button class="action-btn" data-tooltip="复制" @click="copyNoteContent">
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
    <div v-else class="card-actions">
      <!-- 分组 -->
      <button
        v-if="store.currentCategoryId === 'all'"
        class="action-btn"
        :data-tooltip="`分组: ${originalCategoryName}`"
      >
        <Folder class="action-icon" />
      </button>

      <!-- 换色调色盘 -->
      <div class="action-popover-wrapper">
        <button
          class="action-btn"
          data-tooltip="更改颜色"
          @click="
            showColorPicker = !showColorPicker;
            showFolderPicker = false;
          "
        >
          <Palette class="action-icon" />
        </button>

        <div v-if="showColorPicker" class="color-picker-popover">
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
      </div>

      <!-- 移动分类 -->
      <div ref="folderWrapperRef" class="action-popover-wrapper">
        <button
          class="action-btn"
          data-tooltip="移动分类"
          @click="toggleFolderPicker"
        >
          <FolderInput class="action-icon" />
        </button>

        <div
          v-if="showFolderPicker"
          class="folder-picker-popover"
          :class="{ 'show-below': popoverPlacement === 'bottom' }"
        >
          <div class="popover-title">
            移动至分类
          </div>
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
        </div>
      </div>

      <!-- 复制 -->
      <button class="action-btn" data-tooltip="复制" @click="copyNoteContent">
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
}



.updated-time {
  font-size: 10px;
  opacity: 0.6;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transform: translate3d(0, 4px, 0);
  will-change: opacity, transform;
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &.is-deleted-actions {
    opacity: 0.75;
    transform: translate3d(0, 0, 0);

    &:hover {
      opacity: 1;
    }
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

  &.show-below {
    bottom: auto;
    top: calc(100% + 8px);
    animation: popoverFadeInBelow 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

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

@keyframes popoverFadeInBelow {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
