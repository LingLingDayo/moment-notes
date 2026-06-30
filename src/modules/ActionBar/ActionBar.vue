<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { Plus, Trash2, Sun, Moon } from 'lucide-vue-next';
import { isUTools } from '@utils/storage';
import SearchSection from './SearchSection.vue';
import SortPopover from './SortPopover.vue';
import GridColumnsPopover from './GridColumnsPopover.vue';

const store = useStickyNotesStore();

// 当前处于展开状态的下拉菜单：'sort' | 'columns' | null
const activePopover = ref<'sort' | 'columns' | null>(null);

const togglePopover = (type: 'sort' | 'columns') => {
  activePopover.value = activePopover.value === type ? null : type;
};

const closePopover = () => {
  activePopover.value = null;
};

// 动态清空按钮的提示文字
const clearTooltip = computed(() => {
  if (store.currentCategoryId === 'trash') {
    return '清空回收站';
  }
  return store.currentCategoryId === 'all' ? '清空所有便签' : '清空当前分类便签';
});

// 初始化主题与事件监听
onMounted(() => {
  // 监听全局点击以关闭所有下拉菜单
  document.addEventListener('click', closePopover);

  // 初始化主题并自动读取存储/系统设置
  store.initTheme(isUTools());

  // 如果在 uTools 环境下，监听每次插件切入以更新主题
  if (isUTools()) {
    try {
      window.utools.onPluginEnter(() => {
        store.initTheme(true);
      });
    } catch (e) {
      console.error('Failed to register theme watcher on utools enter:', e);
    }
  }
});

onUnmounted(() => {
  document.removeEventListener('click', closePopover);
});

// 清空当前分类便签
const handleClear = async () => {
  if (store.currentCategoryId === 'trash') {
    const ok = await store.askConfirm(
      '确认清空回收站吗？',
      '⚠️ 警告：清空回收站将彻底从设备删除其中所有的便签，此操作不可逆，数据无法找回！'
    );
    if (ok) {
      store.clearTrash();
    }
    return;
  }

  const currentCat = store.categories.find(c => c.id === store.currentCategoryId);
  const catName = store.currentCategoryId === 'all'
    ? '"全部便签"'
    : (currentCat ? `"${currentCat.name}"` : '当前分类');

  const ok = await store.askConfirm(
    '确认删除便签',
    `⚠️ 警告：确定要清空 ${catName} 下的所有便签吗？这些便签将被移动到回收站。`
  );
  if (ok) {
    store.clearNotes(store.currentCategoryId);
    store.showToast('已将所有便签移至回收站');
  }
};

// 创建新便签
const handleAddNote = () => {
  // 创建一个空便签，放在最前端
  store.addNote(store.currentCategoryId, '', '', 'yellow');
  store.showToast('已新建空便签，可以直接编辑');
};
</script>

<template>
  <div class="action-bar-container">
    <!-- 搜索区域 -->
    <SearchSection />

    <!-- 按钮操作区 -->
    <div class="actions-wrapper">
      <!-- 切换主题 -->
      <button
        v-if="store.enabledActionBarButtons.includes('theme-toggle')"
        class="icon-btn theme-toggle"
        data-tooltip="切换主题"
        @click="store.toggleTheme"
      >
        <Sun v-if="store.isDark" class="btn-icon" />
        <Moon v-else class="btn-icon" />
      </button>

      <!-- 排序选择 -->
      <SortPopover
        v-if="store.enabledActionBarButtons.includes('sort-select')"
        :is-open="activePopover === 'sort'"
        @toggle="togglePopover('sort')"
        @close="closePopover"
      />

      <!-- 列数设置 -->
      <GridColumnsPopover
        v-if="store.enabledActionBarButtons.includes('columns-select')"
        :is-open="activePopover === 'columns'"
        @toggle="togglePopover('columns')"
        @close="closePopover"
      />

      <!-- 清空当前分类 (垃圾箱分类下隐藏) -->
      <button
        v-if="store.currentCategoryId !== 'trash' && store.enabledActionBarButtons.includes('clear-notes')"
        class="icon-btn danger"
        :disabled="store.filteredNotes.length === 0"
        :data-tooltip="clearTooltip"
        @click="handleClear"
      >
        <Trash2 class="btn-icon" />
      </button>

      <!-- 清空回收站 (在垃圾箱分类下显示) -->
      <button
        v-if="store.currentCategoryId === 'trash' && store.enabledActionBarButtons.includes('clear-notes')"
        class="primary-btn danger-btn"
        :disabled="store.filteredNotes.length === 0"
        data-tooltip="清空回收站"
        @click="handleClear"
      >
        <Trash2 class="btn-icon-plus" />
        <span>清空回收站</span>
      </button>

      <!-- 新建便签 (垃圾箱分类下隐藏) -->
      <button
        v-if="store.currentCategoryId !== 'trash' && store.enabledActionBarButtons.includes('add-note')"
        class="primary-btn"
        data-tooltip="新建便签"
        @click="handleAddNote"
      >
        <Plus class="btn-icon-plus" />
        <span>新建便签</span>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.action-bar-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  padding-bottom: 0;
  gap: 16px;
  position: relative;
  z-index: 50;
}

.actions-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: var(--btn-bg);
  border: 1px solid var(--btn-border);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  background-clip: padding-box;

  &:hover:not(:disabled) {
    background: var(--btn-hover-bg);
    color: var(--btn-hover-color);
    border-color: var(--btn-hover-border);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.danger {
    &:hover:not(:disabled) {
      background: var(--danger-hover-bg);
      border-color: var(--danger-hover-border);
      color: var(--danger-color);
    }
  }

  .btn-icon {
    width: 16px;
    height: 16px;
  }

  &.active {
    color: var(--accent-color);
    border-color: rgba(99, 102, 241, 0.25);
    background: var(--accent-light);
  }
}

.primary-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  height: 38px;
  line-height: 38px;
  border-radius: 12px;
  background: var(--accent-color);
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 4px 12px -2px rgba(99, 102, 241, 0.3);
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: var(--accent-hover);
    box-shadow: 0 6px 16px -2px rgba(99, 102, 241, 0.4);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  .btn-icon-plus {
    width: 16px;
    height: 16px;
  }

  &.danger-btn {
    background: var(--danger-color, #ff4d4f);
    box-shadow: 0 4px 12px -2px rgba(255, 77, 79, 0.3);

    &:hover:not(:disabled) {
      background: #ff7875;
      box-shadow: 0 6px 16px -2px rgba(255, 77, 79, 0.4);
    }
  }
}

@media (max-width: 1049px) {
  .action-bar-container {
    padding: 12px 16px;
    padding-bottom: 0;
    gap: 12px;
  }

  .actions-wrapper {
    gap: 6px;
  }

  .icon-btn {
    width: 34px;
    height: 34px;
    border-radius: 10px;
  }

  .primary-btn {
    height: 34px;
    padding: 0 12px;
    border-radius: 10px;
  }
}

@media (max-width: 869px) {
  .primary-btn {
    width: 34px;
    padding: 0;
    justify-content: center;

    span {
      display: none;
    }
  }
}
</style>
