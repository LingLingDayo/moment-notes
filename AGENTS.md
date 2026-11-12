# AGENTS.md (项目指导规范)

## 📌 项目简介
本项目是一个基于 **Vue 3 + TypeScript + Vite + Pinia** 构建的高颜值、高生产力的 **uTools 便签插件**，同一套代码也可以构建为 **Electron 独立桌面应用**。
- **设计风格**：采用现代 Glassmorphism 视觉风格、Fluent Design 微动效，支持暗黑/浅色模式自适应。
- **核心功能**：便签分组管理、多色主题、置顶、快捷搜索、可配置双击动作、uTools 超级面板文本捕获、数据导入导出备份；桌面应用形态额外提供全局唤起快捷键（支持鼠标按键、长按、双击）和失焦自动隐藏。
- **架构分层**：`modules` 负责功能界面，`stores` 负责应用状态，`domain` 负责可复用的领域规则，`infrastructure` 负责存储与外部适配；`electron` 存放桌面应用的主进程与 preload。
- **运行形态**：`utools`（插件）、`electron`（桌面应用）、`browser`（网页 / 开发调试）三种，统一通过 [platform.ts](src/infrastructure/platform/platform.ts) 识别。

---

## 🛠️ 开发与编码规范

> [!TIP]
> **常用命令索引**：在执行项目构建、测试、代码校验或开发调试前，请按需查阅 [常用命令速查手册](docs/commands.md) 了解所有可用命令及详细运行效果。

### 1. 代码质量与校验规范
- **静态检查**：修改代码后，**必须**运行 `npm run lint`（`eslint`）和 `npm run typecheck`（`vue-tsc`）进行校验并修复所有问题。严禁仅凭 IDE 提示就宣布任务完成。
- **测试同步**：修改或重构代码时，**必须**运行 `npm test` 并检查是否存在对应的测试文件（如 `*.spec.ts` 或 `*.test.ts`）；若存在，需根据逻辑变动同步更新或补充测试用例，确保全量测试通过且无控制台告警噪音。
- **单测环境兼容**：Pinia Store 与领域模块会在纯 Node 单测环境下被多次实例化：
  - 访问 `document`、`window`、`matchMedia` 等浏览器 API 前必须做 `typeof xxx !== 'undefined'` 判空保护；
  - 在 Store `setup` 中向模块级单例（如 [CommandRegistry.ts](src/domain/commands/CommandRegistry.ts)）注册处理器时，必须保证多次实例化幂等（如传入 `{ silent: true }`），避免测试重建 Pinia 时刷屏告警。

### 2. 代码体量与拆分规范
- **文件行数红线**：单个源文件（如 `.vue`、`.ts`、`.scss` 等）的代码长度**绝对禁止超过 600 行**，并以 **450 行**作为主动拆分预警线。
- **重构拆分**：当代码行数接近预警线或包含多个独立交互区域（如多个 Popover 下拉浮层、独立子面板、复杂表单段落）时，必须主动拆分为同目录下的独立子组件（参考 `src/modules/NoteCard/*Popover.vue`）或独立的函数/Composable 模块，禁止使用压缩格式等方式规避行数限制。

### 3. 架构分层与依赖方向
- **单向依赖原则**：严格遵循 `modules / views / components` → `stores` → `domain` ↔ `infrastructure` → `types` 的依赖流向。
- **领域层边界守卫**：`src/domain/**` **严禁**导入 `src/stores/**` 或 `src/modules/**`（已配置 ESLint `no-restricted-imports` 强制拦截）。跨层共享的基础类型应定义在 [src/types/index.ts](src/types/index.ts) 或 `src/domain/**` 内，禁止从 `stores` 反向导出类型给 `domain`。
- **领域规则集中收口**：
  - **分类规则**：系统分类判定（`all` / `recent` / `trash`）、新建便签目标分类推导、分类存在性校验统一使用 [categoryRules.ts](src/domain/category/categoryRules.ts)，**严禁**在组件、`App.vue` 或 Store 中重复手写 `['all', 'recent', 'trash'].includes(...)`。
  - **筛选与排序算法**：便签分类初筛、关键词检索、多维排序及管道阶段统一维护在 [noteAlgorithms.ts](src/domain/notes/noteAlgorithms.ts) 与 [NoteFilterPipeline.ts](src/domain/pipeline/NoteFilterPipeline.ts)，禁止在外部另写一套平行的过滤或排序实现，也禁止新增未接入生产链路的死抽象。
  - **图片资产协议**：`asset://` URL 编解码与 Markdown 资产提取属于领域规则（[assetCodec.ts](src/domain/assets/assetCodec.ts)），Canvas 压缩与 SHA-256 计算属于基础设施（[imageProcessor.ts](src/infrastructure/assets/imageProcessor.ts)）。

### 4. 状态管理规范
- **按职责拆分**：`noteStore` 管理便签 CRUD、筛选和排序；`categoryStore` 管理分类 CRUD、层级和顺序；`uiStore` 管理主题、偏好设置、弹窗和通知；`desktopStore` 管理仅桌面应用形态生效的设置（全局唤起快捷键、失焦自动隐藏）并同步给主进程。
- **组件按需直连**：组件应按职责优先直接调用对应的子 Store（如 `useUiStore`、`useNoteStore`、`useCategoryStore`、`useDesktopStore`、`useShortcutStore`），通过 Store actions 触发单向状态变更。
- **门面克制透传**：[stickyNotes.ts](src/stores/stickyNotes.ts) 仅作为跨 Store 协调层（负责应用初始化、备份恢复、跨领域联动），**严禁**在其中重写子 Store 的领域规则，也**禁止**继续向其追加无跨 Store 协调价值的纯 `toRef` 透传字段。

