import type { DoubleClickNoteAction } from '../domain/noteInteractions/DoubleClickNoteActionRegistry';

export type { DoubleClickNoteAction } from '../domain/noteInteractions/DoubleClickNoteActionRegistry';

export interface Category {
  id: string;
  name: string;
  createdAt: number;
  parentId?: string;
}

export type NoteType = 'text' | 'markdown';

export interface Note {
  id: string;
  categoryId: string; // 'all' or specific category id
  title?: string;
  content: string;
  type?: NoteType; // 'text' (default) or 'markdown'
  images?: string[]; // 便签图片列表 (支持 Base64、URL 或本地路径)
  color: string; // HSL color string or preset name
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  isDeleted?: boolean;
  deletedAt?: number;
  lastUsedAt?: number;
  useCount?: number;
}

export interface NoteColorPreset {
  name: string;
  lightBg: string;
  darkBg: string;
  lightBorder: string;
  darkBorder: string;
  lightText: string;
  darkText: string;
  lightBtnHoverBg: string;
  lightBtnHoverColor: string;
  darkBtnHoverBg: string;
  darkBtnHoverColor: string;
}

export interface CategoryViewSetting {
  sortMode?: 'date' | 'title' | 'tag' | 'custom' | 'useCount';
  sortOrder?: 'asc' | 'desc';
  gridColumns?: 'auto' | 1 | 2 | 3 | 4;
}

export interface AppSettings {
  theme?: 'dark' | 'light';
  gridColumns?: 'auto' | 1 | 2 | 3 | 4;
  minNoteWidth?: number;
  noteMaxHeight?: number;
  enabledActionBarButtons?: string[];
  dateFormat?: string;
  defaultNoteColor?: string;
  defaultNoteType?: NoteType;
  defaultEditMode?: 'inline' | 'fullscreen';
  doubleClickNoteAction?: DoubleClickNoteAction;
  superPanelDefaultCategory?: string;
  startPageMode?: 'last' | 'default';
  enableHoverAnimation?: boolean;
  enableAutoCopySelection?: boolean;
  showNoteCount?: boolean;
  prefixTagWithHash?: boolean;
  sortMode?: 'date' | 'title' | 'tag' | 'custom' | 'useCount';
  sortOrder?: 'asc' | 'desc';
  categoryIndependentToolbar?: boolean;
  skipDeleteConfirm?: boolean;
  categoryViewSettings?: Record<string, CategoryViewSetting>;
  shortcuts?: Array<{ id: string; currentKey: string }>;
  collapsedCategoryIds?: string[];
}

export interface BackupData {
  version: string;
  timestamp: number;
  categories: Category[];
  notes: Note[];
  settings?: AppSettings;
}

export interface ExportOptions {
  categoryIds: string[];
  includeSettings: boolean;
  includeTrash: boolean;
}

export type ImportMode = 'merge' | 'overwrite';

export interface ImportOptions {
  mode: ImportMode;
  categoryIds: string[];
  importUncategorized: boolean;
  importSettings: boolean;
}
