<script lang="ts" setup>
import { ref, onUnmounted } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { ClipboardList, Download, Upload } from 'lucide-vue-next';
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
  reader.onload = (e) => {
    const text = e.target?.result as string;
    if (text) {
      store.importBackup(text);
    }
    target.value = '';
  };
  reader.readAsText(file);
};

// 侧边栏宽度管理
const sidebarWidth = ref(260);
const isResizing = ref(false);

// 从本地存储初始化宽度
const savedWidth = localStorage.getItem('sidebar-width');
if (savedWidth) {
  const width = parseInt(savedWidth, 10);
  if (!isNaN(width) && width >= 200) {
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
  if (newWidth < 200) {
    newWidth = 200;
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
    <div class="sidebar-header">
      <ClipboardList class="header-icon" />
      <h2 class="header-title">分类管理</h2>
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
    <div 
      class="resize-handle" 
      :class="{ resizing: isResizing }"
      @mousedown="startResize"
    ></div>
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
}

.sidebar-header {
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  .header-icon {
    width: 22px;
    height: 22px;
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
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.backup-section {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 12px;
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
  padding: 8px 0;
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
  right: -2px;
  width: 4px;
  height: 100%;
  cursor: col-resize;
  z-index: 10;
  background: transparent;
  transition: background-color 0.2s ease;

  &:hover,
  &.resizing {
    background-color: var(--accent-color);
  }
}
</style>
