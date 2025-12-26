<script lang="ts">
  import { session } from '$lib/stores'

  $: teamName = $session?.teamName
</script>

<svelte:head>
  <title>NewsLab - Team Stream</title>
</svelte:head>

<div class="min-h-screen bg-white flex flex-col pb-[50px]">
  <!-- Team Header -->
  <header class="bg-[#f0e6f7] py-6 text-center border-b-2 border-[#5422b0]">
    <div class="w-16 h-16 mx-auto mb-3 rounded-lg overflow-hidden bg-white">
      <img
        src="/icons/logo-teamstream-fallback.png"
        alt="Team logo"
        class="w-full h-full object-cover"
      />
    </div>
    <h1 class="text-lg font-semibold text-[#5422b0]">
      {teamName || 'Team NewsLab'}
    </h1>
  </header>

  <!-- Content Area -->
  <main class="flex-1 flex items-center justify-center px-8">
    <div class="text-center">
      <p class="text-[#777777] text-base">Nothing to show yet.</p>
      <p class="text-[#777777] text-sm mt-2">
        Published stories from your team<br />
        will appear here.
      </p>
    </div>
  </main>
</div>
