<script lang="ts" setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { Download, X, CheckSquare, Square, Folder, FileText, Settings, Trash2 } from '@lucide/vue';
import { ExportOptions } from '@type';

const store = useStickyNotesStore();

// 选中的分类 ID 列表
const selectedCategoryIds = ref<string[]>([]);
const includeSettings = ref(true);
const includeTrash = ref(false);

// 计算各个分类下的便签数量映射
const categoryNoteCountMap = computed(() => {
  const map: Record<string, number> = {};

  // 自定义分类计数
  store.categories.forEach(c => {
    map[c.id] = 0;
  });
  map['uncategorized'] = 0;

  store.allNotes.forEach(n => {
    if (n.isDeleted && !includeTrash.value) return;
    const catId = n.categoryId || 'all';
    if (catId !== 'all' && map[catId] !== undefined) {
      map[catId]++;
    } else {
      map['uncategorized']++;
    }
  });

  return map;
});

// 初始化勾选状态（默认全选）
const initSelections = () => {
  const ids = store.categories.map(c => c.id);
  if (categoryNoteCountMap.value['uncategorized'] > 0) {
    ids.push('uncategorized');
  }
  selectedCategoryIds.value = ids;
};

watch(
  () => store.showExportModal,
  val => {
    if (val) {
      initSelections();
    }
  },
  { immediate: true }
);

// 全选 / 取消全选
const isAllSelected = computed(() => {
  const totalCount = store.categories.length + (categoryNoteCountMap.value['uncategorized'] > 0 ? 1 : 0);
  return totalCount > 0 && selectedCategoryIds.value.length === totalCount;
});

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedCategoryIds.value = [];
  } else {
    initSelections();
  }
};

const toggleCategory = (id: string) => {
  const idx = selectedCategoryIds.value.indexOf(id);
  if (idx > -1) {
    selectedCategoryIds.value.splice(idx, 1);
  } else {
    selectedCategoryIds.value.push(id);
  }
};

// 计算总勾选导出的便签数量
const totalExportNotesCount = computed(() => {
  const selectedSet = new Set(selectedCategoryIds.value);
  return store.allNotes.filter(n => {
    if (n.isDeleted && !includeTrash.value) return false;
    const catId = n.categoryId || 'all';
    if (catId !== 'all') {
      return selectedSet.has(catId);
    }
    return selectedSet.has('uncategorized');
  }).length;
});

const handleConfirmExport = () => {
  const options: ExportOptions = {
    categoryIds: selectedCategoryIds.value,
    includeSettings: includeSettings.value,
    includeTrash: includeTrash.value
  };
  store.exportSelectedBackup(options);
  store.closeExportModal();
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && store.showExportModal) {
    store.closeExportModal();
  }
};

onMounted(() => window.addEventListener('keydown', handleKeyDown));
onUnmounted(() => window.removeEventListener('keydown', handleKeyDown));
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="store.showExportModal"
        class="modal-backdrop"
        @click.self="store.closeExportModal"
      >
        <div class="modal-card">
          <!-- 头部标题栏 -->
          <div class="modal-header">
            <div class="header-title">
              <Download class="header-icon" />
              <span>选择导出数据</span>
            </div>
            <button class="close-btn" data-tooltip="关闭" @click="store.closeExportModal">
              <X class="close-icon" />
            </button>
          </div>

          <!-- 内容主体 -->
          <div class="modal-body">
            <p class="section-desc">
              请选择需要包含在备份 JSON 文件中的分类与数据：
            </p>

            <!-- 分类选择头部工具栏 -->
            <div class="selection-toolbar">
              <span class="sub-title">分类数据 ({{ selectedCategoryIds.length }}/{{ store.categories.length + (categoryNoteCountMap['uncategorized'] > 0 ? 1 : 0) }})</span>
              <button class="text-action-btn" @click="toggleSelectAll">
                {{ isAllSelected ? '取消全选' : '全选' }}
              </button>
            </div>

            <!-- 分类多选列表容器 -->
            <div class="category-list custom-scrollbar">
              <!-- 自定义分类项目 -->
              <div
                v-for="cat in store.categories"
                :key="cat.id"
                class="category-item"
                :class="{ active: selectedCategoryIds.includes(cat.id) }"
                @click="toggleCategory(cat.id)"
              >
                <div class="item-left">
                  <CheckSquare v-if="selectedCategoryIds.includes(cat.id)" class="checkbox-icon checked" />
                  <Square v-else class="checkbox-icon" />
                  <Folder class="folder-icon" />
                  <span class="cat-name">{{ cat.name }}</span>
                </div>
                <span class="badge">{{ categoryNoteCountMap[cat.id] || 0 }} 贴</span>
              </div>

              <!-- 全局/未明确分配分类的便签 -->
              <div
                v-if="categoryNoteCountMap['uncategorized'] > 0"
                class="category-item"
                :class="{ active: selectedCategoryIds.includes('uncategorized') }"
                @click="toggleCategory('uncategorized')"
              >
                <div class="item-left">
                  <CheckSquare v-if="selectedCategoryIds.includes('uncategorized')" class="checkbox-icon checked" />
                  <Square v-else class="checkbox-icon" />
                  <FileText class="folder-icon" />
                  <span class="cat-name">未分类/全部便签</span>
                </div>
                <span class="badge">{{ categoryNoteCountMap['uncategorized'] }} 贴</span>
              </div>
            </div>

            <!-- 附加选项配置区 -->
            <div class="options-section">
              <div class="option-item" @click="includeSettings = !includeSettings">
                <CheckSquare v-if="includeSettings" class="checkbox-icon checked" />
                <Square v-else class="checkbox-icon" />
                <Settings class="option-icon" />
                <span class="option-label">包含系统与偏好设置 (主题/布局/快捷键等)</span>
              </div>

              <div class="option-item" @click="includeTrash = !includeTrash">
                <CheckSquare v-if="includeTrash" class="checkbox-icon checked" />
                <Square v-else class="checkbox-icon" />
                <Trash2 class="option-icon" />
                <span class="option-label">包含已放入回收站的便签</span>
              </div>
            </div>
          </div>

          <!-- 底部操作按钮栏 -->
          <div class="modal-footer">
            <div class="summary-info">
              共选择 <strong>{{ totalExportNotesCount }}</strong> 张便签
            </div>
            <div class="footer-actions">
              <button class="btn btn-cancel" @click="store.closeExportModal">
                取消
              </button>
              <button
                class="btn btn-primary"
                :disabled="selectedCategoryIds.length === 0 && !includeSettings"
                @click="handleConfirmExport"
              >
                <Download class="btn-icon" />
                <span>导出备份</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
}

