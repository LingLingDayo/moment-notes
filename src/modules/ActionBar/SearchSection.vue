<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { Search, X, ChevronDown } from 'lucide-vue-next';

const store = useStickyNotesStore();

// 搜索目标弹窗状态
const showTargetPopover = ref(false);

const targetOptions = [
  { value: 'all', label: '全部' },
  { value: 'title', label: '标题' },
  { value: 'content', label: '内容' },
  { value: 'tag', label: '标签' }
] as const;

// 动态 placeholder text
const searchPlaceholder = computed(() => {
  switch (store.searchTarget) {
    case 'title': return '搜索便签标题...';
    case 'content': return '搜索便签内容...';
    case 'tag': return '搜索便签标签...';
    default: return '搜索全部信息...';
  }
});

const currentTargetLabel = computed(() => {
  const option = targetOptions.find(opt => opt.value === store.searchTarget);
  return option ? option.label : '全部';
});

const changeSearchTarget = (target: 'all' | 'title' | 'content' | 'tag') => {
  store.searchTarget = target;
  showTargetPopover.value = false;
  
  let targetName = '全部信息';
  if (target === 'title') targetName = '标题';
  if (target === 'content') targetName = '内容';
  if (target === 'tag') targetName = '标签';
  store.showToast(`已切换搜索范围为：${targetName}`, 'success');
};

// 清空搜索词
const clearSearch = () => {
  store.searchQuery = '';
};

const handleDocumentClick = () => {
  showTargetPopover.value = false;
};

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<template>
  <div class="search-section">
    <div class="search-wrapper">
      <Search class="search-icon" />
      <input 
        v-model="store.searchQuery"
        type="text" 
        :placeholder="searchPlaceholder"
        class="search-input"
      />
      <button 
        v-if="store.searchQuery" 
        class="clear-search-btn"
        @click="clearSearch"
      >
        <X class="clear-icon" />
      </button>
    </div>

    <!-- 搜索目标选择器 -->
    <div class="search-target-wrapper" @click.stop>
      <button 
        class="target-trigger-btn" 
        data-tooltip="搜索范围"
        @click="showTargetPopover = !showTargetPopover"
      >
        <span>{{ currentTargetLabel }}</span>
        <ChevronDown class="chevron-icon" />
      </button>
      
      <div v-if="showTargetPopover" class="target-popover">
        <div class="popover-title">搜索范围</div>
        <div class="target-list">
          <button 
            v-for="opt in targetOptions"
            :key="opt.value"
            class="target-item"
            :class="{ active: store.searchTarget === opt.value }"
            @click="changeSearchTarget(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.search-section {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 370px;
  // max-width: 520px;
}

.search-wrapper {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 6px 14px;
  flex: 1;
  height: 38px;
  box-sizing: border-box;
  position: relative;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  .light-theme & {
    background: rgba(255, 255, 255, 0.6);
    border-color: rgba(0, 0, 0, 0.08);
  }

  &:focus-within {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px var(--accent-light);
    background: rgba(0, 0, 0, 0.18);

    .light-theme & {
      background: #ffffff;
    }
  }
}

.search-icon {
  width: 16px;
  height: 16px;
  color: var(--text-muted);
  margin-right: 10px;
}

.search-input {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 13px;
  width: 100%;
  padding: 4px 0;
  outline: none;

  &::placeholder {
    color: var(--text-muted);
  }
}

.clear-search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 50%;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 8px;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
  }
}

.search-target-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.target-trigger-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 16px;
  height: 38px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
  box-sizing: border-box;

  span {
    white-space: nowrap;
  }

  .light-theme & {
    background: rgba(255, 255, 255, 0.8);
    border-color: rgba(0, 0, 0, 0.08);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: var(--text-primary);
    border-color: rgba(255, 255, 255, 0.15);

    .light-theme & {
      background: rgba(0, 0, 0, 0.04);
    }
  }

  .chevron-icon {
    width: 12px;
    height: 12px;
    opacity: 0.7;
  }
}

.target-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--popover-bg);
  border: 1px solid var(--popover-border);
  padding: 6px;
  border-radius: 12px;
  box-shadow: var(--popover-shadow);
  z-index: 100;
  min-width: 110px;
  animation: popoverFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  .popover-title {
    font-size: 10px;
    font-weight: 700;
    color: var(--text-muted);
    margin-bottom: 6px;
    padding: 2px 6px;
  }
}

.target-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.target-item {
  text-align: left;
  padding: 5px 8px;
  border-radius: 5px;
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  cursor: pointer;
  width: 100%;
  background: transparent;
  border: none;

  &:hover {
    background: var(--item-hover-bg);
    color: var(--text-primary);
  }

  &.active {
    background: var(--accent-light);
    color: var(--accent-color);
    font-weight: 600;
  }
}

.clear-icon {
  width: 12px;
  height: 12px;
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
</style>
