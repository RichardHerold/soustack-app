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
      <div class="empty-icon">📚</div>
      <h2>No recipes yet</h2>
      <p>Import your first recipe to get started</p>
      <a href="/import" class="btn btn-primary">Import a Recipe</a>
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
    font-size: 4rem;
    opacity: 0.5;
  }

  .empty-state h2 {
    margin: 0;
  }

  .empty-state p {
    color: var(--color-text-muted);
    margin: 0;
  }
</style>