.modal-card {
  width: 440px;
  max-width: 90vw;
  background: var(--card-bg, rgba(255, 255, 255, 0.95));
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.2));
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--text-primary, #333);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));

  .header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;

    .header-icon {
      width: 18px;
      height: 18px;
      color: var(--primary-color, #3b82f6);
    }
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--text-secondary, #666);
    cursor: pointer;
    transition: background 0.2s, color 0.2s;

    &:hover {
      background: var(--btn-hover-bg, rgba(0, 0, 0, 0.05));
      color: var(--text-primary, #111);
    }

    .close-icon {
      width: 16px;
      height: 16px;
    }
  }
}

.modal-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  .section-desc {
    font-size: 13px;
    color: var(--text-secondary, #666);
    margin: 0;
  }
}

.selection-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .sub-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary, #333);
  }

  .text-action-btn {
    background: none;
    border: none;
    color: var(--primary-color, #3b82f6);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;
    transition: background 0.2s;

    &:hover {
      background: rgba(59, 130, 246, 0.1);
    }
  }
}

.category-list {
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 4px;
}

.category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--item-bg, rgba(0, 0, 0, 0.03));
  border: 1px solid transparent;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;

  &:hover {
    background: var(--item-hover-bg, rgba(0, 0, 0, 0.06));
  }

  &.active {
    background: var(--item-active-bg, rgba(59, 130, 246, 0.08));
    border-color: rgba(59, 130, 246, 0.3);
  }

  .item-left {
    display: flex;
    align-items: center;
    gap: 8px;

    .checkbox-icon {
      width: 16px;
      height: 16px;
      color: var(--text-secondary, #999);

      &.checked {
        color: var(--primary-color, #3b82f6);
      }
    }

    .folder-icon {
      width: 15px;
      height: 15px;
      color: var(--text-secondary, #666);
    }

    .cat-name {
      font-size: 13px;
      font-weight: 500;
    }
  }

  .badge {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.06);
    color: var(--text-secondary, #666);
  }
}

.options-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;

  .option-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--text-primary, #444);
    cursor: pointer;
    user-select: none;
    padding: 4px 0;

    .checkbox-icon {
      width: 15px;
      height: 15px;
      color: var(--text-secondary, #999);

      &.checked {
        color: var(--primary-color, #3b82f6);
      }
    }

    .option-icon {
      width: 14px;
      height: 14px;
      color: var(--text-secondary, #666);
    }

    .option-label {
      font-size: 12px;
    }
  }
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-top: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  background: var(--footer-bg, rgba(0, 0, 0, 0.02));

  .summary-info {
    font-size: 12px;
    color: var(--text-secondary, #666);
  }

  .footer-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;

  &.btn-cancel {
    background: transparent;
    border-color: var(--btn-border, rgba(0, 0, 0, 0.15));
    color: var(--text-secondary, #666);

    &:hover {
      background: var(--btn-hover-bg, rgba(0, 0, 0, 0.05));
    }
  }

  &.btn-primary {
    background: var(--primary-color, #3b82f6);
    color: #fff;

    &:hover:not(:disabled) {
      background: var(--primary-hover-color, #2563eb);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-icon {
      width: 14px;
      height: 14px;
    }
  }
}

/* Modal 动画 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);

  .modal-card {
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;

  .modal-card {
    transform: scale(0.95) translateY(10px);
  }
}
</style>
