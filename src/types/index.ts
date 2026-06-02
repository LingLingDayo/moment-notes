export interface Category {
  id: string;
  name: string;
  createdAt: number;
}

export interface Note {
  id: string;
  categoryId: string; // 'all' or specific category id
  title?: string;
  content: string;
  color: string; // HSL color string or preset name
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
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
