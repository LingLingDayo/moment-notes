<script lang="ts" setup>
import { ref, provide, computed } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { Folder, Trash2 } from 'lucide-vue-next';
import { isUTools } from '@/utils/storage';
import CategoryItem from './CategoryItem.vue';

const store = useStickyNotesStore();

// 处于编辑重命名状态的分类ID
const editingId = ref<string | null>(null);
const editCategoryName = ref('');

// 开启编辑
const startEdit = (id: string, currentName: string) => {
  editingId.value = id;
  editCategoryName.value = currentName;
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
    `确定要删除分类 "${name}" 吗？该分类下的子分类会自动上移，该分类下的便签将被移至回收站。`
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
  return store.notes.filter(
    n => (n.categoryId === categoryId || descendants.has(n.categoryId)) && n.isDeleted !== true
  ).length;
};

// 拖动排序相关的状态与方法
const draggedCatId = ref<string | null>(null);
const dragOverCatId = ref<string | null>(null);
const dragPlacement = ref<'before' | 'after' | 'inside' | null>(null);
const isOverOutZone = ref(false);

// 拖拽指示线样式与层级计算
const getCategoryLevel = (id: string): number => {
  if (id === 'all' || id === 'trash') return 0;
  let level = 0;
  let current = store.categories.find(c => c.id === id);
  while (current && current.parentId) {
    level++;
    const parentId = current.parentId;
    current = store.categories.find(c => c.id === parentId);
  }
  return level;
};

const dragIndicatorStyle = computed(() => {
  const overId = dragOverCatId.value;
  const placement = dragPlacement.value;

  if (!overId || !placement || placement === 'inside') {
    return {};
  }

  const containerEl = document.querySelector('.category-list-wrapper');
  const targetEl = document.querySelector(`[data-id="${overId}"]`);

  if (containerEl && targetEl) {
    const containerRect = containerEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();

    let top = targetRect.top - containerRect.top;
    if (placement === 'before') {
      top -= 4;
    } else {
      top += targetRect.height + 2;
    }

    let level = 0;
    if (overId !== 'all') {
      level = getCategoryLevel(overId);
    }

    return {
      top: `${top}px`,
      '--item-level': level
    };
  }

  return {};
});

// 寻找同级分类中的下一个兄弟节点
const getNextSibling = (cat: any) => {
  if (cat.id === 'all') {
    return categoryTree.value.find(c => !c.isSystem);
  }

  let siblings = [];
  if (!cat.parentId) {
    siblings = categoryTree.value;
  } else {
    const parent = store.categories.find(c => c.id === cat.parentId);
    if (parent) {
      const findChildren = (nodes: any[]): any[] | null => {
        for (const node of nodes) {
          if (node.id === parent.id) return node.children;
          if (node.children) {
            const res = findChildren(node.children);
            if (res) return res;
          }
        }
        return null;
      };
      siblings = findChildren(categoryTree.value) || [];
    }
  }

  const idx = siblings.findIndex(s => s.id === cat.id);
  if (idx !== -1 && idx < siblings.length - 1) {
    return siblings[idx + 1];
  }
  return null;
};

const onDragStart = (event: DragEvent, cat: any) => {
  // 允许系统分类被拖拽换位
  draggedCatId.value = cat.id;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', cat.id);
  }
  isOverOutZone.value = false;
};

