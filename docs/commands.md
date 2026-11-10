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
| **桌面应用开发调试** | `npm run dev:electron` | 开发调试 | 启动 Vite 开发服务器（端口 `4021`），用 `esbuild` 编译 `electron/main` 与 `electron/preload` 到 `dist-electron/`，并拉起 Electron 窗口加载开发服务器。界面支持热更新；主进程或 preload 源码变动后会自动重新编译并重启 Electron。开发版的数据目录是 `%APPDATA%/moment-notes-dev`，与正式版互不影响。 |
| **桌面应用构建** | `npm run build:electron` | 生产构建 | 执行类型检查后，把界面构建到 `dist-electron/renderer/`，主进程与 preload 编译为 `dist-electron/main.cjs`、`dist-electron/preload.cjs`。只生成代码产物，不打包成可执行文件。 |
| **桌面应用打包（免安装目录）** | `npm run pack:electron` | 生产构建 | 先执行 `build:electron`，再用 `electron-builder` 生成未压缩的应用目录 `release/win-unpacked/`，可直接运行其中的 `拾光便签.exe`。比完整打包快，适合验证打包配置。 |
| **桌面应用打包（安装包）** | `npm run dist:electron` | 生产构建 | 先执行 `build:electron`，再生成 Windows 安装包 `release/moment-notes-<版本>-setup.exe` 和便携版 `release/moment-notes-<版本>-portable.exe`。打包配置见根目录的 `electron-builder.yml`。 |
| **本地预览打包产物** | `npm run preview` | 验证预览 | 本地启动 HTTP 服务器预览 `dist/` 目录中的 Web 生产打包产物。 |
| **单元测试** | `npm run test` | 质量保障 | 启动 Vitest 测试框架，执行所有 `*.test.ts` 和 `*.spec.ts` 单元测试文件。 |
| **代码规范检查与修复** | `npm run lint` | 静态检查 | 使用 ESLint 校验 `src` 和 `electron` 下所有 `.ts`、`.tsx`、`.vue` 文件，并自动应用可修复的规则（支持缓存加速）。 |
| **无缓存代码检查** | `npm run lint:nocache` | 静态检查 | 忽略 ESLint 缓存，全量重新检查并修复 `src` 和 `electron` 代码。 |
| **类型检查 (单次执行)** | `npm run typecheck` 或 `npx vue-tsc --noEmit` | 静态检查 | 执行 Vue 3 + TypeScript 纯静态类型校验（覆盖 `src`、`utools`、`electron`），不输出中间构建文件。 |
| **构建脚本类型检查** | `npx tsc -p tsconfig.node.json --noEmit` | 静态检查 | 校验 `vite.config.ts` 与 `scripts/` 下的构建脚本（如 `scripts/vitePluginElectron.ts`），这部分不在 `vue-tsc` 的检查范围内。 |
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

**桌面应用产物结构 (`npm run build:electron`)**：
```text
dist-electron/
├── renderer/        # 界面（与 Web 产物相同的结构：index.html、assets/、logo.png）
├── main.cjs         # Electron 主进程（esbuild 打成单文件）
└── preload.cjs      # 沙箱 preload（CommonJS）
```

**桌面应用安装包 (`npm run dist:electron`)**：
```text
release/
├── moment-notes-<版本>-setup.exe     # NSIS 安装包
├── moment-notes-<版本>-portable.exe  # 便携版，单文件直接运行
└── win-unpacked/                     # 未压缩的应用目录
```

---

## 🖥️ 桌面应用打包注意事项

- **下载镜像**：首次安装依赖和首次打包需要下载 Electron 本体及 NSIS 等打包工具。网络不通时可设置环境变量：
  - `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`
  - `ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/`
- **原生模块**：全局输入监听使用 `uiohook-napi`，它自带各平台的预编译二进制，打包时不需要也不会重新编译（`npmRebuild: false`），并被解包到 `app.asar.unpacked`。
- **平台范围**：目前只配置并验证了 Windows x64。
- **未签名**：安装包没有代码签名，在其他电脑上首次运行时 Windows SmartScreen 可能会拦截提示。
- **`EBUSY: resource busy or locked ... app.asar`**：重复打包时如果出现这个错误，说明 `release/win-unpacked/resources/app.asar` 正被其他进程占用。常见原因是打包出来的应用还在运行（包括驻留在托盘里），或者某个把项目目录当作工作区打开的 Electron 类工具占用了该文件。处理办法：
  - 退出占用它的程序后重试；或者
  - 临时把输出目录指到别处：`npm run build:electron && npx electron-builder --win -c.directories.output=<其他目录>`。
