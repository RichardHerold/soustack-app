# Feature Request: Export Browser-Compatible Recipe Extraction Function

## Summary

The `soustack` package needs to export a browser-compatible function for extracting Schema.org recipes from HTML strings. Currently, `scrapeRecipe()` requires Node.js-specific modules (`fs.promises`) and cannot be used in browser environments, preventing client-side scraping of paywalled content.

## Use Case

When scraping recipes from paywalled sites (e.g., NYTimes Cooking, Bon Appétit), we need to:

1. Fetch HTML in the browser using `fetch()` with `credentials: 'include'` to leverage the user's authenticated session/cookies
2. Extract the Schema.org recipe data from the fetched HTML string
3. Convert it to Soustack format using `fromSchemaOrg()`

**Current limitation:** `scrapeRecipe(url)` attempts to fetch the URL server-side, which:

- Cannot access browser cookies/session
- Fails for paywalled content
- Has CORS restrictions

## Current Implementation Analysis

### What Exists (Internal)

The package already has the necessary extraction logic internally:

- `extractRecipe(html: string)` - Extracts Schema.org recipe from HTML string
- `extractJsonLd(html: string)` - Extracts JSON-LD structured data
- `extractMicrodata(html: string)` - Extracts microdata structured data

These functions are in `src/scraper/extractors/index.ts` but are **not exported**.

### What's Missing

A browser-compatible exported function that:

- Accepts HTML string (not URL)
- Uses only browser-compatible dependencies (no Node.js `fs`, `path`, etc.)
- Returns Schema.org recipe object (same format as `scrapeRecipe()` currently returns)
- Can be used with `fromSchemaOrg()` to convert to Soustack format

## Proposed Solution

### Option 1: Export Existing Internal Function (Recommended)

Export `extractRecipe()` as `extractRecipeFromHTML()`:

```typescript
/**
 * Extract Schema.org recipe data from HTML string (browser-compatible)
 * @param html - HTML string containing Schema.org recipe data
 * @returns Schema.org recipe object, or null if not found
 */
export function extractRecipeFromHTML(html: string): Recipe | null {
  const { recipe } = extractRecipe(html);
  return recipe;
}
```

**Benefits:**

- Minimal code changes
- Reuses existing, tested extraction logic
- Same return format as `scrapeRecipe()` (Schema.org format)
- Works in both browser and Node.js environments

### Option 2: Add HTML Parameter to scrapeRecipe()

Modify `scrapeRecipe()` to accept either URL or HTML:

```typescript
export async function scrapeRecipe(
  urlOrHtml: string,
  options?: ScrapeRecipeOptions & { html?: boolean }
): Promise<Recipe> {
  let html: string;

  if (options?.html) {
    // Use provided HTML string
    html = urlOrHtml;
  } else {
    // Fetch from URL (Node.js only)
    html = await fetchPage(urlOrHtml, options);
  }

  const { recipe } = extractRecipe(html);
  if (!recipe) {
    throw new Error("No Schema.org recipe data found");
  }

  return fromSchemaOrg(recipe);
}
```

**Drawbacks:**

- More complex API
- Still requires Node.js dependencies for URL fetching
- Mixes concerns (URL fetching vs HTML parsing)

## Expected Usage Pattern

### Browser Usage (After Fix)

```typescript
import { extractRecipeFromHTML, fromSchemaOrg } from "soustack";

async function scrapeRecipeInBrowser(url: string) {
  // Fetch HTML using browser's native fetch (includes cookies/session)
  const response = await fetch(url, {
    method: "GET",
    credentials: "include", // Include cookies for authenticated content
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();

  // Extract Schema.org recipe from HTML (browser-compatible)
  const schemaOrgRecipe = extractRecipeFromHTML(html);

  if (!schemaOrgRecipe) {
    throw new Error("No recipe data found in page");
  }

  // Convert to Soustack format
  const soustackRecipe = fromSchemaOrg(schemaOrgRecipe);

  return soustackRecipe;
}
```

### Current Workaround (What We're Doing Now)

Since `extractRecipeFromHTML()` doesn't exist, we're:

1. Fetching HTML in browser
2. Sending HTML to server endpoint
3. Server uses internal extraction logic (replicating it with cheerio)
4. Server converts and returns Soustack recipe

