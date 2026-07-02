<script lang="ts" setup>
import { useSettings } from './useSettings';
import { Download, Upload } from 'lucide-vue-next';
import SettingWrapper from './controls/SettingWrapper.vue';
import { SettingItem } from './settingsConfig';

defineProps<{
  item: SettingItem;
}>();

const { fileInputRef, triggerFileInput, handleFileImport, exportBackup } = useSettings();
</script>

<template>
  <SettingWrapper :item="item">
    <div class="group-control button-row">
      <input
        ref="fileInputRef"
        type="file"
        accept=".json"
        class="hidden-file-input"
        @change="handleFileImport"
      />
      <button class="action-btn" @click="exportBackup">
        <Download class="control-icon" />
        <span>导出数据备份</span>
      </button>
      <button class="action-btn" @click="triggerFileInput">
        <Upload class="control-icon" />
        <span>导入数据恢复</span>
      </button>
    </div>
  </SettingWrapper>
</template>

<style lang="scss" scoped>
.group-control {
  display: flex;
  gap: 10px;
  margin: 4px 0;
  width: 100%;

  &.button-row {
    flex-wrap: wrap;
  }
}

.hidden-file-input {
  display: none;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 36px;
  line-height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  background: var(--btn-bg);
  border: 1px solid var(--btn-border);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
  background-clip: padding-box;

  &:hover {
    background: var(--btn-hover-bg);
    color: var(--btn-hover-color);
    border-color: var(--btn-hover-border);
  }

  .control-icon {
    width: 16px;
    height: 16px;
  }
}
</style>
