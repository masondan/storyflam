<script lang="ts">
  import { fly } from 'svelte/transition'
  import { previewDrawerOpen, session, teamColors } from '$lib/stores'
  import { getOptimizedUrl } from '$lib/cloudinary'
  import type { ContentBlock } from '$lib/types'

  export let title = ''
  export let summary = ''
  export let featuredImageUrl: string | null = null
  export let featuredImageCaption = ''
  export let contentBlocks: ContentBlock[] = []
  export let teamName: string | null = null
  export let teamLogoUrl: string | null = null

  let scrollY = 0
  let headerOpacity = 1

  $: displayTeamName = teamName || $session?.publicationName || 'StoryFlam Publication'
  $: authorName = $session?.name || 'Journalist'
  $: console.log('=== PREVIEW DRAWER RECEIVED ===', { title, contentBlocks, showEmpty: !title && contentBlocks.length === 0 })

  function closeDrawer() {
    previewDrawerOpen.set(false)
  }

  function handleScroll(e: Event) {
    const main = e.target as HTMLElement
    scrollY = main.scrollTop
    // Reduce opacity as user scrolls down, min opacity at 100px
    headerOpacity = Math.max(0.3, 1 - scrollY / 100)
  }

  function extractYouTubeId(url: string): string {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
    return match ? match[1] : ''
  }
</script>

<div
  class="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-[480px] w-full z-[55] bg-white flex flex-col h-svh"
  transition:fly={{ x: '100%', duration: 300 }}
>
    <!-- Slim Header -->
    <header 
      class="sticky top-0 z-40 px-4 py-3 flex items-center justify-center transition-opacity duration-300"
      style="background-color: #{$teamColors.secondary}; opacity: {headerOpacity};"
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
        {displayTeamName}
      </h1>
    </header>

    <!-- Content -->
    <main class="flex-1 overflow-y-auto px-4 py-6" on:scroll={handleScroll}>
      <!-- Author -->
      <p class="text-sm text-[#777777] mb-2">By {authorName}</p>

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
      <div class="prose prose-sm max-w-none text-[#333333]">
        {#each contentBlocks as block}
          {#if block.type === 'paragraph'}
            <p class="mb-4">{@html block.text}</p>
          {:else if block.type === 'heading'}
            <h3 class="text-xl font-bold text-[#333333] mb-4">{@html block.text}</h3>
          {:else if block.type === 'bold'}
            <p class="mb-4"><strong>{@html block.text}</strong></p>
          {:else if block.type === 'separator'}
            <hr class="w-1/2 mx-auto my-6 border-[#999999]" />
          {:else if block.type === 'image'}
            <figure class="mb-4">
              <img
                src={getOptimizedUrl(block.url || '')}
                alt=""
                class="w-full rounded-lg"
              />
            </figure>
          {:else if block.type === 'youtube'}
            <div class="mb-4 aspect-video">
              <iframe
                src="https://www.youtube.com/embed/{extractYouTubeId(block.url || '')}"
                class="w-full h-full rounded-lg"
                frameborder="0"
                allowfullscreen
                title="YouTube video"
              ></iframe>
            </div>
          {:else if block.type === 'link'}
            <p class="mb-4">
              <a
                href={block.url}
                target="_blank"
                rel="noopener noreferrer"
                class="underline"
                style="color: #{block.color || $teamColors.primary};"
              >
                {block.text}
              </a>
            </p>
          {/if}
        {/each}
      </div>

      {#if !title && contentBlocks.length === 0}
        <div class="text-center text-[#999999] py-12">
          <p>Nothing to preview yet.</p>
          <p class="text-sm mt-2">Start writing to see your story here.</p>
        </div>
      {/if}
    </main>
  </div>
