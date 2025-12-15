<script lang="ts">
  import type { SoustackInstruction } from '$lib/db';
  
  export let instructions: Array<string | SoustackInstruction>;
  
  // Track completed steps
  let completedSteps: Set<number> = new Set();
  
  function toggleStep(index: number) {
    if (completedSteps.has(index)) {
      completedSteps.delete(index);
    } else {
      completedSteps.add(index);
    }
    completedSteps = completedSteps; // Trigger reactivity
  }
  
  // Format duration
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
  
  // Get step text from string or object
  function getStepText(instruction: string | SoustackInstruction): string {
    return typeof instruction === 'string' ? instruction : instruction.step;
  }
  
  // Get step metadata
  function getStepMeta(instruction: string | SoustackInstruction): {
    duration?: string;
    equipment?: string;
    notes?: string;
  } {
    if (typeof instruction === 'string') return {};
    return {
      duration: instruction.duration ? formatDuration(instruction.duration) : undefined,
      equipment: instruction.equipment,
      notes: instruction.notes
    };
  }
</script>

<ol class="instruction-list">
  {#each instructions as instruction, i}
    {@const meta = getStepMeta(instruction)}
    <li 
      class="instruction-item"
      class:completed={completedSteps.has(i)}
    >
      <button 
        class="step-number"
        on:click={() => toggleStep(i)}
        aria-label={completedSteps.has(i) ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {#if completedSteps.has(i)}
          ✓
        {:else}
          {i + 1}
        {/if}
      </button>
      
      <div class="step-content">
        <p class="step-text">{getStepText(instruction)}</p>
        
        {#if meta.duration || meta.equipment}
          <div class="step-meta">
            {#if meta.duration}
              <span class="meta-badge">⏱ {meta.duration}</span>
            {/if}
            {#if meta.equipment}
              <span class="meta-badge">🍳 {meta.equipment}</span>
            {/if}
          </div>
        {/if}
        
        {#if meta.notes}
          <p class="step-notes">{meta.notes}</p>
        {/if}
      </div>
    </li>
  {/each}
</ol>

<style>
  .instruction-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    counter-reset: step;
  }
  
  .instruction-item {
    display: flex;
    gap: var(--space-md);
  }
  
  .step-number {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .step-number:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }
  
  .instruction-item.completed .step-number {
    background: var(--color-success);
    border-color: var(--color-success);
    color: white;
  }
  
  .step-content {
    flex: 1;
    min-width: 0;
  }
  
  .step-text {
    margin: 0;
    line-height: 1.7;
  }
  
  .instruction-item.completed .step-text {
    color: var(--color-text-muted);
  }
  
  .step-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
    margin-top: var(--space-sm);
  }
  
  .meta-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: 0.75rem;
    padding: var(--space-xs) var(--space-sm);
    background: var(--color-surface);
    border-radius: var(--radius-full);
    color: var(--color-text-muted);
  }
  
  .step-notes {
    margin: var(--space-sm) 0 0;
    font-size: 0.875rem;
    color: var(--color-text-muted);
    font-style: italic;
    padding-left: var(--space-md);
    border-left: 2px solid var(--color-border);
  }
</style>
