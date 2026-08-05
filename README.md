# 📌 uTools 拾光便签 (MomentNotes)

![预览图](./docs/images/pic1.png)

> **高颜值便签，可配置双击动作。**
>
> 拾光便签是一款基于 **Vue 3 + TypeScript + Pinia + Sass** 构建的高颜值、生产力工具型 uTools 便签插件。融入了现代 **Glassmorphism** 风格与 **Fluent Design** 微动效交互，支持可配置双击动作、超级面板文本捕获、多级分类与数据云同步，助你清爽、高效地记录日常灵感与备忘。

---

## 🌈 核心特色

- 🚀 **双击动作**：非编辑状态下双击卡片可执行“复制并粘贴到光标处”“全屏查看”“移入最近删除”或“不执行任何操作”，默认使用复制粘贴。
- 📂 **分类管理**：支持无限层级的子分类与自由排序，配备“最近使用”高频分类与“最近删除”回收站。
- 🔍 **多维检索**：支持空格分隔的多关键词检索，结合内嵌式范围下拉框，支持“标题/内容/标签”精准与模糊搜索。
- 📝 **Markdown**：支持纯文本与 Markdown 格式自由切换，内置图片查看器支持图片全屏缩放、平移与旋转预览。
- 🎨 **个性化定制**：内置设置中心，支持自定义卡片外观、页面布局与默认格式等多种偏好设置，并支持平滑置顶与亮暗主题自适应。
- 💡 **超级面板**：完美集成 uTools 超级面板，支持划词一键捕获文本极速生成卡片。
- ⌨️ **快捷键操作**：支持自定义全局快捷键（如一键唤起、快捷新建、聚焦搜索框等）以及卡片编辑的快捷键操作。
- 🔄 **备份与同步**：支持全局 JSON 备份、选择性导入导出和基本结构校验，在 uTools 环境下使用平台存储能力同步数据。
- 🏷️ **标签交互**：支持卡片标签快速管理，点击标签可直接复制标签内容。

---

## 🔌 uTools API 适配

在 `src/utils/storage.ts` 中封装了统一的适配层：
- **数据持久化**：在 uTools 环境下使用 `dbStorage`；用户启用 uTools 数据同步后可跨设备同步，浏览器环境下自动退化到 `localStorage`。
- **系统主题贴合**：进入 uTools 插件时调用 API 读取系统主题并应用，浏览器环境下跟随系统偏好。
- **本地写盘**：复用 Preload 底层服务进行静默安全的 JSON 导入导出。

---

## 🧭 架构概览

项目采用“功能模块 + Pinia Store + 领域规则 + 基础设施适配”的分层方式：

- **界面模块**：`src/modules/` 按 ActionBar、CategorySidebar、NoteCard、SettingsModal 和 DataModal 拆分功能界面。
- **共享组件**：`src/components/` 放置跨模块复用的弹窗、Toast、Popover 和预览组件。
- **状态层**：`noteStore`、`categoryStore` 和 `uiStore` 分别管理便签、分类和界面偏好；`stickyNotes` 负责跨 Store 初始化、备份恢复和统一 facade 暴露。
- **领域层**：`src/domain/` 提供命令、事件总线、快捷键、过滤流水线、设置定义和双击动作注册表等与 UI 解耦的规则。
- **基础设施层**：`src/infrastructure/storage/` 提供分类、便签、备份和设置仓储；`src/utils/storage.ts` 负责 uTools 与浏览器存储环境适配。
- **设置扩展**：设置界面元数据位于 `src/modules/SettingsModal/settingsConfig.ts`；默认值、合法值、Codec 和持久化由 `SettingDefinition`、`SettingRepository` 与领域注册表提供。

新增双击动作时，应优先修改 `src/domain/noteInteractions/DoubleClickNoteActionRegistry.ts` 并补充测试，避免在组件、启动加载和备份恢复流程中重复维护动作值。

---

## 🛠️ 本地开发与调试

### 1. 安装依赖
```bash
npm install
```

### 2. 启动开发服务器
```bash
npm run dev
```
启动后，本地预览地址为：`http://localhost:4021/`。

### 3. 在 uTools 中调试
1. 呼出 `uTools`，搜索并进入 **开发者工具**。
2. 点击 **新建项目**，选择项目根目录下的 `public/plugin.json`。
3. 确保本地 `npm run dev` 正常运行，在开发者工具中点击 **运行** 即可进行沙箱调试。

使用浏览器进行功能验证时，默认访问 `http://localhost:4021/`；测试结束后请关闭浏览器并清理临时快照。

### 4. 代码规范、测试与 Git 提交规范
为了确保代码质量与风格一致，本项目集成了 Husky, ESLint 和 commitlint：
**代码格式化与校验**：在提交前，请运行以下命令：
```bash
npm run lint:nocache
npx vue-tsc --noEmit
npm test
```
`npm run lint` 和 `npm run lint:nocache` 会自动修复 ESLint 格式问题；类型检查使用 `vue-tsc`，测试使用 Vitest。
**Git 提交信息**：提交信息须遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范，格式为 `<type>(<scope>): <subject>`，例如：
- `feat: 新增便签多色主题选择`
- `fix: 修复置顶便签重排时的动画卡顿问题`

---

## 📦 打包与发布

1. **打包项目**：
```bash
npm run build
```
打包完成后，会在根目录下生成 `dist/` 目录。

2. **打包 UPX**：
在 `uTools 开发者工具` 项目面板中点击 **打包项目**，选择生成的 `dist/` 目录和 `public/` 下的图标，生成 `.upx` 格式的插件包，上传至 uTools 开放平台审核即可。

---

## 📂 项目结构

```text
moment-notes/
├── .github/          # GitHub 工作流配置
├── .utools/          # uTools 开发者配置
├── docs/             # 项目文档及预览图
├── public/           # 静态资源及 uTools 插件配置文件 (plugin.json)
├── src/
│   ├── components/   # 跨模块复用的 UI 组件
│   ├── domain/       # 领域规则：命令、事件、快捷键、流水线、注册表
│   ├── infrastructure/  # 基础设施：存储仓储与备份 Codec
│   ├── modules/      # 按功能拆分的界面模块
│   ├── stores/       # Pinia Store 与跨 Store 协调 facade
│   ├── styles/       # 全局样式、SCSS 变量与 Mixins
│   ├── types/        # TypeScript 类型定义
│   ├── utils/        # 平台适配与通用工具 (storage、tooltip 等)
│   ├── views/        # 页面级视图 (Dashboard)
│   ├── App.vue       # 应用入口与 uTools 生命周期接入
│   └── main.ts       # Vue、Pinia 和全局 Tooltip 初始化
├── vite.config.ts    # Vite 构建配置
└── tsconfig.json     # TypeScript 配置
```

---

## 🤝 参与贡献

如果你发现了 Bug 或者有更好的功能建议，欢迎提交 **Issue** 或发起 **Pull Request**！
在提 PR 前，请确保：
1. 你的代码已经通过 `npm run lint:nocache`、`npx vue-tsc --noEmit` 和 `npm test`。
2. 保持组件行数在合理范围内，若组件逻辑较复杂，建议合理拆分出子组件或 Composable 函数。

---

## 📄 开源协议

本项目采用 **MIT License** 开源协议。详情请参阅 [LICENSE](LICENSE) 文件。
