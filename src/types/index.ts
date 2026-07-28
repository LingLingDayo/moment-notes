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
