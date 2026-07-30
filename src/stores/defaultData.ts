import { Category, Note } from '@type';

export const getDefaultCategories = (): Category[] => [
  { id: '1', name: '常用模版', createdAt: Date.now() },
  { id: '2', name: '工作备忘', createdAt: Date.now() - 1000 },
  { id: '3', name: '灵感想法', createdAt: Date.now() - 2000 }
];

export const getDefaultNotes = (): Note[] => [
  {
    id: 'n1',
    categoryId: 'uncategorized',
    title: '✨ 欢迎使用拾光便签',
    content:
      `嗨喽！这是一个基于 uTools 平台开发的便签插件。在这里你可以分类整理你的日常工作备忘、常用快捷回复和奇思妙想！！
随时记录每一个灵感瞬间，用鲜艳的色彩和流畅的体验，让随时记事变得轻松又优雅～赶快试试双击卡片，开启属于你的拾光记录吧！`,
    color: 'yellow',
    isPinned: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: ['欢迎', '指南']
  },
  {
    id: 'n2',
    categoryId: '1',
    title: '🌈 核心特色功能',
    content:
      `1. 双击快捷粘贴：双击便签卡片，将自动隐藏并把内容直接粘贴到你的光标输入位置，适合常用回复或模版。
2. 多级分类管理：支持无限层级的子分类与自由重排。分类项右侧工具栏可快速进行添加子分类、重命名与删除操作。
3. 超级面板捕获：集成 uTools 超级面板，支持划词一键捕获文本极速生成卡片。`,
    color: 'blue',
    isPinned: false,
    createdAt: Date.now() - 1000,
    updatedAt: Date.now() - 1000,
    tags: ['特色', '效率']
  },
  {
    id: 'n3',
    categoryId: '1',
    title: '🎯 快捷操作指南',
    content:
      `支持丰富的个性化与管理操作：
1. 点击右上角放大按钮可全屏预览与编辑，点击左上角大头针可置顶便签。
2. 卡片底部的工具栏可修改卡片颜色、移动分类或切换 Markdown 格式。
3. 顶部操作栏支持切换深浅主题、调整布局与排序。
4. 在「自定义排序」下支持鼠标拖拽重排卡片。`,
    color: 'green',
    isPinned: false,
    createdAt: Date.now() - 2000,
    updatedAt: Date.now() - 2000,
    tags: ['操作', '快速开始']
  },
  {
    id: 'n4',
    categoryId: '2',
    title: '⌨️ 快捷键指南',
    content:
      `1. 极速新建：【Ctrl + Alt + N】可在当前分类下快速创建空白便签。
2. 快速搜索：【Ctrl + F】可使光标自动聚焦到搜索框，输入关键字直接过滤。
3. 保存编辑：在内容编辑框内，按【Ctrl + Enter】可以直接保存内容。
4. 放弃编辑：在编辑标题或内容时，按【Esc】可以放弃修改并退出。`,
    color: 'purple',
    isPinned: false,
    createdAt: Date.now() - 3000,
    updatedAt: Date.now() - 3000,
    tags: ['快捷键', '效率']
  },
  {
    id: 'n5',
    categoryId: '3',
    title: '📝 Markdown 演示',
    type: 'markdown',
    content:
      `拾光便签支持原生的 **Markdown** 语法渲染。

### 常用语法示例：
- **列表与任务**：支持 \`- [x]\` 任务复选框
- **引用块**：
  > 支持精美的暗黑/浅色主题自适应引用样式。
- **图片大图灯箱预览**：点击下方图片即可唤起全屏大图查看器！

![拾光便签](https://fastly.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f38f.png)`,
    color: 'pink',
    isPinned: false,
    createdAt: Date.now() - 4000,
    updatedAt: Date.now() - 4000,
    tags: ['示例', 'Markdown']
  }
];
