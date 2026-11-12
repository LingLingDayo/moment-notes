# Infrastructure 基础设施与适配层规范

本目录负责隔离 `utools`、`electron`、`browser` 三种运行形态及底层浏览器/系统 API，向上层提供统一的仓储与宿主桥接接口。

## 目录职责
- `platform/`：运行形态识别（`platform.ts`）与剪贴板复制、外部链接打开等跨宿主桥接（`hostBridge.ts`）。
- `storage/`：设置持久化仓储（`SettingRepository.ts`）、便签与分类仓储（`Repository.ts`）及图片二进制附件仓储（`AssetRepository.ts`）。
- `assets/`：依赖浏览器 Canvas、WebCrypto、Fetch 的图片智能压缩、SHA-256 哈希与 Base64 转换（`imageProcessor.ts`）。
- `desktop/`、`windows/`：Electron 渲染进程 IPC 桥接（`desktopBridge.ts`）与独立便签窗口管理（`detachedNoteWindow.ts`）。

## 核心约束
1. **单一宿主入口**：所有涉及 `window.utools`、`window.desktop`、`navigator.clipboard`、`localStorage` 的宿主与环境差异，必须收口在本层（或 `src/utils/storage.ts`）统一封装，严禁让 `modules` 或 `domain` 直接访问宿主全局对象。
2. **无 DOM 单测兼容**：访问 `window`、`document`、`navigator`、`localStorage`、`crypto` 等全局对象前必须做 `typeof xxx !== 'undefined'` 判空与降级兜底（如 Node 单测环境下的内存存储或原数据回退），确保单元测试在无浏览器环境下安全运行。
3. **可注入设计**：仓储类应支持注入自定义 Adapter，便于单元测试脱离真实存储介质独立验证。
