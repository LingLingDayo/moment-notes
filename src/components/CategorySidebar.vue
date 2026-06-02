<script lang="ts" setup>
import { ref, nextTick } from 'vue';
import { useStickyNotesStore } from '../stores/stickyNotes';
import { Folder, Plus, Trash2, Edit3, ClipboardList, Check, X, Download, Upload } from 'lucide-vue-next';

const store = useStickyNotesStore();

const fileInputRef = ref<HTMLInputElement | null>(null);

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const handleFileImport = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target?.result as string;
    if (text) {
      store.importBackup(text);
    }
    target.value = '';
  };
  reader.readAsText(file);
};

// 是否处于新增分类的编辑状态
const isAdding = ref(false);
const newCategoryName = ref('');
const addInputRef = ref<HTMLInputElement | null>(null);

// 处于编辑重命名状态的分类ID
const editingId = ref<string | null>(null);
const editCategoryName = ref('');
const editInputRef = ref<HTMLInputElement | null>(null);

// 开启新增
const startAdd = async () => {
  isAdding.value = true;
  newCategoryName.value = '';
  await nextTick();
  addInputRef.value?.focus();
};

// 取消新增
const cancelAdd = () => {
  isAdding.value = false;
  newCategoryName.value = '';
};

// 提交新增
const submitAdd = () => {
  const name = newCategoryName.value.trim();
  if (name) {
    store.addCategory(name);
    store.showToast(`已成功创建分类 "${name}"`);
    isAdding.value = false;
    newCategoryName.value = '';
  } else {
    cancelAdd();
  }
};

// 开启编辑
const startEdit = async (id: string, currentName: string) => {
  editingId.value = id;
  editCategoryName.value = currentName;
  await nextTick();
  editInputRef.value?.focus();
};

// 取消编辑
const cancelEdit = () => {
  editingId.value = null;
  editCategoryName.value = '';
};

// 提交编辑
const submitEdit = (id: string) => {
  const name = editCategoryName.value.trim();
  if (name) {
    store.updateCategory(id, name);
    store.showToast(`分类已重命名为 "${name}"`);
    editingId.value = null;
  } else {
    cancelEdit();
  }
};

// 删除分类
const confirmDelete = async (id: string, name: string) => {
  const ok = await store.askConfirm(
    '确认删除分类',
    `确定要删除分类 "${name}" 吗？该分类下的便签不会被删除，将变为未分类状态。`
  );
  if (ok) {
    store.deleteCategory(id);
    store.showToast(`分类 "${name}" 已删除`);
  }
};

// 获取某个分类下的便签总数
const getNoteCount = (categoryId: string) => {
  if (categoryId === 'all') {
    return store.notes.length;
  }
  return store.notes.filter(n => n.categoryId === categoryId).length;
};
</script>

<template>
  <aside class="sidebar-container">
    <div class="sidebar-header">
      <ClipboardList class="header-icon" />
      <h2 class="header-title">分类管理</h2>
    </div>

    <div class="sidebar-menu">
      <!-- "全部便签" 分类 -->
      <div 
        class="menu-item" 
        :class="{ active: store.currentCategoryId === 'all' }"
        @click="store.currentCategoryId = 'all'"
      >
        <div class="active-indicator"></div>
        <div class="item-left">
          <Folder class="item-icon" />
          <span class="item-name">全部便签</span>
        </div>
        <span class="item-badge">{{ getNoteCount('all') }}</span>
      </div>

      <!-- 用户自定义分类列表 -->
      <div 
        v-for="cat in store.categories" 
        :key="cat.id"
        class="menu-item"
        :class="{ active: store.currentCategoryId === cat.id }"
        @click="store.currentCategoryId = cat.id"
      >
        <div class="active-indicator"></div>
        <!-- 编辑状态 -->
        <div v-if="editingId === cat.id" class="item-edit-wrapper" @click.stop>
          <input 
            ref="editInputRef"
            v-model="editCategoryName"
            type="text" 
            class="item-edit-input"
            @keyup.enter="submitEdit(cat.id)"
            @keyup.esc="cancelEdit"
            @blur="submitEdit(cat.id)"
          />
          <button class="edit-btn confirm" @click="submitEdit(cat.id)">
            <Check class="btn-icon-small" />
          </button>
        </div>

        <!-- 正常展示状态 -->
        <template v-else>
          <div class="item-left">
            <Folder class="item-icon" />
            <span class="item-name" @dblclick="startEdit(cat.id, cat.name)">{{ cat.name }}</span>
          </div>
          
          <div class="item-right" @click.stop>
            <span class="item-badge">{{ getNoteCount(cat.id) }}</span>
            <div class="item-actions">
              <button class="action-btn" title="编辑分类" @click="startEdit(cat.id, cat.name)">
                <Edit3 class="action-icon" />
              </button>
              <button class="action-btn delete" title="删除分类" @click="confirmDelete(cat.id, cat.name)">
                <Trash2 class="action-icon" />
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 添加分类入口 -->
    <div class="sidebar-footer">
      <div v-if="isAdding" class="add-category-input-wrapper">
        <input 
          ref="addInputRef"
          v-model="newCategoryName"
          type="text" 
          placeholder="分类名称..."
          class="add-input"
          @keyup.enter="submitAdd"
          @keyup.esc="cancelAdd"
          @blur="submitAdd"
        />
        <div class="add-actions">
          <button class="add-confirm-btn" @click="submitAdd">
            <Check class="btn-icon" />
          </button>
          <button class="add-cancel-btn" @click="cancelAdd">
            <X class="btn-icon" />
          </button>
        </div>
      </div>
      
      <button v-else class="add-category-btn" @click="startAdd">
        <Plus class="add-icon" />
        <span>添加新分类</span>
      </button>

      <!-- 备份管理区 (开发者效率与数据安全增强) -->
      <div class="backup-section">
        <input 
          ref="fileInputRef"
          type="file" 
          accept=".json"
          class="hidden-file-input"
          @change="handleFileImport"
        />
        <button class="backup-btn" title="导出备份为 JSON 文件" @click="store.exportBackup">
          <Download class="backup-btn-icon" />
          <span>导出备份</span>
        </button>
        <button class="backup-btn" title="从 JSON 文件恢复数据" @click="triggerFileInput">
          <Upload class="backup-btn-icon" />
          <span>导入备份</span>
        </button>
      </div>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
