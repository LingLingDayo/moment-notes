<script lang="ts" setup>
import { ref, nextTick } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { Folder, Edit3, Trash2, Check, ChevronDown, ChevronRight, Plus } from 'lucide-vue-next';
import { isUTools } from '@/utils/storage';

const store = useStickyNotesStore();

// 处于编辑重命名状态的分类ID
const editingId = ref<string | null>(null);
const editCategoryName = ref('');
const editInputRef = ref<HTMLInputElement | null>(null);

const subAddInputRef = ref<HTMLInputElement | null>(null);

const setEditInputRef = (el: any) => {
  editInputRef.value = el as HTMLInputElement | null;
};

const setSubAddInputRef = (el: any) => {
  subAddInputRef.value = el as HTMLInputElement | null;
};

// 开启编辑
const startEdit = async (id: string, currentName: string) => {
  editingId.value = id;
  editCategoryName.value = currentName;
  await nextTick();
  if (editInputRef.value) {
    editInputRef.value.focus();
    editInputRef.value.select();
  }
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
    `确定要删除分类 "${name}" 吗？该分类下的子分类与便签不会被删除，将分别自动上移与变为未分类状态。`
  );
  if (ok) {
    store.deleteCategory(id);
    store.showToast(`分类 "${name}" 已删除`);
  }
};

// 获取某个分类下的便签总数
const getNoteCount = (categoryId: string) => {
  if (categoryId === 'all') {
    return store.notes.filter(n => n.isDeleted !== true).length;
  }
  const descendants = store.getCategoryDescendants(categoryId);
  return store.notes.filter(n => (n.categoryId === categoryId || descendants.has(n.categoryId)) && n.isDeleted !== true).length;
};

// 拖动排序相关的状态与方法
const draggedCatId = ref<string | null>(null);
const dragOverCatId = ref<string | null>(null);
const dragPlacement = ref<'before' | 'after' | 'inside' | null>(null);
const isOverContainer = ref(false);

const onDragStart = (event: DragEvent, cat: any) => {
  if (cat.isSystem || cat.isVirtualAdd) {
    event.preventDefault();
    return;
  }
  draggedCatId.value = cat.id;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', cat.id);
  }
  isOverContainer.value = false;
};

const onDragOverItem = (event: DragEvent, cat: any) => {
  if (!draggedCatId.value || draggedCatId.value === cat.id) return;
  if (cat.isVirtualAdd) return;

  event.preventDefault();
  event.stopPropagation();
  
  if (cat.isSystem) {
    dragOverCatId.value = null;
    dragPlacement.value = null;
    return;
  }

  // 限制：不能拖入自身的子孙分类中
  const descendants = store.getCategoryDescendants(draggedCatId.value);
  if (descendants.has(cat.id)) {
    dragOverCatId.value = null;
    dragPlacement.value = null;
    return;
  }

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const clientY = event.clientY;
  const relativeY = clientY - rect.top;
  const threshold1 = rect.height * 0.25;
  const threshold2 = rect.height * 0.75;

  dragOverCatId.value = cat.id;
  isOverContainer.value = false;

  if (relativeY < threshold1) {
    dragPlacement.value = 'before';
  } else if (relativeY > threshold2) {
    dragPlacement.value = 'after';
  } else {
    dragPlacement.value = 'inside';
  }
};

const onDragOverContainer = (event: DragEvent) => {
  if (!draggedCatId.value) return;
  event.preventDefault();
  dragOverCatId.value = null;
  dragPlacement.value = null;
  isOverContainer.value = true;
};

const onContainerDrop = (event: DragEvent) => {
  event.preventDefault();
  if (!draggedCatId.value) return;

  const sourceId = draggedCatId.value;
  
  if (dragOverCatId.value && dragPlacement.value) {
    const targetId = dragOverCatId.value;
    const targetCat = store.categories.find(c => c.id === targetId);
    
    if (targetCat) {
      if (dragPlacement.value === 'inside') {
        store.moveCategory(sourceId, targetId, undefined, 'inside');
        const sourceCat = store.categories.find(c => c.id === sourceId);
        store.showToast(`已将分类 "${sourceCat?.name}" 移入 "${targetCat.name}" 内部`);
      } else {
        store.moveCategory(sourceId, targetCat.parentId, targetId, dragPlacement.value);
        const sourceCat = store.categories.find(c => c.id === sourceId);
        const placementText = dragPlacement.value === 'before' ? '上方' : '下方';
        store.showToast(`已将分类 "${sourceCat?.name}" 移至 "${targetCat.name}" 的${placementText}`);
      }
    }
  } else if (isOverContainer.value) {
    store.moveCategory(sourceId, undefined, undefined, 'inside');
    const sourceCat = store.categories.find(c => c.id === sourceId);
    store.showToast(`已将分类 "${sourceCat?.name}" 移出为一级分类`);
  }

  resetDragState();
};

