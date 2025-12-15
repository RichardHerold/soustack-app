<script lang="ts">
  import type { StoredRecipe } from "$lib/db";
  import { toggleFavorite } from "$lib/db/recipes";

  export let recipe: StoredRecipe;

  // Format time display
  function formatTime(time?: string | number): string {
    if (!time) return "";

    // Handle number (minutes)
    if (typeof time === "number") {
      const hours = Math.floor(time / 60);
      const minutes = time % 60;
      if (hours && minutes) return `${hours}h ${minutes}m`;
      if (hours) return `${hours}h`;
      if (minutes) return `${minutes}m`;
      return "";
    }

    // Handle string
    if (typeof time !== "string") return "";

    // Check if it's a number string (minutes)
    const minutesNum = parseInt(time, 10);
    if (!isNaN(minutesNum) && time === minutesNum.toString()) {
      const hours = Math.floor(minutesNum / 60);
      const minutes = minutesNum % 60;
      if (hours && minutes) return `${hours}h ${minutes}m`;
      if (hours) return `${hours}h`;
      if (minutes) return `${minutes}m`;
      return "";
    }

    // Parse ISO 8601 duration (e.g., "PT1H30M")
    const match = time.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return time;

    const hours = parseInt(match[1] || "0");
    const minutes = parseInt(match[2] || "0");

    if (hours && minutes) return `${hours}h ${minutes}m`;
    if (hours) return `${hours}h`;
    if (minutes) return `${minutes}m`;
    return "";
  }

  // Get ingredient count
  $: ingredientCount = recipe.ingredients?.length || 0;

  // Get total time
  $: totalTime = formatTime(recipe.time?.total);

  async function handleFavorite(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    await toggleFavorite(recipe._id);
  }
</script>

<a href="/recipe/{recipe._id}" class="recipe-card card">
  <div class="card-header">
    <h3 class="recipe-name">{recipe.name}</h3>
    <button
      class="favorite-btn"
      class:is-favorite={recipe._favorite}
      on:click={handleFavorite}
      aria-label={recipe._favorite
        ? "Remove from favorites"
        : "Add to favorites"}
    >
      {recipe._favorite ? "★" : "☆"}
    </button>
  </div>

  {#if recipe.description}
    <p class="recipe-description">{recipe.description}</p>
  {/if}

  <div class="recipe-meta">
    {#if totalTime}
      <span class="meta-item">
        <span class="meta-icon">⏱</span>
        {totalTime}
      </span>
    {/if}

    <span class="meta-item">
      <span class="meta-icon">🥕</span>
      {ingredientCount} ingredients
    </span>

    {#if recipe.yield?.servings}
      <span class="meta-item">
        <span class="meta-icon">👥</span>
        {recipe.yield.servings} servings
      </span>
    {/if}
  </div>

  {#if recipe.tags && recipe.tags.length > 0}
    <div class="recipe-tags">
      {#each recipe.tags.slice(0, 3) as tag}
        <span class="tag">{tag}</span>
      {/each}
      {#if recipe.tags.length > 3}
        <span class="tag">+{recipe.tags.length - 3}</span>
      {/if}
    </div>
  {/if}
</a>

<style>
  .recipe-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    text-decoration: none;
    color: inherit;
    transition:
      transform 0.2s,
      box-shadow 0.2s;
  }

  .recipe-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
    text-decoration: none;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-sm);
  }

  .recipe-name {
    margin: 0;
    font-size: 1.125rem;
    line-height: 1.3;
  }

  .favorite-btn {
    background: none;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0;
    color: var(--color-text-light);
    transition: color 0.2s;
  }

  .favorite-btn:hover {
    color: var(--color-warning);
  }

  .favorite-btn.is-favorite {
    color: var(--color-warning);
  }

  .recipe-description {
    color: var(--color-text-muted);
    font-size: 0.875rem;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .recipe-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-md);
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  .meta-icon {
    font-size: 1rem;
  }

  .recipe-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    margin-top: var(--space-xs);
  }
</style>