const onDragOverItem = (event: DragEvent, cat: any) => {
  if (!draggedCatId.value) return;

  event.preventDefault();
  event.stopPropagation();

  if (draggedCatId.value === cat.id) {
    dragOverCatId.value = null;
    dragPlacement.value = null;
    return;
  }

  if (cat.isSystem && draggedCatId.value !== 'all') return;

  // 防止拖入自身或子孙节点
  const isValidTarget = (targetId: string) => {
    if (!draggedCatId.value || targetId === draggedCatId.value) return false;
    if (draggedCatId.value === 'all') return true;
    const desc = store.getCategoryDescendants(draggedCatId.value);
    return !desc.has(targetId);
  };

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const relativeY = event.clientY - rect.top;
  const threshold1 = rect.height * 0.25;
  const threshold2 = rect.height * 0.75;

  isOverOutZone.value = false;

  if (relativeY < threshold1) {
    if (isValidTarget(cat.id)) {
      dragOverCatId.value = cat.id;
      dragPlacement.value = 'before';
    } else {
      dragOverCatId.value = null;
      dragPlacement.value = null;
    }
  } else if (relativeY > threshold2) {
    const isCollapsed = store.collapsedCategoryIds.includes(cat.id);
    const hasChildren = cat.children && cat.children.length > 0;

    if (draggedCatId.value === 'all') {
      const nextSibling = getNextSibling(cat);
      if (nextSibling && !nextSibling.parentId && isValidTarget(nextSibling.id)) {
        dragOverCatId.value = nextSibling.id;
        dragPlacement.value = 'before';
      } else {
        dragOverCatId.value = cat.id;
        dragPlacement.value = 'after';
      }
    } else {
      if (hasChildren && !isCollapsed) {
        const targetId = cat.children[0].id;
        if (isValidTarget(targetId)) {
          dragOverCatId.value = targetId;
          dragPlacement.value = 'before';
        }
      } else {
        const nextSibling = getNextSibling(cat);
        if (nextSibling && isValidTarget(nextSibling.id)) {
          dragOverCatId.value = nextSibling.id;
          dragPlacement.value = 'before';
        } else {
          dragOverCatId.value = cat.id;
          dragPlacement.value = 'after';
        }
      }
    }
  } else {
    // Middle 50% => inside
    if (draggedCatId.value === 'all') {
      dragOverCatId.value = null;
      dragPlacement.value = null;
    } else {
      if (isValidTarget(cat.id)) {
        dragOverCatId.value = cat.id;
        dragPlacement.value = 'inside';
      } else {
        dragOverCatId.value = null;
        dragPlacement.value = null;
      }
    }
  }
};

const onDragOverAllNotes = (event: DragEvent) => {
  if (!draggedCatId.value) return;
  event.preventDefault();
  event.stopPropagation();

  if (draggedCatId.value === 'all') {
    dragOverCatId.value = null;
    dragPlacement.value = null;
    return;
  }

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const relativeY = event.clientY - rect.top;

  isOverOutZone.value = false;

  if (relativeY < rect.height * 0.5) {
    dragOverCatId.value = 'all';
    dragPlacement.value = 'before';
  } else {
    const firstCustomCat = categoryTree.value.find(c => !c.isSystem);
    if (firstCustomCat) {
      dragOverCatId.value = firstCustomCat.id;
      dragPlacement.value = 'before';
    } else {
      dragOverCatId.value = 'all';
      dragPlacement.value = 'after';
    }
  }
};

const onDragOverOutZone = (event: DragEvent) => {
  if (!draggedCatId.value) return;
  event.preventDefault();
  event.stopPropagation();

  dragOverCatId.value = null;
  dragPlacement.value = null;
  isOverOutZone.value = true;
};

const onOutZoneDrop = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  if (!draggedCatId.value) return;

  const sourceId = draggedCatId.value;
  store.moveCategory(sourceId, undefined, undefined, 'after'); // 移动到一级分类末尾
  const sourceCat = store.categories.find(c => c.id === sourceId);
  store.showToast(`已将分类 "${sourceCat?.name}" 移出为一级分类`);

  resetDragState();
};

const onContainerDrop = (event: DragEvent) => {
  event.preventDefault();
  if (!draggedCatId.value) return;

  const sourceId = draggedCatId.value;

  if (dragOverCatId.value && dragPlacement.value) {
    const targetId = dragOverCatId.value;

    if (targetId === 'all') {
      const firstRootCat = categoryTree.value.find(c => c.id !== sourceId && !c.isSystem);
      if (firstRootCat && dragPlacement.value === 'after') {
        store.moveCategory(sourceId, undefined, firstRootCat.id, 'before');
      } else {
        // Drop 'before' all or 'after' all when no custom categories
        store.moveCategory(sourceId, undefined, 'all', dragPlacement.value);
      }
      const sourceCat = store.categories.find(c => c.id === sourceId);
      store.showToast(`已将分类 "${sourceCat?.name || '全部便签'}" 移至对应位置`);
    } else {
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
          store.showToast(
            `已将分类 "${sourceCat?.name || '全部便签'}" 移至 "${targetCat.name}" 的${placementText}`
          );
        }
      }
    }
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
  isOverOutZone.value = false;
};

