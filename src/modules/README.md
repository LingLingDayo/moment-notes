# Modules 功能视图层规范

本目录按功能领域组织业务界面模块（`NoteCard`、`CategorySidebar`、`ActionBar`、`SettingsModal`、`DataModal` 等）。

## 核心约束
1. **代码体量与子组件拆分**：单个 `.vue` / `.ts` / `.scss` 文件**严禁超过 600 行**（接近 450 行主动拆分）。当组件包含多个 Popover 浮层、独立子面板或复杂交互逻辑时，须拆分为同目录下的子组件（如 `NoteCard/*Popover.vue`）或 Composable Hook。
2. **Store 按需直连**：组件应按职责优先直接调用对应子 Store（`useUiStore`、`useNoteStore`、`useCategoryStore`、`useDesktopStore`、`useShortcutStore`），通过 Store actions 修改状态。
3. **设置弹窗联动**：在 `SettingsModal` 中新增设置项时，仅在 `settingsConfig.ts` 配置展示元数据；值读写由 `useSettings.ts` 统一委托给 `uiStore.setSetting`，**严禁**在 `useSettings.ts` 中堆砌 `else if` 分支，**严禁**在组件中手写平台判断控制设置显隐（由设置定义的 `platforms` 自动派生）。
4. **宿主隔离与提示气泡**：
   - **禁止直调宿主 API**：剪贴板复制、打开外链、键值存储、文件导出必须调用 `infrastructure` / `utils` 桥接函数，**严禁**直接访问 `window.utools`、`window.desktop`、`navigator.clipboard`、原生 `localStorage` 或用 `<a>` 触发下载。
   - **全局 Tooltip**：悬停提示**严禁在原生 HTML 标签上使用 `title` 属性**，统一使用 `data-tooltip`。
