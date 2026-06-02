<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { Plus, Trash2, Sun, Moon } from 'lucide-vue-next';
import { storage, isUTools } from '@utils/storage';
import SearchSection from './SearchSection.vue';
import SortPopover from './SortPopover.vue';

const store = useStickyNotesStore();

// 黑暗模式状态
const isDark = ref(false);

// 动态清空按钮的提示文字
const clearTooltip = computed(() => {
  return store.currentCategoryId === 'all' ? '清空所有便签' : '清空当前分类便签';
});

// 初始化主题与事件监听
onMounted(() => {
  // 1. 如果在 uTools 环境下，我们可以根据 uTools 的系统颜色设置
  if (isUTools()) {
    try {
      isDark.value = window.utools.isDarkColors();
      applyTheme(isDark.value);
      
      // 监听 uTools 主题切换
      window.utools.onPluginEnter(() => {
        isDark.value = window.utools.isDarkColors();
        applyTheme(isDark.value);
      });
      return;
    } catch (e) {
      console.error('Failed to get theme from uTools:', e);
    }
  }

  // 2. 浏览器环境，从 localStorage 获取或跟随系统
  const storedTheme = storage.getItem('sticky_notes_theme');
  if (storedTheme) {
    isDark.value = storedTheme === 'dark';
  } else {
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  applyTheme(isDark.value);
});

// 切换主题
const toggleTheme = () => {
  isDark.value = !isDark.value;
  applyTheme(isDark.value);
  storage.setItem('sticky_notes_theme', isDark.value ? 'dark' : 'light');
};

// 应用主题类
const applyTheme = (dark: boolean) => {
  const root = document.documentElement;
  if (dark) {
    root.classList.remove('light-theme');
    root.classList.add('dark-theme');
  } else {
    root.classList.remove('dark-theme');
    root.classList.add('light-theme');
  }
};

// 清空当前分类便签
const handleClear = async () => {
  const currentCat = store.categories.find(c => c.id === store.currentCategoryId);
  const catName = currentCat ? `"${currentCat.name}"` : '所有';
  
  const ok = await store.askConfirm(
    '确认清空便签',
    `⚠️ 警告：确定要清空 ${catName} 下的所有便签吗？此操作无法撤销。`
  );
  if (ok) {
    store.clearNotes(store.currentCategoryId);
    store.showToast('便签已清空');
  }
};

// 创建新便签
const handleAddNote = () => {
  // 创建一个空便签，放在最前端
  const newNote = store.addNote(store.currentCategoryId, '', '', 'yellow');
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
        class="icon-btn theme-toggle" 
        data-tooltip="切换主题" 
        @click="toggleTheme"
      >
        <Sun v-if="isDark" class="btn-icon" />
        <Moon v-else class="btn-icon" />
      </button>

      <!-- 排序选择 -->
      <SortPopover />

      <!-- 清空当前分类 -->
      <button 
        class="icon-btn danger" 
        :disabled="store.filteredNotes.length === 0"
        :data-tooltip="clearTooltip" 
        @click="handleClear"
      >
        <Trash2 class="btn-icon" />
      </button>

      <!-- 新建便签 -->
      <button 
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
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--panel-border);
  backdrop-filter: blur(var(--glass-blur));
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
  border-radius: 12px;
  background: var(--accent-color);
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 4px 12px -2px rgba(99, 102, 241, 0.3);

  &:hover {
    background: var(--accent-hover);
    box-shadow: 0 6px 16px -2px rgba(99, 102, 241, 0.4);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  .btn-icon-plus {
    width: 15px;
    height: 15px;
  }
}
</style>
