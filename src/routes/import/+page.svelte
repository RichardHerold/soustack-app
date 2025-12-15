<script lang="ts">
  import { goto } from '$app/navigation';
  import { importRecipe } from '$lib/db/recipes';
  
  let importMethod: 'url' | 'file' | 'paste' = 'url';
  let urlInput = '';
  let pasteInput = '';
  let fileInput: HTMLInputElement;
  
  let loading = false;
  let error: string | null = null;
  
  async function handleUrlImport() {
    if (!urlInput.trim()) {
      error = 'Please enter a URL';
      return;
    }
    
    loading = true;
    error = null;
    
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlInput.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to scrape recipe');
      }

      const { recipe } = await response.json();
      const id = await importRecipe(recipe, urlInput.trim());
      goto(`/recipe/${id}`);
      
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to import recipe';
    } finally {
      loading = false;
    }
  }
  
  async function handleFileImport(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;
    
    loading = true;
    error = null;
    
    try {
      const text = await file.text();
      const id = await importRecipe(text, `file:${file.name}`);
      goto(`/recipe/${id}`);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to import file';
    } finally {
      loading = false;
    }
  }
  
  async function handlePasteImport() {
    if (!pasteInput.trim()) {
      error = 'Please paste some JSON';
      return;
    }
    
    loading = true;
    error = null;
    
    try {
      const id = await importRecipe(pasteInput, 'paste');
      goto(`/recipe/${id}`);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to parse JSON';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Import Recipe - Soustack</title>
</svelte:head>

<div class="import-page">
  <header>
    <a href="/" class="back-link">← Back</a>
    <h1>Import Recipe</h1>
    <p class="subtitle">Add a recipe from a URL, file, or paste JSON directly</p>
  </header>
  
  <!-- Import Method Tabs -->
  <div class="method-tabs">
    <button
      class="tab"
      class:active={importMethod === 'url'}
      on:click={() => importMethod = 'url'}
    >
      From URL
    </button>
    <button
      class="tab"
      class:active={importMethod === 'file'}
      on:click={() => importMethod = 'file'}
    >
      From File
    </button>
    <button
      class="tab"
      class:active={importMethod === 'paste'}
      on:click={() => importMethod = 'paste'}
    >
      Paste JSON
    </button>
  </div>
  
  <!-- Import Forms -->
  <div class="import-form card">
    {#if importMethod === 'url'}
      <div class="form-group">
        <label for="url-input">Recipe URL</label>
        <input
          id="url-input"
          type="url"
          placeholder="https://example.com/recipe/..."
          bind:value={urlInput}
          disabled={loading}
        />
        <p class="hint">
          Paste a link to any recipe page. We'll extract the recipe data automatically.
        </p>
      </div>
      <button
        class="btn btn-primary"
        on:click={handleUrlImport}
        disabled={loading}
      >
        {loading ? 'Importing...' : 'Import from URL'}
      </button>
      
    {:else if importMethod === 'file'}
      <div class="form-group">
        <label for="file-input">Recipe File</label>
        <div class="file-drop">
          <input
            id="file-input"
            type="file"
            accept=".json,.soustack.json"
            bind:this={fileInput}
            on:change={handleFileImport}
            disabled={loading}
          />
          <div class="file-drop-content">
            <span class="file-icon">📄</span>
            <span>Drop a .json file here or click to browse</span>
          </div>
        </div>
        <p class="hint">
          Upload a Soustack JSON file or any JSON recipe file.
        </p>
      </div>
      
    {:else if importMethod === 'paste'}
      <div class="form-group">
        <label for="paste-input">Recipe JSON</label>
        <textarea
          id="paste-input"
          placeholder={`{
  "soustack": "0.1",
  "name": "My Recipe",
  "ingredients": [...],
  "instructions": [...]
}`}
          rows="12"
          bind:value={pasteInput}
          disabled={loading}
        />
        <p class="hint">
          Paste Soustack JSON or Schema.org recipe JSON.
        </p>
      </div>
      <button
        class="btn btn-primary"
        on:click={handlePasteImport}
        disabled={loading}
      >
        {loading ? 'Importing...' : 'Import JSON'}
      </button>
    {/if}
    
    {#if error}
      <div class="error-message">
        {error}
      </div>
    {/if}
  </div>
  
  <!-- Sample Recipe -->
  <div class="sample-section">
    <h3>Try a sample recipe</h3>
    <p>Don't have a recipe handy? Try this sample:</p>
    <button
      class="btn btn-secondary"
      on:click={() => {
        pasteInput = JSON.stringify({
          soustack: "0.1",
          name: "Basic Sourdough Bread",
          description: "A simple sourdough loaf with a crispy crust and chewy interior.",
          yield: {
            amount: 1,
            unit: "loaf",
            servings: 8
          },
          time: {
            active: "PT45M",
            passive: "PT14H",
            total: "PT16H"
          },
          tags: ["bread", "sourdough", "fermented"],
          ingredients: [
            {
              item: "500g bread flour",
              quantity: { amount: 500, unit: "g" },
              name: "bread flour",
              scaling: { type: "linear" }
            },
            {
              item: "375g water",
              quantity: { amount: 375, unit: "g" },
              name: "water",
              scaling: { type: "linear" }
            },
            {
              item: "100g active sourdough starter",
              quantity: { amount: 100, unit: "g" },
              name: "sourdough starter",
              scaling: { type: "linear" }
            },
            {
              item: "10g salt",
              quantity: { amount: 10, unit: "g" },
              name: "salt",
              scaling: { type: "proportional", factor: 0.7 }
            }
          ],
          instructions: [
            { step: "Mix flour and water in a large bowl. Let rest for 30 minutes (autolyse).", duration: "PT30M" },
            { step: "Add starter and salt. Mix until well combined. The dough will be shaggy.", duration: "PT5M" },
            { step: "Over the next 3-4 hours, perform 4 sets of stretch and folds, 45 minutes apart.", duration: "PT4H" },
            { step: "Shape the dough into a round and place in a floured banneton.", duration: "PT10M" },
            { step: "Cover and refrigerate for 8-14 hours.", duration: "PT12H" },
            { step: "Preheat oven to 500°F with a Dutch oven inside for 45 minutes.", duration: "PT45M" },
            { step: "Score the dough and bake covered for 20 minutes, then uncovered for 20-25 minutes until deep golden.", duration: "PT45M" },
            { step: "Cool completely before slicing, at least 1 hour." }
          ]
        }, null, 2);
        importMethod = 'paste';
      }}
    >
      Load Sample Recipe
    </button>
  </div>
</div>

<style>
  .import-page {
    max-width: 600px;
    margin: 0 auto;
  }
  
  header {
    margin-bottom: var(--space-xl);
  }
  
  .back-link {
    color: var(--color-text-muted);
    text-decoration: none;
    display: inline-block;
    margin-bottom: var(--space-md);
  }
  
  .back-link:hover {
    color: var(--color-text);
  }
  
  h1 {
    margin: 0 0 var(--space-sm);
  }
  
  .subtitle {
    color: var(--color-text-muted);
    margin: 0;
  }
  
  .method-tabs {
    display: flex;
    gap: var(--space-sm);
    margin-bottom: var(--space-lg);
  }
  
  .tab {
    flex: 1;
    padding: var(--space-md);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
  }
  
  .tab:hover {
    border-color: var(--color-primary);
  }
  
  .tab.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
  }
  
  .import-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }
  
  .form-group label {
    font-weight: 500;
  }
  
  .hint {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    margin: 0;
  }
  
  .file-drop {
    position: relative;
    border: 2px dashed var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-xl);
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .file-drop:hover {
    border-color: var(--color-primary);
  }
  
  .file-drop input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
  
  .file-drop-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
    color: var(--color-text-muted);
  }
  
  .file-icon {
    font-size: 2rem;
  }
  
  textarea {
    font-family: var(--font-mono);
    font-size: 0.875rem;
    resize: vertical;
  }
  
  .error-message {
    padding: var(--space-md);
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: var(--radius-md);
    color: #dc2626;
    font-size: 0.875rem;
  }
  
  .sample-section {
    margin-top: var(--space-2xl);
    padding-top: var(--space-xl);
    border-top: 1px solid var(--color-border);
  }
  
  .sample-section h3 {
    margin: 0 0 var(--space-sm);
  }
  
  .sample-section p {
    color: var(--color-text-muted);
    margin: 0 0 var(--space-md);
  }
</style>
