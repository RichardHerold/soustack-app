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
    const { url, html } = await request.json();
    
    // #region agent log
    log('info', 'Received request', { url, hasHtml: !!html, htmlLength: html?.length });
    // #endregion
    
    let schemaOrgRecipe;
    let recipe;
    
    if (html && typeof html === 'string') {
      // Extract recipe from provided HTML (browser-fetched HTML with cookies)
      // #region agent log
      log('info', 'Extracting recipe from HTML', { htmlLength: html.length });
      // #endregion
      
      // Replicate extractRecipe logic since it's not exported
      // Try JSON-LD first
      const cheerio = await import('cheerio');
      const $ = cheerio.load(html);
      const scripts = $('script[type="application/ld+json"]');
      let jsonLdRecipe: any = null;
      
      scripts.each((_idx: number, element: any) => {
        const content = $(element).html();
        if (!content) return;
        try {
          const data = JSON.parse(content);
          if (Array.isArray(data)) {
            for (const item of data) {
              if (item['@type'] === 'Recipe' || (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))) {
                jsonLdRecipe = item;
                return false; // break
              }
            }
          } else if (data['@type'] === 'Recipe' || (Array.isArray(data['@type']) && data['@type'].includes('Recipe'))) {
            jsonLdRecipe = data;
            return false; // break
          }
        } catch (e) {
          // Invalid JSON, skip
        }
      });
      
      if (jsonLdRecipe) {
        schemaOrgRecipe = jsonLdRecipe;
        // #region agent log
        log('info', 'Found JSON-LD recipe', { recipeName: schemaOrgRecipe?.name });
        // #endregion
      } else {
        // Try microdata
        const recipeEl = $('[itemscope][itemtype*="schema.org/Recipe"]').first();
        if (recipeEl.length) {
          const microdataRecipe: any = {};
          const simpleProps = ['name', 'description', 'image', 'author', 'prepTime', 'cookTime', 'totalTime', 'recipeYield', 'recipeCategory', 'recipeCuisine'];
          simpleProps.forEach(prop => {
            const node = recipeEl.find(`[itemprop="${prop}"]`).first();
            if (node.length) {
              microdataRecipe[prop] = node.attr('content') || node.attr('href') || node.attr('src') || node.text().trim();
            }
          });
          
          const ingredients: string[] = [];
          recipeEl.find('[itemprop="recipeIngredient"]').each((_idx: number, el: any) => {
            const text = $(el).attr('content') || $(el).text();
            if (text) ingredients.push(text.trim());
          });
          if (ingredients.length) microdataRecipe.recipeIngredient = ingredients;
          
          const instructions: string[] = [];
          recipeEl.find('[itemprop="recipeInstructions"]').each((_idx: number, el: any) => {
            const text = $(el).attr('content') || $(el).find('[itemprop="text"]').first().text() || $(el).text();
            if (text) instructions.push(text.trim());
          });
          if (instructions.length) microdataRecipe.recipeInstructions = instructions;
          
          if ((microdataRecipe as any).name || ingredients.length) {
            schemaOrgRecipe = microdataRecipe;
            // #region agent log
            log('info', 'Found microdata recipe', { recipeName: (schemaOrgRecipe as any)?.name });
            // #endregion
          }
        }
      }
      
      if (!schemaOrgRecipe) {
        // #region agent log
        log('error', 'No recipe found in HTML', {});
        // #endregion
        return json({ error: 'No Schema.org recipe data found in HTML' }, { status: 400 });
      }
    } else if (url && typeof url === 'string') {
      // Use URL scraping (server-side)
      // scrapeRecipe already returns a Soustack recipe (not Schema.org)
      // #region agent log
      log('info', 'Calling scrapeRecipe', { url });
      // #endregion
      const soustackRecipe = await scrapeRecipe(url);
      
      // #region agent log
      log('info', 'scrapeRecipe succeeded', { recipeName: soustackRecipe?.name, recipeKeys: soustackRecipe ? Object.keys(soustackRecipe) : null });
      // #endregion
      
      if (!soustackRecipe) {
        // #region agent log
        log('error', 'scrapeRecipe returned null/undefined', {});
        // #endregion
        return json({ error: 'Failed to scrape recipe: no recipe data found' }, { status: 500 });
      }
      
      // scrapeRecipe already returns Soustack format, use it directly
      recipe = soustackRecipe;
    } else {
      // #region agent log
      log('error', 'Validation failed', { url, hasHtml: !!html });
      // #endregion
      return json({ error: 'Either URL or HTML is required' }, { status: 400 });
    }
    
    // If we extracted from HTML, we need to convert Schema.org to Soustack
    if (!recipe && schemaOrgRecipe) {
      // #region agent log
      log('info', 'Converting Schema.org to Soustack format', { 
        schemaOrgRecipeType: typeof schemaOrgRecipe, 
        schemaOrgRecipeIsNull: schemaOrgRecipe === null, 
        schemaOrgRecipeIsUndefined: schemaOrgRecipe === undefined,
        schemaOrgRecipeString: JSON.stringify(schemaOrgRecipe).substring(0, 500)
      });
      // #endregion
      
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
      log('info', 'Calling fromSchemaOrg', { 
        hasContext: !!schemaOrgData['@context'], 
        hasType: !!schemaOrgData['@type'],
        schemaOrgDataType: typeof schemaOrgData,
        schemaOrgDataKeys: schemaOrgData ? Object.keys(schemaOrgData) : null,
        schemaOrgDataPreview: JSON.stringify(schemaOrgData).substring(0, 500)
      });
      // #endregion
      
      recipe = fromSchemaOrg(schemaOrgData);
    }
    
    // #region agent log
    log('info', 'Conversion completed', { 
      recipeIsNull: recipe === null, 
      recipeIsUndefined: recipe === undefined, 
      recipeName: recipe?.name, 
      recipeKeys: recipe ? Object.keys(recipe) : null, 
      hasSoustackVersion: recipe && 'soustack' in recipe, 
      tags: recipe?.tags, 
      ingredientsCount: recipe?.ingredients?.length 
    });
    // #endregion
    
    if (!recipe) {
      // #region agent log
      log('error', 'Recipe is null/undefined after processing', { 
        schemaOrgRecipeKeys: schemaOrgRecipe ? Object.keys(schemaOrgRecipe) : null,
        schemaOrgRecipeString: schemaOrgRecipe ? JSON.stringify(schemaOrgRecipe).substring(0, 1000) : null
      });
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
    log('error', 'scrapeRecipe failed', { 
      errorMessage, 
      errorStack, 
      errorType: error?.constructor?.name,
      errorString: String(error),
      errorKeys: error && typeof error === 'object' ? Object.keys(error) : null
    });
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

