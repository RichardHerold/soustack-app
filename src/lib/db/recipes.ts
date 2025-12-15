import { db, generateId, indexRecipeIngredients } from './index';
import type { StoredRecipe, SoustackRecipe, RecipeNote, RecipeVersion } from './index';

// ============================================================================
// Recipe CRUD Operations
// ============================================================================

/**
 * Add a new recipe to the database
 */
export async function addRecipe(recipe: SoustackRecipe, importedFrom?: string): Promise<string> {
  const id = generateId();
  
  const storedRecipe: StoredRecipe = {
    ...recipe,
    _id: id,
    _createdAt: new Date(),
    _updatedAt: new Date(),
    _cookCount: 0,
    _favorite: false,
    _importedFrom: importedFrom
  };
  
  await db.recipes.add(storedRecipe);
  await indexRecipeIngredients(storedRecipe);
  
  return id;
}

/**
 * Get a recipe by ID
 */
export async function getRecipe(id: string): Promise<StoredRecipe | undefined> {
  return db.recipes.get(id);
}

/**
 * Update an existing recipe
 */
export async function updateRecipe(id: string, updates: Partial<SoustackRecipe>): Promise<void> {
  const existing = await db.recipes.get(id);
  if (!existing) {
    throw new Error(`Recipe not found: ${id}`);
  }
  
  // Create version snapshot before updating
  await createVersion(id, existing, 'Auto-saved before edit');
  
  await db.recipes.update(id, updates);
  
  // Re-index ingredients if they changed
  if (updates.ingredients) {
    const updated = await db.recipes.get(id);
    if (updated) {
      await indexRecipeIngredients(updated);
    }
  }
}

/**
 * Delete a recipe and all associated data
 */
export async function deleteRecipe(id: string): Promise<void> {
  await db.transaction('rw', [db.recipes, db.ingredientIndex, db.notes, db.versions], async () => {
    await db.recipes.delete(id);
    await db.ingredientIndex.where('recipeId').equals(id).delete();
    await db.notes.where('recipeId').equals(id).delete();
    await db.versions.where('recipeId').equals(id).delete();
  });
}

/**
 * Get all recipes, optionally sorted
 */
export async function getAllRecipes(
  sortBy: 'name' | '_createdAt' | '_updatedAt' | '_cookCount' = '_updatedAt',
  descending = true
): Promise<StoredRecipe[]> {
  const collection = db.recipes.orderBy(sortBy);
  return descending ? collection.reverse().toArray() : collection.toArray();
}

/**
 * Search recipes by name
 */
export async function searchRecipesByName(query: string): Promise<StoredRecipe[]> {
  const lowerQuery = query.toLowerCase();
  return db.recipes
    .filter(recipe => recipe.name.toLowerCase().includes(lowerQuery))
    .toArray();
}

/**
 * Search recipes by tag
 */
export async function searchRecipesByTag(tag: string): Promise<StoredRecipe[]> {
  return db.recipes
    .where('tags')
    .equals(tag.toLowerCase())
    .toArray();
}

/**
 * Search recipes by ingredient
 */
export async function searchRecipesByIngredient(ingredient: string): Promise<StoredRecipe[]> {
  const lowerIngredient = ingredient.toLowerCase();
  
  // Find matching ingredient index entries
  const matches = await db.ingredientIndex
    .filter(idx => idx.ingredientName.includes(lowerIngredient))
    .toArray();
  
  // Get unique recipe IDs
  const recipeIds = [...new Set(matches.map(m => m.recipeId))];
  
  // Fetch the recipes
  return db.recipes.bulkGet(recipeIds).then(recipes => 
    recipes.filter((r): r is StoredRecipe => r !== undefined)
  );
}

/**
 * Get favorite recipes
 */