const onDragEnd = () => {
  resetDragState();
};

const resetDragState = () => {
  draggedCatId.value = null;
  dragOverCatId.value = null;
  dragPlacement.value = null;
  isOverContainer.value = false;
};

const hasParent = (id: string) => {
  const cat = store.categories.find(c => c.id === id);
  return !!(cat && cat.parentId);
};

// 子分类增加逻辑
const startAddSub = async (parentId: string) => {
  store.addingSubParentId = parentId;
  store.newSubCategoryName = '分类';
  
  // 展开父分类
  if (store.collapsedCategoryIds.includes(parentId)) {
    store.toggleCategoryCollapse(parentId);
  }
  
  await nextTick();
  if (subAddInputRef.value) {
    subAddInputRef.value.focus();
    subAddInputRef.value.select();
  }
};

const cancelAddSub = () => {
  store.addingSubParentId = null;
  store.newSubCategoryName = '';
};

const submitAddSub = (parentId?: string) => {
  const name = store.newSubCategoryName.trim();
  if (name) {
    store.addCategory(name, parentId);
    store.showToast(`已成功创建子分类 "${name}"`);
  }
  cancelAddSub();
};

// 单击分类项处理
const handleCategoryClick = (cat: any) => {
  if (cat.isVirtualAdd) return;
  store.currentCategoryId = cat.id;
};

// 双击分类项处理
const handleCategoryDblClick = (cat: any) => {
  if (cat.isVirtualAdd || cat.isSystem) return;
  if (cat.hasChildren) {
    store.toggleCategoryCollapse(cat.id);
  }
};

</script>

