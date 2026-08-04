import { Note, Category } from '@type';
import {
  filterNotes,
  sortNotes,
  SearchTarget,
  SortMode,
  SortOrder
} from '../../stores/stickyNotesAlgorithms';

export interface NoteFilterContext {
  notes: Note[];
  searchQuery: string;
  searchTarget: SearchTarget[];
  sortMode: SortMode;
  sortOrder: SortOrder;
  currentCategoryId: string;
  categories: Category[];
}

export interface PipelineStage {
  name: string;
  process(notes: Note[], context: NoteFilterContext): Note[];
}

export class CategoryFilterStage implements PipelineStage {
  public name = 'CategoryFilterStage';

  public process(notes: Note[], _context: NoteFilterContext): Note[] {
    // 假设在 Pipeline 接入前 notes 已根据分类做基础过滤
    return notes;
  }
}

export class SearchFilterStage implements PipelineStage {
  public name = 'SearchFilterStage';

  public process(notes: Note[], context: NoteFilterContext): Note[] {
    return filterNotes(notes, context.searchQuery, context.searchTarget, context.categories);
  }
}

export class SortFilterStage implements PipelineStage {
  public name = 'SortFilterStage';

  public process(notes: Note[], context: NoteFilterContext): Note[] {
    return sortNotes(notes, context.sortMode, context.sortOrder, context.currentCategoryId);
  }
}

export class LimitStage implements PipelineStage {
  public name = 'LimitStage';

  public process(notes: Note[], context: NoteFilterContext): Note[] {
    if (context.currentCategoryId === 'recent') {
      return notes.slice(0, 30);
    }
    return notes;
  }
}

export class NoteFilterPipeline {
  private stages: PipelineStage[] = [
    new CategoryFilterStage(),
    new SearchFilterStage(),
    new SortFilterStage(),
    new LimitStage()
  ];

  public addStage(stage: PipelineStage): this {
    this.stages.push(stage);
    return this;
  }

  public execute(context: NoteFilterContext): Note[] {
    let currentNotes = context.notes;
    for (const stage of this.stages) {
      currentNotes = stage.process(currentNotes, context);
    }
    return currentNotes;
  }
}

export const defaultPipeline = new NoteFilterPipeline();
