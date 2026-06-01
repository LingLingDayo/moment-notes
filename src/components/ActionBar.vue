<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { useStickyNotesStore } from '../stores/stickyNotes';
import { Search, Plus, Trash2, Sun, Moon, X } from 'lucide-vue-next';
import { storage, isUTools } from '../utils/storage';

const store = useStickyNotesStore();

// 黑暗模式状态
const isDark = ref(false);

// 初始化主题
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

// 清空搜索词
const clearSearch = () => {
  store.searchQuery = '';
};
</script>

<template>
  <div class="action-bar-container">
    <!-- 搜索区域 -->
    <div class="search-wrapper">
      <Search class="search-icon" />
      <input 
        v-model="store.searchQuery"
        type="text" 
        placeholder="搜索便签内容或标题..."
        class="search-input"
      />
      <button 
        v-if="store.searchQuery" 
        class="clear-search-btn"
        @click="clearSearch"
      >
        <X class="clear-icon" />
      </button>
    </div>

    <!-- 按钮操作区 -->
    <div class="actions-wrapper">
      <!-- 切换主题 -->
      <button 
        class="icon-btn theme-toggle" 
        title="切换主题" 
        @click="toggleTheme"
      >
        <Sun v-if="isDark" class="btn-icon" />
        <Moon v-else class="btn-icon" />
      </button>

      <!-- 清空当前分类 -->
      <button 
        class="icon-btn danger" 
        :disabled="store.filteredNotes.length === 0"
        title="清空当前便签" 
        @click="handleClear"
      >
        <Trash2 class="btn-icon" />
      </button>

      <!-- 新建便签 -->
      <button 
        class="primary-btn" 
        title="新建便签" 
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
}

.search-wrapper {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 6px 14px;
  flex: 1;
  max-width: 420px;
  position: relative;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  .light-theme & {
    background: rgba(255, 255, 255, 0.6);
    border-color: rgba(0, 0, 0, 0.08);
  }

  &:focus-within {
    max-width: 480px;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px var(--accent-light);
    background: rgba(0, 0, 0, 0.18);

    .light-theme & {
      background: #ffffff;
    }
  }
}

.search-icon {
  width: 16px;
  height: 16px;
  color: var(--text-muted);
  margin-right: 10px;
}

.search-input {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 13px;
  width: 100%;
  padding: 4px 0;

  &::placeholder {
    color: var(--text-muted);
  }
}

.clear-search-btn {
  position: absolute;
  right: 10px;
  padding: 4px;
  border-radius: 50%;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
  }
}

.clear-icon {
  width: 12px;
  height: 12px;
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
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);

  .light-theme & {
    background: rgba(255, 255, 255, 0.8);
    border-color: rgba(0, 0, 0, 0.08);
  }

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    color: var(--text-primary);
    border-color: rgba(255, 255, 255, 0.15);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.danger {
    &:hover:not(:disabled) {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.25);
      color: #ef4444;
    }
  }

  .btn-icon {
    width: 16px;
    height: 16px;
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