<template>
  <div 
    :class="{ 'uTools': isUTools() }" 
    class="sidebar-menu"
    @dragover="onDragOverContainer"
    @drop="onContainerDrop"
  >
    <TransitionGroup 
      tag="div" 
      name="category-list" 
      style="display: flex; flex-direction: column; gap: 6px;"
    >
      <div 
        v-for="(cat, index) in store.orderedCategories" 
        :key="cat.id"
        class="menu-item"
        :class="{ 
          active: store.currentCategoryId === cat.id,
          'has-actions': !cat.isSystem && !cat.isVirtualAdd,
          'dragging': draggedCatId === cat.id,
          'drag-before': dragOverCatId === cat.id && dragPlacement === 'before',
          'drag-after': dragOverCatId === cat.id && dragPlacement === 'after',
          'drag-inside': dragOverCatId === cat.id && dragPlacement === 'inside'
        }"
        :draggable="editingId !== cat.id && !cat.isVirtualAdd"
        :style="{ '--item-level': cat.level || 0 }"
        @click="handleCategoryClick(cat)"
        @dblclick="handleCategoryDblClick(cat)"
        @dragstart="onDragStart($event, cat)"
        @dragover="onDragOverItem($event, cat)"
        @dragend="onDragEnd"
      >
        <div class="active-indicator"></div>
        
        <!-- Toggle button for subcategories -->
        <span 
          v-if="!cat.isSystem && cat.hasChildren"
          class="collapse-toggle"
          @click.stop="store.toggleCategoryCollapse(cat.id)"
        >
          <ChevronDown v-if="!cat.isCollapsed" class="toggle-icon" />
          <ChevronRight v-else class="toggle-icon" />
        </span>
        <span v-else-if="!cat.isSystem && cat.level > 0" class="collapse-toggle-spacer"></span>

        <!-- 系统分类 (全部便签) -->
        <template v-if="cat.isSystem">
          <div class="item-left">
            <Folder class="item-icon" />
            <span class="item-name" data-tooltip="全部便签">全部便签</span>
          </div>
          <span class="item-badge">{{ getNoteCount('all') }}</span>
        </template>
  
        <!-- 用户自定义分类 or 虚拟新增子分类 -->
        <template v-else>
          <!-- 虚拟新增分类状态 -->
          <div v-if="cat.isVirtualAdd" class="item-edit-wrapper" @click.stop>
            <input 
              :ref="setSubAddInputRef"
              v-model="store.newSubCategoryName"
              type="text" 
              placeholder="子分类名称..."
              class="item-edit-input"
              @keyup.enter="submitAddSub(cat.parentId)"
              @keyup.esc="cancelAddSub"
              @blur="submitAddSub(cat.parentId)"
            />
            <button class="edit-btn confirm" @click="submitAddSub(cat.parentId)">
              <Check class="btn-icon-small" />
            </button>
          </div>

          <!-- 编辑状态 -->
          <div v-else-if="editingId === cat.id" class="item-edit-wrapper" @click.stop>
            <input 
              :ref="setEditInputRef"
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
              <span class="item-name" :data-tooltip="cat.name">{{ cat.name }}</span>
            </div>
            
            <div class="item-right" @click.stop>
              <span class="item-badge">{{ getNoteCount(cat.id) }}</span>
              <div class="item-actions">
                <!-- 添加子分类 -->
                <button class="action-btn" data-tooltip="添加子分类" @click="startAddSub(cat.id)">
                  <Plus class="action-icon" />
                </button>

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

    <!-- 拖拽移出根级提示区 -->
    <div 
      v-if="draggedCatId && hasParent(draggedCatId)" 
      class="drag-out-zone"
      :class="{ 'active': isOverContainer && !dragOverCatId }"
      @dragover.prevent
    >
      <span>移出为一级分类</span>
    </div>

    <!-- 分割线 -->
    <div class="menu-divider"></div>

    <!-- 垃圾箱分类 -->
    <div 
      class="menu-item trash-item"
      :class="{ active: store.currentCategoryId === 'trash' }"
      @click="store.currentCategoryId = 'trash'"
    >
      <div class="active-indicator"></div>
      <div class="item-left">
        <Trash2 class="item-icon" />
        <span class="item-name" data-tooltip="已删除的便签">垃圾箱</span>
      </div>
      <span class="item-badge">{{ store.trashNotesCount }}</span>
    </div>
  </div>
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
  --level-indent: 14px;
  padding-left: calc(14px + var(--item-level, 0) * var(--level-indent));
  padding-right: 10px;
  border-radius: 10px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  position: relative;

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
    
    .item-badge, .item-actions, .active-indicator, .collapse-toggle {
      opacity: 0 !important;
    }
  }

  &.drag-inside {
    background: color-mix(in srgb, var(--accent-color) 12%, var(--item-hover-bg)) !important;
    border-color: var(--accent-color) !important;
    box-shadow: 0 0 0 1px var(--accent-color), var(--shadow-sm) !important;
  }

  &.drag-before {
    position: relative;
    &::before {
      content: '';
      position: absolute;
      top: -3px;
      left: calc(14px + var(--item-level, 0) * var(--level-indent, 14px));
      right: 10px;
      height: 3px;
      background: var(--accent-color);
      border-radius: 2px;
      box-shadow: 0 0 8px var(--accent-color);
      z-index: 10;
    }
  }

  &.drag-after {
    position: relative;
    &::after {
      content: '';
      position: absolute;
      bottom: -3px;
      left: calc(14px + var(--item-level, 0) * var(--level-indent, 14px));
      right: 10px;
      height: 3px;
      background: var(--accent-color);
      border-radius: 2px;
      box-shadow: 0 0 8px var(--accent-color);
      z-index: 10;
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
    padding-left: calc(10px + var(--item-level, 0) * 10px);
    padding-right: 6px;
  }

  .item-left {
    gap: 8px;
  }
}

.category-list-move {
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.menu-divider {
  height: 1px;
  background: color-mix(in srgb, var(--text-primary) 10%, transparent);
  // margin: 6px 4px;
  opacity: 0.8;
}

.trash-item {
  &.active {
    .item-icon {
      color: var(--danger-color, #ff4d4f) !important;
    }
    .item-badge {
      background: var(--danger-color, #ff4d4f) !important;
      color: var(--text-on-accent, #ffffff) !important;
    }
  }
}

.drag-out-zone {
  margin: 4px 0;
  height: 38px;
  border: 1px dashed var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 4%, transparent);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--accent-color);
  opacity: 0.6;
  transition: all 0.2s ease;
  user-select: none;
  pointer-events: none;

  &.active {
    opacity: 1;
    background: color-mix(in srgb, var(--accent-color) 12%, transparent);
    box-shadow: inset 0 0 8px color-mix(in srgb, var(--accent-color) 20%, transparent);
  }
}
</style>
