<script lang="ts" setup>
import { onMounted, onUnmounted } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { useShortcutStore } from '@stores/shortcutStore';
import CategorySidebar from '@modules/CategorySidebar/CategorySidebar.vue';
import ActionBar from '@modules/ActionBar/ActionBar.vue';
import NoteGrid from '@modules/NoteGrid.vue';
import Toast from '@components/Toast.vue';
import ConfirmModal from '@components/ConfirmModal.vue';
import SettingsModal from '@modules/SettingsModal/SettingsModal.vue';

const store = useStickyNotesStore();
const shortcutStore = useShortcutStore();

const handleGlobalKeyDown = (e: KeyboardEvent) => {
  // 正在录制快捷键时，不触发全局动作响应
  if (shortcutStore.isRecording) return;

  const keyString = shortcutStore.getEventKeyString(e);
  if (!keyString) return;

  const matched = shortcutStore.shortcuts.find(s => s.currentKey === keyString);
  if (matched) {
    // 局部快捷键不触发全局动作
    if (['saveEdit', 'cancelEdit'].includes(matched.id)) return;

    e.preventDefault();
    shortcutStore.triggerShortcut(matched.id);
  }
};

onMounted(() => {
  // 加载存储中的便签和分类数据
  store.loadData();

  // 监听全局快捷键 (开发者/键盘流效率增强)
  window.addEventListener('keydown', handleGlobalKeyDown);
});

onUnmounted(() => {
  // 注销全局监听，杜绝内存泄漏 (安全防线)
  window.removeEventListener('keydown', handleGlobalKeyDown);
});
</script>

<template>
  <div class="dashboard-layout">
    <!-- 左侧分类侧边栏 -->
    <CategorySidebar />

    <!-- 右侧内容主面板 -->
    <main class="main-panel">
      <!-- 顶部操作条 -->
      <ActionBar />

      <!-- 便签网格内容区 (带切换过渡动画) -->
      <Transition name="fade-slide" mode="out-in">
        <NoteGrid :key="store.currentCategoryId" />
      </Transition>
    </main>

    <!-- 全局状态提示 -->
    <Toast />

    <!-- 全局确认弹窗 -->
    <ConfirmModal />

    <!-- 全局设置弹窗 -->
    <SettingsModal />
  </div>
</template>

<style lang="scss" scoped>
.dashboard-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: transparent;
}

.main-panel {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.01);
}

/* 分类切换时的淡入淡出滑动过渡 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition:
    opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