### 5. 设置与单一事实源规范
- **唯一注册表**：所有应用偏好设置必须在 [AppSettingRegistry.ts](src/domain/settings/AppSettingRegistry.ts) 中基于 [SettingDefinition.ts](src/domain/settings/SettingDefinition.ts) 的 Codec（`booleanSettingCodec`、`enumSettingCodec`、`numberSettingCodec`、`stringSettingCodec`、`jsonSettingCodec` 等）统一声明，并纳入 `APP_SETTING_DEFINITIONS`。
- **新增设置项的标准流程**（缺一不可，禁止跳步手写）：
  1. 在 [AppSettingRegistry.ts](src/domain/settings/AppSettingRegistry.ts) 定义 `XXX_SETTING` 并加入 `APP_SETTING_DEFINITIONS`；
  2. 在 [src/types/index.ts](src/types/index.ts) 的 `AppSettings` 中补充对应字段类型；
  3. 在 `uiStore`（或对应子 Store）中通过 [SettingRepository.ts](src/infrastructure/storage/SettingRepository.ts) 的 `settingRepository.get` 初始化、`settingRepository.set` 落盘，并在 `uiStore.loadSettings` 与 `uiStore.setSetting` 中接入；
  4. 在 [settingsConfig.ts](src/modules/SettingsModal/settingsConfig.ts) 中声明界面展示项。
- **反模式禁令**：
  - **严禁**在 Store 或组件中手写 `storage.getItem('sticky_notes_xxx')` / `storage.setItem('sticky_notes_xxx')` 直接读写设置项；
  - **严禁**在 [useSettings.ts](src/modules/SettingsModal/useSettings.ts) 中堆砌逐项 `else if (key === 'xxx')` 分发（统一走 `uiStore.setSetting`）；
  - **严禁**在 [settingsHelper.ts](src/stores/settingsHelper.ts) 中手写逐项类型校验恢复逻辑（已由 `APP_SETTING_DEFINITIONS` 遍历自动完成解码与派发）。
- **形态专属设置**：只在特定运行形态下生效的设置，在 `SettingDefinition` 中用 `platforms` 声明适用范围，界面显隐与备份导入导出均由其自动派生，**禁止**在组件里手写 `window.utools` / `window.desktop` 判断。

### 6. 样式与动效规范
- **样式复用**：样式定义应优先使用全局已定义的 SCSS 变量与 Mixins（位于 [styles](src/styles/) 内）。
- **流畅交互**：界面需要具备流畅细腻的过渡效果（如列表重排使用 FLIP 动画、侧边栏切换淡入滑动、聚焦拉伸等），严禁出现粗糙的硬直无过渡交互。

### 7. 提示气泡 (Tooltip) 规范
- **标签限制**：所有新增功能或组件中，如果需要实现悬停文字提示，**禁止在原生 HTML 元素上使用 `title` 属性**。
- **全局气泡**：必须统一使用自定义的 `data-tooltip` 属性。项目已在 [tooltip.ts](src/utils/tooltip.ts) 中集成了统一的 Tooltip，使用 `data-tooltip` 可自动激活该效果。

---

## 🔌 平台与宿主桥接规范（uTools / Browser / Electron）

### 1. 平台识别与宿主能力调用
- **唯一平台判定源**：统一使用 [platform.ts](src/infrastructure/platform/platform.ts) 导出的 `getRuntimePlatform()`、`isUTools()`、`isElectron()`、`isBrowser()`（或经 [storage.ts](src/utils/storage.ts) 重导出的同名函数），**严禁**在业务代码中重复编写 `typeof window.utools !== 'undefined'`。
- **宿主桥接封装**：视图组件（`.vue`）与领域层代码**严禁直接调用** `window.utools`、`navigator.clipboard` 或原生 `localStorage`，必须通过统一封装的桥接函数调用：
  - **键值持久化**：统一使用 [storage.ts](src/utils/storage.ts) 中的 `storage` 适配器（uTools 下自动走 `dbStorage`，浏览器/Electron 下走 `localStorage`，Node 单测下自动内存兜底）；
  - **复制文本**：统一使用 [hostBridge.ts](src/infrastructure/platform/hostBridge.ts) 的 `copyTextToClipboard(text)`；
  - **打开外部链接**：统一使用 [hostBridge.ts](src/infrastructure/platform/hostBridge.ts) 的 `openExternalUrl(url)`；
  - **粘贴至宿光标**：统一使用 [storage.ts](src/utils/storage.ts) 的 `pasteTextToCursor(text)`；
  - **文件导出写盘**：统一使用 [storage.ts](src/utils/storage.ts) 的 `downloadOrWriteFile`（禁止在组件中用 `<a>` 标签直接触发受沙箱限制的下载）。

### 2. 调试与浏览器子代理
- **端口规范**：启用浏览器子代理（browser subagent）调试时，须告知其本地运行端口为 `4021`。

---

## 🖥️ Electron 桌面应用适配规范

> [!TIP]
> 当涉及 Electron 桌面应用的主进程、preload、进程间通信（IPC）、全局触发器、失焦自动隐藏或桌面端打包配置时，请按需查阅 [Electron 桌面应用适配规范](docs/electron.md)。

---

## 📖 参考资料
- **uTools 官方文档**：[开发者指南](https://www.u-tools.cn/docs/developer/basic/getting-started.html)
  > [!TIP]
  > 当涉及 `uTools` 平台特有功能（如插件生命周期、API 交互、`utools.copyText` 等）的开发或调试时，请务必先查阅该官方文档，以确保实现方式符合平台规范。
