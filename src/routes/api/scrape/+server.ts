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
    return json(
      { error: error instanceof Error ? error.message : 'Failed to scrape recipe' },
      { status: 500 }
    );
  }
};

