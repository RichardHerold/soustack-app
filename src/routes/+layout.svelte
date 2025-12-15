<script lang="ts">
  import { recipeCount } from '$lib/stores/recipes';
  import '../app.css';
</script>

<div class="app">
  <header>
    <nav>
      <a href="/" class="logo">
        <span class="logo-icon">🥣</span>
        <span class="logo-text">Soustack</span>
      </a>
      
      <div class="nav-links">
        <a href="/">Recipes</a>
        <a href="/import">Import</a>
      </div>
      
      <div class="nav-meta">
        <span class="recipe-count">{$recipeCount} recipes</span>
      </div>
    </nav>
  </header>
  
  <main>
    <slot />
  </main>
  
  <footer>
    <p>
      Built on the <a href="https://soustack.org" target="_blank" rel="noopener">Soustack</a> format
    </p>
  </footer>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  
  header {
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    padding: 0 1rem;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  
  nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1200px;
    margin: 0 auto;
    height: 60px;
  }
  
  .logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    color: var(--color-text);
    font-weight: 600;
    font-size: 1.25rem;
  }
  
  .logo-icon {
    font-size: 1.5rem;
  }
  
  .nav-links {
    display: flex;
    gap: 1.5rem;
  }
  
  .nav-links a {
    text-decoration: none;
    color: var(--color-text-muted);
    transition: color 0.2s;
  }
  
  .nav-links a:hover {
    color: var(--color-text);
  }
  
  .nav-meta {
    color: var(--color-text-muted);
    font-size: 0.875rem;
  }
  
  main {
    flex: 1;
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
    width: 100%;
  }
  
  footer {
    border-top: 1px solid var(--color-border);
    padding: 1rem;
    text-align: center;
    color: var(--color-text-muted);
    font-size: 0.875rem;
  }
  
  footer a {
    color: var(--color-primary);
  }
</style>
