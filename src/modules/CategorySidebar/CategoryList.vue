<script lang="ts" setup>
import { ref, nextTick } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { Folder, Edit3, Trash2, Check } from 'lucide-vue-next';
import { isUTools } from '@/utils/storage';

const store = useStickyNotesStore();

// 处于编辑重命名状态的分类ID
const editingId = ref<string | null>(null);
const editCategoryName = ref('');
const editInputRef = ref<HTMLInputElement | null>(null);

// 开启编辑
const startEdit = async (id: string, currentName: string) => {
  editingId.value = id;
  editCategoryName.value = currentName;
  await nextTick();
  editInputRef.value?.focus();
};

// 取消编辑
const cancelEdit = () => {
  editingId.value = null;
  editCategoryName.value = '';
};

// 提交编辑
const submitEdit = (id: string) => {
  const name = editCategoryName.value.trim();
  if (name) {
    store.updateCategory(id, name);
    store.showToast(`分类已重命名为 "${name}"`);
    editingId.value = null;
  } else {
    cancelEdit();
  }
};

// 删除分类
const confirmDelete = async (id: string, name: string) => {
  const ok = await store.askConfirm(
    '确认删除分类',
    `确定要删除分类 "${name}" 吗？该分类下的便签不会被删除，将变为未分类状态。`
  );
  if (ok) {
    store.deleteCategory(id);
    store.showToast(`分类 "${name}" 已删除`);
  }
};

// 获取某个分类下的便签总数
const getNoteCount = (categoryId: string) => {
  if (categoryId === 'all') {
    return store.notes.length;
  }
  return store.notes.filter(n => n.categoryId === categoryId).length;
};

// 拖动排序相关的状态与方法
const draggedIndex = ref<number | null>(null);
let lastSwapTime = 0;

const onDragStart = (event: DragEvent, index: number) => {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', index.toString());
  }
  lastSwapTime = 0; // 重置冷却时间
  setTimeout(() => {
    draggedIndex.value = index;
  }, 0);
};

const onDragOver = (event: DragEvent, index: number) => {
  if (draggedIndex.value === null || draggedIndex.value === index) return;

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const clientY = event.clientY;
  const threshold = rect.top + rect.height / 2;

  // 向下拖拽：鼠标必须穿过目标元素中线以下
  if (draggedIndex.value < index) {
    if (clientY < threshold) return;
  } 
  // 向上拖拽：鼠标必须穿过目标元素中线以上
  else if (draggedIndex.value > index) {
    if (clientY > threshold) return;
  }

  // 150ms 冷却节流，防止在 FLIP 动画位移期间发生位置跳跃产生的振荡
  const now = Date.now();
  if (now - lastSwapTime < 150) return;
  lastSwapTime = now;

  store.reorderCategories(draggedIndex.value, index);
  draggedIndex.value = index;
};

const onDragEnd = () => {
  draggedIndex.value = null;
};
</script>

<template>
  <TransitionGroup 
    tag="div" 
    name="category-list" 
    :class="{ 'uTools': isUTools() }" 
    class="sidebar-menu"
  >
    <div 
      v-for="(cat, index) in store.orderedCategories" 
      :key="cat.id"
      class="menu-item"
      :class="{ 
        active: store.currentCategoryId === cat.id,
        'has-actions': !cat.isSystem,
        'dragging': draggedIndex === index
      }"
      :draggable="editingId !== cat.id"
      @click="store.currentCategoryId = cat.id"
      @dragstart="onDragStart($event, index)"
      @dragover.prevent="onDragOver($event, index)"
      @dragend="onDragEnd"
    >
      <div class="active-indicator"></div>
      
      <!-- 系统分类 (全部便签) -->
      <template v-if="cat.isSystem">
        <div class="item-left">
          <Folder class="item-icon" />
          <span class="item-name" data-tooltip="全部便签">全部便签</span>
        </div>
        <span class="item-badge">{{ getNoteCount('all') }}</span>
      </template>

      <!-- 用户自定义分类 -->
      <template v-else>
        <!-- 编辑状态 -->
        <div v-if="editingId === cat.id" class="item-edit-wrapper" @click.stop>
          <input 
            ref="editInputRef"
            v-model="editCategoryName"
            type="text" 
            class="item-edit-input"
            @keyup.enter="submitEdit(cat.id)"
            @keyup.esc="cancelEdit"
            @blur="submitEdit(cat.id)"
          />
          <button class="edit-btn confirm" @click="submitEdit(cat.id)">
            <Check class="btn-icon-small" />
          </button>
        </div>

        <!-- 正常展示状态 -->
        <template v-else>
          <div class="item-left">
            <Folder class="item-icon" />
            <span class="item-name" :data-tooltip="cat.name" @dblclick="startEdit(cat.id, cat.name)">{{ cat.name }}</span>
          </div>
          
          <div class="item-right" @click.stop>
            <span class="item-badge">{{ getNoteCount(cat.id) }}</span>
            <div class="item-actions">
              <button class="action-btn" data-tooltip="编辑分类" @click="startEdit(cat.id, cat.name)">
                <Edit3 class="action-icon" />
              </button>
              <button class="action-btn delete" data-tooltip="删除分类" @click="confirmDelete(cat.id, cat.name)">
                <Trash2 class="action-icon" />
              </button>
            </div>
          </div>
        </template>
      </template>
    </div>
  </TransitionGroup>
