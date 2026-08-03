<script lang="ts" setup>
import { GitMerge, RotateCcw } from '@lucide/vue';
import { ImportMode } from '@type';

interface Props {
  /** 导入模式 (merge | overwrite) */
  modelValue: ImportMode;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: ImportMode): void;
}>();

const selectMode = (mode: ImportMode) => {
  emit('update:modelValue', mode);
};
</script>

<template>
  <div class="section-container">
    <div class="section-title">
      选择导入方式
    </div>
    <div class="mode-grid">
      <!-- 增量合并模式 -->
      <div
        class="mode-card"
        :class="{ active: props.modelValue === 'merge' }"
        @click="selectMode('merge')"
      >
        <div class="mode-header">
          <GitMerge class="mode-icon merge" />
          <span class="mode-name">增量合并</span>
        </div>
        <p class="mode-desc">
          保留现有数据，仅追加新项并更新相同 ID 项
        </p>
      </div>

      <!-- 覆盖已有模式 -->
      <div
        class="mode-card danger"
        :class="{ active: props.modelValue === 'overwrite' }"
        @click="selectMode('overwrite')"
      >
        <div class="mode-header">
          <RotateCcw class="mode-icon overwrite" />
          <span class="mode-name">覆盖已有</span>
        </div>
        <p class="mode-desc">
          ⚠️ 清空当前全部数据，完全替换为导入内容
        </p>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.section-container {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .section-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary, #333);
  }
}

.mode-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.mode-card {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1.5px solid var(--border-color, rgba(0, 0, 0, 0.1));
  background: var(--item-bg, rgba(0, 0, 0, 0.02));
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;

  &:hover {
    border-color: rgba(59, 130, 246, 0.4);
  }

  &.active {
    border-color: var(--primary-color, #3b82f6);
    background: rgba(59, 130, 246, 0.08);
  }

  &.danger {
    &.active {
      border-color: #ef4444;
      background: rgba(239, 68, 68, 0.08);
    }
  }

  .mode-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 4px;

    .mode-icon {
      width: 15px;
      height: 15px;

      &.merge {
        color: #3b82f6;
      }
      &.overwrite {
        color: #ef4444;
      }
    }
  }

  .mode-desc {
    font-size: 11px;
    color: var(--text-secondary, #666);
    margin: 0;
    line-height: 1.4;
  }
}
</style>
