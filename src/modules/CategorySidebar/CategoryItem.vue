<script lang="ts" setup>
import { inject, computed } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { Folder, Edit3, Trash2, Check, ChevronRight, Plus } from 'lucide-vue-next';

const props = defineProps<{
  cat: any;
  level: number;
}>();

const store = useStickyNotesStore();
const ctx: any = inject('categoryContext');

const isCollapsed = computed(() => store.collapsedCategoryIds.includes(props.cat.id));
const hasChildren = computed(() => props.cat.children && props.cat.children.length > 0);
const isAddingSub = computed(() => store.addingSubParentId === props.cat.id);

// 获取分类下的便签数
const getNoteCount = (categoryId: string) => {
  if (categoryId === 'all') {
    return store.allNotes.filter(n => n.isDeleted !== true).length;
  }
  const descendants = store.getCategoryDescendants(categoryId);
  return store.allNotes.filter(
    n => (n.categoryId === categoryId || descendants.has(n.categoryId)) && n.isDeleted !== true
  ).length;
};

// 自定义指令：用于在元素挂载时自动聚焦并全选内容，避免在更新时重复触发
const vFocusSelect = {
  mounted: (el: HTMLInputElement) => {
    setTimeout(() => {
      el.focus();
      el.select();
    }, 100);
  }
};
</script>

<template>
  <div class="category-node">
    <div
      class="menu-item"
      :class="{
        active: store.currentCategoryId === cat.id,
        'has-actions': !cat.isSystem,
        dragging: ctx.draggedCatId.value === cat.id,
        'drag-inside': ctx.dragOverCatId.value === cat.id && ctx.dragPlacement.value === 'inside'
      }"
      :data-id="cat.id"
      :draggable="ctx.editingId.value !== cat.id"
      :style="{ '--item-level': level }"
      @click="ctx.handleCategoryClick(cat)"
      @dblclick="ctx.handleCategoryDblClick(cat)"
      @dragstart="ctx.onDragStart($event, cat)"
      @dragover="ctx.onDragOverItem($event, cat)"
      @dragend="ctx.onDragEnd"
    >
      <div class="active-indicator"></div>

      <!-- 折叠/展开箭头 -->
      <span
        v-if="hasChildren"
        class="collapse-toggle"
        @click.stop="store.toggleCategoryCollapse(cat.id)"
        @dblclick.stop
      >
        <ChevronRight class="toggle-icon" :class="{ 'is-expanded': !isCollapsed }" />
      </span>

      <!-- 编辑分类名称状态 -->
      <div v-if="ctx.editingId.value === cat.id" class="item-edit-wrapper" @click.stop>
        <input
          v-model="ctx.editCategoryName.value"
          v-focus-select
          type="text"
          class="item-edit-input"
          @keyup.enter="ctx.submitEdit(cat.id)"
          @keyup.esc="ctx.cancelEdit"
          @blur="ctx.submitEdit(cat.id)"
        />
        <button class="edit-btn confirm" @mousedown.prevent @click="ctx.submitEdit(cat.id)">
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
          <span v-if="store.showNoteCount && getNoteCount(cat.id) > 0" class="item-badge">{{ getNoteCount(cat.id) }}</span>
          <div v-if="!cat.isSystem" class="item-actions">
            <!-- 添加子分类 -->
            <button class="action-btn" data-tooltip="添加子分类" @click="ctx.startAddSub(cat.id)">
              <Plus class="action-icon" />
            </button>

            <!-- 编辑分类 -->
            <button
              class="action-btn"
              data-tooltip="编辑分类"
              @click="ctx.startEdit(cat.id, cat.name)"
            >
              <Edit3 class="action-icon" />
            </button>

            <!-- 删除分类 -->
            <button
              class="action-btn delete"
              data-tooltip="删除分类"
              @click="ctx.confirmDelete(cat.id, cat.name)"
            >
              <Trash2 class="action-icon" />
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- 子分类列表容器 (Grid 0fr -> 1fr 纯 CSS 完美折叠动画) -->
    <div class="sub-categories" :class="{ 'is-collapsed': isCollapsed }">
      <div class="sub-categories-inner">
        <!-- 递归渲染子分类 -->
        <CategoryItem
          v-for="child in cat.children"
          :key="child.id"
          :cat="child"
          :level="level + 1"
        />

        <!-- 虚拟新增子分类输入框 -->
        <div
          v-if="isAddingSub"
          class="menu-item virtual-add-item"
          :style="{ '--item-level': level + 1 }"
        >
          <div class="item-edit-wrapper" @click.stop>
            <input
              v-model="store.newSubCategoryName"
              v-focus-select
              type="text"
              placeholder="子分类名称..."
              class="item-edit-input"
              @keyup.enter="ctx.submitAddSub(cat.id)"
              @keyup.esc="ctx.cancelAddSub"
              @blur="ctx.submitAddSub(cat.id)"
            />
            <button class="edit-btn confirm" @mousedown.prevent @click="ctx.submitAddSub(cat.id)">
              <Check class="btn-icon-small" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.category-node {
  display: block;
}

.sub-categories {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: visible; // 展开时可见，让拖动指示线能够正常溢出显示

  .sub-categories-inner {
    overflow: hidden;
  }

  &.is-collapsed {
    grid-template-rows: 0fr;
    overflow: hidden; // 折叠时裁剪
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
  margin-bottom: 6px;
  flex-shrink: 0;

  .active-indicator {
    position: absolute;
    left: 0;
    width: 3px;
    height: 0;
    background: var(--accent-color);
    border-radius: 0 4px 4px 0;
    transition: height 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .collapse-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    margin-right: 4px;
    margin-left: -4px;
    border-radius: 4px;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
    z-index: 2;
    flex-shrink: 0;
    align-self: center;
    background: transparent;

    &:hover {
      color: var(--text-primary);

      .toggle-icon {
        transform: scale(1.12);

        &.is-expanded {
          transform: rotate(90deg) scale(1.12);
        }
      }
    }

    .toggle-icon {
      display: block;
      width: 12px;
      height: 12px;
      stroke-width: 2.5px;
      transition:
        transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
        color 0.2s ease;

      &.is-expanded {
        transform: rotate(90deg);
      }
    }
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

    .item-badge,
    .item-actions,
    .active-indicator,
    .collapse-toggle {
      opacity: 0 !important;
    }
  }

  &.drag-inside {
    background: var(--drag-inside-bg) !important;
    border-color: var(--accent-color) !important;
    box-shadow:
      inset 0 0 0 1px var(--accent-color),
      var(--shadow-sm) !important;
  }

  &.category-list-move {
    transition: none;
  }

  .sidebar-menu.is-dragging & {
    &.category-list-move {
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
  }

  &.category-list-enter-active,
  &.category-list-leave-active {
    transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  }

  &.category-list-enter-from,
  &.category-list-leave-to {
    opacity: 0;
    height: 0;
    min-height: 0;
    margin-bottom: 0;
    padding-top: 0;
    padding-bottom: 0;
    border-top-width: 0;
    border-bottom-width: 0;
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
  width: 24px;
  height: 24px;
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
    background: var(--action-btn-hover-bg);
    color: var(--text-primary);
    color: var(--btn-hover-color);
  }

  &.delete:hover {
    background: var(--action-btn-danger-hover-bg);
    color: var(--danger-color);
  }

  .action-icon {
    width: 14px;
    height: 14px;
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
  .menu-item {
    height: 36px;
    padding-left: calc(10px + var(--item-level, 0) * 10px);
    padding-right: 6px;
  }

  .item-left {
    gap: 8px;
  }
}
</style>

