import type { Note, Category } from '../types/index';

export type SearchTarget = 'all' | 'title' | 'content' | 'tag';
export type SortMode = 'date' | 'title' | 'tag' | 'custom' | 'useCount';
export type SortOrder = 'asc' | 'desc';

/**
 * 依据搜索词与目标范围过滤便签列表
 */
export function filterNotes(
  notes: Note[],
  searchQuery: string,
  searchTarget: SearchTarget[] = ['all']
): Note[] {
  const q = searchQuery.trim().toLowerCase();
  if (!q) {
    return notes;
  }

  const keywords = q.split(/\s+/).filter(k => k.length > 0);
  if (keywords.length === 0) {
    return notes;
  }

  return notes.filter(n => {
    return keywords.every(kw => {
      const term = kw.toLowerCase();
      const noteTitle = (n.title || '').toLowerCase();
      const noteContent = (n.content || '').toLowerCase();

      const titleMatch = noteTitle.includes(term);
      const contentMatch = noteContent.includes(term);
      const tagsMatch = Array.isArray(n.tags)
        ? n.tags.some(tag => typeof tag === 'string' && tag.toLowerCase().includes(term))
        : false;

      if (searchTarget.includes('all')) {
        return titleMatch || contentMatch || tagsMatch;
      }

      let match = false;
      if (searchTarget.includes('title') && titleMatch) match = true;
      if (searchTarget.includes('content') && contentMatch) match = true;
      if (searchTarget.includes('tag') && tagsMatch) match = true;
      return match;
    });
  });
}

/**
 * 根据多维排序模式与顺序对便签列表进行排序
 */
export function sortNotes(
  notes: Note[],
  sortMode: SortMode = 'date',
  sortOrder: SortOrder = 'desc',
  currentCategoryId = 'all'
): Note[] {
  if (notes.length <= 1) {
    return [...notes];
  }

  // 1. 预计算 custom 索引 Map，避免在 sort 回调中频繁执行 findIndex (查找复杂度从 O(N) 降至 O(1))
  const indexMap = sortMode === 'custom'
    ? new Map(notes.map((n, i) => [n.id, i]))
    : null;

  // 2. 预计算 tag 字典序 Map，避免在 sort 回调中频繁做深浅拷贝与中文拼音字典排序
  const sortedTagsMap = sortMode === 'tag'
    ? new Map(
        notes.map(n => [
          n.id,
          Array.isArray(n.tags) && n.tags.length > 0
            ? [...n.tags].sort((t1, t2) => t1.localeCompare(t2, 'zh'))
            : []
        ])
      )
    : null;

  return [...notes].sort((a, b) => {
    // 置顶(isPinned)始终排在最前面
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // 最近使用分类特殊按 lastUsedAt 降序
    if (currentCategoryId === 'recent') {
      const timeA = a.lastUsedAt || 0;
      const timeB = b.lastUsedAt || 0;
      return timeB - timeA;
    }

    if (sortMode === 'title') {
      const titleA = a.title || '';
      const titleB = b.title || '';
      if (!titleA && titleB) return 1;
      if (titleA && !titleB) return -1;
      if (!titleA && !titleB) {
        return sortOrder === 'asc'
          ? (a.updatedAt || 0) - (b.updatedAt || 0)
          : (b.updatedAt || 0) - (a.updatedAt || 0);
      }

      const cmp = titleA.localeCompare(titleB, 'zh');
      if (cmp !== 0) {
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      return sortOrder === 'asc'
        ? (a.updatedAt || 0) - (b.updatedAt || 0)
        : (b.updatedAt || 0) - (a.updatedAt || 0);
    } else if (sortMode === 'tag') {
      const tagsA = sortedTagsMap?.get(a.id) || [];
      const tagsB = sortedTagsMap?.get(b.id) || [];

      // 无标签垫底
      if (tagsA.length === 0 && tagsB.length > 0) return 1;
      if (tagsA.length > 0 && tagsB.length === 0) return -1;
      if (tagsA.length === 0 && tagsB.length === 0) {
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      }

      // 比较代表/主要标签 (拼音字典序，归聚相同标签的分组)
      const repTagA = tagsA[0];
      const repTagB = tagsB[0];
      const repCmp = repTagA.localeCompare(repTagB, 'zh');
      if (repCmp !== 0) {
        return sortOrder === 'asc' ? repCmp : -repCmp;
      }

      // 同大组内，标签数量更多的便签优先排在前面
      if (tagsA.length !== tagsB.length) {
        return tagsB.length - tagsA.length;
      }

      // 标签数量相同时，逐项比较剩余标签字典序
      for (let i = 1; i < tagsA.length; i++) {
        const itemCmp = tagsA[i].localeCompare(tagsB[i], 'zh');
        if (itemCmp !== 0) {
          return sortOrder === 'asc' ? itemCmp : -itemCmp;
        }
      }

      // 标签完全相同时，对比更新时间
      return sortOrder === 'asc'
        ? (a.updatedAt || 0) - (b.updatedAt || 0)
        : (b.updatedAt || 0) - (a.updatedAt || 0);
    } else if (sortMode === 'useCount') {
      const countA = a.useCount || 0;
      const countB = b.useCount || 0;
      if (countA !== countB) {
        return sortOrder === 'asc' ? countA - countB : countB - countA;
      }
      return sortOrder === 'asc'
        ? (a.updatedAt || 0) - (b.updatedAt || 0)
        : (b.updatedAt || 0) - (a.updatedAt || 0);
    } else if (sortMode === 'custom') {
      if (currentCategoryId !== 'all' && currentCategoryId !== 'trash') {
        const isOwnA = a.categoryId === currentCategoryId;
        const isOwnB = b.categoryId === currentCategoryId;
        if (isOwnA && !isOwnB) return -1;
        if (!isOwnA && isOwnB) return 1;
      }
      const indexA = indexMap?.get(a.id) ?? 0;
      const indexB = indexMap?.get(b.id) ?? 0;
      return indexA - indexB;
    } else {
      return sortOrder === 'desc'
        ? (b.updatedAt || 0) - (a.updatedAt || 0)
        : (a.updatedAt || 0) - (b.updatedAt || 0);
    }
  });
}

/**
 * 聚合检索与排序算法，并应用 recent 分类截断策略
 */
export function getFilteredAndSortedNotes(
  notes: Note[],
  searchQuery: string,
  searchTarget: SearchTarget[] = ['all'],
  sortMode: SortMode = 'date',
  sortOrder: SortOrder = 'desc',
  currentCategoryId = 'all'
): Note[] {
  const filtered = filterNotes(notes, searchQuery, searchTarget);
  const sorted = sortNotes(filtered, sortMode, sortOrder, currentCategoryId);

  if (currentCategoryId === 'recent') {
    return sorted.slice(0, 30);
  }
  return sorted;
}

/**
 * 规范化与修正分类排序 ID 数组
 */
export function normalizeCategoryOrder(
  loadedOrder: string[],
  categories: Category[]
): string[] {
  const currentIds = new Set(categories.map(c => c.id));
  currentIds.add('all');

  const finalOrder = loadedOrder.filter(id => currentIds.has(id));
  categories.forEach(c => {
    if (!finalOrder.includes(c.id)) {
      finalOrder.push(c.id);
    }
  });
  if (!finalOrder.includes('all')) {
    finalOrder.unshift('all');
  }

  return finalOrder;
}
