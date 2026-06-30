<script lang="ts" setup>
import { useSettings } from './useSettings';
import { SETTINGS_SCHEMA } from './settingsConfig';
import SettingControl from './SettingControl.vue';
import AboutPanel from './AboutPanel.vue';
import DataPanel from './DataPanel.vue';
import { Settings, X, Plus, Trash2 } from 'lucide-vue-next';

const {
  store,
  activeTab,
  getSettingValue,
  clearTooltip,
  handleClear,
  handleAddNote,
  close
} = useSettings();
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="store.showSettings" class="modal-overlay" @click="close">
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
            <button
              v-for="group in SETTINGS_SCHEMA"
              :key="group.id"
              class="tab-item"
              :class="{ active: activeTab === group.id }"
              @click="activeTab = group.id"
            >
              <component :is="group.icon" v-if="group.icon" class="tab-icon" />
              <span>{{ group.tabTitle || group.title }}</span>
            </button>
          </div>

          <!-- 右侧配置区域 -->
          <div class="settings-content">
            <div v-for="group in SETTINGS_SCHEMA" :key="group.id">
              <div v-if="activeTab === group.id" class="settings-panel">
                <h4 class="panel-title">
                  {{ group.title }}
                </h4>

                <!-- 循环渲染配置的设置项 -->
                <SettingControl
                  v-for="item in group.items"
                  :key="item.key"
                  v-model="getSettingValue(item.key).value"
                  :item="item"
                >
                  <!-- 快捷操作自定义插槽 -->
                  <template #quickActions>
                    <div class="quick-actions-row">
                      <button class="action-btn-primary" @click="handleAddNote">
                        <Plus class="control-icon" />
                        <span>新建便签</span>
                      </button>
                      <button
                        class="action-btn-danger"
                        :disabled="store.filteredNotes.length === 0"
                        @click="handleClear"
                      >
                        <Trash2 class="control-icon" />
                        <span>{{ clearTooltip }}</span>
                      </button>
                    </div>
                  </template>

                  <!-- 导入备份恢复自定义插槽 -->
                  <template #backupRestore>
                    <DataPanel />
                  </template>

                  <!-- 关于插件自定义插槽 -->
                  <template #aboutInfo>
                    <AboutPanel />
                  </template>
                </SettingControl>
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

.quick-actions-row {
  display: flex;
  gap: 10px;
  width: 100%;
}

.action-btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  background: var(--accent-color);
  border: 1px solid transparent;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s ease;
  cursor: pointer;
  box-shadow: 0 4px 10px -2px rgba(99, 102, 241, 0.25);

  &:hover {
    background: var(--accent-hover);
    transform: translateY(-1px);
    box-shadow: 0 6px 14px -2px rgba(99, 102, 241, 0.35);
  }

  &:active {
    transform: translateY(0);
  }

  .control-icon {
    width: 14px;
    height: 14px;
  }
}

.action-btn-danger {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  background: var(--danger-color, #ff4d4f);
  border: 1px solid transparent;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s ease;
  cursor: pointer;
  box-shadow: 0 4px 10px -2px rgba(255, 77, 79, 0.2);

  &:hover:not(:disabled) {
    background: #ff7875;
    transform: translateY(-1px);
    box-shadow: 0 6px 14px -2px rgba(255, 77, 79, 0.3);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
  }

  .control-icon {
    width: 14px;
    height: 14px;
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
