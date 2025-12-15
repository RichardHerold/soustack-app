<script lang="ts">
  export let images: string[] = [];
  export let alt: string;

  let activeIndex = 0;
  let failedImages: Set<number> = new Set();
  let lastImagesRef: string[] = [];

  $: imageEntries = images
    .map((src, index) => ({ src, index }))
    .filter((entry) => !!entry.src && !failedImages.has(entry.index));

  $: hasImages = imageEntries.length > 0;
  $: hasMultiple = imageEntries.length > 1;

  $: if (activeIndex >= imageEntries.length) {
    activeIndex = Math.max(imageEntries.length - 1, 0);
  }

  $: if (images !== lastImagesRef) {
    lastImagesRef = images;
    failedImages = new Set();
    activeIndex = 0;
  }

  function next() {
    if (!hasMultiple) return;
    activeIndex = (activeIndex + 1) % imageEntries.length;
  }

  function prev() {
    if (!hasMultiple) return;
    activeIndex = (activeIndex - 1 + imageEntries.length) % imageEntries.length;
  }

  function goTo(index: number) {
    activeIndex = index;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!hasMultiple) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      next();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      prev();
    }
  }

  function hideImage(entryIndex: number) {
    failedImages.add(entryIndex);
    failedImages = new Set(failedImages);
  }
</script>

{#if hasImages}
  <div class="gallery" role="region" aria-label="Recipe images">
    <div
      class="gallery-main"
      tabindex="0"
      on:keydown={handleKeydown}
      on:click={() => hasMultiple && next()}
      aria-live="polite"
    >
      <img
        src={imageEntries[activeIndex]?.src}
        alt={alt}
        loading="lazy"
        on:error={() => {
          const entryIndex = imageEntries[activeIndex]?.index;
          if (typeof entryIndex === "number") {
            hideImage(entryIndex);
          }
        }}
      />

      {#if hasMultiple}
        <button
          class="gallery-prev"
          on:click|stopPropagation={prev}
          aria-label="Previous image"
        >
          ‹
        </button>
        <button
          class="gallery-next"
          on:click|stopPropagation={next}
          aria-label="Next image"
        >
          ›
        </button>
      {/if}
    </div>

    {#if hasMultiple}
      <div class="gallery-thumbnails">
        {#each imageEntries as entry, i}
          <button
            class="thumbnail"
            class:active={i === activeIndex}
            on:click={() => goTo(i)}
            aria-label={`View image ${i + 1}`}
          >
            <img
              src={entry.src}
              alt=""
              loading="lazy"
              on:error={() => hideImage(entry.index)}
            />
          </button>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .gallery {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .gallery-main {
    position: relative;
    border-radius: var(--radius-lg);
    overflow: hidden;
    background: var(--color-surface);
    cursor: pointer;
    outline: none;
  }

  .gallery-main:focus-visible {
    box-shadow: 0 0 0 2px var(--color-primary);
  }

  .gallery-main img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .gallery-prev,
  .gallery-next {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(0, 0, 0, 0.4);
    color: white;
    border: none;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .gallery-prev {
    left: var(--space-sm);
  }

  .gallery-next {
    right: var(--space-sm);
  }

  .gallery-prev:hover,
  .gallery-next:hover {
    background: rgba(0, 0, 0, 0.6);
  }

  .gallery-thumbnails {
    display: flex;
    gap: var(--space-sm);
    overflow-x: auto;
  }

  .thumbnail {
    border: none;
    padding: 0;
    border-radius: var(--radius-md);
    overflow: hidden;
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.2s, transform 0.2s;
    background: transparent;
  }

  .thumbnail.active {
    opacity: 1;
    outline: 2px solid var(--color-text);
    outline-offset: 2px;
  }

  .thumbnail img {
    display: block;
    width: 64px;
    height: 64px;
    object-fit: cover;
  }
</style>
