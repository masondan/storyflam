<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { COLOR_PALETTES } from '$lib/stores'

  export let selectedColor: string = '5422b0'
  export let disabled: boolean = false

  const dispatch = createEventDispatcher<{ select: { primary: string; secondary: string } }>()

  function handleSelect(palette: typeof COLOR_PALETTES[number]) {
    if (disabled) return
    dispatch('select', { primary: palette.primary, secondary: palette.secondary })
  }
</script>

<div class="space-y-3">
  <div class="flex items-baseline justify-between border-b border-[#e0e0e0] pb-1">
    <span class="text-sm text-[#777777]">Pick a theme</span>
  </div>
  
  <div class="flex gap-3 pt-1">
    {#each COLOR_PALETTES as palette}
      <button
        type="button"
        on:click={() => handleSelect(palette)}
        disabled={disabled}
        class="relative w-8 h-8 rounded-full transition-transform"
        class:opacity-50={disabled}
        class:cursor-not-allowed={disabled}
        style="background-color: #{palette.primary};"
        aria-label={palette.name}
        title={palette.name}
      >
        {#if selectedColor === palette.primary}
          <span 
            class="absolute inset-[-4px] rounded-full border-2"
            style="border-color: #{palette.primary};"
          ></span>
        {/if}
      </button>
    {/each}
  </div>
</div>
