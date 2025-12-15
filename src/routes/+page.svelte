<script lang="ts">
  import {
    filteredRecipes,
    searchQuery,
    activeTagFilter,
    allTags,
    recipeCount,
  } from "$lib/stores/recipes";
  import RecipeCard from "$lib/components/RecipeCard.svelte";
  import { cleanupRecipeTags } from "$lib/db/recipes";
  import { onMount } from "svelte";

  function clearFilters() {
    $searchQuery = "";
    $activeTagFilter = null;
  }

  // Run cleanup on mount to fix existing recipes
  onMount(async () => {
    try {
      const cleaned = await cleanupRecipeTags();
      if (cleaned > 0) {
        console.log(`Cleaned tags in ${cleaned} recipes`);
      }
    } catch (e) {
      console.error("Error cleaning tags:", e);
    }
  });
</script>

<svelte:head>
  <title>Soustack</title>
</svelte:head>

<div class="home">
  <!-- Search & Filters -->
  <section class="search-section">
    <div class="search-bar">
      <input
        type="search"
        placeholder="Search recipes..."
        bind:value={$searchQuery}
      />
    </div>

    {#if $allTags.length > 0}
      <div class="tags">
        <button
          class="tag"
          class:tag-active={$activeTagFilter === null}
          on:click={() => ($activeTagFilter = null)}
        >
          All
        </button>
        {#each $allTags as tag}
          <button
            class="tag"
            class:tag-active={$activeTagFilter === tag}
            on:click={() => ($activeTagFilter = tag)}
          >
            {tag}
          </button>
        {/each}
      </div>
    {/if}
  </section>

  <!-- Recipe Grid -->
  {#if $filteredRecipes.length > 0}
    <section class="recipes-grid">
      {#each $filteredRecipes as recipe (recipe._id)}
        <RecipeCard {recipe} />
      {/each}
    </section>
  {:else if $recipeCount === 0}
    <!-- Empty State - No Recipes -->
    <section class="empty-state">
      <div class="empty-icon">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="12" y="8" width="40" height="48" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
          <line x1="20" y1="18" x2="44" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="20" y1="26" x2="44" y2="26" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="20" y1="34" x2="36" y2="34" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="20" y1="42" x2="40" y2="42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <h2>No recipes yet</h2>
      <p>Import your first recipe to get started</p>
      <a href="/import" class="btn btn-import">Import a Recipe</a>
    </section>
  {:else}
    <!-- Empty State - No Results -->
    <section class="empty-state">
      <div class="empty-icon">🔍</div>
      <h2>No recipes found</h2>
      <p>Try a different search or filter</p>
      <button class="btn btn-secondary" on:click={clearFilters}>
        Clear filters
      </button>
    </section>
  {/if}
</div>

<style>
  .home {
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
  }

  .search-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .search-bar input {
    max-width: 400px;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
  }

  .recipes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--space-lg);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: var(--space-2xl);
    gap: var(--space-md);
  }

  .empty-icon {
    opacity: 0.4;
    color: var(--color-text);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .empty-icon svg {
    width: 64px;
    height: 64px;
  }

  .empty-state h2 {
    margin: 0;
  }

  .empty-state p {
    color: var(--color-text-muted);
    margin: 0;
  }

  .btn-import {
    background: #0F172A; /* Midnight */
    color: #ffffff;
    font-weight: 500;
  }

  .btn-import:hover {
    background: #1E293B;
    color: #ffffff;
  }
</style>
