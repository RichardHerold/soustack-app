<script lang="ts">
  import type { SoustackIngredient } from '$lib/db';
  
  export let ingredients: Array<string | SoustackIngredient>;
  export let scaleFactor: number = 1;
  
  // Scale an ingredient based on its scaling type
  function scaleIngredient(
    ing: string | SoustackIngredient,
    factor: number
  ): { display: string; scaled: boolean } {
    // Simple string ingredient - try to scale the number at the start
    if (typeof ing === 'string') {
      return scaleSimpleIngredient(ing, factor);
    }
    
    // Structured ingredient
    if (!ing.quantity) {
      return { display: ing.item, scaled: false };
    }
    
    const scalingType = ing.scaling?.type ?? 'linear';
    const baseAmount = ing.quantity.amount;
    let scaledAmount: number;
    
    switch (scalingType) {
      case 'fixed':
        // Fixed ingredients don't scale (e.g., "1 bay leaf")
        scaledAmount = baseAmount;
        break;
        
      case 'proportional':
        // Proportional scales by square root (e.g., salt, spices)
        // At 2x recipe, you might only need 1.5x the salt
        scaledAmount = baseAmount * Math.pow(factor, ing.scaling?.factor ?? 0.7);
        break;
        
      case 'discrete':
        // Discrete rounds to nearest allowed value (e.g., eggs)
        scaledAmount = Math.round(baseAmount * factor);
        if (ing.scaling?.values) {
          // Find nearest allowed value
          scaledAmount = ing.scaling.values.reduce((prev, curr) =>
            Math.abs(curr - scaledAmount) < Math.abs(prev - scaledAmount) ? curr : prev
          );
        }
        break;
        
      case 'sublinear':
        // Sublinear for things that scale less than linearly
        scaledAmount = baseAmount * Math.pow(factor, ing.scaling?.factor ?? 0.8);
        break;
        
      case 'linear':
      default:
        // Linear scaling (most ingredients)
        scaledAmount = baseAmount * factor;
        break;
    }
    
    // Apply min/max constraints
    if (ing.scaling?.min !== undefined) {
      scaledAmount = Math.max(scaledAmount, ing.scaling.min);
    }
    if (ing.scaling?.max !== undefined) {
      scaledAmount = Math.min(scaledAmount, ing.scaling.max);
    }
    
    // Format the scaled amount
    const formattedAmount = formatAmount(scaledAmount, ing.quantity.unit);
    const unit = ing.quantity.unit ? ` ${ing.quantity.unit}` : '';
    const name = ing.name || extractName(ing.item);
    const prep = ing.prep ? `, ${ing.prep}` : '';
    
    return {
      display: `${formattedAmount}${unit} ${name}${prep}`,
      scaled: factor !== 1
    };
  }
  
  // Scale a simple string ingredient by parsing the leading number
  function scaleSimpleIngredient(
    ing: string,
    factor: number
  ): { display: string; scaled: boolean } {
    if (factor === 1) {
      return { display: ing, scaled: false };
    }
    
    // Match leading number or fraction
    const match = ing.match(/^([\d\/\s.]+)\s*(.*)/);
    if (!match) {
      return { display: ing, scaled: false };
    }
    
    const [, numPart, rest] = match;
    const baseAmount = parseFraction(numPart);
    
    if (isNaN(baseAmount)) {
      return { display: ing, scaled: false };
    }
    
    const scaledAmount = baseAmount * factor;
    const formatted = formatAmount(scaledAmount, null);
    
    return {
      display: `${formatted} ${rest}`,
      scaled: true
    };
  }
  
  // Parse a fraction string like "1 1/2" or "1/4"
  function parseFraction(str: string): number {
    const parts = str.trim().split(/\s+/);
    let total = 0;
    
    for (const part of parts) {
      if (part.includes('/')) {
        const [num, denom] = part.split('/').map(Number);
        total += num / denom;
      } else {
        total += parseFloat(part);
      }
    }
    
    return total;
  }
  
  // Format a number for display (using fractions for common values)
  function formatAmount(amount: number, unit: string | null): string {
    // Round to reasonable precision
    const rounded = Math.round(amount * 8) / 8;
    
    // Common fractions to display nicely
    const fractions: Record<number, string> = {
      0.125: '⅛',
      0.25: '¼',
      0.333: '⅓',
      0.375: '⅜',
      0.5: '½',
      0.625: '⅝',
      0.667: '⅔',
      0.75: '¾',
      0.875: '⅞'
    };
    
    const whole = Math.floor(rounded);
    const frac = rounded - whole;
    
    // Check if we have a nice fraction
    const closestFrac = Object.keys(fractions)
      .map(Number)
      .find(f => Math.abs(frac - f) < 0.02);
    
    if (closestFrac !== undefined) {
      if (whole === 0) {
        return fractions[closestFrac];
      }
      return `${whole} ${fractions[closestFrac]}`;
    }
    
    // Otherwise, show decimal
    if (rounded === Math.floor(rounded)) {
      return rounded.toString();
    }
    
    return rounded.toFixed(1).replace(/\.0$/, '');
  }
  
  // Extract ingredient name from a string like "2 cups flour, sifted"
  function extractName(item: string): string {
    // Remove leading number and unit
    const withoutAmount = item.replace(/^[\d\/\s.]+\s*(?:cups?|tbsps?|tsps?|oz|lbs?|g|kg|ml|l|pinch|dash)\s*/i, '');
    // Remove prep instructions after comma
    return withoutAmount.split(',')[0].trim();
  }
  
  // Track checked state for ingredients
  let checkedIngredients: Set<number> = new Set();
  
  function toggleChecked(index: number) {
    if (checkedIngredients.has(index)) {
      checkedIngredients.delete(index);
    } else {
      checkedIngredients.add(index);
    }
    checkedIngredients = checkedIngredients; // Trigger reactivity
  }
