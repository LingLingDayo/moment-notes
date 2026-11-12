# Stores 状态管理层规范

本目录基于 Pinia 管理响应式状态，负责衔接 `modules` 视图层与 `domain` / `infrastructure` 底层服务。

## 职责分工
- `noteStore.ts`：便签 CRUD、当前分类便签过滤同步、搜索防抖、排序模式与顺序。
- `categoryStore.ts`：分类 CRUD、树形层级计算、拖拽排序与折叠状态。
- `uiStore.ts`：主题切换、常规偏好设置（统一经 `settingRepository` 读写并通过 `setSetting` / `loadSettings` 收口）、弹窗与 Toast 状态。
- `desktopStore.ts` / `shortcutStore.ts`：桌面专属设置同步与快捷键管理。
- `stickyNotes.ts`（协调层）：仅负责跨 Store 初始化（`loadData`）、备份恢复、检索与排序响应式串联。
- `settingsHelper.ts`：基于 `domain/settings` 注册表遍历驱动的备份设置导出与恢复。

## 核心约束
1. **设置读写规范**：偏好设置必须通过 `SettingRepository` 与领域设置注册表初始化和落盘，并在 `uiStore.setSetting` / `loadSettings` 中接入；**严禁**手写 `storage.getItem/setItem('sticky_notes_xxx')`，**严禁**在 `settingsHelper.ts` 中手写逐项 `if-else` 校验。
2. **领域规则下沉**：分类合法性判定、新建便签分类推导、筛选与排序算法必须直接调用 `domain` 层纯函数，禁止在 Store 内重复编写业务判断。
3. **精简协调层**：视图组件应优先按职责直接调用对应子 Store；禁止向 `stickyNotes.ts` 继续追加无跨 Store 协调价值的纯 `toRef` 透传字段。
4. **环境判空与幂等**：Store 初始化可能运行在无 DOM 的 Node 单测环境中，操作 `document` / `window` 前须判空；注册全局命令时须传入幂等选项（如 `{ silent: true }`）。
