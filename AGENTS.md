# AGENTS.md (项目指导规范)

## 📌 项目简介
基于 **Vue 3 + TypeScript + Vite + Pinia** 构建的 **uTools 便签插件** 与 **Electron 独立桌面应用**（共用同一套源码）。
- **设计风格**：现代 Glassmorphism 视觉、Fluent Design 微动效，支持暗黑/浅色模式自适应。
- **架构分层**：[`modules`](src/modules/README.md)（功能视图）、[`stores`](src/stores/README.md)（状态管理）、[`domain`](src/domain/README.md)（领域规则与纯算法）、[`infrastructure`](src/infrastructure/README.md)（存储与宿主适配）、[`electron`](docs/electron.md)（桌面端主进程与 preload）。
- **运行形态**：`utools`、`electron`、`browser` 三种，统一通过平台适配层识别。

---

## 🛠️ 开发与架构约束

> [!TIP]
> - **分层模块规范**：修改具体分层代码前，请先按需阅读对应目录下的 `README.md`（[domain](src/domain/README.md) / [infrastructure](src/infrastructure/README.md) / [stores](src/stores/README.md) / [modules](src/modules/README.md)）。
> - **常用命令**：执行构建、测试、校验或调试前，请查阅 [常用命令速查手册](docs/commands.md)。
> - **桌面端规范**：涉及 Electron 主进程、preload、IPC、全局触发器或打包配置时，请查阅 [Electron 桌面应用适配规范](docs/electron.md)。
> - **uTools 文档**：涉及 uTools 平台特性与 API 时，请参考 [uTools 开发者指南](https://www.u-tools.cn/docs/developer/basic/getting-started.html)。

### 1. 质量校验与测试规范
- **静态检查**：修改代码后**必须**运行 `eslint` 和 `tsc` 校验并清零所有错误，严禁仅凭 IDE 提示宣布完成。
- **测试同步**：修改或重构逻辑时**必须**同步更新或补充单测，确保测试通过且无控制台告警噪音。
- **单测环境兼容**：Store 与领域模块需兼容无 DOM 的 Node 单测环境（访问浏览器 API 前需判空）；向全局单例注册命令或事件时须保持幂等，避免测试重建实例时产生重复注册告警。

### 2. 代码体量与拆分规范
- **行数红线**：单个源文件（`.vue`、`.ts`、`.scss` 等）**严禁超过 600 行**（接近 450 行时应主动拆分，禁止靠压缩代码规避）。
- **模块化拆分**：包含多个独立交互区（如多个 Popover 浮层、子面板）或复杂逻辑时，应拆分为同目录下的独立子组件或 Composable/工具模块。

### 3. 架构分层与单向依赖
- **单向依赖**：严格遵循 `modules / views / components` → `stores` → `domain` ↔ `infrastructure` → `types`。`domain` 层**严禁**反向导入 `stores` 或 `modules`，跨层共享类型统一定义在 `types` 或 `domain` 内。
- **领域规则收口**：分类判定、筛选排序算法、资产协议编解码等可复用规则统一收口在 `domain` 层；禁止在组件或 Store 中散落重复条件判断，禁止保留未接入生产链路的死抽象。

### 4. 状态管理规范
- **职责边界**：`noteStore`（便签 CRUD 与筛选排序）、`categoryStore`（分类管理）、`uiStore`（主题、偏好、弹窗与通知）、`desktopStore`（桌面专属设置同步）。
- **按需直连**：组件应优先按职责直接调用对应子 Store，通过 actions 单向修改状态。
- **精简协调层**：跨 Store 协调层仅负责初始化、备份恢复与跨领域流程，不得重写子 Store 规则，也不要无节制追加纯透传字段。

### 5. 设置与单一事实源
- **注册表驱动**：所有偏好设置的默认值、编解码校验（Codec）及适用平台（`platforms`）统一在领域层设置注册表中声明，并经设置仓储持久化。
- **禁止散落维护**：界面配置、Store 读写、备份导入导出均应从设置注册表派生或遍历驱动，**严禁**在多处硬编码存储 Key 或堆砌逐项 `if-else` 分发，**严禁**在组件内手写平台判断控制设置显隐。

### 6. 宿主桥接与平台适配
- **隔离宿主 API**：平台识别、键值存储、剪贴板复制、外部链接打开、光标粘贴、文件导出写盘等能力，**必须**统一通过 `infrastructure` / `utils` 封装的桥接函数与 `storage` 适配器调用。
- **禁止直连**：视图组件与领域代码**严禁**直接访问 `window.utools`、`window.desktop`、`navigator.clipboard`、原生 `localStorage`，或使用受沙箱限制的 `<a>` 标签触发文件下载。
- **调试端口**：启用浏览器子代理（browser subagent）调试时，须告知其本地运行端口为 `4021`。

### 7. 样式、动效与提示气泡
- **样式与动效**：优先复用 [styles](src/styles/) 下的全局 SCSS 变量与 Mixins；交互需保持流畅过渡（如 FLIP 列表动画、淡入滑动），避免生硬切换。
- **全局 Tooltip**：悬停文字提示**严禁使用原生 `title` 属性**，必须统一使用自定义的 `data-tooltip` 属性。