</script>

<ul class="ingredient-list">
  {#each ingredients as ingredient, i}
    {@const scaled = scaleIngredient(ingredient, scaleFactor)}
    <li class:checked={checkedIngredients.has(i)}>
      <label class="ingredient-item">
        <input
          type="checkbox"
          checked={checkedIngredients.has(i)}
          on:change={() => toggleChecked(i)}
        />
        <span class="ingredient-text" class:scaled={scaled.scaled}>
          {scaled.display}
        </span>
        {#if typeof ingredient !== 'string' && ingredient.optional}
          <span class="optional-badge">optional</span>
        {/if}
      </label>
      {#if typeof ingredient !== 'string' && ingredient.notes}
        <span class="ingredient-notes">{ingredient.notes}</span>
      {/if}
    </li>
  {/each}
</ul>

<style>
  .ingredient-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }
  
  .ingredient-item {
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm);
    cursor: pointer;
    padding: var(--space-sm);
    border-radius: var(--radius-md);
    transition: background 0.2s;
  }
  
  .ingredient-item:hover {
    background: var(--color-surface);
  }
  
  .ingredient-item input[type="checkbox"] {
    width: auto;
    margin-top: 0.25em;
    cursor: pointer;
  }
  
  .ingredient-text {
    flex: 1;
  }
  
  .ingredient-text.scaled {
    color: var(--color-primary);
  }
  
  li.checked .ingredient-text {
    text-decoration: line-through;
    color: var(--color-text-muted);
  }
  
  .optional-badge {
    font-size: 0.75rem;
    padding: 0.125rem 0.375rem;
    background: var(--color-surface);
    border-radius: var(--radius-full);
    color: var(--color-text-muted);
  }
  
  .ingredient-notes {
    display: block;
    font-size: 0.875rem;
    color: var(--color-text-muted);
    margin-left: calc(var(--space-sm) + 1rem + var(--space-sm));
    font-style: italic;
  }
</style>
