<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { db } from '$lib/db';
  import type { StoredRecipe, SoustackIngredient } from '$lib/db';
  import { markAsCooked, deleteRecipe, exportRecipe } from '$lib/db/recipes';
  import { goto } from '$app/navigation';
  import ScaleControl from '$lib/components/ScaleControl.svelte';
  import IngredientList from '$lib/components/IngredientList.svelte';
  import InstructionList from '$lib/components/InstructionList.svelte';
  
  let recipe: StoredRecipe | null = null;
  let loading = true;
  let error: string | null = null;
  let scaleFactor = 1;
  
  $: recipeId = $page.params.id;
  
  onMount(() => {
    loadRecipe();
  });
  
  async function loadRecipe() {
    loading = true;
    error = null;
    
    try {
      recipe = await db.recipes.get(recipeId) ?? null;
      if (!recipe) {
        error = 'Recipe not found';
      }
    } catch (e) {
      error = 'Failed to load recipe';
      console.error(e);
    } finally {
      loading = false;
    }
  }
  
  // Format ISO duration
  function formatDuration(iso?: string): string {
    if (!iso) return '';
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return iso;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    
    if (hours && minutes) return `${hours}h ${minutes}m`;
    if (hours) return `${hours}h`;
    if (minutes) return `${minutes}m`;
    return '';
  }
  
  async function handleMarkCooked() {
    if (!recipe) return;
    await markAsCooked(recipe._id);
    await loadRecipe();
  }
  
  async function handleDelete() {
    if (!recipe) return;
    if (!confirm(`Delete "${recipe.name}"? This cannot be undone.`)) return;
    
    await deleteRecipe(recipe._id);
    goto('/');
  }
  
  function handleExport() {
    if (!recipe) return;
    
    const exported = exportRecipe(recipe);
    const json = JSON.stringify(exported, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recipe.name.toLowerCase().replace(/\s+/g, '-')}.soustack.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }
</script>

<svelte:head>
  <title>{recipe?.name ?? 'Recipe'} - Soustack</title>
</svelte:head>

{#if loading}
  <div class="loading">Loading recipe...</div>
{:else if error}
  <div class="error">
    <p>{error}</p>
    <a href="/" class="btn btn-secondary">Back to recipes</a>
  </div>
{:else if recipe}
  <article class="recipe-detail">
    <!-- Header -->
    <header class="recipe-header">
      <div class="header-top">
        <a href="/" class="back-link">← Back</a>
        <div class="header-actions">
          <button class="btn btn-ghost" on:click={handleExport}>Export</button>
          <button class="btn btn-ghost" on:click={handleDelete}>Delete</button>
        </div>
      </div>
      
      <h1>{recipe.name}</h1>
      
      {#if recipe.description}
        <p class="recipe-description">{recipe.description}</p>
      {/if}
      
      <!-- Meta info -->
      <div class="recipe-meta">
        {#if recipe.time?.total}
          <div class="meta-item">
            <span class="meta-label">Total Time</span>
            <span class="meta-value">{formatDuration(recipe.time.total)}</span>
          </div>
        {/if}
        
        {#if recipe.time?.active}
          <div class="meta-item">
            <span class="meta-label">Active</span>
            <span class="meta-value">{formatDuration(recipe.time.active)}</span>
          </div>
        {/if}
        
        {#if recipe.yield?.servings}
          <div class="meta-item">
            <span class="meta-label">Servings</span>
            <span class="meta-value">{recipe.yield.servings}</span>
          </div>
        {/if}
        
        {#if recipe._cookCount > 0}
          <div class="meta-item">
            <span class="meta-label">Cooked</span>
            <span class="meta-value">{recipe._cookCount} times</span>
          </div>
        {/if}
      </div>
      
      {#if recipe.tags && recipe.tags.length > 0}
        <div class="recipe-tags">
          {#each recipe.tags as tag}
            <span class="tag">{tag}</span>
          {/each}
        </div>
      {/if}
    </header>
    
    <!-- Scale Control -->
    <section class="scale-section">
      <ScaleControl 
        baseServings={recipe.yield?.servings ?? 4} 
        bind:scaleFactor 
      />
    </section>
    
    <div class="recipe-content">
      <!-- Ingredients -->
      <section class="ingredients-section">
        <h2>Ingredients</h2>
        <IngredientList ingredients={recipe.ingredients} {scaleFactor} />
      </section>
      
      <!-- Instructions -->
      <section class="instructions-section">
        <h2>Instructions</h2>
        <InstructionList instructions={recipe.instructions} />
      </section>
    </div>
    
    <!-- Actions -->
    <footer class="recipe-footer">
      <button class="btn btn-primary" on:click={handleMarkCooked}>
        ✓ I Made This
      </button>
      
      {#if recipe.source?.url}
        <a 
          href={recipe.source.url} 
          target="_blank" 
          rel="noopener noreferrer"
          class="btn btn-secondary"
        >
          View Original
        </a>
      {/if}
    </footer>
  </article>
{/if}

<style>
  .recipe-detail {
    max-width: 800px;
    margin: 0 auto;
  }
  
  .loading, .error {
    text-align: center;
    padding: var(--space-2xl);
  }
  
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-md);
  }
  
  .back-link {
    color: var(--color-text-muted);
    text-decoration: none;
  }
  
  .back-link:hover {
    color: var(--color-text);
  }
  
  .header-actions {
    display: flex;
    gap: var(--space-sm);
  }
  
  .recipe-header h1 {
    margin: 0 0 var(--space-sm);
  }
  
  .recipe-description {
    color: var(--color-text-muted);
    font-size: 1.125rem;
    margin: 0 0 var(--space-md);
  }
  
  .recipe-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-lg);
    margin-bottom: var(--space-md);
  }
  
  .meta-item {
    display: flex;
    flex-direction: column;
  }
  
  .meta-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
  }
  
  .meta-value {
    font-size: 1.125rem;
    font-weight: 600;
  }
  
  .recipe-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }
  
  .scale-section {
    margin: var(--space-xl) 0;
    padding: var(--space-lg);
    background: var(--color-surface);
    border-radius: var(--radius-lg);
  }
  
  .recipe-content {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: var(--space-xl);
    margin: var(--space-xl) 0;
  }
  
  @media (max-width: 768px) {
    .recipe-content {
      grid-template-columns: 1fr;
    }
  }
  
  .recipe-content h2 {
    font-size: 1.25rem;
    margin: 0 0 var(--space-md);
  }
  
  .recipe-footer {
    display: flex;
    gap: var(--space-md);
    padding-top: var(--space-xl);
    border-top: 1px solid var(--color-border);
  }
</style>
