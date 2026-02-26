<script lang="ts">
  import { storyReaderDrawerOpen, currentViewingStory, session } from '$lib/stores'
  import { fly } from 'svelte/transition'
  import { tick, onDestroy } from 'svelte'
  import { getOptimizedUrl } from '$lib/cloudinary'
  import { renderContent } from '$lib/content'
  import { initPlyrInContainer } from '$lib/plyr-init'

  export let publicationName = 'StoryFlam Publication'
  export let publicationLogoUrl: string | null = null
  export let primaryColor = '5422b0'
  export let secondaryColor = 'f0e6f7'

  let scrollY = 0
  let headerOpacity = 1
  let contentContainer: HTMLElement
  let cleanupPlyr: (() => void) | null = null

  $: displayPublicationName = publicationName || $session?.publicationName || 'StoryFlam Publication'
  $: storyData = $currentViewingStory?.story
  $: authorName = storyData?.author_name || 'Unknown'
  $: title = storyData?.title || ''
  $: featuredImageUrl = storyData?.featured_image_url
  $: storyContent = storyData?.content || null

  // Re-initialize Plyr whenever the drawer opens with story data
  $: if ($storyReaderDrawerOpen && storyData) {
    initStoryPlyr()
  }

  async function initStoryPlyr() {
    if (cleanupPlyr) { cleanupPlyr(); cleanupPlyr = null }
    await tick()
    if (!contentContainer) return
    cleanupPlyr = await initPlyrInContainer(contentContainer)
  }

  function closeDrawer() {
    storyReaderDrawerOpen.set(false)
    currentViewingStory.set(null)
  }

  function handleScroll(e: Event) {
    const main = e.target as HTMLElement
    scrollY = main.scrollTop
    headerOpacity = Math.max(0.3, 1 - scrollY / 100)
  }

  onDestroy(() => {
    if (cleanupPlyr) { cleanupPlyr(); cleanupPlyr = null }
  })
</script>

{#if $storyReaderDrawerOpen}
  <div
    class="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-[480px] w-full z-50 bg-white flex flex-col h-svh"
    transition:fly={{ y: '100%', duration: 300 }}
  >
    <!-- Slim Header -->
    <header 
      class="sticky top-0 z-40 px-4 py-5 flex items-center justify-center transition-opacity duration-300 border-b border-[#efefef]"
      style="background-color: #{secondaryColor}; opacity: {headerOpacity};"
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
      
      <h1 class="text-sm font-semibold" style="color: #{primaryColor};">
        {displayPublicationName}
      </h1>
    </header>

    <!-- Content -->
    <main class="flex-1 px-4 py-6 overflow-y-auto" on:scroll={handleScroll}>
      {#if storyData}
        <article>
          <!-- Byline -->
          <p class="text-sm text-[#777777] mb-1">By {authorName}</p>
          
          <!-- Title -->
          <h2 class="text-2xl font-bold text-black mb-4">{title}</h2>
          
          <!-- Featured Image -->
          {#if featuredImageUrl}
            <figure class="mb-4">
              <img 
                src={getOptimizedUrl(featuredImageUrl)} 
                alt="" 
                class="w-full rounded-lg"
              />
            </figure>
          {/if}
          
          <!-- Content Blocks -->
          <div class="story-content" bind:this={contentContainer}>
            {@html renderContent(storyContent, primaryColor)}
          </div>
        </article>
      {:else}
        <div class="flex items-center justify-center h-full text-[#777777]">
          <p>No story selected</p>
        </div>
      {/if}
    </main>
  </div>
  {/if}
  
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
