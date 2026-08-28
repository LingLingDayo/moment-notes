# 项目常用命令速查手册

本文档汇总了 **拾光便签 (moment-notes)** 项目中所有的常用命令、运行方式及其执行效果，供开发与 AI Agent 查阅参考。

---

## 📋 常用命令速查表

| 指令名称 | 运行方式 | 类别 | 运行效果与说明 |
| :--- | :--- | :--- | :--- |
| **Web 开发服务** | `npm run dev` | 开发调试 | 清理 `dist/` 中的 uTools 专用配置文件，启动 Vite 本地开发服务器（默认端口：`http://localhost:4021`）。用于纯浏览器端功能开发。 |
| **uTools 开发调试** | `npm run dev:utools` | 开发调试 | 打包 `utools/preload/services.ts` 为 CommonJS，向 `dist/plugin.json` 注入 `development.main` 开发服务器地址，并启动 Vite 开发服务。供 uTools 开发者工具载入 `dist/` 进行实时热更新调试。 |
| **Web 生产打包** | `npm run build` 或 `npm run build:web` | 生产构建 | 清理 uTools 插件产物，执行 `vue-tsc --noEmit` 进行 TypeScript 严格类型检查，并通过 Vite 构建生成纯净的 Web 生产产物（输出至 `dist/`，不包含任何插件配置与 preload 脚本）。 |
| **uTools 插件打包** | `npm run build:utools` | 生产构建 | 先执行类型检查与 Vite 前端构建，再通过 `esbuild` 编译压缩 `utools/preload/services.ts`，最后将纯净的 `plugin.json`、`logo.png` 与 `preload` 复制到 `dist/`。生成的 `dist/` 可直接作为 uTools 插件分发或打包为 `.upx`。 |
| **本地预览打包产物** | `npm run preview` | 验证预览 | 本地启动 HTTP 服务器预览 `dist/` 目录中的 Web 生产打包产物。 |
| **单元测试** | `npm run test` | 质量保障 | 启动 Vitest 测试框架，执行所有 `*.test.ts` 和 `*.spec.ts` 单元测试文件。 |
| **代码规范检查与修复** | `npm run lint` | 静态检查 | 使用 ESLint 校验 `src` 下所有 `.ts`、`.tsx`、`.vue` 文件，并自动应用可修复的规则（支持缓存加速）。 |
| **无缓存代码检查** | `npm run lint:nocache` | 静态检查 | 忽略 ESLint 缓存，全量重新检查并修复 `src` 代码。 |
| **类型检查 (单次执行)** | `npx vue-tsc --noEmit` | 静态检查 | 执行 Vue 3 + TypeScript 纯静态类型校验，不输出中间构建文件。 |
| **GitHub Pages 部署** | `npm run deploy` | 自动化部署 | 先执行 `npm run build` 打包 Web 产物，然后将 `dist/` 目录初始化为临时仓库并强制推送到当前远程仓库的 `gh-pages` 分支。 |

---

## 💡 构建产物对比指南

**Web 产物结构 (`npm run build` / `npm run build:web`)**：
```text
dist/
├── assets/          # JS、CSS 及打包后静态资源
├── index.html       # Web 应用入口 HTML
└── logo.png         # 应用图标
```

**uTools 插件产物结构 (`npm run build:utools`)**：
```text
dist/
├── assets/          # 前端 JS/CSS 资源
├── preload/         # Node.js 扩展服务（CommonJS）
│   ├── package.json # 声明 type: commonjs
│   └── services.js  # esbuild 打包后的服务脚本
├── index.html       # 插件主界面 HTML
├── logo.png         # 插件市场图标
└── plugin.json      # uTools 插件元数据配置（无 development 字段）
```
