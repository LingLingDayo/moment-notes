<script lang="ts" setup>
import { computed } from 'vue';
import { CheckSquare, Square, FileText } from '@lucide/vue';
import DataCategoryTreeItem from './DataCategoryTreeItem.vue';

export interface CategoryItem {
  id: string;
  name: string;
  parentId?: string;
}

export interface CategoryTreeNode extends CategoryItem {
  children: CategoryTreeNode[];
  level: number;
}

interface Props {
  /** 分类列表 */
  categories: CategoryItem[];
  /** 当前勾选的分类 ID 数组 */
  selectedCategoryIds: string[];
  /** 分类与未分类的便签数量映射 */
  noteCountMap: Record<string, number>;
  /** 是否全选 */
  isAllSelected: boolean;
  /** 工具栏标题文本 */
  title?: string;
  /** 已选数量（若不传则默认为 selectedCategoryIds.length） */
  selectedCount?: number;
  /** 总数量（若不传则默认为 categories.length） */
  totalCount?: number;
  /** 是否显示未分类便签项 */
  showUncategorized?: boolean;
  /** 未分类便签项是否已选中 */
  isUncategorizedSelected?: boolean;
  /** 未分类便签项名称 */
  uncategorizedLabel?: string;
  /** 分类排序数组（可选） */
  categoryOrder?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  title: '分类数据',
  selectedCount: undefined,
  totalCount: undefined,
  showUncategorized: false,
  isUncategorizedSelected: false,
  uncategorizedLabel: '未分类便签',
  categoryOrder: () => []
});

const emit = defineEmits<{
  (e: 'toggleCategory', id: string, subtreeIds?: string[]): void;
  (e: 'toggleSelectAll'): void;
  (e: 'toggleUncategorized'): void;
}>();

// 构建并排序分类树形结构
const categoryTree = computed<CategoryTreeNode[]>(() => {
  const catMap = new Map<string, CategoryTreeNode>();

  props.categories.forEach(c => {
    catMap.set(c.id, { ...c, children: [], level: 0 });
  });

  const rootNodes: CategoryTreeNode[] = [];

  props.categories.forEach(c => {
    const node = catMap.get(c.id)!;
    if (c.parentId && catMap.has(c.parentId)) {
      catMap.get(c.parentId)!.children.push(node);
    } else {
      rootNodes.push(node);
    }
  });

  // 如果提供了 categoryOrder 排序，则按其索引值排序
  if (props.categoryOrder && props.categoryOrder.length > 0) {
    const getOrderIndex = (id: string) => {
      const idx = props.categoryOrder!.indexOf(id);
      return idx === -1 ? Infinity : idx;
    };
    const sortFn = (a: CategoryTreeNode, b: CategoryTreeNode) =>
      getOrderIndex(a.id) - getOrderIndex(b.id);

    rootNodes.sort(sortFn);
    catMap.forEach(node => {
      node.children.sort(sortFn);
    });
  }

  // 递归递归设置 level 层级深度
  const setLevel = (nodes: CategoryTreeNode[], currentLevel: number) => {
    nodes.forEach(n => {
      n.level = currentLevel;
      if (n.children.length > 0) {
        setLevel(n.children, currentLevel + 1);
      }
    });
  };
  setLevel(rootNodes, 0);

  return rootNodes;
});
</script>

<template>
  <div class="category-selector-section">
    <!-- 分类选择头部工具栏 -->
    <div class="selection-toolbar">
      <span class="sub-title">
        {{ props.title }} ({{ props.selectedCount ?? props.selectedCategoryIds.length }}/{{ props.totalCount ?? props.categories.length }})
      </span>
      <button
        v-if="props.categories.length > 0"
        class="text-action-btn"
        @click="emit('toggleSelectAll')"
      >
        {{ props.isAllSelected ? '取消全选' : '全选' }}
      </button>
    </div>

    <!-- 分类多选列表容器 (树形加载) -->
    <div class="category-list custom-scrollbar">
      <!-- 树形渲染顶级节点及其递归子树 -->
      <DataCategoryTreeItem
        v-for="rootNode in categoryTree"
        :key="rootNode.id"
        :node="rootNode"
        :selected-category-ids="props.selectedCategoryIds"
        :note-count-map="props.noteCountMap"
        @toggle-category="(id, subtreeIds) => emit('toggleCategory', id, subtreeIds)"
      />

      <!-- 全局/未明确分配分类的便签 -->
      <div
        v-if="props.showUncategorized"
        class="category-item uncategorized-item"
        :class="{ active: props.isUncategorizedSelected }"
        @click="emit('toggleUncategorized')"
      >
        <div class="item-left">
          <span class="collapse-spacer"></span>
          <CheckSquare
            v-if="props.isUncategorizedSelected"
            class="checkbox-icon checked"
          />
          <Square v-else class="checkbox-icon" />
          <FileText class="folder-icon" />
          <span class="cat-name">{{ props.uncategorizedLabel }}</span>
        </div>
        <span class="badge">{{ props.noteCountMap['uncategorized'] || 0 }}</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.category-selector-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selection-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .sub-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary, #333);
  }

  .text-action-btn {
    height: 20px;
    line-height: 20px;
    background: none;
    border: none;
    color: var(--primary-color, #3b82f6);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    padding: 0 6px;
    border-radius: 4px;
    transition: background 0.2s;

    &:hover {
      background: rgba(59, 130, 246, 0.1);
    }
  }
}

.category-list {
  max-height: 240px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-right: 4px;
}

.category-item.uncategorized-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 7px;
  padding-bottom: 7px;
  padding-left: 10px;
  padding-right: 12px;
  border-radius: 8px;
  background: var(--item-bg, rgba(0, 0, 0, 0.03));
  border: 1px solid transparent;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  margin-top: 4px;

  &:hover {
    background: var(--item-hover-bg, rgba(0, 0, 0, 0.06));
  }

  &.active {
    background: var(--item-active-bg, rgba(59, 130, 246, 0.08));
    border-color: rgba(59, 130, 246, 0.3);
  }

  .item-left {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    flex: 1;

    .collapse-spacer {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    .checkbox-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      color: var(--text-secondary, #999);

      &.checked {
        color: var(--primary-color, #3b82f6);
      }
    }

    .folder-icon {
      width: 15px;
      height: 15px;
      flex-shrink: 0;
      color: var(--text-secondary, #666);
    }

    .cat-name {
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .badge {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.06);
    color: var(--text-secondary, #666);
    flex-shrink: 0;
  }
}
</style>
