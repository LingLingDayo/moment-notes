import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { Category } from '@type';
import { storage } from '@utils/storage';
import { useUiStore } from './uiStore';

export const useCategoryStore = defineStore('categoryStore', () => {
  const categories = ref<Category[]>([]);
  const categoryOrder = ref<string[]>([]);
  const collapsedCategoryIds = ref<string[]>([]);
  const addingSubParentId = ref<string | null>(null);
  const newSubCategoryName = ref('');

  const saveCategories = () => {
    storage.setItem('sticky_notes_categories', JSON.stringify(categories.value));
  };

  const saveCategoryOrder = () => {
    storage.setItem('sticky_notes_category_order', JSON.stringify(categoryOrder.value));
  };

  const saveCollapsedCategories = () => {
    storage.setItem(
      'sticky_notes_collapsed_categories',
      JSON.stringify(collapsedCategoryIds.value)
    );
  };

  const toggleCategoryCollapse = (id: string) => {
    const idx = collapsedCategoryIds.value.indexOf(id);
    if (idx === -1) {
      collapsedCategoryIds.value.push(id);
    } else {
      collapsedCategoryIds.value.splice(idx, 1);
    }
    saveCollapsedCategories();
  };

  const isCategoryCollapsed = (id: string) => {
    return collapsedCategoryIds.value.includes(id);
  };

  const getCategoryDescendants = (categoryId: string): Set<string> => {
    const descendants = new Set<string>();
    const childrenMap = new Map<string, string[]>();

    categories.value.forEach(c => {
      if (c.parentId) {
        if (!childrenMap.has(c.parentId)) {
          childrenMap.set(c.parentId, []);
        }
        childrenMap.get(c.parentId)!.push(c.id);
      }
    });

    const queue = [categoryId];
    let head = 0;
    while (head < queue.length) {
      const current = queue[head++];
      const children = childrenMap.get(current) || [];
      children.forEach(childId => {
        if (!descendants.has(childId)) {
          descendants.add(childId);
          queue.push(childId);
        }
      });
    }
    return descendants;
  };

  const orderedCategories = computed(() => {
    const catMap = new Map(categories.value.map(c => [c.id, c]));
    const childrenMap = new Map<string, Category[]>();
    const rootCategories: Category[] = [];

    categories.value.forEach(c => {
      if (c.parentId && catMap.has(c.parentId)) {
        if (!childrenMap.has(c.parentId)) {
          childrenMap.set(c.parentId, []);
        }
        childrenMap.get(c.parentId)!.push(c);
      } else {
        rootCategories.push(c);
      }
    });

    const getOrderIndex = (id: string) => {
      const idx = categoryOrder.value.indexOf(id);
      return idx === -1 ? Infinity : idx;
    };
    const sortFn = (a: Category, b: Category) => {
      return getOrderIndex(a.id) - getOrderIndex(b.id);
    };

    rootCategories.sort(sortFn);
    childrenMap.forEach(list => list.sort(sortFn));

    const result: Array<
      Category & {
        isSystem: boolean;
        level: number;
        hasChildren: boolean;
        isCollapsed: boolean;
        isVirtualAdd?: boolean;
      }
    > = [];

    result.push({
      id: 'all',
      name: '全部便签',
      createdAt: 0,
      isSystem: true,
      level: 0,
      hasChildren: false,
      isCollapsed: false
    });

    const traverse = (cat: Category, level: number) => {
      const children = childrenMap.get(cat.id) || [];
      const hasChildren = children.length > 0;
      const isCollapsed = collapsedCategoryIds.value.includes(cat.id);

      result.push({
        ...cat,
        isSystem: false,
        level,
        hasChildren,
        isCollapsed
      });

      if (addingSubParentId.value === cat.id && !isCollapsed) {
        result.push({
          id: `sub-add-${cat.id}`,
          name: '',
          createdAt: Date.now(),
          parentId: cat.id,
          isSystem: false,
          level: level + 1,
          hasChildren: false,
          isCollapsed: false,
          isVirtualAdd: true
        });
      }

      if (hasChildren && !isCollapsed) {
        children.forEach(child => {
          traverse(child, level + 1);
        });
      }
    };

    rootCategories.forEach(cat => {
      traverse(cat, 0);
    });

    return result;
  });

  const reorderCategories = (fromIndex: number, toIndex: number) => {
    const fromCat = orderedCategories.value[fromIndex];
    const toCat = orderedCategories.value[toIndex];
    if (!fromCat || !toCat) return;

    const fromId = fromCat.id;
    const toId = toCat.id;

    const order = [...categoryOrder.value];
    const fromIdx = order.indexOf(fromId);
    const toIdx = order.indexOf(toId);

    if (fromIdx !== -1 && toIdx !== -1) {
      const [moved] = order.splice(fromIdx, 1);
      order.splice(toIdx, 0, moved);
      categoryOrder.value = order;
      saveCategoryOrder();
    }
  };

  const moveCategory = (
    categoryId: string,
    targetParentId: string | undefined,
    targetSiblingId: string | undefined,
    position: 'before' | 'after' | 'inside'
  ) => {
    let cat = categories.value.find(c => c.id === categoryId);
    if (!cat && categoryId !== 'all') return;

    if (categoryId === 'all') {
      if (targetParentId !== undefined) {
        const uiStore = useUiStore();
        uiStore.showToast('“全部便签”只能作为一级分类排序', 'error');
        return;
      }
    } else {
      if (targetParentId === categoryId) return;
      const descendants = getCategoryDescendants(categoryId);
      if (targetParentId && descendants.has(targetParentId)) {
        const uiStore = useUiStore();
        uiStore.showToast('无法将分类移动到其子分类下', 'error');
        return;
      }

      cat!.parentId = targetParentId;
      saveCategories();
    }

    const order = [...categoryOrder.value];
    if (!order.includes('all')) {
      order.unshift('all');
    }

    const currentIdx = order.indexOf(categoryId);
    if (currentIdx !== -1) {
      order.splice(currentIdx, 1);
    }

    if (position === 'inside') {
      const parentIdx = order.indexOf(targetParentId || '');
      if (parentIdx !== -1) {
        order.splice(parentIdx + 1, 0, categoryId);
      } else {
        order.push(categoryId);
      }

      if (targetParentId && collapsedCategoryIds.value.includes(targetParentId)) {
        collapsedCategoryIds.value = collapsedCategoryIds.value.filter(id => id !== targetParentId);
        saveCollapsedCategories();
      }
    } else {
      const siblingIdx = order.indexOf(targetSiblingId || '');
      if (siblingIdx !== -1) {
        const insertIdx = position === 'before' ? siblingIdx : siblingIdx + 1;
        order.splice(insertIdx, 0, categoryId);
      } else {
        order.push(categoryId);
      }
    }

    categoryOrder.value = order;
    saveCategoryOrder();
  };

  const addCategory = (name: string, parentId?: string): Category | undefined => {
    if (!name.trim()) return;
    const newCategory: Category = {
      id: Date.now().toString(),
      name: name.trim(),
      createdAt: Date.now(),
      parentId
    };
    categories.value.push(newCategory);
    saveCategories();

    categoryOrder.value.push(newCategory.id);
    saveCategoryOrder();

    return newCategory;
  };

  const deleteCategory = (id: string) => {
    const targetParentId = categories.value.find(c => c.id === id)?.parentId;
    categories.value = categories.value
      .map(c => {
        if (c.parentId === id) {
          return { ...c, parentId: targetParentId };
        }
        return c;
      })
      .filter(c => c.id !== id);
    saveCategories();

    categoryOrder.value = categoryOrder.value.filter(itemId => itemId !== id);
    saveCategoryOrder();
  };

  const updateCategory = (id: string, name: string) => {
    if (!name.trim()) return;
    const category = categories.value.find(c => c.id === id);
    if (category) {
      category.name = name.trim();
      saveCategories();
    }
  };

  const categoryOptions = computed(() => {
    const list: Array<{ label: string; value: string }> = [];
    list.push({ label: '全部便签', value: 'all' });

    const getCategoryPath = (catId: string): string => {
      const path: string[] = [];
      let current = categories.value.find(c => c.id === catId);
      while (current) {
        path.unshift(current.name);
        const parentId = current.parentId;
        current = parentId ? categories.value.find(c => c.id === parentId) : undefined;
      }
      return path.join(' / ');
    };

    const getOrderIndex = (id: string) => {
      const idx = categoryOrder.value.indexOf(id);
      return idx === -1 ? Infinity : idx;
    };
    const sortFn = (a: Category, b: Category) => {
      return getOrderIndex(a.id) - getOrderIndex(b.id);
    };

    const catMap = new Map(categories.value.map(c => [c.id, { ...c, children: [] as any[] }]));
    const rootCategories: any[] = [];

    categories.value.forEach(c => {
      const item = catMap.get(c.id);
      if (item) {
        if (c.parentId && catMap.has(c.parentId)) {
          catMap.get(c.parentId)!.children.push(item);
        } else {
          rootCategories.push(item);
        }
      }
    });

    rootCategories.sort(sortFn);
    catMap.forEach((item: any) => item.children.sort(sortFn));

    const flattenList: any[] = [];
    const traverse = (nodes: any[]) => {
      nodes.forEach(node => {
        flattenList.push(node);
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      });
    };
    traverse(rootCategories);

    flattenList.forEach((cat: any) => {
      list.push({
        label: getCategoryPath(cat.id),
        value: cat.id
      });
    });

    list.push({ label: '最近使用', value: 'recent' });
    list.push({ label: '最近删除', value: 'trash' });

    return list;
  });

  return {
    categories,
    categoryOrder,
    collapsedCategoryIds,
    addingSubParentId,
    newSubCategoryName,
    saveCategories,
    saveCategoryOrder,
    saveCollapsedCategories,
    toggleCategoryCollapse,
    isCategoryCollapsed,
    getCategoryDescendants,
    orderedCategories,
    reorderCategories,
    moveCategory,
    addCategory,
    deleteCategory,
    updateCategory,
    categoryOptions
  };
});
