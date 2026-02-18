<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { supabase } from '$lib/supabase'
  import { getOptimizedUrl, getThumbnailUrl } from '$lib/cloudinary'
  import { renderContent } from '$lib/content'
  import type { Publication, Story, ContentBlock } from '$lib/types'

  let team: Publication | null = null
  let stories: Story[] = []
  let loading = true
  let error = ''
  let selectedStory: Story | null = null

  $: teamName = decodeURIComponent($page.params.teamName || '')
  $: primaryColor = team?.primary_color || '5422b0'
  $: secondaryColor = team?.secondary_color || 'f0e6f7'

  onMount(async () => {
    await loadTeamData()
  })

  async function loadTeamData() {
    if (!teamName) {
      error = 'Team not found'
      loading = false
      return
    }

    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .ilike('team_name', teamName.replace(/-/g, ' '))
      .single()

    if (teamError || !teamData) {
      error = 'Team not found'
      loading = false
      return
    }

    if (!teamData.share_enabled) {
      error = 'This team stream is not public'
      loading = false
      return
    }

    team = teamData

    const { data: storiesData } = await supabase
      .from('stories')
      .select('*')
      .eq('course_id', teamData.course_id)
      .eq('publication_name', teamData.team_name)
      .eq('status', 'published')
      .order('is_pinned', { ascending: false })
      .order('pin_timestamp', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    stories = storiesData || []
    loading = false
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  function getSnippet(story: Story): string {
    if (!story.content) return ''
    if ('html' in story.content) {
      const text = story.content.html.replace(/<[^>]+>/g, '').trim()
      return text.length > 120 ? text.slice(0, 120) + '...' : text
    }
    if ('blocks' in story.content) {
      const textBlocks = story.content.blocks.filter((b: ContentBlock) => b.type === 'paragraph' || b.type === 'heading' || b.type === 'bold')
      const text = textBlocks.map((b: ContentBlock) => b.text || '').filter(Boolean).join(' ')
      return text.length > 120 ? text.slice(0, 120) + '...' : text
    }
    return ''
  }

  function openStory(story: Story) {
    selectedStory = story
  }

  function closeStory() {
    selectedStory = null
  }


</script>

<svelte:head>
  <title>{team?.publication_name || 'Publication Stream'} | StoryFlam</title>
  <meta name="description" content="Published stories from {team?.publication_name || 'this publication'}" />
</svelte:head>

{#if loading}
  <div class="min-h-screen flex items-center justify-center bg-white">
    <div class="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style="border-color: #{primaryColor}; border-top-color: transparent;"></div>
  </div>
{:else if error}
  <div class="min-h-screen flex flex-col items-center justify-center bg-white px-4">
    <img
      src="/logos/logo-storyflam-gen.svg"
      alt="StoryFlam"
      class="w-16 h-16 mb-4 opacity-50"
    />
    <p class="text-[#777777] text-lg">{error}</p>
  </div>
{:else if selectedStory}
  <!-- Story Reader View -->
  <div class="min-h-screen bg-white flex flex-col">
    <!-- Team Header -->
    <header 
      class="py-4 text-center border-b-2 shrink-0 relative"
      style="background-color: #{secondaryColor}; border-color: #{primaryColor};"
    >
      <button
        on:click={closeStory}
        class="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center"
        aria-label="Back to stream"
      >
        <img
          src="/icons/icon-arrow-left.svg"
          alt=""
          class="w-4 h-4"
          style="filter: invert(47%) sepia(0%) saturate(0%) brightness(55%) contrast(92%);"
        />
      </button>

      <div 
        class="w-12 h-12 mx-auto mb-2 rounded-lg overflow-hidden bg-white border-2"
        style="border-color: #{primaryColor};"
      >
        <img
          src={team?.logo_url || '/logos/logo-storyflam-gen.svg'}
          alt="Publication logo"
          class="w-full h-full object-cover"
        />
      </div>
      <h1 class="text-base font-semibold" style="color: #{primaryColor};">
        {team?.publication_name}
      </h1>
    </header>

    <!-- Story Content -->
    <main class="flex-1 px-4 py-6 overflow-y-auto">
      <article>
        <p class="text-sm text-[#777777] mb-1">By {selectedStory.author_name}</p>
        <h2 class="text-2xl font-bold text-black mb-4">{selectedStory.title}</h2>
        
        {#if selectedStory.featured_image_url}
          <figure class="mb-4">
            <img 
              src={getOptimizedUrl(selectedStory.featured_image_url)} 
              alt="" 
              class="w-full rounded-lg"
            />
          </figure>
        {/if}
        
        <div class="story-content">
          {@html renderContent(selectedStory.content, primaryColor)}
        </div>
      </article>
    </main>
  </div>
{:else}
  <!-- Team Stream List View -->
  <div class="min-h-screen bg-white flex flex-col">
    <!-- Team Header -->
    <header 
      class="py-6 text-center border-b-2"
      style="background-color: #{secondaryColor}; border-color: #{primaryColor};"
    >
      <div 
        class="w-16 h-16 mx-auto mb-3 rounded-lg overflow-hidden bg-white border-2"
        style="border-color: #{primaryColor};"
      >
        <img
          src={team?.logo_url || '/logos/logo-storyflam-gen.svg'}
          alt="Publication logo"
          class="w-full h-full object-cover"
        />
      </div>
      <h1 class="text-xl font-bold" style="color: #{primaryColor};">
        {team?.publication_name}
      </h1>
    </header>

    <!-- Stories -->
    <main class="flex-1 overflow-y-auto">
      {#if stories.length === 0}
        <div class="flex items-center justify-center h-64 px-4">
          <p class="text-[#777777] text-center">No published stories yet</p>
        </div>
      {:else}
        <div class="divide-y divide-[#efefef]">
          {#each stories as story (story.id)}
            <button
              on:click={() => openStory(story)}
              class="w-full flex gap-3 p-4 text-left hover:bg-[#fafafa] transition-colors"
            >
              <!-- Thumbnail -->
              <div class="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-[#efefef]">
                <img
                  src={story.featured_image_url 
                    ? getThumbnailUrl(story.featured_image_url, 160) 
                    : '/logos/logo-storyflam-gen.svg'}
                  alt=""
                  class="w-full h-full object-cover"
                />
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0 flex flex-col items-start">
                <!-- Date -->
                <div class="flex items-center gap-1 text-xs text-[#999999] mb-1 justify-start">
                  <img
                    src="/icons/icon-time.svg"
                    alt=""
                    class="w-3 h-3"
                    style="filter: invert(60%);"
                  />
                  <span>{formatDate(story.created_at)}</span>
                  {#if story.is_pinned}
                    <img
                      src="/icons/icon-pin-fill.svg"
                      alt="Pinned"
                      class="w-3 h-3 ml-1"
                      style="filter: invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%);"
                    />
                  {/if}
                </div>

                <!-- Title -->
                <h3 class="font-semibold text-black line-clamp-2 mb-1 text-left">
                  {story.title}
                </h3>

                <!-- Snippet -->
                {#if getSnippet(story)}
                  <p class="text-sm text-[#777777] line-clamp-2">
                    {getSnippet(story)}
                  </p>
                {/if}

                <!-- Author -->
                <p class="text-xs text-[#999999] mt-1 text-right">
                  {story.author_name}
                </p>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </main>

    <!-- Footer -->
    <footer class="py-3 text-center border-t border-[#efefef]">
      <p class="text-xs text-[#999999]">
        Powered by <span class="font-medium" style="color: #{primaryColor};">NewsLab</span>
      </p>
    </footer>
  </div>
{/if}

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .story-content :global(a) {
    text-decoration: none;
  }
  
  .story-content :global(a:hover) {
    text-decoration: underline;
  }
</style>
