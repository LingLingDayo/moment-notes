<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { LayoutGrid } from 'lucide-vue-next';

const store = useStickyNotesStore();

// 弹窗显示状态
const showPopover = ref(false);

// 切换列数
const changeGridColumns = (cols: 'auto' | 1 | 2 | 3 | 4) => {
  store.setGridColumns(cols);
  showPopover.value = false;
  
  const label = cols === 'auto' ? '自动' : `${cols} 列`;
  store.showToast(`已强制设置卡片列数为：${label}`, 'success');
};

const handleDocumentClick = () => {
  showPopover.value = false;
};

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<template>
  <div class="action-popover-wrapper" @click.stop>
    <button 
      class="icon-btn" 
      :class="{ active: showPopover }"
      data-tooltip="列数设置" 
      @click="showPopover = !showPopover"
    >
      <LayoutGrid class="btn-icon" />
    </button>
    
    <div v-if="showPopover" class="columns-popover">
      <div class="popover-title">列数设置</div>
      <div class="columns-list">
        <!-- 自动选项 -->
        <button 
          class="columns-item" 
          :class="{ active: store.gridColumns === 'auto' }"
          @click="changeGridColumns('auto')"
        >
          <span class="columns-item-icon">⚡</span>
          <span>自动适应</span>
        </button>

        <!-- 1-4 列 -->
        <button 
          v-for="cols in [1, 2, 3, 4]"
          :key="cols"
          class="columns-item" 
          :class="{ 
            active: store.gridColumns === cols,
            disabled: cols > store.maxColumns
          }"
          :disabled="cols > store.maxColumns"
          :data-tooltip="cols > store.maxColumns ? '当前窗口宽度不足' : undefined"
          @click="changeGridColumns(cols as 1 | 2 | 3 | 4)"
        >
          <span class="columns-item-icon">📊</span>
          <span>{{ cols }} 列布局</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.action-popover-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: var(--btn-bg);
  border: 1px solid var(--btn-border);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  background-clip: padding-box;

  &:hover:not(:disabled) {
    background: var(--btn-hover-bg);
    color: var(--btn-hover-color);
    border-color: var(--btn-hover-border);
  }

  .btn-icon {
    width: 16px;
    height: 16px;
  }

  &.active {
    color: var(--accent-color);
    border-color: rgba(99, 102, 241, 0.25);
    background: var(--accent-light);
  }
}

.columns-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--popover-bg);
  border: 1px solid var(--popover-border);
  padding: 8px;
  border-radius: 12px;
  box-shadow: var(--popover-shadow);
  z-index: 100;
  min-width: 130px;
  animation: popoverFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  backdrop-filter: blur(var(--glass-blur));

  .popover-title {
    font-size: 10px;
    font-weight: 700;
    color: var(--text-muted);
    margin-bottom: 6px;
    padding: 0 4px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
}

.columns-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.columns-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 11px;
  color: var(--text-secondary);
  cursor: pointer;
  background: transparent;
  border: none;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: var(--item-hover-bg);
    color: var(--text-primary);
  }

  &.active {
    background: var(--accent-light);
    color: var(--accent-color);
    font-weight: 600;
  }

  &:disabled,
  &.disabled {
    opacity: 0.4;
    cursor: not-allowed;
    // 故意保留 pointer-events 以便 tooltip 触发
    pointer-events: auto;
  }

  .columns-item-icon {
    font-size: 12px;
    flex-shrink: 0;
  }
}

@keyframes popoverFadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 1049px) {
  .icon-btn {
    width: 34px;
    height: 34px;
    border-radius: 10px;
  }
}
</style>