.sidebar-container {
  width: 260px;
  height: 100%;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--panel-border);
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(var(--glass-blur));
  flex-shrink: 0;
}

.sidebar-header {
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  .header-icon {
    width: 22px;
    height: 22px;
    color: var(--accent-color);
  }

  .header-title {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: 0.5px;
  }
}

.sidebar-menu {
  flex: 1;
  padding: 16px 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  position: relative;
  overflow: hidden;

  .active-indicator {
    position: absolute;
    left: 0;
    width: 3px;
    height: 0;
    background: var(--accent-color);
    border-radius: 0 4px 4px 0;
    transition: height 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  &:hover {
    background: var(--item-hover-bg);
    color: var(--text-primary);
    
    .item-badge {
      opacity: 0;
      transform: scale(0.8);
    }
    
    .item-actions {
      opacity: 1;
      transform: translateX(0);
    }
  }

  &.active {
    background: var(--panel-bg);
    border-color: var(--panel-border);
    color: var(--text-primary);
    box-shadow: var(--shadow-sm);
    font-weight: 600;

    .active-indicator {
      height: 16px;
    }

    .item-icon {
      color: var(--accent-color);
    }

    .item-badge {
      background: var(--accent-color);
      color: var(--text-on-accent);
    }
  }
}

.item-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;

  .item-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    color: var(--text-muted);
    transition: color 0.2s;
  }

  .item-name {
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    user-select: none;
  }
}

.item-right {
  display: flex;
  align-items: center;
  position: relative;
  width: 48px;
  height: 20px;
  justify-content: flex-end;
}

.item-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  background: var(--badge-bg);
  color: var(--text-secondary);
  transition: all 0.2s;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  position: absolute;
  right: 0;
  opacity: 0;
  transform: translateX(10px);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.action-btn {
  padding: 4px;
  border-radius: 6px;
  color: var(--text-muted);
  
  &:hover {
    background: var(--item-hover-bg);
    color: var(--text-primary);
  }

  &.delete:hover {
    background: var(--danger-hover-bg);
    color: var(--danger-color);
  }

  .action-icon {
    width: 13px;
    height: 13px;
  }
}

.item-edit-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.item-edit-input {
  flex: 1;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 13px;
  color: var(--text-primary);
  width: 100%;
}

.edit-btn {
  padding: 4px;
  border-radius: 6px;
  background: var(--accent-color);
  color: var(--text-on-accent);
  
  &.confirm:hover {
    background: var(--accent-hover);
  }

  .btn-icon-small {
    width: 12px;
    height: 12px;
  }
}

.sidebar-footer {
  padding: 20px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.backup-section {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 12px;
}

.hidden-file-input {
  display: none;
}

.backup-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 0;
  border-radius: 8px;
  background: var(--btn-bg);
  border: 1px solid var(--btn-border);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 500;

  &:hover {
    background: var(--btn-hover-bg);
    color: var(--btn-hover-color);
    border-color: var(--btn-hover-border);
  }

  .backup-btn-icon {
    width: 12px;
    height: 12px;
  }
}

.add-category-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  background: var(--accent-light);
  color: var(--accent-color);
  font-size: 13px;
  font-weight: 600;
  border: 1px dashed var(--accent-border-dashed);

  &:hover {
    background: var(--accent-color);
    color: var(--text-on-accent);
    border-color: transparent;
  }

  .add-icon {
    width: 15px;
    height: 15px;
  }
}

.add-category-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.add-input {
  flex: 1;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--text-primary);

  &:focus {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px var(--accent-light);
  }
}

.add-actions {
  display: flex;
  gap: 4px;
}

.add-confirm-btn, .add-cancel-btn {
  padding: 8px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;

  .btn-icon {
    width: 14px;
    height: 14px;
  }
}

.add-confirm-btn {
  background: var(--accent-color);
  color: var(--text-on-accent);
  &:hover {
    background: var(--accent-hover);
  }
}

.add-cancel-btn {
  background: var(--btn-bg);
  color: var(--text-secondary);
  border: 1px solid var(--btn-border);
  &:hover {
    background: var(--btn-hover-bg);
    color: var(--btn-hover-color);
    border-color: var(--btn-hover-border);
  }
}
</style>
