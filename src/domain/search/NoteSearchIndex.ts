import type { Note, Category } from '../../types';
import type { SearchTarget } from '../../stores/stickyNotesAlgorithms';

export const SEARCH_DEBOUNCE_THRESHOLD = 300;
export const SEARCH_DEBOUNCE_MS = 150;

export interface NoteIndexEntry {
  titleLower: string;
  contentLower: string;
  tagsLower: string[];
  rawTitle?: string;
  rawContent?: string;
  rawTagsRef?: string[];
  rawTagsJoined?: string;
}

/**
 * 解析并规范化搜索关键词（去空格、转小写、按空格拆分词）
 */
export function parseSearchKeywords(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return q.split(/\s+/).filter(k => k.length > 0);
}

/**
 * 构建小写化分类路径 Map（用于分类名称搜索与短路匹配）
 */
export function buildCategoryPathMapLower(categories: Category[]): Map<string, string> {
  const pathMap = new Map<string, string>();
  if (!categories || categories.length === 0) {
    return pathMap;
  }

  const catMap = new Map(categories.map(c => [c.id, c]));
  for (const c of categories) {
    const path: string[] = [];
    let cur: Category | undefined = c;
    while (cur) {
      path.unshift(cur.name);
      cur = cur.parentId ? catMap.get(cur.parentId) : undefined;
    }
    pathMap.set(c.id, path.join(' / ').toLowerCase());
  }

  return pathMap;
}

/**
 * 便签小写索引缓存器
 * 利用 WeakMap 绑定原始 Note 对象，自动跟随垃圾回收，避免常驻内存泄漏
 */
export class NoteSearchIndex {
  private cache = new WeakMap<Note, NoteIndexEntry>();

  /**
   * 获取或构建便签的小写文本索引条目
   */
  public getOrCreateEntry(note: Note): NoteIndexEntry {
    const existing = this.cache.get(note);
    const rawTags = note.tags;
    const rawTagsJoined = Array.isArray(rawTags) ? rawTags.join('\0') : '';

    if (
      existing &&
      existing.rawTitle === note.title &&
      existing.rawContent === note.content &&
      (existing.rawTagsRef === rawTags || existing.rawTagsJoined === rawTagsJoined)
    ) {
      return existing;
    }

    const titleLower = (note.title || '').toLowerCase();
    const contentLower = (note.content || '').toLowerCase();
    const tagsLower = Array.isArray(rawTags)
      ? rawTags.map(tag => (typeof tag === 'string' ? tag.toLowerCase() : ''))
      : [];

    const entry: NoteIndexEntry = {
      titleLower,
      contentLower,
      tagsLower,
      rawTitle: note.title,
      rawContent: note.content,
      rawTagsRef: rawTags,
      rawTagsJoined
    };

    this.cache.set(note, entry);
    return entry;
  }

  /**
   * 判定便签是否匹配当前所有关键词及目标范围（短路求值，未启用范围完全不执行匹配）
   */
  public matchNote(
    note: Note,
    keywords: string[],
    searchTarget: SearchTarget[] = ['all'],
    categoryPathLower?: string
  ): boolean {
    if (keywords.length === 0) return true;

    const entry = this.getOrCreateEntry(note);
    const searchAll = searchTarget.includes('all');
    const searchTitle = searchAll || searchTarget.includes('title');
    const searchContent = searchAll || searchTarget.includes('content');
    const searchTag = searchAll || searchTarget.includes('tag');
    const searchCategory = searchAll || searchTarget.includes('category');

    for (let i = 0; i < keywords.length; i++) {
      const term = keywords[i];
      let termMatched = false;

      if (searchTitle && entry.titleLower.includes(term)) {
        termMatched = true;
      } else if (searchContent && entry.contentLower.includes(term)) {
        termMatched = true;
      } else if (
        searchTag &&
        entry.tagsLower.some(tag => tag.includes(term))
      ) {
        termMatched = true;
      } else if (
        searchCategory &&
        categoryPathLower &&
        categoryPathLower.includes(term)
      ) {
        termMatched = true;
      }

      if (!termMatched) {
        return false;
      }
    }

    return true;
  }

  /**
   * 过滤便签列表
   */
  public filterNotes(
    notes: Note[],
    searchQuery: string,
    searchTarget: SearchTarget[] = ['all'],
    categoryPathMapLower?: Map<string, string>
  ): Note[] {
    const keywords = parseSearchKeywords(searchQuery);
    if (keywords.length === 0) {
      return notes;
    }

    const pathMap = categoryPathMapLower;

    return notes.filter(note => {
      let categoryLower = '';
      if (pathMap) {
        if (note.categoryId && pathMap.has(note.categoryId)) {
          categoryLower = pathMap.get(note.categoryId)!;
        } else if (note.categoryId === 'uncategorized') {
          categoryLower = '未分类';
        }
      }
      return this.matchNote(note, keywords, searchTarget, categoryLower);
    });
  }
}

export const defaultSearchIndex = new NoteSearchIndex();
