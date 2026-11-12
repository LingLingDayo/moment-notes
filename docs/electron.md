# Electron 桌面应用适配规范

本文档定义了 **拾光便签 (moment-notes)** 在 Electron 独立桌面应用形态下的架构边界、进程通信、数据持久化及全局触发器规范，供开发与 AI Agent 在涉及桌面端功能时查阅遵循。

---

## 1. 目录与构建
- **源码位置**：`electron/main`（主进程：窗口、托盘、IPC、全局触发器）、`electron/preload`（沙箱 preload）、`electron/shared`（两者共用的常量）。
- **构建方式**：只有 `--mode electron` 时才启用 [vitePluginElectron.ts](../scripts/vitePluginElectron.ts)，其余模式的产物不受影响。打包配置在根目录的 [electron-builder.yml](../electron-builder.yml)。
- **领域代码共用**：触发器的类型、校验、匹配状态机位于 `src/domain/desktop`，主进程与界面共用同一份，禁止在 `electron/` 里另写一套规则。

---

## 2. 进程边界
- **最小接口**：渲染进程开启 `sandbox` 与 `contextIsolation`，preload 只通过 `window.desktop` 暴露 [DesktopApi.ts](../src/infrastructure/desktop/DesktopApi.ts) 定义的接口；新增能力时先扩展这份类型，再分别实现 preload 与主进程的处理。
- **界面侧调用**：界面代码不直接访问 `window.desktop`，统一经 [desktopBridge.ts](../src/infrastructure/desktop/desktopBridge.ts) 调用。
- **不信任输入**：主进程收到渲染进程传来的设置后必须用领域层的解析函数重新校验，不能直接使用。

---

## 3. 设置与数据
- **设置归属**：主进程不保存设置。桌面专属设置由 `desktopStore` 经 `settingRepository`（底层走 `storage` 适配器）持久化，并在初始化和变更时推给主进程。
- **数据位置**：便签数据沿用 `storage` 适配器的 `localStorage` 分支，保存在 `%APPDATA%/moment-notes`（开发版为 `moment-notes-dev`）。
- **文件导出**：导出文本或备份时通过 `desktopBridge` 调用主进程的保存对话框与写盘，不使用 `<a>` 标签下载。

---

## 4. 全局触发器与窗口行为
- **两套后端**：纯键盘组合键且触发方式为"按下"时使用 Electron 的 `globalShortcut`（按键会被拦截）；涉及鼠标按键、长按或双击时使用 `uiohook-napi`（只监听不拦截，按键仍会传给当前程序）。全局钩子只在需要时启动。
- **失焦隐藏**：打开系统文件对话框等会让窗口短暂失焦的操作之前，必须先调用 `suspendAutoHideUntilFocus`，否则窗口会在对话框弹出时被自动收起。
