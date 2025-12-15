import Dexie, { type EntityTable } from 'dexie';

/**
 * Soustack App Database Schema
 * 
 * Design principles:
 * 1. Store complete Soustack recipes as-is (the format IS the data model)
 * 2. App-specific metadata uses underscore prefix (_id, _createdAt, etc.)
 * 3. Denormalized indexes for search performance
 * 4. Notes and versions are separate from the exportable recipe
 */

// ============================================================================
// Core Types (aligned with Soustack format)
// ============================================================================

// These will eventually come from 'soustack' package
// For now, define minimal types to get started

export interface SoustackRecipe {
  soustack: string;  // Version, e.g. "0.1"
  id?: string;
  name: string;
  description?: string;
  author?: {
    name?: string;
    url?: string;
  };
  source?: {
    url?: string;
    adapted?: boolean;
  };
  image?: string | string[];
  yield?: {
    amount: number;
    unit: string;
    servings?: number;
    description?: string;
  };
  time?: {
    active?: string;   // ISO 8601 duration
    passive?: string;
    total?: string;
    breakdown?: Array<{
      phase: string;
      active?: string;
      passive?: string;
    }>;
  };
  ingredients: Array<string | SoustackIngredient>;
  instructions: Array<string | SoustackInstruction>;
  equipment?: Array<string | SoustackEquipment>;
  tags?: string[];
  notes?: string;
}

export interface SoustackIngredient {
  item: string;
  quantity?: {
    amount: number;
    unit: string | null;
  };
  name?: string;
  prep?: string;
  destination?: string;
  scaling?: {
    type: 'linear' | 'proportional' | 'fixed' | 'discrete' | 'sublinear';
    factor?: number;
    values?: number[];
    min?: number;
    max?: number;
  };
  optional?: boolean;
  notes?: string;
}

export interface SoustackInstruction {
  step: string;
  duration?: string;
  equipment?: string;
  ingredients?: string[];
  notes?: string;
  image?: string;
}

export interface SoustackEquipment {
  name: string;
  id?: string;
  required?: boolean;
  alternatives?: string[];
  capacity?: {
    amount: number;
    unit: string;
  };
  notes?: string;
}

// ============================================================================
// App-Specific Types (extend Soustack for local storage)
// ============================================================================

export interface StoredRecipe extends SoustackRecipe {
  _id: string;              // UUID, primary key
  _createdAt: Date;         // When added to this app
  _updatedAt: Date;         // Last modified
  _lastCookedAt?: Date;     // Last time user cooked this
  _cookCount: number;       // Times cooked
  _favorite: boolean;       // Quick access
  _importedFrom?: string;   // Original URL if scraped
}

export interface IngredientIndex {
  id?: number;
  recipeId: string;         // Links to StoredRecipe._id
  ingredientName: string;   // Normalized for search (lowercase, trimmed)
  originalItem: string;     // Full ingredient string as written
}

export interface RecipeNote {
  id?: number;
  recipeId: string;
  content: string;
  createdAt: Date;
  type: 'observation' | 'modification' | 'success' | 'failure';
}

export interface RecipeVersion {
  id?: number;
  recipeId: string;
  version: number;
  snapshot: SoustackRecipe;  // Full recipe at this point in time
  createdAt: Date;
  note?: string;            // What changed
}

// ============================================================================
// Database Definition
// ============================================================================

export class SoustackDB extends Dexie {
  recipes!: EntityTable<StoredRecipe, '_id'>;
  ingredientIndex!: EntityTable<IngredientIndex, 'id'>;
  notes!: EntityTable<RecipeNote, 'id'>;
  versions!: EntityTable<RecipeVersion, 'id'>;

  constructor() {
    super('SoustackDB');

    this.version(1).stores({
      // Primary recipe storage
      // Indexed: _id (primary), name, tags (multi-entry), dates, favorite, cookCount
      recipes: '_id, name, *tags, _createdAt, _updatedAt, _favorite, _cookCount',
      
      // Denormalized ingredient index for "what can I cook?" queries
      ingredientIndex: '++id, recipeId, ingredientName',
      
      // Personal notes (not part of exportable recipe)
      notes: '++id, recipeId, createdAt, type',
      
      // Version history for tracking changes
      versions: '++id, recipeId, version, createdAt'
    });

    // Auto-set timestamps on create
    this.recipes.hook('creating', (_primKey, obj) => {
      obj._createdAt = obj._createdAt || new Date();
      obj._updatedAt = new Date();
      obj._cookCount = obj._cookCount || 0;
      obj._favorite = obj._favorite || false;
    });

    // Auto-update timestamp on modification
    this.recipes.hook('updating', (mods) => {
      return { ...mods, _updatedAt: new Date() };
    });
  }
}

// Singleton database instance
export const db = new SoustackDB();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a UUID for new recipes
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Extract searchable ingredient names from a recipe
 */
export function extractIngredientNames(recipe: SoustackRecipe): string[] {
  return recipe.ingredients.map(ing => {
    if (typeof ing === 'string') {
      // Simple string ingredient - extract the main item
      // "2 cups flour" -> "flour"
      // This is a rough heuristic; the parser in soustack-core does better
      const words = ing.toLowerCase().split(/\s+/);
      // Skip quantity words and return the rest
      const quantityWords = ['cup', 'cups', 'tbsp', 'tsp', 'oz', 'lb', 'g', 'kg', 'ml', 'l'];
      return words
        .filter(w => !quantityWords.includes(w) && !/^\d/.test(w))
        .join(' ')
        .trim();
    } else {
      // Structured ingredient - use the name field or parse from item
      return (ing.name || ing.item).toLowerCase().trim();
    }
  }).filter(Boolean);
}

/**
 * Index a recipe's ingredients for search
 */
export async function indexRecipeIngredients(recipe: StoredRecipe): Promise<void> {
  // Remove existing index entries for this recipe
  await db.ingredientIndex.where('recipeId').equals(recipe._id).delete();
  
  // Add new entries
  const ingredients = recipe.ingredients.map(ing => ({
    recipeId: recipe._id,
    ingredientName: typeof ing === 'string' 
      ? ing.toLowerCase() 
      : (ing.name || ing.item).toLowerCase(),
    originalItem: typeof ing === 'string' ? ing : ing.item
  }));
  
  await db.ingredientIndex.bulkAdd(ingredients);
}
