import { liveQuery } from 'dexie';
import { readable, writable, derived } from 'svelte/store';
import { db } from '../db';
import type { StoredRecipe } from '../db';

// ============================================================================
// Dexie liveQuery -> Svelte Store Adapter
// ============================================================================

/**
 * Convert a Dexie liveQuery observable to a Svelte readable store
 */
function fromLiveQuery<T>(
  queryFn: () => Promise<T>,
  initialValue: T
) {
  return readable<T>(initialValue, (set) => {
    const observable = liveQuery(queryFn);
    const subscription = observable.subscribe({
      next: (value) => set(value),
      error: (err) => console.error('liveQuery error:', err)
    });
    
    return () => subscription.unsubscribe();
  });
}

// ============================================================================
// Recipe Stores
// ============================================================================

/**
 * All recipes, sorted by last updated (most recent first)
 */
export const allRecipes = fromLiveQuery(
  () => db.recipes.orderBy('_updatedAt').reverse().toArray(),
  [] as StoredRecipe[]
);

/**
 * Favorite recipes only
 */
export const favoriteRecipes = fromLiveQuery(
  () => db.recipes.filter(r => r._favorite).toArray(),
  [] as StoredRecipe[]
);

/**
 * Recently cooked recipes (last 30 days)
 */
export const recentlyCookedRecipes = fromLiveQuery(
  () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return db.recipes
      .filter(r => r._lastCookedAt !== undefined && r._lastCookedAt > thirtyDaysAgo)
      .toArray();
  },
  [] as StoredRecipe[]
);

/**
 * Recipe count
 */
export const recipeCount = fromLiveQuery(
  () => db.recipes.count(),
  0
);

// ============================================================================
// UI State Stores
// ============================================================================

/**
 * Current search query
 */
export const searchQuery = writable('');

/**
 * Current tag filter (null = show all)
 */
export const activeTagFilter = writable<string | null>(null);

/**
 * Sort order for recipe list
 */
export const sortOrder = writable<'name' | '_updatedAt' | '_cookCount'>('_updatedAt');

/**
 * Current scale factor (for recipe view)
 */
export const scaleFactor = writable(1);

// ============================================================================
// Derived Stores
// ============================================================================

/**
 * All unique tags from all recipes
 */
export const allTags = derived(allRecipes, ($recipes) => {
  const tagSet = new Set<string>();
  for (const recipe of $recipes) {
    if (recipe.tags) {
      for (const tag of recipe.tags) {
        tagSet.add(tag);
      }
    }
  }
  return Array.from(tagSet).sort();
});

/**
 * Filtered recipes based on search and tag
 */
export const filteredRecipes = derived(
  [allRecipes, searchQuery, activeTagFilter, sortOrder],
  ([$recipes, $query, $tag, $sort]) => {
    let results = $recipes;
    
    // Filter by search query
    if ($query.trim()) {
      const lowerQuery = $query.toLowerCase();
      results = results.filter(r => 
        r.name.toLowerCase().includes(lowerQuery) ||
        r.description?.toLowerCase().includes(lowerQuery) ||
        r.tags?.some(t => t.toLowerCase().includes(lowerQuery))
      );
    }
    
    // Filter by tag
    if ($tag) {
      results = results.filter(r => r.tags?.includes($tag));
    }
    
    // Sort
    results = [...results].sort((a, b) => {
      switch ($sort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case '_cookCount':
          return (b._cookCount || 0) - (a._cookCount || 0);
        case '_updatedAt':
        default:
          return (b._updatedAt?.getTime() || 0) - (a._updatedAt?.getTime() || 0);
      }
    });
    
    return results;
  }
);

// ============================================================================
// Recipe Detail Store
// ============================================================================

/**
 * Currently selected recipe ID
 */
export const currentRecipeId = writable<string | null>(null);

/**
 * Currently selected recipe (reactive to DB changes)
 */
export const currentRecipe = derived(
  currentRecipeId,
  ($id, set) => {
    if (!$id) {
      set(null);
      return;
    }
    
    const observable = liveQuery(() => db.recipes.get($id));
    const subscription = observable.subscribe({
      next: (value) => set(value ?? null),
      error: (err) => {
        console.error('Error loading recipe:', err);
        set(null);
      }
    });
    
    return () => subscription.unsubscribe();
  },
  null as StoredRecipe | null
);