const hasParent = (id: string) => {
  const cat = store.categories.find(c => c.id === id);
  return !!(cat && cat.parentId);
};

// 子分类增加逻辑
const startAddSub = (parentId: string) => {
  store.addingSubParentId = parentId;
  store.newSubCategoryName = '分类';

  // 展开父分类
  if (store.collapsedCategoryIds.includes(parentId)) {
    store.toggleCategoryCollapse(parentId);
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
  store.currentCategoryId = cat.id;
};

// 双击分类项处理
const handleCategoryDblClick = (cat: any) => {
  if (cat.isSystem) return;
  const hasChildren = cat.children && cat.children.length > 0;
  if (hasChildren) {
    store.toggleCategoryCollapse(cat.id);
  }
};

// 构建并排序树形结构
const categoryTree = computed(() => {
  const catMap = new Map(store.categories.map(c => [c.id, { ...c, children: [] as any[] }]));
  const rootCategories: any[] = [];

  store.categories.forEach(c => {
    const item = catMap.get(c.id)!;
    if (c.parentId && catMap.has(c.parentId)) {
      catMap.get(c.parentId)!.children.push(item);
    } else {
      rootCategories.push(item);
    }
  });

  const getOrderIndex = (id: string) => {
    const idx = store.categoryOrder.indexOf(id);
    return idx === -1 ? Infinity : idx;
  };
  const sortFn = (a: any, b: any) => getOrderIndex(a.id) - getOrderIndex(b.id);

  rootCategories.sort(sortFn);
  catMap.forEach(item => item.children.sort(sortFn));

  return rootCategories;
});

// 提供上下文给递归子分类组件
provide('categoryContext', {
  draggedCatId,
  dragOverCatId,
  dragPlacement,
  editingId,
  editCategoryName,
  startEdit,
  cancelEdit,
  submitEdit,
  confirmDelete,
  onDragStart,
  onDragOverItem,
  onDragEnd,
  startAddSub,
  submitAddSub,
  cancelAddSub,
  handleCategoryClick,
  handleCategoryDblClick
});
</script>

<template>
  <div
    :class="{ uTools: isUTools(), 'is-dragging': draggedCatId !== null }"
    class="sidebar-menu"
    @drop="onContainerDrop"
  >
    <div class="category-list-wrapper">
      <!-- 系统分类 (全部便签) -->
      <div
        class="menu-item"
        data-id="all"
        :class="{
          active: store.currentCategoryId === 'all',
          dragging: draggedCatId === 'all'
        }"
        :draggable="editingId !== 'all'"
        @click="store.currentCategoryId = 'all'"
        @dragover.prevent.stop="onDragOverAllNotes"
        @dragstart="onDragStart($event, { id: 'all', isSystem: true })"
        @dragend="onDragEnd"
      >
        <div class="active-indicator"></div>
        <div class="item-left">
          <Folder class="item-icon" />
          <span class="item-name" data-tooltip="全部便签">全部便签</span>
        </div>
        <span class="item-badge">{{ getNoteCount('all') }}</span>
      </div>

      <!-- 用户自定义分类树 -->
      <CategoryItem v-for="cat in categoryTree" :key="cat.id" :cat="cat" :level="0" />

      <!-- 拖拽指示线 -->
      <div
        v-if="dragOverCatId && dragPlacement && dragPlacement !== 'inside'"
        class="drag-indicator-line"
        :style="dragIndicatorStyle"
      ></div>
    </div>

    <!-- 拖拽移出根级提示区 -->
    <div
      v-if="draggedCatId && hasParent(draggedCatId)"
      class="drag-out-zone"
      :class="{ active: isOverOutZone }"
      @dragover.prevent.stop="onDragOverOutZone"
      @dragleave="isOverOutZone = false"
      @drop.prevent.stop="onOutZoneDrop"
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

<style lang="scss" scoped src="./CategoryList.scss"></style>
