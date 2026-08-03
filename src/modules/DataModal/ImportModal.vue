<script lang="ts" setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import {
  Upload,
  X,
  CheckSquare,
  Square,
  Settings,
  AlertTriangle
} from '@lucide/vue';
import { ImportMode, ImportOptions } from '@type';
import DataCategorySelector from './components/DataCategorySelector.vue';
import ImportFileInfoCard from './components/ImportFileInfoCard.vue';
import ImportModeSelector from './components/ImportModeSelector.vue';

const store = useStickyNotesStore();

const importMode = ref<ImportMode>('merge');
const selectedCategoryIds = ref<string[]>([]);
const importUncategorized = ref(true);
const importSettings = ref(true);

const backupData = computed(() => store.pendingImportData);

// 统计备份数据中各个分类下的便签数
const backupCategoryNoteMap = computed(() => {
  if (!backupData.value) return {};

  const map: Record<string, number> = {};
  const rawCategories = Array.isArray(backupData.value.categories) ? backupData.value.categories : [];
  const rawNotes = Array.isArray(backupData.value.notes) ? backupData.value.notes : [];

  rawCategories.forEach(c => {
    map[c.id] = 0;
  });
  map['uncategorized'] = 0;

  rawNotes.forEach(n => {
    const catId = n.categoryId || 'all';
    if (catId !== 'all' && map[catId] !== undefined) {
      map[catId]++;
    } else {
      map['uncategorized']++;
    }
  });

  return map;
});

// 初始化勾选状态
const initSelections = () => {
  if (!backupData.value) return;
  const rawCategories = Array.isArray(backupData.value.categories) ? backupData.value.categories : [];
  selectedCategoryIds.value = rawCategories.map(c => c.id);
  importUncategorized.value = (backupCategoryNoteMap.value['uncategorized'] || 0) > 0;
  importSettings.value = !!backupData.value.settings;
};

watch(
  () => store.showImportModal,
  val => {
    if (val) {
      importMode.value = 'merge';
      initSelections();
    }
  },
  { immediate: true }
);

const rawCategories = computed(() =>
  Array.isArray(backupData.value?.categories) ? backupData.value!.categories : []
);

const isAllSelected = computed(() => {
  const totalCount = rawCategories.value.length;
  return totalCount > 0 && selectedCategoryIds.value.length === totalCount;
});

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedCategoryIds.value = [];
  } else {
    selectedCategoryIds.value = rawCategories.value.map(c => c.id);
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

// 格式化时间戳
const formattedBackupTime = computed(() => {
  if (!backupData.value?.timestamp) return '未知时间';
  const d = new Date(backupData.value.timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
});

// 统计即将导入的便签数
const pendingNotesCount = computed(() => {
  if (!backupData.value) return 0;
  const rawNotes = Array.isArray(backupData.value.notes) ? backupData.value.notes : [];
  const selectedSet = new Set(selectedCategoryIds.value);

  return rawNotes.filter(n => {
    const catId = n.categoryId || 'all';
    if (catId !== 'all' && selectedSet.has(catId)) {
      return true;
    }
    if ((catId === 'all' || !catId) && importUncategorized.value) {
      return true;
    }
    return false;
  }).length;
});

const handleConfirmImport = async () => {
  if (importMode.value === 'overwrite') {
    const ok = await store.askConfirm(
      '确认覆盖数据？',
      '⚠️ 警告：选择“覆盖已有”将会清空您现有的全部分类与便签数据，完全替换为所选导入的内容，此操作无法撤销！'
    );
    if (!ok) return;
  }

  const options: ImportOptions = {
    mode: importMode.value,
    categoryIds: selectedCategoryIds.value,
    importUncategorized: importUncategorized.value,
    importSettings: importSettings.value
  };

  store.importSelectedBackup(options);
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && store.showImportModal) {
    store.closeImportModal();
  }
};

onMounted(() => window.addEventListener('keydown', handleKeyDown));
onUnmounted(() => window.removeEventListener('keydown', handleKeyDown));
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="store.showImportModal && backupData"
        class="modal-backdrop"
        @click.self="store.closeImportModal"
      >
        <div class="modal-card">
          <!-- 头部标题栏 -->
          <div class="modal-header">
            <div class="header-title">
              <Upload class="header-icon" />
              <span>导入数据恢复</span>
            </div>
            <button class="close-btn" data-tooltip="关闭" @click="store.closeImportModal">
              <X class="close-icon" />
            </button>
          </div>

          <!-- 内容主体区 -->
          <div class="modal-body custom-scrollbar">
            <!-- 备份文件信息卡片 -->
            <ImportFileInfoCard
              :version="backupData.version"
              :formatted-time="formattedBackupTime"
              :categories-count="rawCategories.length"
              :notes-count="backupData.notes?.length || 0"
              :has-settings="!!backupData.settings"
            />

            <!-- 1. 导入方式选择 (Radio Group) -->
            <ImportModeSelector v-model="importMode" />

            <!-- 2. 导入数据内容勾选区 -->
            <div class="section-container">
              <DataCategorySelector
                title="选择导入分类"
                :categories="rawCategories"
                :selected-category-ids="selectedCategoryIds"
                :note-count-map="backupCategoryNoteMap"
                :is-all-selected="isAllSelected"
                :show-uncategorized="(backupCategoryNoteMap['uncategorized'] || 0) > 0"
                :is-uncategorized-selected="importUncategorized"
                uncategorized-label="未分类/全域便签"
                @toggle-category="toggleCategory"
                @toggle-select-all="toggleSelectAll"
                @toggle-uncategorized="importUncategorized = !importUncategorized"
              />

              <!-- 导入系统设置选项 -->
              <div v-if="backupData.settings" class="options-section">
                <div class="option-item" @click="importSettings = !importSettings">
                  <CheckSquare v-if="importSettings" class="checkbox-icon checked" />
                  <Square v-else class="checkbox-icon" />
                  <Settings class="option-icon" />
                  <span class="option-label">同时导入并覆盖系统偏好设置 (主题/布局等)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 底部操作按钮栏 -->
          <div class="modal-footer">
            <div class="summary-info">
              将导入 <strong>{{ pendingNotesCount }}</strong> 张便签
            </div>
            <div class="footer-actions">
              <button class="btn btn-cancel" @click="store.closeImportModal">
                取消
              </button>
              <button
                class="btn"
                :class="importMode === 'overwrite' ? 'btn-danger' : 'btn-primary'"
                :disabled="selectedCategoryIds.length === 0 && !importUncategorized && !importSettings"
                @click="handleConfirmImport"
              >
                <AlertTriangle v-if="importMode === 'overwrite'" class="btn-icon" />
                <Upload v-else class="btn-icon" />
                <span>{{ importMode === 'overwrite' ? '确认覆盖导入' : '确认增量导入' }}</span>
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
  z-index: $z-index-modal-level2;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
}

.modal-card {
  width: 480px;
  max-width: 92vw;
  max-height: 85vh;
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
  gap: 16px;
  overflow-y: auto;
}

.section-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
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

  &.btn-danger {
    background: #ef4444;
    color: #fff;

    &:hover:not(:disabled) {
      background: #dc2626;
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
