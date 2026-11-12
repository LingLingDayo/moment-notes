import type { Category } from '../../types';

export const SYSTEM_CATEGORY_IDS = ['all', 'recent', 'trash'] as const;
export type SystemCategoryId = (typeof SYSTEM_CATEGORY_IDS)[number];

/**
 * 判断指定分类 ID 是否为系统内置特殊分类（全部便签、最近使用、回收站）
 */
export function isSystemCategoryId(id: string): boolean {
  return (SYSTEM_CATEGORY_IDS as readonly string[]).includes(id);
}

/**
 * 推导新建便签时应当落入的目标分类 ID。
 * 当用户处于虚拟分类（全部便签、最近使用、回收站）时，自动归纳为未分类（uncategorized）；否则保持当前选中分类。
 */
export function resolveNoteCreationCategoryId(currentCategoryId: string): string {
  if (isSystemCategoryId(currentCategoryId)) {
    return 'uncategorized';
  }
  return currentCategoryId || 'uncategorized';
}

/**
 * 解析并校验目标分类 ID 是否在有效分类列表中；若无效则安全回退到 fallback（默认 'all'）。
 */
export function resolveValidCategoryId(
  targetId: string | null | undefined,
  categories: Category[],
  fallback = 'all'
): string {
  if (!targetId) return fallback;
  if (isSystemCategoryId(targetId)) return targetId;
  const exists = categories.some(c => c.id === targetId);
  return exists ? targetId : fallback;
}
