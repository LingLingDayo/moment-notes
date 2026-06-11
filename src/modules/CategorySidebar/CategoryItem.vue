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
    return store.notes.filter(n => n.isDeleted !== true).length;
  }
  const descendants = store.getCategoryDescendants(categoryId);
  return store.notes.filter(
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
        <button class="edit-btn confirm" @click="ctx.submitEdit(cat.id)">
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
            <button class="edit-btn confirm" @click="ctx.submitAddSub(cat.id)">
              <Check class="btn-icon-small" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped src="./CategoryList.scss"></style>
