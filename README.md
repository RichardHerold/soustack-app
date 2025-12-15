# Soustack App

**Recipes that compute.** A local-first recipe manager built on the [Soustack](https://soustack.org) open recipe format.

## Features

- **Intelligent Scaling** — Scale recipes up or down with smart ingredient adjustments (salt scales proportionally, eggs round discretely, bay leaves stay fixed)
- **Import from Anywhere** — Paste JSON, upload files, or scrape from URLs
- **Local-First** — Your recipes live in your browser. No account needed.
- **Export Anytime** — Export to Soustack JSON or Schema.org for portability

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Tech Stack

- **SvelteKit** — Full-stack Svelte framework
- **Dexie.js** — IndexedDB wrapper for local storage
- **soustack** — Core parsing, validation, and scaling logic (coming soon)

## Project Structure

```
src/
├── lib/
│   ├── db/              # Dexie database schema and operations
│   │   ├── index.ts     # Database schema
│   │   └── recipes.ts   # CRUD operations
│   ├── stores/          # Svelte stores (reactive queries)
│   │   └── recipes.ts
│   └── components/      # Reusable UI components
│       ├── RecipeCard.svelte
│       ├── ScaleControl.svelte
│       ├── IngredientList.svelte
│       └── InstructionList.svelte
├── routes/
│   ├── +page.svelte     # Home (recipe list)
│   ├── +layout.svelte   # App shell
│   ├── recipe/[id]/     # Recipe detail view
│   └── import/          # Import workflow
└── app.css              # Global styles
```

## MVP Roadmap

- [x] Project scaffold
- [x] Dexie database schema
- [x] Recipe list view
- [x] Recipe detail view with scaling
- [x] Import via paste/file
- [ ] Integrate soustack-core for parsing
- [ ] Import via URL scraping
- [ ] PWA manifest & service worker
- [ ] Deploy to Vercel

## Data Model

Recipes are stored in Soustack format with additional app metadata:

```typescript
interface StoredRecipe extends SoustackRecipe {
  _id: string;           // UUID
  _createdAt: Date;
  _updatedAt: Date;
  _cookCount: number;
  _favorite: boolean;
}
```

App-specific fields use underscore prefix (`_`) and are stripped on export.

## License

MIT
