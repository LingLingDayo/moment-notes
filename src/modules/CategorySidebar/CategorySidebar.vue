<script lang="ts" setup>
import { ref, onUnmounted } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { Settings } from '@lucide/vue';
import { isUTools } from '@utils/storage';
import CategoryList from './CategoryList.vue';
import CategoryAdd from './CategoryAdd.vue';

const store = useStickyNotesStore();
const isAddingCategory = ref(false);

// 侧边栏宽度常量
const DEFAULT_SIDEBAR_WIDTH = 220;
const MIN_SIDEBAR_WIDTH = 160;

// 侧边栏宽度管理
const sidebarWidth = ref(DEFAULT_SIDEBAR_WIDTH);
const isResizing = ref(false);

// 从本地存储初始化宽度
const savedWidth = localStorage.getItem('sidebar-width');
if (savedWidth) {
  const width = parseInt(savedWidth, 10);
  if (!isNaN(width) && width >= MIN_SIDEBAR_WIDTH) {
    sidebarWidth.value = width;
  }
}

const startResize = (e: MouseEvent) => {
  e.preventDefault();
  isResizing.value = true;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';

  window.addEventListener('mousemove', handleResize);
  window.addEventListener('mouseup', stopResize);
};

const handleResize = (e: MouseEvent) => {
  if (!isResizing.value) return;
  let newWidth = e.clientX;
  if (newWidth < MIN_SIDEBAR_WIDTH) {
    newWidth = MIN_SIDEBAR_WIDTH;
  }
  // 限制最大宽度为窗口宽度的 50%
  const maxWidth = window.innerWidth * 0.5;
  if (newWidth > maxWidth) {
    newWidth = maxWidth;
  }
  sidebarWidth.value = newWidth;
};

const stopResize = () => {
  if (!isResizing.value) return;
  isResizing.value = false;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';

  localStorage.setItem('sidebar-width', sidebarWidth.value.toString());

  window.removeEventListener('mousemove', handleResize);
  window.removeEventListener('mouseup', stopResize);
};

onUnmounted(() => {
  window.removeEventListener('mousemove', handleResize);
  window.removeEventListener('mouseup', stopResize);
});
</script>

<template>
  <aside class="sidebar-container" :style="{ width: sidebarWidth + 'px' }">
    <div v-if="!isUTools()" class="sidebar-header">
      <img src="/logo.png" class="logo" alt="logo" />
      <h2 class="header-title">
        拾光便签
      </h2>
    </div>

    <!-- 分类列表区域 -->
    <CategoryList />

    <!-- 侧边栏底部操作区 -->
    <div class="sidebar-footer">
      <div class="sidebar-footer-actions">
        <!-- 添加分类组件 -->
        <CategoryAdd v-model:is-adding="isAddingCategory" class="category-add-wrapper" />

        <!-- 设置按钮 (带微动效) -->
        <button
          class="settings-btn"
          :class="{ 'is-hidden': isAddingCategory }"
          data-tooltip="打开设置"
          @click="store.openSettings()"
        >
          <Settings class="settings-btn-icon" />
        </button>
      </div>
    </div>

    <!-- 拖拽调整宽度的手柄 -->
    <div class="resize-handle" :class="{ resizing: isResizing }" @mousedown="startResize"></div>
  </aside>
</template>

<style lang="scss" scoped>
.sidebar-container {
  height: 100%;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--panel-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
}

.sidebar-header {
  padding: 18px;
  padding-bottom: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  .logo {
    width: 30px;
    height: 30px;
    color: var(--accent-color);
  }

  .header-title {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: 0.5px;
  }
}

.sidebar-footer {
  padding: 16px 12px;
  // border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.sidebar-footer-actions {
  display: flex;
  align-items: center;
  width: 100%;
}

.category-add-wrapper {
  flex: 1;
}

.settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--btn-bg);
  border: 1px solid var(--btn-border);
  color: var(--text-muted);
  cursor: pointer;
  transition:
    width 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    margin-left 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    background-color 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    color 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  flex-shrink: 0;
  margin-left: 8px;
  overflow: hidden;

  &:hover {
    background: var(--btn-hover-bg);
    color: var(--accent-color);
    border-color: var(--btn-hover-border);

    .settings-btn-icon {
      transform: rotate(45deg);
    }
  }

  .settings-btn-icon {
    width: 16px;
    height: 16px;
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  &.is-hidden {
    width: 0;
    margin-left: 0;
    opacity: 0;
    border-color: transparent;
    pointer-events: none;
  }
}

.resize-handle {
  position: absolute;
  top: 0;
  right: -5px;
  width: 10px;
  height: 100%;
  cursor: col-resize;
  z-index: 10;
  background: transparent;
  display: flex;
  justify-content: center;

  &::after {
    content: '';
    width: 3px;
    height: 100%;
    background-color: transparent;
    transition: background-color 0.2s ease;
  }

  &:hover::after,
  &.resizing::after {
    background-color: var(--accent-color);
  }
}

@media (max-width: 1049px) {
  .sidebar-header {
    padding: 14px;
    padding-bottom: 0;
    gap: 8px;
  }

  .sidebar-footer {
    padding: 12px 8px;
  }

  .settings-btn {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    margin-left: 6px;

    .settings-btn-icon {
      width: 14px;
      height: 14px;
    }
  }
}
</style>
