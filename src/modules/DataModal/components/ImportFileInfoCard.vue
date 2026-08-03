<script lang="ts" setup>
import { FileCode, Calendar } from '@lucide/vue';

interface Props {
  /** 备份数据版本 */
  version?: string;
  /** 格式化后的备份生成时间字符串 */
  formattedTime: string;
  /** 包含的分类数量 */
  categoriesCount: number;
  /** 包含的便签数量 */
  notesCount: number;
  /** 是否包含偏好设置 */
  hasSettings: boolean;
}

const props = defineProps<Props>();
</script>

<template>
  <div class="file-info-card">
    <div class="info-meta">
      <div class="meta-item">
        <FileCode class="meta-icon" />
        <span>版本: <strong>{{ props.version || '未知' }}</strong></span>
      </div>
      <div class="meta-item">
        <Calendar class="meta-icon" />
        <span>生成时间: {{ props.formattedTime }}</span>
      </div>
    </div>
    <div class="info-stats">
      <span>包含 {{ props.categoriesCount }} 个分类</span>
      <span>•</span>
      <span>{{ props.notesCount }} 张便签</span>
      <template v-if="props.hasSettings">
        <span>•</span>
        <span>包含偏好设置</span>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.file-info-card {
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--item-bg, rgba(59, 130, 246, 0.05));
  border: 1px solid rgba(59, 130, 246, 0.15);
  display: flex;
  flex-direction: column;
  gap: 6px;

  .info-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    color: var(--text-secondary, #666);

    .meta-item {
      display: flex;
      align-items: center;
      gap: 5px;

      .meta-icon {
        width: 13px;
        height: 13px;
      }
    }
  }

  .info-stats {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 500;
    color: var(--primary-color, #3b82f6);
  }
}
</style>
