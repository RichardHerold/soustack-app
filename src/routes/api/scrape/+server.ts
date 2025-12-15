import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { scrapeRecipe } from 'soustack';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { url } = await request.json();
    
    if (!url || typeof url !== 'string') {
      return json({ error: 'URL is required' }, { status: 400 });
    }

    const recipe = await scrapeRecipe(url);
    
    return json({ recipe });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape recipe';
    
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

