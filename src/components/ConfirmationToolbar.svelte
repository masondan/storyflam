<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  export let message: string
  export let primaryColor: string = '5422b0'
  export let isLoading: boolean = false

  const dispatch = createEventDispatcher()

  function handleCancel() {
    dispatch('cancel')
  }

  function handleConfirm() {
    dispatch('confirm')
  }
</script>

<div class="flex items-center justify-center gap-3 py-2 px-4 rounded-full text-white" style="background-color: #{primaryColor};">
  <button
    type="button"
    on:click={handleCancel}
    disabled={isLoading}
    class="px-3 py-1 rounded-full border border-white text-white text-sm font-medium transition-all hover:bg-white hover:bg-opacity-20 disabled:opacity-50"
    aria-label="Cancel"
  >
    Cancel
  </button>
  <span class="text-sm font-medium">{message}</span>
  <button
    type="button"
    on:click={handleConfirm}
    disabled={isLoading}
    class="px-3 py-1 rounded-full border border-white text-white text-sm font-medium transition-all hover:bg-white hover:bg-opacity-20 disabled:opacity-50"
    aria-label="Confirm"
  >
    {isLoading ? 'Loading...' : 'Confirm'}
  </button>
</div>
