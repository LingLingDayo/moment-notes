# Domain 领域层规范

本目录承载与 UI 框架（Vue / Pinia）及宿主运行环境无关的**业务规则、纯算法、编解码协议与配置注册表**。

## 目录职责
- `settings/`：设置编解码器工厂（`SettingDefinition.ts`）与全局设置注册表（`AppSettingRegistry.ts`）。
- `notes/`、`pipeline/`、`search/`：便签分类初筛、关键词索引检索、多维排序纯函数与过滤管道。
- `category/`：系统内置分类（`all` / `recent` / `trash`）判定、新建便签目标分类推导与分类有效性回退。
- `assets/`：`asset://` 协议编解码、Markdown 资产 ID 提取与孤儿附件清理领域服务。
- `desktop/`、`shortcuts/`、`noteInteractions/`、`commands/`、`events/`：桌面触发器状态机、快捷键管线、双击动作注册表、全局命令注册表与领域事件总线。

## 核心约束
1. **严禁反向依赖**：禁止导入 `src/stores/**` 或 `src/modules/**`（已配置 ESLint 强拦截），禁止依赖 Vue 响应式 API。跨层共享类型定义在 `src/types/` 或本层内。
2. **设置单一事实源**：新增或修改偏好设置时，必须在 `settings/AppSettingRegistry.ts` 中声明 `key`、`storageKey`、`defaultValue`、`codec` 及可选 `platforms`，并加入 `APP_SETTING_DEFINITIONS`。
3. **环境无关与幂等**：不得直接调用 `localStorage`、`window.utools` 或 DOM API（外部 I/O 通过 `infrastructure` 仓储接口注入）；模块级单例（如 `CommandRegistry`）需支持幂等注册，避免单测重建实例时产生告警。
4. **拒绝死抽象**：所有领域规则与管道阶段必须真实接入生产链路，并配套同目录下的 `*.test.ts` 单元测试。
