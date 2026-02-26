<script lang="ts">
  import { page } from '$app/stores'
  import { session, writeDrawerOpen, teamColors } from '$lib/stores'

  $: courseId = $session?.courseId || ''
  $: currentPath = $page.url.pathname

  $: isHomePage = currentPath.endsWith('/home')
  $: isStreamPage = currentPath.endsWith('/stream')
  $: isSettingsPage = currentPath.endsWith('/settings')

  function openWriteDrawer() {
    writeDrawerOpen.set(true)
  }

  // Convert hex color to CSS filter
  function hexToFilter(hex: string): string {
    // For team colors, use a generic color filter approach
    // The purple filter: invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%)
    // We'll use a simpler approach: just set the color directly with background
    return `#${hex}`
  }
</script>

<footer class="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-[480px] w-full bg-white z-40 md:shadow-2xl md:rounded-t-lg">
  <nav class="flex items-center h-[50px] px-3 justify-center gap-6 border-t border-[#ddd]">
    <!-- Invisible spacer (matches right side width: 2 icons + gap) -->
    <div class="w-[30px]"></div>

    <!-- My Stories -->
    <a
      href="/{courseId}/home"
      class="flex items-center justify-center"
      aria-label="My Stories"
    >
      {#if isHomePage}
        <div class="w-8 h-8" style="background-color: #{$teamColors.primary}; -webkit-mask-image: url('/icons/icon-stories-fill.svg'); mask-image: url('/icons/icon-stories-fill.svg'); -webkit-mask-size: contain; mask-size: contain;"></div>
      {:else}
        <img
          src="/icons/icon-stories.svg"
          alt=""
          class="w-8 h-8"
          style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
        />
      {/if}
    </a>

    <!-- Write Button -->
    <button
      on:click={openWriteDrawer}
      class="flex items-center justify-center rounded-full w-14 h-14 -mt-5"
      style="background-color: #{$teamColors.primary};"
      aria-label="Write new story"
    >
      <img
        src="/icons/icon-storyflam-quill.svg"
        alt=""
        class="w-10 h-10"
        style="filter: invert(100%) brightness(1.2);"
      />
    </button>

    <!-- Publication -->
    <a
      href="/{courseId}/stream"
      class="flex items-center justify-center"
      aria-label="My Publication"
    >
      {#if isStreamPage}
        <div class="w-8 h-8" style="background-color: #{$teamColors.primary}; -webkit-mask-image: url('/icons/icon-publication-fill.svg'); mask-image: url('/icons/icon-publication-fill.svg'); -webkit-mask-size: contain; mask-size: contain;"></div>
      {:else}
        <img
          src="/icons/icon-publication.svg"
          alt=""
          class="w-8 h-8"
          style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
        />
      {/if}
    </a>

    <!-- Settings -->
    <a
      href="/{courseId}/settings"
      class="flex items-center justify-center"
      aria-label="My Profile"
    >
      {#if isSettingsPage}
        <div class="w-8 h-8" style="background-color: #{$teamColors.primary}; -webkit-mask-image: url('/icons/icon-profile-fill.svg'); mask-image: url('/icons/icon-profile-fill.svg'); -webkit-mask-size: contain; mask-size: contain;"></div>
      {:else}
        <img
          src="/icons/icon-profile.svg"
          alt=""
          class="w-8 h-8"
          style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
        />
      {/if}
    </a>
  </nav>
</footer>
