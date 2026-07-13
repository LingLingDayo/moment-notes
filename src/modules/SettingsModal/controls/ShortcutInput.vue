<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useShortcutStore } from '@stores/shortcutStore';
import { RefreshCw, X } from '@lucide/vue';
import SettingWrapper from './SettingWrapper.vue';
import { SettingItem } from '../settingsConfig';

const props = defineProps<{
  modelValue: string;
  item: SettingItem;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void;
  (e: 'error', msg: string): void;
}>();

const shortcutStore = useShortcutStore();
const isRecording = ref(false);
const shortcutId = props.item.key;

watch(isRecording, (val) => {
  shortcutStore.isRecording = val;
});

const handleKeyDown = (e: KeyboardEvent) => {
  if (!isRecording.value) return;

  e.preventDefault();
  e.stopPropagation();

  const key = e.key;

  // 忽略单纯的修饰键按下
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
    return;
  }

  // 处理 ESC 取消录制
  if (key === 'Escape') {
    isRecording.value = false;
    return;
  }

  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');

  // 格式化主按键
  let displayKey = key;
  if (key === ' ') displayKey = 'Space';
  else if (key === 'ArrowLeft') displayKey = 'Left';
  else if (key === 'ArrowRight') displayKey = 'Right';
  else if (key === 'ArrowUp') displayKey = 'Up';
  else if (key === 'ArrowDown') displayKey = 'Down';
  else if (key.length === 1) displayKey = key.toUpperCase();

  parts.push(displayKey);

  const result = parts.join('+');
  
  // 更新并检测冲突
  const res = shortcutStore.updateShortcut(shortcutId, result);
  if (!res.success) {
    emit('error', res.message || '快捷键冲突');
  } else {
    emit('update:modelValue', result);
  }
  isRecording.value = false;
};

const startRecording = () => {
  if (props.disabled) return;
  isRecording.value = true;
};

const stopRecording = () => {
  isRecording.value = false;
};

const handleReset = () => {
  shortcutStore.resetShortcut(shortcutId);
  const match = shortcutStore.shortcuts.find(s => s.id === shortcutId);
  if (match) {
    emit('update:modelValue', match.currentKey);
  }
};

const handleClear = () => {
  shortcutStore.clearShortcut(shortcutId);
  emit('update:modelValue', '');
};
</script>

<template>
  <SettingWrapper :item="item">
    <template #default>
      <div class="shortcut-input-group">
        <div
          tabindex="0"
          class="shortcut-input-box"
          :class="{ recording: isRecording, disabled: disabled }"
          @click="startRecording"
          @keydown="handleKeyDown"
          @blur="stopRecording"
        >
          <span class="shortcut-text">{{ isRecording ? '正在录制...' : (modelValue || '无') }}</span>
          <span v-if="isRecording" class="rec-badge">REC</span>
        </div>

        <button
          class="control-btn"
          data-tooltip="重置为默认值"
          :disabled="disabled"
          @click="handleReset"
        >
          <RefreshCw class="control-icon" />
        </button>
        <button
          class="control-btn danger"
          data-tooltip="清除快捷键"
          :disabled="disabled || !modelValue"
          @click="handleClear"
        >
          <X class="control-icon" />
        </button>
      </div>
    </template>
  </SettingWrapper>
</template>

<style lang="scss" scoped>
.shortcut-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
}

.shortcut-input-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  background: var(--input-bg, rgba(0, 0, 0, 0.05));
  border: 1px solid var(--input-border, rgba(255, 255, 255, 0.08));
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  outline: none;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    color 0.2s ease;
  user-select: none;
  box-sizing: border-box;

  &:hover:not(.disabled) {
    border-color: var(--accent-color);
  }

  &:focus:not(.disabled) {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px var(--accent-light);
  }

  &.recording {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px var(--accent-light);
    color: var(--accent-color);
    background: var(--accent-light);
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .shortcut-text {
    font-family: var(--font-mono, monospace);
    font-weight: 600;
  }

  .rec-badge {
    background: var(--danger-color, #ef4444);
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    padding: 2px 5px;
    border-radius: 4px;
    animation: pulse 1.5s infinite;
  }
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--btn-border);
  background: var(--btn-bg);
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    opacity 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
  flex-shrink: 0;
  background-clip: padding-box;

  &:hover:not(:disabled) {
    background: var(--btn-hover-bg);
    color: var(--btn-hover-color);
    border-color: var(--btn-hover-border);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.danger:hover:not(:disabled) {
    color: var(--danger-color);
    background: var(--danger-hover-bg);
    border-color: var(--danger-hover-border);
  }

  .control-icon {
    width: 16px;
    height: 16px;
  }
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
</style>
