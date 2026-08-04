<script lang="ts" setup>
import { ref, computed } from 'vue';
import { CheckSquare, Square, Folder, ChevronRight } from '@lucide/vue';
import { CategoryTreeNode } from './DataCategorySelector.vue';

interface Props {
  node: CategoryTreeNode;
  selectedCategoryIds: string[];
  noteCountMap: Record<string, number>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'toggleCategory', id: string, subtreeIds?: string[]): void;
}>();

// 控制子节点的展开/折叠状态（默认全部展开，便于清晰查看完整的层级树）
const isCollapsed = ref(false);

const hasChildren = computed(() => props.node.children && props.node.children.length > 0);

const isSelected = computed(() => props.selectedCategoryIds.includes(props.node.id));

// 获取以当前节点为根的所有子孙节点 ID 列表（包含自身）
const getSubtreeIds = (treeNode: CategoryTreeNode): string[] => {
  const ids = [treeNode.id];
  const traverse = (children: CategoryTreeNode[]) => {
    children.forEach(child => {
      ids.push(child.id);
      if (child.children && child.children.length > 0) {
        traverse(child.children);
      }
    });
  };
  if (treeNode.children) {
    traverse(treeNode.children);
  }
  return ids;
};

const handleNodeClick = () => {
  const subtreeIds = getSubtreeIds(props.node);
  emit('toggleCategory', props.node.id, subtreeIds);
};

const toggleCollapse = (e: Event) => {
  e.stopPropagation();
  isCollapsed.value = !isCollapsed.value;
};
</script>

<template>
  <div class="tree-node-wrapper">
    <div
      class="category-item"
      :class="{ active: isSelected }"
      :style="{ paddingLeft: `calc(10px + ${node.level * 16}px)` }"
      @click="handleNodeClick"
    >
      <div class="item-left">
        <!-- 折叠/展开控制图标 -->
        <span
          v-if="hasChildren"
          class="collapse-toggle"
          :data-tooltip="isCollapsed ? '展开子分类' : '折叠子分类'"
          @click="toggleCollapse"
        >
          <ChevronRight class="toggle-icon" :class="{ 'is-expanded': !isCollapsed }" />
        </span>
        <span v-else class="collapse-spacer"></span>

        <!-- 复选框 -->
        <CheckSquare v-if="isSelected" class="checkbox-icon checked" />
        <Square v-else class="checkbox-icon" />

        <!-- 文件夹图标 & 名称 -->
        <Folder class="folder-icon" />
        <span class="cat-name">{{ node.name }}</span>
      </div>

      <!-- 便签数量 Counter Badge -->
      <span class="badge">{{ noteCountMap[node.id] || 0 }}</span>
    </div>

    <!-- 递归渲染子分类节点 -->
    <div v-if="hasChildren && !isCollapsed" class="tree-children">
      <DataCategoryTreeItem
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :selected-category-ids="selectedCategoryIds"
        :note-count-map="noteCountMap"
        @toggle-category="(id, subtreeIds) => emit('toggleCategory', id, subtreeIds)"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.tree-node-wrapper {
  display: flex;
  flex-direction: column;
}

.category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 7px;
  padding-bottom: 7px;
  padding-right: 12px;
  border-radius: 8px;
  background: var(--item-bg, rgba(0, 0, 0, 0.03));
  border: 1px solid transparent;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  margin-bottom: 4px;

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

    .collapse-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 4px;
      color: var(--text-secondary, #888);
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.15s ease, color 0.15s ease;

      &:hover {
        background: rgba(0, 0, 0, 0.08);
        color: var(--text-primary, #333);
      }

      .toggle-icon {
        width: 14px;
        height: 14px;
        stroke-width: 2.2;
        transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);

        &.is-expanded {
          transform: rotate(90deg);
        }
      }
    }

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

.tree-children {
  display: flex;
  flex-direction: column;
}
</style>
