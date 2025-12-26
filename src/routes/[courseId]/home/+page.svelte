<script lang="ts">
  let activeTab: 'drafts' | 'published' = 'drafts'
</script>

<svelte:head>
  <title>NewsLab - Home</title>
</svelte:head>

<div class="min-h-screen bg-white flex flex-col pb-[50px]">
  <!-- Tabs -->
  <div class="px-4 pt-4">
    <div class="flex gap-6">
      <button
        on:click={() => (activeTab = 'drafts')}
        class="pb-2 text-base font-medium transition-colors relative"
        class:text-[#5422b0]={activeTab === 'drafts'}
        class:text-[#777777]={activeTab !== 'drafts'}
      >
        Drafts
        {#if activeTab === 'drafts'}
          <span class="absolute bottom-0 left-0 right-0 h-[2px] bg-[#5422b0]"></span>
        {/if}
      </button>
      <button
        on:click={() => (activeTab = 'published')}
        class="pb-2 text-base font-medium transition-colors relative"
        class:text-[#5422b0]={activeTab === 'published'}
        class:text-[#777777]={activeTab !== 'published'}
      >
        Published
        {#if activeTab === 'published'}
          <span class="absolute bottom-0 left-0 right-0 h-[2px] bg-[#5422b0]"></span>
        {/if}
      </button>
    </div>
  </div>

  <!-- Content Area -->
  <main class="flex-1 flex items-center justify-center px-8">
    {#if activeTab === 'drafts'}
      <div class="text-center">
        <p class="text-[#777777] text-base">Nothing to show yet.</p>
        <p class="text-[#777777] text-sm mt-2">
          First, create or join a team in Settings.<br />
          Then dive in - your drafts appear here.
        </p>
      </div>
    {:else}
      <div class="text-center">
        <p class="text-[#777777] text-base">Nothing to show yet.</p>
        <p class="text-[#777777] text-sm mt-2">
          Published stories appear here<br />
          and in your Team Stream.
        </p>
      </div>
    {/if}
  </main>
</div>
