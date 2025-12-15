<script lang="ts">
  import { recipeCount } from "$lib/stores/recipes";
  import "../app.css";
  import logoSvg from "$lib/assets/logo.svg?url";
</script>

<div class="app">
  <header>
    <nav>
      <a href="/" class="logo">
        <img src={logoSvg} alt="Soustack" class="logo-icon" />
        <span class="logo-text">soustack</span>
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
      Built on the <a href="https://soustack.org" target="_blank" rel="noopener"
        >Soustack</a
      > format
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
    background: #faf9f7;
    border-bottom: 1px solid var(--color-border);
    padding: 0 2rem;
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
    height: 64px;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    text-decoration: none;
    color: var(--color-text);
    font-family: "IBM Plex Mono", "SF Mono", Consolas, monospace;
    font-weight: 700;
    font-size: 1.5rem;
    letter-spacing: -0.02em;
    transition: opacity 0.2s;
  }

  .logo-text {
    margin-left: -20px;
  }

  .logo:hover {
    opacity: 0.7;
    text-decoration: none;
  }

  .logo-icon {
    flex-shrink: 0;
    display: block;
    width: 32px;
    height: 32px;
    object-fit: contain;
  }

  .nav-links {
    display: flex;
    gap: 2rem;
  }

  .nav-links a {
    text-decoration: none;
    color: var(--color-text-muted);
    font-size: 0.9375rem;
    font-weight: 400;
    transition: color 0.2s;
  }

  .nav-links a:hover {
    color: var(--color-text);
    text-decoration: none;
  }

  .nav-meta {
    color: var(--color-text-muted);
    font-size: 0.875rem;
    font-weight: 400;
  }

  main {
    flex: 1;
    max-width: 1200px;
    margin: 0 auto;
    padding: 3rem 2rem;
    width: 100%;
  }

  footer {
    border-top: 1px solid var(--color-border);
    padding: 2rem;
    text-align: center;
    color: var(--color-text-muted);
    font-size: 0.875rem;
    font-weight: 400;
  }

  footer a {
    color: var(--color-text);
    text-decoration: underline;
  }

  footer a:hover {
    color: var(--color-text-muted);
  }
</style>
