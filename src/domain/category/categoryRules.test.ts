import { describe, it, expect } from 'vitest';
import {
  isSystemCategoryId,
  resolveNoteCreationCategoryId,
  resolveValidCategoryId
} from './categoryRules';
import type { Category } from '../../types';

describe('categoryRules 领域层分类规则单测', () => {
  it('isSystemCategoryId 正确识别内置特殊分类', () => {
    expect(isSystemCategoryId('all')).toBe(true);
    expect(isSystemCategoryId('recent')).toBe(true);
    expect(isSystemCategoryId('trash')).toBe(true);
    expect(isSystemCategoryId('work')).toBe(false);
    expect(isSystemCategoryId('uncategorized')).toBe(false);
  });

  it('resolveNoteCreationCategoryId 归纳系统分类为未分类', () => {
    expect(resolveNoteCreationCategoryId('all')).toBe('uncategorized');
    expect(resolveNoteCreationCategoryId('recent')).toBe('uncategorized');
    expect(resolveNoteCreationCategoryId('trash')).toBe('uncategorized');
    expect(resolveNoteCreationCategoryId('custom-cat')).toBe('custom-cat');
    expect(resolveNoteCreationCategoryId('')).toBe('uncategorized');
  });

  it('resolveValidCategoryId 解析并校验有效性与回退', () => {
    const categories: Category[] = [
      { id: 'cat-1', name: '工作', createdAt: 1 },
      { id: 'cat-2', name: '生活', createdAt: 2 }
    ];

    expect(resolveValidCategoryId('cat-1', categories)).toBe('cat-1');
    expect(resolveValidCategoryId('all', categories)).toBe('all');
    expect(resolveValidCategoryId('recent', categories)).toBe('recent');
    expect(resolveValidCategoryId('non-existing', categories)).toBe('all');
    expect(resolveValidCategoryId(undefined, categories, 'fallback-id')).toBe('fallback-id');
  });
});
