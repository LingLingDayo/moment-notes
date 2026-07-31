import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterNotes,
  sortNotes,
  getFilteredAndSortedNotes,
  normalizeCategoryOrder
} from '../src/stores/stickyNotesAlgorithms.ts';

// 基础便签 Mock 数据
const createMockNote = (overrides = {}) => ({
  id: 'note-1',
  categoryId: 'cat-1',
  title: '测试便签',
  content: '便签内容示例',
  color: 'yellow',
  isPinned: false,
  createdAt: 1000,
  updatedAt: 1000,
  tags: ['工作', '会议'],
  useCount: 0,
  ...overrides
});

test('filterNotes - 空搜索词返回全部便签', () => {
  const notes = [createMockNote({ id: '1' }), createMockNote({ id: '2' })];
  const result = filterNotes(notes, '');
  assert.equal(result.length, 2);
});

test('filterNotes - 多关键字全目标匹配', () => {
  const notes = [
    createMockNote({ id: '1', title: 'Vue3 学习指南', content: '使用 Vite 构建', tags: ['前端'] }),
    createMockNote({ id: '2', title: 'React 进阶', content: '使用 Next.js 构建', tags: ['前端'] }),
    createMockNote({ id: '3', title: 'Python 脚本', content: '爬虫开发', tags: ['后端'] })
  ];

  // 搜索 '前端 Vue' 应该只匹配到第 1 条
  const result = filterNotes(notes, '前端 Vue', ['all']);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, '1');
});

test('filterNotes - 指定目标 (仅标题/仅标签) 过滤', () => {
  const notes = [
    createMockNote({ id: '1', title: '项目会议记录', content: '讨论需求', tags: ['重要'] }),
    createMockNote({ id: '2', title: '日记', content: '今天开了一场会议', tags: ['生活'] })
  ];

  // 仅在标题中搜索 '会议'
  const titleResult = filterNotes(notes, '会议', ['title']);
  assert.equal(titleResult.length, 1);
  assert.equal(titleResult[0].id, '1');

  // 仅在标签中搜索 '重要'
  const tagResult = filterNotes(notes, '重要', ['tag']);
  assert.equal(tagResult.length, 1);
  assert.equal(tagResult[0].id, '1');
});

test('sortNotes - 置顶便签 isPinned 始终优先置顶', () => {
  const notes = [
    createMockNote({ id: '1', isPinned: false, updatedAt: 2000 }),
    createMockNote({ id: '2', isPinned: true, updatedAt: 1000 })
  ];

  const sorted = sortNotes(notes, 'date', 'desc');
  assert.equal(sorted[0].id, '2');
});

test('sortNotes - title 拼音字典序及升降序', () => {
  const notes = [
    createMockNote({ id: '1', title: '苹果', updatedAt: 1000 }),
    createMockNote({ id: '2', title: '香蕉', updatedAt: 1000 }),
    createMockNote({ id: '3', title: '鸭梨', updatedAt: 1000 })
  ];

  const ascSorted = sortNotes(notes, 'title', 'asc');
  assert.equal(ascSorted[0].title, '苹果');
  assert.equal(ascSorted[1].title, '香蕉');
  assert.equal(ascSorted[2].title, '鸭梨');

  const descSorted = sortNotes(notes, 'title', 'desc');
  assert.equal(descSorted[0].title, '鸭梨');
});

test('sortNotes - tag 分组与多标签逻辑比较', () => {
  const notes = [
    createMockNote({ id: '1', tags: [], updatedAt: 3000 }),
    createMockNote({ id: '2', tags: ['工作', '紧急'], updatedAt: 1000 }),
    createMockNote({ id: '3', tags: ['工作'], updatedAt: 2000 })
  ];

  const sorted = sortNotes(notes, 'tag', 'asc');
  // 有标签在前，无标签在后；标签同为 '工作' 时，标签数量多的在前面 ('2' 包含 2 个标签, '3' 包含 1 个)
  assert.equal(sorted[0].id, '2');
  assert.equal(sorted[1].id, '3');
  assert.equal(sorted[2].id, '1');
});

test('sortNotes - useCount 使用次数排序', () => {
  const notes = [
    createMockNote({ id: '1', useCount: 5, updatedAt: 1000 }),
    createMockNote({ id: '2', useCount: 20, updatedAt: 2000 })
  ];

  const sorted = sortNotes(notes, 'useCount', 'desc');
  assert.equal(sorted[0].id, '2');
  assert.equal(sorted[1].id, '1');
});

test('getFilteredAndSortedNotes - recent 模式下截取最多 30 条', () => {
  const notes = [];
  for (let i = 1; i <= 50; i++) {
    notes.push(createMockNote({ id: `note-${i}`, lastUsedAt: i * 100 }));
  }

  const result = getFilteredAndSortedNotes(notes, '', ['all'], 'date', 'desc', 'recent');
  assert.equal(result.length, 30);
  assert.equal(result[0].id, 'note-50'); // 降序最大
});

test('normalizeCategoryOrder - 维护全分类与 all 顺序', () => {
  const categories = [
    { id: 'cat-1', name: '工作', createdAt: 100 },
    { id: 'cat-2', name: '生活', createdAt: 200 }
  ];

  // 测试一：如果缺少 'all'，必须自动补回且置顶
  const loadedOrder1 = ['cat-1', 'cat-2'];
  const order1 = normalizeCategoryOrder(loadedOrder1, categories);
  assert.deepEqual(order1, ['all', 'cat-1', 'cat-2']);

  // 测试二：剔除已经不存在的分类 ID，并追加新新增分类
  const loadedOrder2 = ['all', 'deleted-cat', 'cat-2'];
  const order2 = normalizeCategoryOrder(loadedOrder2, categories);
  assert.deepEqual(order2, ['all', 'cat-2', 'cat-1']);
});
