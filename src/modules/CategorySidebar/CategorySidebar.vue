<script lang="ts" setup>
import { ref, onUnmounted } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { Download, Upload } from 'lucide-vue-next';
import { isUTools } from '@utils/storage';
import CategoryList from './CategoryList.vue';
import CategoryAdd from './CategoryAdd.vue';

const store = useStickyNotesStore();

const fileInputRef = ref<HTMLInputElement | null>(null);

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const handleFileImport = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target?.result as string;
    if (text) {
      store.importBackup(text);
    }
    target.value = '';
  };
  reader.readAsText(file);
};

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
      <!-- 添加分类组件 -->
      <CategoryAdd />

      <!-- 备份管理区 (开发者效率与数据安全增强) -->
      <div class="backup-section">
        <input
          ref="fileInputRef"
          type="file"
          accept=".json"
          class="hidden-file-input"
          @change="handleFileImport"
        />
        <button class="backup-btn" data-tooltip="导出备份为 JSON 文件" @click="store.exportBackup">
          <Download class="backup-btn-icon" />
          <span>导出备份</span>
        </button>
        <button class="backup-btn" data-tooltip="从 JSON 文件恢复数据" @click="triggerFileInput">
          <Upload class="backup-btn-icon" />
          <span>导入备份</span>
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
  backdrop-filter: blur(var(--glass-blur));
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

.backup-section {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.hidden-file-input {
  display: none;
}

.backup-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  line-height: 34px;
  border-radius: 8px;
  background: var(--btn-bg);
  border: 1px solid var(--btn-border);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background: var(--btn-hover-bg);
    color: var(--btn-hover-color);
    border-color: var(--btn-hover-border);
  }

  .backup-btn-icon {
    width: 12px;
    height: 12px;
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

  .backup-section {
    margin-top: 8px;
    gap: 6px;
  }
}
</style>
