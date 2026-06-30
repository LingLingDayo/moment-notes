<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { Settings, Database, Info, X, Sun, Moon, Columns, Download, Upload } from 'lucide-vue-next';

const store = useStickyNotesStore();

const isVisible = computed(() => store.showSettings);
const activeTab = ref<'general' | 'data' | 'about'>('general');
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
      const ok = store.importBackup(text);
      if (ok) {
        store.showToast('备份恢复成功', 'success');
      }
    }
    target.value = '';
  };
  reader.readAsText(file);
};

const close = () => store.closeSettings();

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isVisible.value) {
    close();
  }
};

onMounted(() => window.addEventListener('keydown', handleKeyDown));
onUnmounted(() => window.removeEventListener('keydown', handleKeyDown));
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="isVisible" class="modal-overlay" @click="close">
      <div class="modal-container" @click.stop>
        <!-- 头部区域 -->
        <div class="modal-header">
          <div class="header-title-area">
            <Settings class="header-icon" />
            <h3>设置</h3>
          </div>
          <button class="close-btn" @click="close">
            <X class="close-icon" />
          </button>
        </div>

        <!-- 主体区域：双栏布局 -->
        <div class="modal-body">
          <!-- 左侧 Tab 栏 -->
          <div class="tab-sidebar">
            <button class="tab-item" :class="{ active: activeTab === 'general' }" @click="activeTab = 'general'">
              <Settings class="tab-icon" />
              <span>常规设置</span>
            </button>
            <button class="tab-item" :class="{ active: activeTab === 'data' }" @click="activeTab = 'data'">
              <Database class="tab-icon" />
              <span>数据管理</span>
            </button>
            <button class="tab-item" :class="{ active: activeTab === 'about' }" @click="activeTab = 'about'">
              <Info class="tab-icon" />
              <span>关于插件</span>
            </button>
          </div>

          <!-- 右侧配置区域 -->
          <div class="settings-content">
            <!-- 1. 常规设置 -->
            <div v-if="activeTab === 'general'" class="settings-panel">
              <h4 class="panel-title">
                常规偏好设置
              </h4>

              <!-- 主题设置 -->
              <div class="settings-group">
                <div class="group-label">
                  个性化主题
                </div>
                <div class="group-control">
                  <button class="theme-btn" :class="{ active: !store.isDark }" @click="if (store.isDark) store.toggleTheme();">
                    <Sun class="control-icon" />
                    <span>浅色模式</span>
                  </button>
                  <button class="theme-btn" :class="{ active: store.isDark }" @click="if (!store.isDark) store.toggleTheme();">
                    <Moon class="control-icon" />
                    <span>深色模式</span>
                  </button>
                </div>
                <div class="group-desc">
                  设置界面的显示主题。在 uTools 插件模式下，主题将自动根据 uTools 的偏好设置进行贴合与变换。
                </div>
              </div>

              <!-- 网格列数 -->
              <div class="settings-group">
                <div class="group-label">
                  便签展示列数
                </div>
                <div class="group-control columns-selector">
                  <button
                    v-for="col in (['auto', 1, 2, 3, 4] as const)"
                    :key="col"
                    class="column-btn"
                    :class="{ active: store.gridColumns === col }"
                    @click="store.setGridColumns(col)"
                  >
                    <Columns class="control-icon-small" />
                    <span>{{ col === 'auto' ? '自适应' : col + ' 列' }}</span>
                  </button>
                </div>
                <div class="group-desc">
                  调整便签卡片在右侧展示区的排列列数。选择“自适应”将根据界面宽度自动计算最合适的排布数量。
                </div>
              </div>
            </div>

            <!-- 2. 数据管理 -->
            <div v-if="activeTab === 'data'" class="settings-panel">
              <h4 class="panel-title">
                数据备份与恢复
              </h4>

              <!-- 导入导出 -->
              <div class="settings-group">
                <div class="group-label">
                  备份操作
                </div>
                <div class="group-control button-row">
                  <input ref="fileInputRef" type="file" accept=".json" class="hidden-file-input" @change="handleFileImport" />
                  <button class="action-btn" @click="store.exportBackup">
                    <Download class="control-icon" />
                    <span>导出数据备份</span>
                  </button>
                  <button class="action-btn" @click="triggerFileInput">
                    <Upload class="control-icon" />
                    <span>导入数据恢复</span>
                  </button>
                </div>
                <div class="group-desc">
                  导出备份能将当前所有的便签及分类列表转换为备份文件；导入恢复能从 JSON 备份中加载数据。
                </div>
              </div>
            </div>

            <!-- 3. 关于插件 -->
            <div v-if="activeTab === 'about'" class="settings-panel">
              <h4 class="panel-title">
                关于拾光便签
              </h4>

              <div class="about-card">
                <img src="/logo.png" class="about-logo" alt="logo" />
                <div class="about-info">
                  <h5 class="app-name">
                    拾光便签
                  </h5>
                  <p class="app-version">
                    Version 1.1.0
                  </p>
                </div>
              </div>

              <div class="about-desc">
                一款专为 <strong>uTools</strong> 平台量身打造的高颜值、高生产力的便签小助手。它融合了流畅的 Fluent Design 动效和优雅的磨砂玻璃视觉外观，旨在帮助您随手捕捉工作、学习和生活中的点点滴滴。
              </div>

              <div class="tips-group">
                <div class="tips-title">
                  💡 常用操作指南与快捷键
                </div>
                <ul class="tips-list">
                  <li><strong>极速新建：</strong>在应用任意位置使用快捷键 <code>Ctrl + Alt + N</code> 可立即新建便签。</li>
                  <li><strong>快速搜索：</strong>使用快捷键 <code>Ctrl + F</code> 可一键聚焦顶部的搜索框。</li>
                  <li><strong>双击隐藏粘贴：</strong>双击便签卡片会直接自动收起窗口，并自动将便签内容填至您原先光标所在的输入位置。</li>
                  <li><strong>捕获外部文本：</strong>在 uTools 的超级面板中，可以直接选中文本一键导入并创建新便签。</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background: var(--modal-overlay-bg); display: flex; align-items: center; justify-content: center;
  z-index: 9990; backdrop-filter: blur(8px);
}

