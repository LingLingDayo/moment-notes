/**
 * stickyNotesAlgorithms 门面导出模块
 * 核心算法已下沉至领域层 domain/notes/noteAlgorithms，此处保持完全向后兼容的统一重导出。
 */
export * from '../domain/notes/noteAlgorithms';
export type { SearchTarget, SortMode, SortOrder } from '../types';
