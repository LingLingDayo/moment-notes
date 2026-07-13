<script lang="ts" setup>
import { useSettings } from './useSettings';
import { SETTINGS_SCHEMA, evaluateVisibility } from './settingsConfig';
import SettingControl from './SettingControl.vue';
import { Settings, X } from '@lucide/vue';

const {
  store,
  activeTab,
  getSettingValue,
  handleClear,
  handleAddNote,
  close
} = useSettings();

const handleButtonAction = (actionKey: string) => {
  if (actionKey === 'addNote') {
    handleAddNote();
  } else if (actionKey === 'clearNotes') {
    handleClear();
  }
};
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
            <template v-for="group in SETTINGS_SCHEMA" :key="group.id">
              <button
                v-if="evaluateVisibility(group.visible, store)"
                class="tab-item"
                :class="{ active: activeTab === group.id }"
                @click="activeTab = group.id"
              >
                <component :is="group.icon" v-if="group.icon" class="tab-icon" />
                <span>{{ group.tabTitle || group.title }}</span>
              </button>
            </template>
          </div>

          <!-- 右侧配置区域 -->
          <div class="settings-content">
            <div v-for="group in SETTINGS_SCHEMA" :key="group.id">
              <div v-if="activeTab === group.id && evaluateVisibility(group.visible, store)" class="settings-panel">
                <h4 class="panel-title">
                  {{ group.title }}
                </h4>

                <!-- 循环渲染配置的设置项 -->
                <SettingControl
                  v-for="item in group.items"
                  :key="item.key"
                  v-model="getSettingValue(item.key).value"
                  :item="item"
                  @action="handleButtonAction"
                />
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
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: var(--modal-overlay-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9990;
}

.modal-container {
  width: 90%;
  max-width: 620px;
  height: 480px;
  border-radius: 20px;
  background: var(--popover-bg);
  border: 1px solid var(--popover-border);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;

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
    transition:
      background-color 0.2s ease,
      color 0.2s ease,
      transform 0.2s ease;
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
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 36px;
  line-height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
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
  padding: 20px;
  overflow-y: auto;
  background: transparent;
}

.settings-panel {
  display: flex;
  flex-flow: row wrap;
  gap: 16px 14px;
}

.panel-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
  border-left: 3px solid var(--accent-color);
  padding-left: 8px;
  line-height: 1.2;
  width: 100%;
}

.quick-actions-row {
  display: flex;
  gap: 10px;
  width: 100%;
}

/* 弹窗过渡动画 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: opacity;

  .modal-container {
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
    will-change: transform, opacity;
  }
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;

  .modal-container {
    transform: scale(0.92) translate3d(0, 12px, 0);
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