.modal-container {
  width: 90%; max-width: 600px; height: 460px; border-radius: 20px;
  background: var(--popover-bg); border: 1px solid var(--popover-border);
  box-shadow: var(--shadow-lg); display: flex; flex-direction: column;
  overflow: hidden; backdrop-filter: blur(20px);
}

.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 24px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); flex-shrink: 0;

  .header-title-area {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text-primary);

    .header-icon {
      width: 20px;
      height: 20px;
      color: var(--accent-color);
    }

    h3 {
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 700;
    }
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    color: var(--text-muted);
    transition: all 0.2s ease;
    cursor: pointer;

    &:hover {
      background: var(--btn-hover-bg);
      color: var(--text-primary);
    }

    .close-icon {
      width: 16px;
      height: 16px;
    }
  }
}

.modal-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 左侧 Tab 侧边栏 */
.tab-sidebar {
  width: 140px;
  background: rgba(0, 0, 0, 0.02);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  padding: 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
  width: 100%;
  cursor: pointer;

  &:hover {
    background: var(--btn-hover-bg);
    color: var(--text-primary);
  }

  &.active {
    background: var(--accent-light);
    color: var(--accent-color);
    font-weight: 600;
  }

  .tab-icon {
    width: 16px;
    height: 16px;
  }
}

/* 右侧配置区域 */
.settings-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background: transparent;
}

.settings-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
  border-left: 3px solid var(--accent-color);
  padding-left: 8px;
  line-height: 1.2;
}

.settings-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);

  .group-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .group-desc {
    font-size: 11px;
    color: var(--text-muted);
    line-height: 1.5;
  }
}

.group-control {
  display: flex;
  gap: 10px;
  margin: 4px 0;

  &.button-row {
    flex-wrap: wrap;
  }
}

.hidden-file-input {
  display: none;
}

.theme-btn,
.column-btn,
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  background: var(--btn-bg);
  border: 1px solid var(--btn-border);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    background: var(--btn-hover-bg);
    color: var(--text-primary);
    border-color: var(--btn-hover-border);
  }

  &.active {
    background: var(--accent-light);
    color: var(--accent-color);
    border-color: rgba(99, 102, 241, 0.25);
    font-weight: 600;
  }

  .control-icon {
    width: 14px;
    height: 14px;
  }

  .control-icon-small {
    width: 12px;
    height: 12px;
  }
}

.columns-selector {
  flex-wrap: wrap;

  .column-btn {
    padding: 0 12px;
    height: 32px;
  }
}

/* 关于页面卡片 */
.about-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid rgba(255, 255, 255, 0.03);
  padding: 14px;
  border-radius: 12px;

  .about-logo {
    width: 44px;
    height: 44px;
  }

  .app-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .app-version {
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 2px;
  }
}

.about-desc {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.tips-group {
  margin-top: 6px;
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid rgba(255, 255, 255, 0.03);
  padding: 14px;
  border-radius: 12px;

  .tips-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--accent-color);
    margin-bottom: 8px;
  }

  .tips-list {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;

    li {
      font-size: 11px;
      line-height: 1.5;
      color: var(--text-muted);
      position: relative;
      padding-left: 12px;

      &::before {
        content: '•';
        position: absolute;
        left: 0;
        color: var(--accent-color);
      }
    }

    code {
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      padding: 2px 4px;
      border-radius: 4px;
      color: var(--text-primary);
      font-family: monospace;
      font-size: 10px;
    }
  }
}

/* 弹窗过渡动画 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  .modal-container {
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;

  .modal-container {
    transform: scale(0.92) translateY(12px);
    opacity: 0;
  }
}

@media (max-width: 599px) {
  .modal-container {
    width: 95%;
    height: 90vh;
  }

  .modal-body {
    flex-direction: column;
  }

  .tab-sidebar {
    width: 100%;
    flex-direction: row;
    height: 48px;
    padding: 6px;
    overflow-x: auto;
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);

    .tab-item {
      padding: 0 10px;
      height: 100%;
      justify-content: center;

      span {
        display: none;
      }
    }
  }

  .settings-content {
    padding: 16px;
  }
}
</style>
