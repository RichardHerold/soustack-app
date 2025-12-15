import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { scrapeRecipe, fromSchemaOrg } from 'soustack';

function log(level: string, message: string, data?: any) {
  const entry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    location: 'api/scrape/+server.ts',
    level,
    message,
    data,
    sessionId: 'debug-session',
    runId: 'run1'
  };
  console.log('[DEBUG]', JSON.stringify(entry));
}

export const POST: RequestHandler = async ({ request }) => {
  // #region agent log
  log('info', 'API route called', {});
  // #endregion
  
  try {
    const { url } = await request.json();
    
    // #region agent log
    log('info', 'Received URL', { url });
    // #endregion
    
    if (!url || typeof url !== 'string') {
      // #region agent log
      log('error', 'URL validation failed', { url });
      // #endregion
      return json({ error: 'URL is required' }, { status: 400 });
    }

    // #region agent log
    log('info', 'Calling scrapeRecipe', { url });
    // #endregion
    
    const schemaOrgRecipe = await scrapeRecipe(url);
    
    // #region agent log
    log('info', 'scrapeRecipe succeeded', { recipeName: schemaOrgRecipe?.name, recipeKeys: schemaOrgRecipe ? Object.keys(schemaOrgRecipe) : null });
    // #endregion
    
    // #region agent log
    log('info', 'Converting Schema.org to Soustack format', { 
      schemaOrgRecipeType: typeof schemaOrgRecipe, 
      schemaOrgRecipeIsNull: schemaOrgRecipe === null, 
      schemaOrgRecipeIsUndefined: schemaOrgRecipe === undefined,
      schemaOrgRecipeString: JSON.stringify(schemaOrgRecipe).substring(0, 500)
    });
    // #endregion
    
    if (!schemaOrgRecipe) {
      // #region agent log
      log('error', 'schemaOrgRecipe is null or undefined', {});
      // #endregion
      return json({ error: 'Failed to scrape recipe: no recipe data found' }, { status: 500 });
    }
    
    // Try wrapping in @context if it's not already wrapped (Schema.org format requirement)
    let schemaOrgData: any = schemaOrgRecipe;
    const recipeObj = schemaOrgRecipe as any;
    if (!recipeObj['@context'] && !recipeObj['@type']) {
      // #region agent log
      log('info', 'Wrapping Schema.org recipe in JSON-LD format', {});
      // #endregion
      schemaOrgData = {
        '@context': 'https://schema.org',
        '@type': 'Recipe',
        ...schemaOrgRecipe
      };
    }
    
    // #region agent log
    log('info', 'Calling fromSchemaOrg', { hasContext: !!schemaOrgData['@context'], hasType: !!schemaOrgData['@type'] });
    // #endregion
    
    const recipe = fromSchemaOrg(schemaOrgData);
    
    // #region agent log
    log('info', 'Conversion completed', { recipeIsNull: recipe === null, recipeIsUndefined: recipe === undefined, recipeName: recipe?.name, recipeKeys: recipe ? Object.keys(recipe) : null, hasSoustackVersion: recipe && 'soustack' in recipe, tags: recipe?.tags, ingredientsCount: recipe?.ingredients?.length });
    // #endregion
    
    if (!recipe) {
      // #region agent log
      log('error', 'fromSchemaOrg returned null/undefined', { schemaOrgRecipeKeys: Object.keys(schemaOrgRecipe) });
      // #endregion
      return json({ error: 'Failed to convert recipe format. The recipe may not be in a supported format.' }, { status: 500 });
    }
    
    // Clean up tags: remove ingredient names that were incorrectly added as tags
    if (recipe.tags && Array.isArray(recipe.tags) && recipe.ingredients && Array.isArray(recipe.ingredients)) {
      // #region agent log
      log('info', 'Cleaning tags', { originalTags: recipe.tags, ingredientsCount: recipe.ingredients.length });
      // #endregion
      
      // Extract ingredient names (lowercase for comparison)
      const ingredientNames = new Set<string>();
      for (const ing of recipe.ingredients) {
        if (typeof ing === 'string') {
          // Simple ingredient string - extract the main ingredient name
          const name = ing.toLowerCase().split(/[,\s]+/)[0].replace(/[^\w]/g, '');
          if (name) ingredientNames.add(name);
        } else if (ing && typeof ing === 'object' && 'name' in ing) {
          // Ingredient object with name property
          const name = String(ing.name).toLowerCase().replace(/[^\w]/g, '');
          if (name) ingredientNames.add(name);
        } else if (ing && typeof ing === 'object' && 'item' in ing) {
          // Ingredient object with item property
          const name = String(ing.item).toLowerCase().split(/[,\s]+/)[0].replace(/[^\w]/g, '');
          if (name) ingredientNames.add(name);
        }
      }
      
      // Filter out tags that match ingredient names
      const cleanedTags = recipe.tags.filter(tag => {
        const tagLower = tag.toLowerCase().replace(/[^\w]/g, '');
        return !ingredientNames.has(tagLower) && tagLower.length > 2; // Also filter very short tags
      });
      
      // #region agent log
      log('info', 'Tags cleaned', { originalTags: recipe.tags, cleanedTags, removedCount: recipe.tags.length - cleanedTags.length });
      // #endregion
      
      recipe.tags = cleanedTags.length > 0 ? cleanedTags : undefined;
    }
    
    return json({ recipe });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape recipe';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // #region agent log
    log('error', 'scrapeRecipe failed', { errorMessage, errorStack, errorType: error?.constructor?.name });
    // #endregion
    
    // Check if it's a module not found error
    if (errorMessage.includes('Cannot find module') || errorMessage.includes('soustack')) {
      return json(
        { error: 'URL scraping requires the soustack npm package. Please run: npm install soustack' },
        { status: 500 }
      );
    }
    
    return json(
      { error: errorMessage },
      { status: 500 }
    );
  }
};

