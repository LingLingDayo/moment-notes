<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { Search, X, ChevronDown } from '@lucide/vue';

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
  if (store.searchTarget.includes('all')) {
    return '搜索全部信息...';
  }
  const parts: string[] = [];
  if (store.searchTarget.includes('title')) parts.push('标题');
  if (store.searchTarget.includes('content')) parts.push('内容');
  if (store.searchTarget.includes('tag')) parts.push('标签');

  if (parts.length > 0) {
    return `搜索便签${parts.join('/')}...`;
  }
  return '搜索全部信息...';
});

// 清空搜索词
const clearSearch = () => {
  store.searchQuery = '';
};

// 切换下拉弹窗显示
const togglePopover = () => {
  showTargetPopover.value = !showTargetPopover.value;
};

// 检查是否选中
const isSelected = (value: 'all' | 'title' | 'content' | 'tag') => {
  return store.searchTarget.includes(value);
};

// 切换选择目标
const toggleTarget = (target: 'all' | 'title' | 'content' | 'tag') => {
  let nextTargets: Array<'all' | 'title' | 'content' | 'tag'> = [];
  if (target === 'all') {
    nextTargets = ['all'];
  } else {
    // 移除 'all'
    nextTargets = store.searchTarget.filter(t => t !== 'all');

    // 切换当前项
    if (nextTargets.includes(target)) {
      nextTargets = nextTargets.filter(t => t !== target);
    } else {
      nextTargets.push(target);
    }

    // 如果全部都取消了，或者把所有其他选项都选上了，自动变回 'all'
    const otherOptionsCount = 3; // title, content, tag
    if (nextTargets.length === 0 || nextTargets.length === otherOptionsCount) {
      nextTargets = ['all'];
    }
  }
  store.searchTarget = nextTargets;
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
        data-tooltip="支持空格分隔的多关键词检索"
      />

      <!-- 清除搜索按钮 -->
      <button
        v-if="store.searchQuery"
        class="clear-search-btn"
        data-tooltip="清空搜索"
        @click="clearSearch"
      >
        <X class="clear-icon" />
      </button>

      <!-- 搜索目标选择器（内嵌到右侧） -->
      <div class="search-target-wrapper" @click.stop>
        <button
          class="target-trigger-btn"
          :class="{ active: showTargetPopover }"
          data-tooltip="选择搜索范围"
          @click="togglePopover"
        >
          <ChevronDown class="chevron-icon" :class="{ open: showTargetPopover }" />
        </button>

        <div v-if="showTargetPopover" class="target-popover">
          <div class="popover-title">
            搜索范围
          </div>
          <div class="target-list">
            <button
              v-for="opt in targetOptions"
              :key="opt.value"
              class="target-item"
              :class="{ selected: isSelected(opt.value) }"
              @click="toggleTarget(opt.value)"
            >
              <span class="target-text">{{ opt.label }}</span>
              <span v-if="isSelected(opt.value)" class="check-icon">✓</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.search-section {
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 320px;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  width: 100%;
  height: 38px;
  box-sizing: border-box;
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
  position: absolute;
  left: 12px;
  width: 16px;
  height: 16px;
  color: var(--text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 100%;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 13px;
  padding: 0 64px 0 36px; // 左边留给搜索图标，右边留给清除按钮 + 触发按钮
  outline: none;
  box-sizing: border-box;

  &::placeholder {
    color: var(--text-muted);
  }
}

.clear-search-btn {
  position: absolute;
  right: 36px; // 调整为紧贴触发按钮的左边
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-primary);

    .light-theme & {
      background: rgba(0, 0, 0, 0.05);
    }
  }
}

.clear-icon {
  width: 12px;
  height: 12px;
}

.search-target-wrapper {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
}

.target-trigger-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;

  &:hover,
  &.active {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-primary);

    .light-theme & {
      background: rgba(0, 0, 0, 0.05);
    }
  }

  .chevron-icon {
    width: 14px;
    height: 14px;
    opacity: 0.7;
    transition: transform 0.2s ease;
    flex-shrink: 0;

    &.open {
      transform: rotate(180deg);
    }
  }
}

.target-popover {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  background: var(--popover-bg);
  border: 1px solid var(--popover-border);
  padding: 6px;
  border-radius: 12px;
  box-shadow: var(--popover-shadow);
  z-index: 100;
  min-width: 120px;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 11px;
  color: var(--text-secondary);
  cursor: pointer;
  width: 100%;
  background: transparent;
  border: none;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &:hover {
    background: var(--item-hover-bg);
    color: var(--text-primary);
  }

  &.selected {
    background: var(--accent-light);
    color: var(--accent-color);
    font-weight: 600;
  }

  .target-text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .check-icon {
    font-size: 10px;
    margin-left: 6px;
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
  .search-section {
    max-width: 280px;
  }
  .search-wrapper {
    height: 34px;
    border-radius: 10px;
  }

  .search-input {
    padding: 0 54px 0 32px;
    font-size: 12px;
  }

  .search-icon {
    left: 10px;
    width: 14px;
    height: 14px;
  }

  .clear-search-btn {
    right: 32px;
    width: 18px;
    height: 18px;
  }

  .clear-icon {
    width: 10px;
    height: 10px;
  }

  .target-trigger-btn {
    right: 4px;
    width: 22px;
    height: 22px;
    padding: 0;

    .chevron-icon {
      width: 12px;
      height: 12px;
    }
  }
}
</style>