</template>

<style lang="scss" scoped>
.sidebar-menu {
  flex: 1;
  padding: 16px 12px;
  margin-top: 10px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;

  &.uTools {
    padding-top: 0;
  }
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 14px;
  padding-right: 10px;
  border-radius: 10px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  position: relative;
  overflow: hidden;

  .active-indicator {
    position: absolute;
    left: 0;
    width: 3px;
    height: 0;
    background: var(--accent-color);
    border-radius: 0 4px 4px 0;
    transition: height 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  &:hover {
    background: var(--item-hover-bg);
    color: var(--text-primary);
  }

  &.has-actions:hover {
    .item-badge {
      opacity: 0;
      transform: scale(0.8);
    }
    
    .item-actions {
      opacity: 1;
      transform: translateX(0);
    }
  }

  &.active {
    background: var(--panel-bg);
    border-color: var(--panel-border);
    color: var(--text-primary);
    box-shadow: var(--shadow-sm);
    font-weight: 600;

    .active-indicator {
      height: 16px;
    }

    .item-icon {
      color: var(--accent-color);
    }

    .item-badge {
      background: var(--accent-color);
      color: var(--text-on-accent);
    }
  }

  &.dragging {
    opacity: 0.45;
    background: var(--item-hover-bg);
    border-color: var(--accent-color);
    border-style: dashed;
    box-shadow: none;
    
    .item-badge, .item-actions, .active-indicator {
      opacity: 0 !important;
    }
  }
}

.item-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;

  .item-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    color: var(--text-muted);
    transition: color 0.2s;
  }

  .item-name {
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    user-select: none;
  }
}

.item-right {
  display: flex;
  align-items: center;
  position: relative;
  width: 48px;
  height: 20px;
  justify-content: flex-end;
}

.item-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  background: var(--badge-bg);
  color: var(--text-secondary);
  transition: all 0.2s;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  position: absolute;
  right: 0;
  opacity: 0;
  transform: translateX(10px);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.action-btn {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  
  &:hover {
    background: var(--item-hover-bg);
    color: var(--text-primary);
  }

  &.delete:hover {
    background: var(--danger-hover-bg);
    color: var(--danger-color);
  }

  .action-icon {
    width: 13px;
    height: 13px;
  }
}

.item-edit-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.item-edit-input {
  flex: 1;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 13px;
  color: var(--text-primary);
  width: 100%;
}

.edit-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 6px;
  background: var(--accent-color);
  color: var(--text-on-accent);
  transition: all 0.2s ease;
  
  &.confirm:hover {
    background: var(--accent-hover);
  }

  .btn-icon-small {
    width: 12px;
    height: 12px;
  }
}

@media (max-width: 1049px) {
  .sidebar-menu {
    padding: 10px 8px;
    margin-top: 8px;
    gap: 4px;

    &.uTools {
      padding-top: 0;
    }
  }

  .menu-item {
    height: 36px;
    padding: 0 10px;
    padding-right: 6px;
  }

  .item-left {
    gap: 8px;
  }
}

.category-list-move {
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}
</style>
