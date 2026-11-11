import type { Note, Category, SearchTarget, SortMode, SortOrder } from '../../types';
import {
  defaultSearchIndex,
  buildCategoryPathMapLower
} from '../search/NoteSearchIndex';

export type { SearchTarget, SortMode, SortOrder };

/** 中文拼音字典排序比较器单例，避免比较循环中数万次重复初始化 locale */
const ZH_COLLATOR = new Intl.Collator('zh');

/**
 * 构建分类 ID 到完整层级路径 (例如: "父分类 / 子分类") 的映射 Map
 */
export function getCategoryPathMap(categories: Category[]): Map<string, string> {
  const pathMap = new Map<string, string>();
  if (!categories || categories.length === 0) {
    return pathMap;
  }

  const catMap = new Map(categories.map(c => [c.id, c]));
  categories.forEach(c => {
    const path: string[] = [];
    let cur: Category | undefined = c;
    while (cur) {
      path.unshift(cur.name);
      cur = cur.parentId ? catMap.get(cur.parentId) : undefined;
    }
    pathMap.set(c.id, path.join(' / '));
  });

  return pathMap;
}

/**
 * 依据分类 ID（含回收站、最近使用、特定分类及其子分类）过滤便签列表
 */
export function filterNotesByCategory(
  notes: Note[],
  categoryId: string,
  descendantCategoryIds?: Set<string>
): Note[] {
  if (categoryId === 'trash') {
    return notes.filter(n => n.isDeleted === true);
  }
  if (categoryId === 'recent') {
    return notes.filter(n => n.isDeleted !== true && n.lastUsedAt !== undefined);
  }
  const activeNotes = notes.filter(n => n.isDeleted !== true);
  if (categoryId === 'all') {
    return activeNotes;
  }
  return activeNotes.filter(
    n => n.categoryId === categoryId || (descendantCategoryIds && descendantCategoryIds.has(n.categoryId))
  );
}

/**
 * 依据搜索词与目标范围过滤便签列表
 */
export function filterNotes(
  notes: Note[],
  searchQuery: string,
  searchTarget: SearchTarget[] = ['all'],
  categories: Category[] = []
): Note[] {
  const pathMap = categories.length > 0 ? buildCategoryPathMapLower(categories) : undefined;
  return defaultSearchIndex.filterNotes(notes, searchQuery, searchTarget, pathMap);
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

  // 1. 预提取排序比对所需字段为不可变原始结构，避免在 sort 回调中频繁穿透 Vue Proxy 触发 get trap
  const items = notes.map((n, i) => {
    let sortedTags: string[] = [];
    if (sortMode === 'tag' && Array.isArray(n.tags) && n.tags.length > 0) {
      sortedTags = [...n.tags].sort((t1, t2) => ZH_COLLATOR.compare(t1, t2));
    }
    return {
      note: n,
      isPinned: Boolean(n.isPinned),
      lastUsedAt: n.lastUsedAt || 0,
      updatedAt: n.updatedAt || 0,
      title: n.title || '',
      tags: sortedTags,
      useCount: n.useCount || 0,
      categoryId: n.categoryId,
      index: i
    };
  });

  items.sort((a, b) => {
    // 置顶(isPinned)始终排在最前面
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // 最近使用分类特殊按 lastUsedAt 降序
    if (currentCategoryId === 'recent') {
      return b.lastUsedAt - a.lastUsedAt;
    }

    if (sortMode === 'title') {
      const titleA = a.title;
      const titleB = b.title;
      if (!titleA && titleB) return 1;
      if (titleA && !titleB) return -1;
      if (!titleA && !titleB) {
        return sortOrder === 'asc' ? a.updatedAt - b.updatedAt : b.updatedAt - a.updatedAt;
      }

      const cmp = ZH_COLLATOR.compare(titleA, titleB);
      if (cmp !== 0) {
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      return sortOrder === 'asc' ? a.updatedAt - b.updatedAt : b.updatedAt - a.updatedAt;
    } else if (sortMode === 'tag') {
      const tagsA = a.tags;
      const tagsB = b.tags;

      // 无标签垫底
      if (tagsA.length === 0 && tagsB.length > 0) return 1;
      if (tagsA.length > 0 && tagsB.length === 0) return -1;
      if (tagsA.length === 0 && tagsB.length === 0) {
        return b.updatedAt - a.updatedAt;
      }

      // 比较代表/主要标签 (拼音字典序，归聚相同标签的分组)
      const repCmp = ZH_COLLATOR.compare(tagsA[0], tagsB[0]);
      if (repCmp !== 0) {
        return sortOrder === 'asc' ? repCmp : -repCmp;
      }

      // 同大组内，标签数量更多的便签优先排在前面
      if (tagsA.length !== tagsB.length) {
        return tagsB.length - tagsA.length;
      }

      // 标签数量相同时，逐项比较剩余标签字典序
      for (let i = 1; i < tagsA.length; i++) {
        const itemCmp = ZH_COLLATOR.compare(tagsA[i], tagsB[i]);
        if (itemCmp !== 0) {
          return sortOrder === 'asc' ? itemCmp : -itemCmp;
        }
      }

      // 标签完全相同时，对比更新时间
      return sortOrder === 'asc' ? a.updatedAt - b.updatedAt : b.updatedAt - a.updatedAt;
    } else if (sortMode === 'useCount') {
      if (a.useCount !== b.useCount) {
        return sortOrder === 'asc' ? a.useCount - b.useCount : b.useCount - a.useCount;
      }
      return sortOrder === 'asc' ? a.updatedAt - b.updatedAt : b.updatedAt - a.updatedAt;
    } else if (sortMode === 'custom') {
      if (currentCategoryId !== 'all' && currentCategoryId !== 'trash') {
        const isOwnA = a.categoryId === currentCategoryId;
        const isOwnB = b.categoryId === currentCategoryId;
        if (isOwnA && !isOwnB) return -1;
        if (!isOwnA && isOwnB) return 1;
      }
      return a.index - b.index;
    } else {
      return sortOrder === 'desc'
        ? b.updatedAt - a.updatedAt
        : a.updatedAt - b.updatedAt;
    }
  });

  return items.map(item => item.note);
}

/**
 * 聚合分类初筛、检索过滤与多维排序算法，并应用 recent 分类截断策略
 */
export function getFilteredAndSortedNotes(
  notes: Note[],
  searchQuery: string,
  searchTarget: SearchTarget[] = ['all'],
  sortMode: SortMode = 'date',
  sortOrder: SortOrder = 'desc',
  currentCategoryId = 'all',
  categories: Category[] = [],
  descendantCategoryIds?: Set<string>
): Note[] {
  const byCategory = filterNotesByCategory(notes, currentCategoryId, descendantCategoryIds);
  const filtered = filterNotes(byCategory, searchQuery, searchTarget, categories);
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

/**
 * 调整标签列表中指定标签的顺序（从 fromTag 移动到 toTag 所在位置）
 */
export function reorderTagList(tags: string[], fromTag: string, toTag: string): string[] {
  if (!Array.isArray(tags) || tags.length <= 1 || fromTag === toTag) {
    return [...(tags || [])];
  }
  const fromIndex = tags.indexOf(fromTag);
  const toIndex = tags.indexOf(toTag);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return [...tags];
  }
  const next = [...tags];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}
