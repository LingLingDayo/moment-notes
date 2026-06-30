<script lang="ts" setup>
import { useSettings } from './useSettings';
import { Download, Upload } from 'lucide-vue-next';

const { fileInputRef, triggerFileInput, handleFileImport, exportBackup } = useSettings();
</script>

<template>
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
  padding: 0 14px;
  border-radius: 10px;
  background: var(--btn-bg, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--btn-border, rgba(255, 255, 255, 0.05));
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    background: var(--btn-hover-bg, rgba(255, 255, 255, 0.08));
    color: var(--text-primary);
    border-color: var(--btn-hover-border, rgba(255, 255, 255, 0.1));
  }

  .control-icon {
    width: 14px;
    height: 14px;
  }
}
</style>
