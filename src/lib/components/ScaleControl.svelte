<script lang="ts">
  export let baseServings: number;
  export let scaleFactor: number = 1;
  
  // Preset scale options
  const presets = [0.5, 1, 1.5, 2, 3, 4];
  
  $: currentServings = Math.round(baseServings * scaleFactor);
  
  function setScale(factor: number) {
    scaleFactor = factor;
  }
  
  function handleCustomServings(e: Event) {
    const target = e.target as HTMLInputElement;
    const newServings = parseInt(target.value);
    if (newServings > 0) {
      scaleFactor = newServings / baseServings;
    }
  }
</script>

<div class="scale-control">
  <div class="scale-header">
    <span class="scale-label">Scale Recipe</span>
    <span class="scale-value">
      {scaleFactor === 1 ? 'Original' : `${scaleFactor}×`}
    </span>
  </div>
  
  <div class="scale-presets">
    {#each presets as preset}
      <button
        class="preset-btn"
        class:active={scaleFactor === preset}
        on:click={() => setScale(preset)}
      >
        {preset === 1 ? '1× (Original)' : `${preset}×`}
      </button>
    {/each}
  </div>
  
  <div class="scale-custom">
    <label for="servings-input">
      Or set servings:
    </label>
    <div class="servings-input-wrapper">
      <input
        id="servings-input"
        type="number"
        min="1"
        value={currentServings}
        on:change={handleCustomServings}
      />
      <span class="servings-unit">servings</span>
    </div>
    <span class="servings-base">
      (base: {baseServings})
    </span>
  </div>
</div>

<style>
  .scale-control {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }
  
  .scale-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .scale-label {
    font-weight: 600;
  }
  
  .scale-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-primary);
  }
  
  .scale-presets {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
  }
  
  .preset-btn {
    padding: var(--space-sm) var(--space-md);
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.875rem;
  }
  
  .preset-btn:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }
  
  .preset-btn.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
  }
  
  .scale-custom {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex-wrap: wrap;
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }
  
  .servings-input-wrapper {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }
  
  .scale-custom input {
    width: 60px;
    text-align: center;
    padding: var(--space-xs) var(--space-sm);
  }
  
  .servings-unit {
    color: var(--color-text-muted);
  }
  
  .servings-base {
    color: var(--color-text-light);
    font-size: 0.75rem;
  }
</style>
