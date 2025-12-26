<script lang="ts">
  import { storyReaderDrawerOpen, currentViewingStory, session } from '$lib/stores'
  import { fly } from 'svelte/transition'

  $: teamName = $session?.teamName || 'Team NewsLab'
  $: story = $currentViewingStory

  function closeDrawer() {
    storyReaderDrawerOpen.set(false)
    currentViewingStory.set(null)
  }
</script>

{#if $storyReaderDrawerOpen}
  <div
    class="fixed inset-0 z-50 bg-white flex flex-col"
    transition:fly={{ y: '100%', duration: 300 }}
  >
    <!-- Team Header -->
    <header class="bg-[#f0e6f7] py-4 text-center border-b-2 border-[#5422b0]">
      <div class="w-12 h-12 mx-auto mb-2 rounded-lg overflow-hidden bg-white">
        <img
          src="/icons/logo-teamstream-fallback.png"
          alt="Team logo"
          class="w-full h-full object-cover"
        />
      </div>
      <h1 class="text-base font-semibold text-[#5422b0]">
        {teamName}
      </h1>
    </header>

    <!-- Close button -->
    <button
      on:click={closeDrawer}
      class="absolute top-4 left-4 w-8 h-8 rounded-full bg-[#efefef] flex items-center justify-center z-10"
      aria-label="Close"
    >
      <img
        src="/icons/icon-close.svg"
        alt=""
        class="w-4 h-4"
        style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
      />
    </button>

    <!-- Content (placeholder - will be populated in Phase 5) -->
    <main class="flex-1 px-4 py-6 overflow-y-auto">
      {#if story}
        <article>
          <p class="text-sm text-[#777777] mb-1">By Author Name</p>
          <h2 class="text-2xl font-bold text-black mb-4">{story.title}</h2>
          <p class="text-base text-[#333333] leading-relaxed">
            Story content will be displayed here...
          </p>
        </article>
      {:else}
        <div class="text-center text-[#777777]">
          <p>No story selected</p>
        </div>
      {/if}
    </main>
  </div>
{/if}