This works but requires:

- Server round-trip (unnecessary overhead)
- Duplicating extraction logic
- More complex architecture

## Technical Requirements

### Dependencies Check

The extraction functions (`extractJsonLd`, `extractMicrodata`, `extractRecipe`) use:

- `cheerio` - ✅ Browser-compatible (already in dependencies)
- No Node.js-specific modules (`fs`, `path`, `url`, etc.)

**Verification needed:** Ensure `cheerio` works correctly in browser bundle. If not, may need to use a browser-compatible HTML parser or provide a separate browser build.

### Return Type

Should return the same Schema.org `Recipe` type that `scrapeRecipe()` currently returns, so it's compatible with `fromSchemaOrg()`:

```typescript
type SchemaOrgRecipe = {
  "@context"?: string;
  "@type"?: string | string[];
  name?: string;
  description?: string;
  image?: string | string[];
  author?: string | { name: string };
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  recipeYield?: string | number;
  recipeCategory?: string | string[];
  recipeCuisine?: string | string[];
  recipeIngredient?: string[];
  recipeInstructions?: string | string[] | { "@type": string; text: string }[];
  // ... other Schema.org Recipe properties
};
```

## Testing Requirements

### Test Cases Needed

1. **JSON-LD extraction:** HTML with `<script type="application/ld+json">` containing Recipe
2. **Microdata extraction:** HTML with `itemscope itemtype="http://schema.org/Recipe"`
3. **Multiple recipes:** HTML with multiple recipes (should return first valid one)
4. **No recipe:** HTML without any recipe data (should return `null`)
5. **Browser environment:** Verify it works in actual browser (not just Node.js)
6. **Bundle size:** Ensure adding this export doesn't significantly increase browser bundle size

### Example Test HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Recipe",
        "name": "Chocolate Chip Cookies",
        "recipeIngredient": ["2 cups flour", "1 cup sugar"],
        "recipeInstructions": ["Mix ingredients", "Bake at 350°F"]
      }
    </script>
  </head>
  <body>
    ...
  </body>
</html>
```

## Implementation Checklist

- [ ] Export `extractRecipe()` as `extractRecipeFromHTML()` (or similar name)
- [ ] Update TypeScript types to include new export
- [ ] Verify cheerio works in browser bundle (or provide alternative)
- [ ] Add JSDoc documentation with usage examples
- [ ] Add tests for browser compatibility
- [ ] Update README with browser usage examples
- [ ] Ensure function returns `null` (not throws) when no recipe found (for consistency with `fromSchemaOrg()`)
- [ ] Consider adding to main export in `src/index.ts`

## Related Code Locations

- **Extraction logic:** `src/scraper/extractors/index.ts`
- **JSON-LD extraction:** `src/scraper/extractors/jsonld.ts`
- **Microdata extraction:** `src/scraper/extractors/microdata.ts`
- **Main scraper:** `src/scraper/index.ts` (contains `scrapeRecipe()`)
- **Exports:** `src/index.ts`

## Priority

**High** - This is a blocker for browser-based recipe scraping applications that need to access paywalled content.

## Additional Context

### Current Package Version

- Package: `soustack@0.1.1`
- Current exports: `scrapeRecipe`, `fromSchemaOrg`, `toSchemaOrg`, `parseIngredient`, etc.
- Missing: Browser-compatible HTML extraction function

### Error We're Encountering

When trying to use `scrapeRecipe()` in browser:

```
TypeError: Cannot destructure property 'stat' of 'import_node_fs.promises' as it is undefined.
```

This occurs because `scrapeRecipe()` internally uses Node.js `fs.promises` module which doesn't exist in browser environments.

## Questions for Maintainer

1. Is there a specific reason `extractRecipe()` wasn't exported? (e.g., browser compatibility concerns with cheerio?)
2. Would you prefer a different function name than `extractRecipeFromHTML()`?
3. Should this function return `null` or throw an error when no recipe is found?
4. Are there any plans for a separate browser build, or should this work in the same bundle?

---

**Submitted by:** Soustack App Development Team  
**Date:** 2024  
**Package Version:** soustack@0.1.1  
**Related Issue:** Browser compatibility for paywalled content scraping
