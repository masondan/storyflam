<script lang="ts">
  import { fly } from 'svelte/transition'
  import { afterUpdate, onDestroy } from 'svelte'
  import { previewDrawerOpen, session, teamColors } from '$lib/stores'
  import { getOptimizedUrl } from '$lib/cloudinary'
  import { renderContent } from '$lib/content'
  import { initPlyrInContainer } from '$lib/plyr-init'

  export let title = ''
  export let summary = ''
  export let featuredImageUrl: string | null = null
  export let featuredImageCaption = ''
  export let contentHtml: string = ''
  export let publicationName: string | null = null
  export let publicationLogoUrl: string | null = null

  let scrollY = 0
  let headerOpacity = 1
  let contentContainer: HTMLElement
  let cleanupPlyr: (() => void) | null = null
  let lastInitHtml = ''

  $: displayPublicationName = publicationName || $session?.publicationName || 'Publication Name'
  $: authorName = $session?.name || 'Journalist'

  function closeDrawer() {
    previewDrawerOpen.set(false)
  }

  function handleScroll(e: Event) {
    const main = e.target as HTMLElement
    scrollY = main.scrollTop
    // Reduce opacity as user scrolls down, min opacity at 100px
    headerOpacity = Math.max(0.3, 1 - scrollY / 100)
  }

  afterUpdate(async () => {
    // Only re-initialize if content changed and container exists
    if (!contentContainer || contentHtml === lastInitHtml) return
    lastInitHtml = contentHtml

    if (cleanupPlyr) { cleanupPlyr(); cleanupPlyr = null }
    cleanupPlyr = await initPlyrInContainer(contentContainer)
  })

  onDestroy(() => {
    if (cleanupPlyr) { cleanupPlyr(); cleanupPlyr = null }
  })
</script>

<div
  class="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-[480px] w-full z-[55] bg-white flex flex-col h-svh"
  transition:fly={{ x: '100%', duration: 300 }}
>
    <!-- Slim Header -->
    <header 
      class="sticky top-0 z-40 px-4 py-3 flex items-center justify-center transition-opacity duration-300 shadow-sm"
      style="background-color: #{$teamColors.secondary}cc; opacity: {headerOpacity};"
    >
      <!-- Close button -->
      <button
        on:click={closeDrawer}
        class="absolute left-4 w-8 h-8 rounded-full bg-[#efefef] flex items-center justify-center"
        aria-label="Close"
      >
        <img
          src="/icons/icon-close.svg"
          alt=""
          class="w-4 h-4"
          style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
        />
      </button>
      
      <h1 class="text-sm font-semibold" style="color: #{$teamColors.primary};">
        {displayPublicationName}
      </h1>
    </header>

    <!-- Content -->
    <main class="flex-1 overflow-y-auto px-4 py-6" on:scroll={handleScroll}>
      <!-- Author -->
      {#if title || summary || featuredImageUrl || contentHtml}
        <p class="text-sm text-[#777777] mb-2">By {authorName}</p>
      {/if}

      <!-- Title -->
      {#if title}
        <h2 class="text-2xl font-bold text-[#333333] mb-4">{title}</h2>
      {/if}

      <!-- Summary -->
      {#if summary}
        <p class="text-base text-[#333333] mb-4 italic">{summary}</p>
      {/if}

      <!-- Featured Image -->
      {#if featuredImageUrl}
        <figure class="mb-6">
          <img
            src={getOptimizedUrl(featuredImageUrl)}
            alt=""
            class="w-full rounded-lg"
          />
          {#if featuredImageCaption}
            <figcaption class="text-sm text-[#777777] text-center mt-2">
              {featuredImageCaption}
            </figcaption>
          {/if}
        </figure>
      {/if}

      <!-- Content Blocks -->
      <div class="story-content" bind:this={contentContainer}>
        {#if contentHtml}
          {@html contentHtml}
        {:else}
          <div class="text-center text-[#999999] py-12">
            <p>Nothing to preview yet.</p>
            <p class="text-sm mt-2">Start writing to see your story here.</p>
          </div>
        {/if}
      </div>
    </main>
  </div>

<style>
  .story-content :global(p) {
    margin-bottom: 0.5rem;
    font-size: 1rem;
    line-height: 1.625;
    color: #333333;
  }

  .story-content :global(h2) {
    font-size: 1.25rem;
    font-weight: 700;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    color: #000000;
  }

  .story-content :global(strong) {
    font-weight: 700;
  }

  .story-content :global(em) {
    font-style: italic;
  }

  .story-content :global(a) {
    color: inherit;
    text-decoration: underline;
  }

  .story-content :global(img) {
    width: 100%;
    border-radius: 0.5rem;
    margin: 1rem 0;
  }

  .story-content :global(video) {
    width: 100%;
    border-radius: 0.5rem;
  }

  .story-content :global(.ql-video-wrapper) {
    margin: 1rem 0;
  }

  .story-content :global(hr) {
    border: none;
    border-top: 1px solid #999999;
    width: 50%;
    margin: 1.5rem auto;
  }

  .story-content :global(.plyr) {
    --plyr-color-main: #5422b0;
    border-radius: 0.5rem;
    overflow: hidden;
    background: transparent;
  }

  .story-content :global(.plyr__video-wrapper) {
    background: transparent;
  }

  .story-content :global(video) {
    max-width: 100%;
    border-radius: 0.5rem;
  }
</style>
