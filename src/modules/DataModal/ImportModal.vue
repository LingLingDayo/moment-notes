<script lang="ts" setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import {
  Upload,
  X,
  CheckSquare,
  Square,
  Folder,
  FileText,
  Settings,
  GitMerge,
  RotateCcw,
  AlertTriangle,
  Calendar,
  FileCode
} from '@lucide/vue';
import { ImportMode, ImportOptions } from '@type';

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
            <div class="file-info-card">
              <div class="info-meta">
                <div class="meta-item">
                  <FileCode class="meta-icon" />
                  <span>版本: <strong>{{ backupData.version || '未知' }}</strong></span>
                </div>
                <div class="meta-item">
                  <Calendar class="meta-icon" />
                  <span>生成时间: {{ formattedBackupTime }}</span>
                </div>
              </div>
              <div class="info-stats">
                <span>包含 {{ rawCategories.length }} 个分类</span>
                <span>•</span>
                <span>{{ backupData.notes?.length || 0 }} 张便签</span>
                <template v-if="backupData.settings">
                  <span>•</span>
                  <span>包含偏好设置</span>
                </template>
              </div>
            </div>

            <!-- 1. 导入方式选择 (Radio Group) -->
            <div class="section-container">
              <div class="section-title">
                选择导入方式
              </div>
              <div class="mode-grid">
                <!-- 增量合并模式 -->
                <div
                  class="mode-card"
                  :class="{ active: importMode === 'merge' }"
                  @click="importMode = 'merge'"
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
                  :class="{ active: importMode === 'overwrite' }"
                  @click="importMode = 'overwrite'"
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

            <!-- 2. 导入数据内容勾选区 -->
            <div class="section-container">
              <div class="selection-toolbar">
                <span class="section-title">选择导入分类 ({{ selectedCategoryIds.length }}/{{ rawCategories.length }})</span>
                <button v-if="rawCategories.length > 0" class="text-action-btn" @click="toggleSelectAll">
                  {{ isAllSelected ? '取消全选' : '全选' }}
                </button>
              </div>

              <!-- 分类列表 -->
              <div class="category-list custom-scrollbar">
                <div
                  v-for="cat in rawCategories"
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
                  <span class="badge">{{ backupCategoryNoteMap[cat.id] || 0 }} 贴</span>
                </div>

                <!-- 无分类/全域便签 -->
                <div
                  v-if="(backupCategoryNoteMap['uncategorized'] || 0) > 0"
                  class="category-item"
                  :class="{ active: importUncategorized }"
                  @click="importUncategorized = !importUncategorized"
                >
                  <div class="item-left">
                    <CheckSquare v-if="importUncategorized" class="checkbox-icon checked" />
                    <Square v-else class="checkbox-icon" />
                    <FileText class="folder-icon" />
                    <span class="cat-name">未分类/全域便签</span>
                  </div>
                  <span class="badge">{{ backupCategoryNoteMap['uncategorized'] }} 贴</span>
                </div>
              </div>

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

.selection-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .text-action-btn {
    background: none;
    border: none;
    color: var(--primary-color, #3b82f6);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;

    &:hover {
      background: rgba(59, 130, 246, 0.1);
    }
  }
}

.category-list {
  max-height: 160px;
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
