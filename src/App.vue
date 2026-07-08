<script lang="ts" setup>
import { onMounted } from 'vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { isUTools } from '@utils/storage';
import Dashboard from '@views/Dashboard.vue';

onMounted(() => {
  const store = useStickyNotesStore();

  const isDevMode =
    import.meta.env.DEV ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    (typeof window !== 'undefined' && (window as any).utools?.isDev?.());

  if (isDevMode) {
    (window as any).resetTags = store.devResetTags;
    (window as any).resetNotes = store.devResetNotes;
    (window as any).resetAllData = store.devResetAllData;
    console.log('%c[Dev Helper] 已挂载开发重置控制台指令: ', 'color: #3b82f6; font-weight: bold;');
    console.log('- resetTags(): 清空所有便签的标签(tags)');
    console.log('- resetNotes(): 重置所有便签内容为默认欢迎便签');
    console.log('- resetAllData(): 清空缓存，完全重置分类与便签数据');
  }

  if (isUTools()) {
    // 监听 uTools 插件进入事件
    window.utools.onPluginEnter(action => {
      // 触发数据加载以保证是最新的
      store.loadData();

      // 自动同步/更新主题
      store.initTheme(true);

      // 判断是否是通过超级面板打开
      const isSuperPanel = action.code === 'save_note' || action.type === 'over';

      if (isSuperPanel) {
        // 读取并校验超级面板默认的打开分类
        const targetCategory = store.superPanelDefaultCategory || 'all';
        const isSystemCat = ['all', 'recent', 'trash'].includes(targetCategory);
        const exists = isSystemCat || store.categories.some((c: any) => c.id === targetCategory);
        const finalCategory = exists ? targetCategory : 'all';

        // 切换到目标分类
        store.currentCategoryId = finalCategory;

        // uTools 提供了强大的文本输入匹配能力，支持将用户选中的文本快速保存
        // action.type 为 'text' 或 'over' (文本匹配指令)
        if (action.type === 'over') {
          const textPayload = action.payload;
          if (textPayload && textPayload.trim()) {
            // 新建便签保存到 targetCategory 分类下
            store.addNote(finalCategory, textPayload.trim(), '💡 快捷导入');
            store.showToast('已自动从输入源新建便签');
          }
        }
      }
    });
  }
});
</script>

<template>
  <div class="app-wrapper" :class="{ 'is-utools': isUTools() }">
    <Dashboard />
  </div>
</template>

<style lang="scss">
.app-wrapper {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>
