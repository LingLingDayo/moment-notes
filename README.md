# 📌 uTools 拾光便签 (MomentNotes)

![预览图](./docs/images/pic1.png)

> **高颜值便签，双击一键极速粘贴。**
>
> 拾光便签是一款基于 **Vue 3 + TypeScript + Pinia + Sass** 构建的高颜值、生产力工具型 uTools 便签插件。融入了现代 **Glassmorphism** 风格与 **Fluent Design** 微动效交互，支持极速双击粘贴、超级面板文本捕获、多级分类与数据云同步，助你清爽、高效地记录日常灵感与备忘。

---

## 🌈 核心特色

- 🚀 **双击粘贴**：非编辑状态下双击卡片可一键自动隐藏插件，并直接粘贴文本到光标处，效率翻倍。
- 📂 **分类管理**：支持无限层级的子分类与自由排序，配备“最近使用”高频分类与“最近删除”回收站。
- 💡 **超级面板**：完美集成 uTools 超级面板，支持划词一键捕获文本极速生成卡片。
- 🔍 **多维检索**：支持空格分隔的多关键词检索，结合内嵌式范围下拉框，支持“标题/内容/标签”精准与模糊搜索。
- 🎨 **个性化定制**：内置设置中心，支持自定义卡片外观与悬浮动效等多种偏好设置，并支持平滑置顶与亮暗主题自适应。
- 🔄 **备份与同步**：支持全局 JSON 备份（带 Schema 校验），在 uTools 环境下自动开启加密云同步。
- ⌨️ **快捷键操作**：支持自定义全局快捷键（如一键唤起、快捷新建、聚焦搜索框等）以及卡片编辑的快捷键操作。
- 🏷️ **标签交互**：支持卡片标签快速管理，点击标签可直接复制标签内容。

---

## 🔌 uTools API 适配

在 `src/utils/storage.ts` 中封装了统一的适配层：
- **数据持久化**：在 uTools 环境下自动启用 `dbStorage`（支持加密与多端同步），浏览器环境下自动退化到 `localStorage`。
- **系统主题贴合**：调用 uTools API 动态获取并监听系统主题色，实现 100% 自动适配。
- **本地写盘**：复用 Preload 底层服务进行静默安全的 JSON 导入导出。

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

### 4. 代码规范与 Git 提交规范
为了确保代码质量与风格一致，本项目集成了 Husky, ESLint 和 commitlint：
**代码格式化与校验**：在提交前，请运行以下命令修复代码中的格式或 Lint 问题：
```bash
npm run lint
```
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
│   ├── components/   # 公用 UI 组件 (如便签卡片、弹窗等)
│   ├── stores/       # Pinia 状态管理 (便签 CRUD 核心状态)
│   ├── styles/       # 全局样式、SCSS 变量与 Mixins
│   ├── types/        # TypeScript 类型定义
│   ├── utils/        # 平台适配与工具函数 (如 storage、tooltip 等)
│   ├── views/        # 主页面与配置页面视图
│   ├── App.vue       # 主入口组件
│   └── main.ts       # 入口文件
├── vite.config.ts    # Vite 构建配置
└── tsconfig.json     # TypeScript 配置
```

---

## 🤝 参与贡献

如果你发现了 Bug 或者有更好的功能建议，欢迎提交 **Issue** 或发起 **Pull Request**！
在提 PR 前，请确保：
1. 你的代码已经通过 `npm run lint` 检查且没有 TypeScript 编译报错。
2. 保持组件行数在合理范围内，若组件逻辑较复杂，建议合理拆分出子组件或 Composable 函数。

---

## 📄 开源协议

本项目采用 **MIT License** 开源协议。详情请参阅 [LICENSE](LICENSE) 文件。
