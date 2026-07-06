<script lang="ts" setup>
import { ref, provide, computed } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { Trash2, History } from 'lucide-vue-next';
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
  if (editingId.value !== id) return;
  const name = editCategoryName.value.trim();
  if (name) {
    const originalCategory = store.categories.find(c => c.id === id);
    if (originalCategory && originalCategory.name === name) {
      cancelEdit();
      return;
    }
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
    `确定要删除分类 "${name}" 吗？该分类下的子分类会自动上移，该分类下的便签将被移至最近删除。`
  );
  if (ok) {
    store.deleteCategory(id);
    store.showToast(`分类 "${name}" 已删除`);
  }
};

// 拖动排序相关的状态与方法
const draggedCatId = ref<string | null>(null);
const dragOverCatId = ref<string | null>(null);
const dragPlacement = ref<'before' | 'after' | 'inside' | null>(null);

// 拖拽指示线样式与层级计算
const getCategoryLevel = (id: string): number => {
  if (id === 'all' || id === 'trash' || id === 'recent') return 0;
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
    // Middle 50% => inside (不能拖入系统分类或 all 本身)
    if (draggedCatId.value === 'all' || cat.isSystem) {
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
};

const onSidebarDragOver = (event: DragEvent) => {
  if (!draggedCatId.value) return;
  const target = event.target as HTMLElement;
  if (target && (target.classList.contains('sidebar-menu') || target.closest('.trash-item'))) {
    dragOverCatId.value = null;
    dragPlacement.value = null;
  }
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
  if (store.addingSubParentId !== parentId) return;
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

  // 将 "全部便签" 作为特殊的系统根分类加入树中，使其参与拖拽排序
  const allItem = {
    id: 'all',
    name: '全部便签',
    isSystem: true,
    createdAt: 0,
    children: [] as any[]
  };
  catMap.set('all', allItem);
  rootCategories.push(allItem);

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
    @dragover="onSidebarDragOver"
    @drop="onContainerDrop"
  >
    <div class="category-list-wrapper" @dragover.prevent>
      <!-- 用户自定义分类树 (包含 "全部便签") -->
      <CategoryItem v-for="cat in categoryTree" :key="cat.id" :cat="cat" :level="0" />

      <!-- 拖拽指示线 -->
      <div
        v-if="dragOverCatId && dragPlacement && dragPlacement !== 'inside'"
        class="drag-indicator-line"
        :style="dragIndicatorStyle"
      ></div>
    </div>

    <!-- 分割线 -->
    <div class="menu-divider"></div>

    <!-- 最近使用分类 -->
    <div
      class="menu-item recent-item"
      :class="{ active: store.currentCategoryId === 'recent' }"
      @click="store.currentCategoryId = 'recent'"
    >
      <div class="active-indicator"></div>
      <div class="item-left">
        <History class="item-icon" />
        <span class="item-name" data-tooltip="最近复制/双击使用过的便签">最近使用</span>
      </div>
      <span v-if="store.recentNotesCount > 0" class="item-badge">{{ store.recentNotesCount }}</span>
    </div>

    <!-- 垃圾箱分类 -->
    <div
      class="menu-item trash-item"
      :class="{ active: store.currentCategoryId === 'trash' }"
      @click="store.currentCategoryId = 'trash'"
    >
      <div class="active-indicator"></div>
      <div class="item-left">
        <Trash2 class="item-icon" />
        <span class="item-name" data-tooltip="已删除的便签">最近删除</span>
      </div>
      <span v-if="store.trashNotesCount > 0" class="item-badge">{{ store.trashNotesCount }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped src="./CategoryList.scss"></style>
