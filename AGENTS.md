
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
- **静态检查**：修改代码后，**必须**运行 `eslint` 和 `tsc` 进行校验并修复所有问题。严禁仅凭 IDE 提示就宣布任务完成。
- **测试同步**：修改或重构代码时，**必须**检查是否存在对应的测试文件（如 `*.spec.ts` 或 `*.test.ts`）；若存在，需根据逻辑变动同步更新或补充测试用例，确保测试正常通过。

### 2. 代码体量与拆分规范
- **文件行数**：单个源文件（如 `.vue`、`.ts`、`.scss` 等）的代码长度**禁止超过 600 行**。
- **重构拆分**：当代码行数接近或超过 600 行时，必须进行重构与拆分（禁止使用压缩等方式规避）。应当将逻辑和视图拆分为更小粒度的子组件或独立的函数/工具模块，并组织在清晰、合理的目录结构中（例如：为复杂组件建立专用文件夹，将拆分出的子组件和逻辑代码存放于该目录下）。

### 3. 状态管理规范
- **按职责拆分**：`noteStore` 管理便签 CRUD、筛选和排序；`categoryStore` 管理分类 CRUD、层级和顺序；`uiStore` 管理主题、偏好设置、弹窗和通知；`desktopStore` 管理仅桌面应用形态生效的设置（全局唤起快捷键、失焦自动隐藏）并同步给主进程。
- **协调层**：跨 Store 的应用协调层负责初始化、备份恢复、跨领域流程和对界面的统一暴露，不应重新实现子 Store 的领域规则。
- **单向流动**：组件内主要通过 Store actions 触发逻辑，避免直接改写不属于当前组件职责的状态。

### 4. 设置与领域规则
- **展示与领域分离**：界面配置只描述展示元数据；默认值、合法值、行为和编解码规则应由领域层统一定义。
- **单一事实源**：同一设置的界面选项、类型、初始化校验、导入导出校验和行为分发应从统一定义派生，禁止在多个模块重复硬编码。
- **持久化适配器**：设置持久化通过基础设施适配层完成；领域代码不得直接依赖 `localStorage`、uTools API 或其他外部存储实现。
- **形态专属设置**：只在某种运行形态下生效的设置，在领域层设置定义里用 `platforms` 声明适用范围，界面是否显示、导入备份时是否应用都由它派生，禁止在组件里另写 `window.utools` / `window.desktop` 判断。

### 5. 样式与动效规范
- **样式复用**：样式定义应优先使用全局已定义的 SCSS 变量与 Mixins（位于 [styles](src/styles/) 内）。
- **流畅交互**：界面需要具备流畅细腻的过渡效果（如列表重排使用 FLIP 动画、侧边栏切换淡入滑动、聚焦拉伸等），严禁出现粗糙的硬直无过渡交互。

### 6. 提示气泡 (Tooltip) 规范
- **标签限制**：所有新增功能或组件中，如果需要实现悬停文字提示，**禁止使用原生 `title` 属性**。
- **全局气泡**：必须统一使用自定义的 `data-tooltip` 属性。项目已在 [tooltip.ts](src/utils/tooltip.ts) 中集成了统一的 Tooltip，使用 `data-tooltip` 可自动激活该效果。

---

## 🔌 uTools 平台适配规范

### 1. 数据持久化
- **适配器优先**：优先使用封装好的 storage 适配器（对应 [storage.ts](src/utils/storage.ts)）。
- **环境自适应**：该适配器在 uTools 环境下使用 `dbStorage`；用户启用 uTools 数据同步后可跨设备同步，浏览器环境下退化到 `localStorage`。

### 2. 文件导出与写入
- **安全写盘**：在插件环境中，由于普通的 `<a>` 标签下载可能受沙箱限制，导出文本或备份 JSON 时必须通过 `preload` 中定义的 Node.js 读写服务进行安全写盘。

### 3. 调试与浏览器子代理
- **端口规范**：启用浏览器子代理（browser subagent）调试时，须告知其本地运行端口为 `4021`。

---

## 🖥️ Electron 桌面应用适配规范

### 1. 目录与构建
- **源码位置**：`electron/main`（主进程：窗口、托盘、IPC、全局触发器）、`electron/preload`（沙箱 preload）、`electron/shared`（两者共用的常量）。
- **构建方式**：只有 `--mode electron` 时才启用 [vitePluginElectron.ts](scripts/vitePluginElectron.ts)，其余模式的产物不受影响。打包配置在根目录的 `electron-builder.yml`。
- **领域代码共用**：触发器的类型、校验、匹配状态机位于 `src/domain/desktop`，主进程与界面共用同一份，禁止在 `electron/` 里另写一套规则。

### 2. 进程边界
- **最小接口**：渲染进程开启 `sandbox` 与 `contextIsolation`，preload 只通过 `window.desktop` 暴露 [DesktopApi.ts](src/infrastructure/desktop/DesktopApi.ts) 定义的接口；新增能力时先扩展这份类型，再分别实现 preload 与主进程的处理。
- **界面侧调用**：界面代码不直接访问 `window.desktop`，统一经 [desktopBridge.ts](src/infrastructure/desktop/desktopBridge.ts) 调用。
- **不信任输入**：主进程收到渲染进程传来的设置后必须用领域层的解析函数重新校验，不能直接使用。

### 3. 设置与数据
- **设置归属**：主进程不保存设置。桌面专属设置由 `desktopStore` 经 storage 适配器持久化，并在初始化和变更时推给主进程。
- **数据位置**：便签数据沿用 storage 适配器的 `localStorage` 分支，保存在 `%APPDATA%/moment-notes`（开发版为 `moment-notes-dev`）。
- **文件导出**：导出文本或备份时通过 `desktopBridge` 调用主进程的保存对话框与写盘，不使用 `<a>` 标签下载。

### 4. 全局触发器与窗口行为
- **两套后端**：纯键盘组合键且触发方式为"按下"时使用 Electron 的 `globalShortcut`（按键会被拦截）；涉及鼠标按键、长按或双击时使用 `uiohook-napi`（只监听不拦截，按键仍会传给当前程序）。全局钩子只在需要时启动。
- **失焦隐藏**：打开系统文件对话框等会让窗口短暂失焦的操作之前，必须先调用 `suspendAutoHideUntilFocus`，否则窗口会在对话框弹出时被自动收起。

---

## 📖 参考资料
- **uTools 官方文档**：[开发者指南](https://www.u-tools.cn/docs/developer/basic/getting-started.html)
  > [!TIP]
  > 当涉及 `uTools` 平台特有功能（如插件生命周期、API 交互、`utools.copyText` 等）的开发或调试时，请务必先查阅该官方文档，以确保实现方式符合平台规范。
