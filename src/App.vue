<script lang="ts" setup>
import { onMounted } from 'vue';
import { useStickyNotesStore } from './stores/stickyNotes';
import { isUTools } from './utils/storage';

onMounted(() => {
  const store = useStickyNotesStore();

  if (isUTools()) {
    // 监听 uTools 插件进入事件
    window.utools.onPluginEnter((action) => {
      // 触发数据加载以保证是最新的
      store.loadData();
      
      // uTools 提供了强大的文本输入匹配能力，支持将用户选中的文本快速保存
      // action.type 为 'text' 或 'over' (文本匹配指令)
      if (action.type === 'text' || action.type === 'over') {
        const textPayload = action.payload;
        if (textPayload && textPayload.trim()) {
          // 在当前分类下极速导入文本便签
          store.addNote(store.currentCategoryId, textPayload.trim(), '💡 快捷导入');
          store.showToast('已自动从输入源新建便签');
        }
      }
    });
  }
});
</script>

<template>
  <div class="app-wrapper">
    <router-view></router-view>
  </div>
</template>

<style lang="scss">
.app-wrapper {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>
