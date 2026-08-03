<script lang="ts" setup>
import { CheckSquare, Square, Folder, FileText } from '@lucide/vue';

export interface CategoryItem {
  id: string;
  name: string;
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
}

const props = withDefaults(defineProps<Props>(), {
  title: '分类数据',
  selectedCount: undefined,
  totalCount: undefined,
  showUncategorized: false,
  isUncategorizedSelected: false,
  uncategorizedLabel: '未分类便签'
});

const emit = defineEmits<{
  (e: 'toggleCategory', id: string): void;
  (e: 'toggleSelectAll'): void;
  (e: 'toggleUncategorized'): void;
}>();
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

    <!-- 分类多选列表容器 -->
    <div class="category-list custom-scrollbar">
      <!-- 自定义分类项目 -->
      <div
        v-for="cat in props.categories"
        :key="cat.id"
        class="category-item"
        :class="{ active: props.selectedCategoryIds.includes(cat.id) }"
        @click="emit('toggleCategory', cat.id)"
      >
        <div class="item-left">
          <CheckSquare
            v-if="props.selectedCategoryIds.includes(cat.id)"
            class="checkbox-icon checked"
          />
          <Square v-else class="checkbox-icon" />
          <Folder class="folder-icon" />
          <span class="cat-name">{{ cat.name }}</span>
        </div>
        <span class="badge">{{ props.noteCountMap[cat.id] || 0 }} 贴</span>
      </div>

      <!-- 全局/未明确分配分类的便签 -->
      <div
        v-if="props.showUncategorized"
        class="category-item"
        :class="{ active: props.isUncategorizedSelected }"
        @click="emit('toggleUncategorized')"
      >
        <div class="item-left">
          <CheckSquare
            v-if="props.isUncategorizedSelected"
            class="checkbox-icon checked"
          />
          <Square v-else class="checkbox-icon" />
          <FileText class="folder-icon" />
          <span class="cat-name">{{ props.uncategorizedLabel }}</span>
        </div>
        <span class="badge">{{ props.noteCountMap['uncategorized'] || 0 }} 贴</span>
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
    background: none;
    border: none;
    color: var(--primary-color, #3b82f6);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;
    transition: background 0.2s;

    &:hover {
      background: rgba(59, 130, 246, 0.1);
    }
  }
}

.category-list {
  max-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 4px;
}

.category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--item-bg, rgba(0, 0, 0, 0.03));
  border: 1px solid transparent;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;

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
    gap: 8px;

    .checkbox-icon {
      width: 16px;
      height: 16px;
      color: var(--text-secondary, #999);

      &.checked {
        color: var(--primary-color, #3b82f6);
      }
    }

    .folder-icon {
      width: 15px;
      height: 15px;
      color: var(--text-secondary, #666);
    }

    .cat-name {
      font-size: 13px;
      font-weight: 500;
    }
  }

  .badge {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.06);
    color: var(--text-secondary, #666);
  }
}
</style>