export async function getFavorites(): Promise<StoredRecipe[]> {
  return db.recipes.where('_favorite').equals(1).toArray();
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(id: string): Promise<boolean> {
  const recipe = await db.recipes.get(id);
  if (!recipe) {
    throw new Error(`Recipe not found: ${id}`);
  }
  
  const newStatus = !recipe._favorite;
  await db.recipes.update(id, { _favorite: newStatus });
  return newStatus;
}

/**
 * Record that a recipe was cooked
 */
export async function markAsCooked(id: string): Promise<void> {
  const recipe = await db.recipes.get(id);
  if (!recipe) {
    throw new Error(`Recipe not found: ${id}`);
  }
  
  await db.recipes.update(id, {
    _lastCookedAt: new Date(),
    _cookCount: recipe._cookCount + 1
  });
}

// ============================================================================
// Notes Operations
// ============================================================================

/**
 * Add a note to a recipe
 */
export async function addNote(
  recipeId: string, 
  content: string, 
  type: RecipeNote['type'] = 'observation'
): Promise<number> {
  return db.notes.add({
    recipeId,
    content,
    type,
    createdAt: new Date()
  });
}

/**
 * Get all notes for a recipe
 */
export async function getNotesForRecipe(recipeId: string): Promise<RecipeNote[]> {
  return db.notes
    .where('recipeId')
    .equals(recipeId)
    .reverse()
    .sortBy('createdAt');
}

/**
 * Delete a note
 */
export async function deleteNote(noteId: number): Promise<void> {
  await db.notes.delete(noteId);
}

// ============================================================================
// Version Operations
// ============================================================================

/**
 * Create a version snapshot of a recipe
 */
export async function createVersion(
  recipeId: string, 
  snapshot: SoustackRecipe, 
  note?: string
): Promise<number> {
  // Get the next version number
  const existingVersions = await db.versions
    .where('recipeId')
    .equals(recipeId)
    .count();
  
  return db.versions.add({
    recipeId,
    version: existingVersions + 1,
    snapshot,
    createdAt: new Date(),
    note
  });
}

/**
 * Get version history for a recipe
 */
export async function getVersionHistory(recipeId: string): Promise<RecipeVersion[]> {
  return db.versions
    .where('recipeId')
    .equals(recipeId)
    .reverse()
    .sortBy('version');
}

/**
 * Restore a recipe to a previous version
 */
export async function restoreVersion(recipeId: string, versionId: number): Promise<void> {
  const version = await db.versions.get(versionId);
  if (!version || version.recipeId !== recipeId) {
    throw new Error('Version not found');
  }
  
  // Save current state before restoring
  const current = await db.recipes.get(recipeId);
  if (current) {
    await createVersion(recipeId, current, 'Auto-saved before restore');
  }
  
  // Restore the snapshot
  await db.recipes.update(recipeId, version.snapshot);
  
  // Re-index ingredients
  const restored = await db.recipes.get(recipeId);
  if (restored) {
    await indexRecipeIngredients(restored);
  }
}

// ============================================================================
// Export Operations
// ============================================================================

/**
 * Export a recipe as clean Soustack JSON (strips app metadata)
 */
export function exportRecipe(recipe: StoredRecipe): SoustackRecipe {
  // Remove app-specific fields (those starting with _)
  const { _id, _createdAt, _updatedAt, _lastCookedAt, _cookCount, _favorite, _importedFrom, ...soustack } = recipe;
  return soustack;
}

/**
 * Export all recipes as an array
 */
export async function exportAllRecipes(): Promise<SoustackRecipe[]> {
  const recipes = await db.recipes.toArray();
  return recipes.map(exportRecipe);
}

/**
 * Import a Soustack recipe (from JSON)
 */
export async function importRecipe(json: string | SoustackRecipe, source?: string): Promise<string> {
  const recipe = typeof json === 'string' ? JSON.parse(json) : json;
  
  // TODO: Validate against Soustack schema using soustack-core
  // For now, just check required fields
  if (!recipe.name || !recipe.ingredients) {
    throw new Error('Invalid recipe: missing name or ingredients');
  }
  
  return addRecipe(recipe, source);
}
