<script lang="ts">
  import { page } from '$app/stores'
  import { session, writeDrawerOpen } from '$lib/stores'

  $: courseId = $session?.courseId || ''
  $: currentPath = $page.url.pathname

  $: isHomePage = currentPath.endsWith('/home')
  $: isStreamPage = currentPath.endsWith('/stream')
  $: isSettingsPage = currentPath.endsWith('/settings')

  function openWriteDrawer() {
    writeDrawerOpen.set(true)
  }
</script>

<footer class="fixed bottom-0 left-0 right-0 bg-white z-40">
  <div class="border-t border-[#777777]">
    <nav class="flex items-center justify-center h-[50px]">
      <!-- User Home -->
      <a
        href="/{courseId}/home"
        class="flex items-center justify-center px-3"
        aria-label="Home"
      >
        {#if isHomePage}
          <img
            src="/icons/icon-user-fill.svg"
            alt=""
            class="w-6 h-6"
            style="filter: invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%);"
          />
        {:else}
          <img
            src="/icons/icon-user.svg"
            alt=""
            class="w-6 h-6"
            style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
          />
        {/if}
      </a>

      <!-- Write Button (center, overlaps top border) -->
      <button
        on:click={openWriteDrawer}
        class="flex items-center justify-center mx-3 -mt-5"
        aria-label="Write new story"
      >
        <img
          src="/icons/icon-newstory.svg"
          alt=""
          class="w-14 h-14"
          style="filter: invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%);"
        />
      </button>

      <!-- Team Stream -->
      <a
        href="/{courseId}/stream"
        class="flex items-center justify-center px-3"
        aria-label="Team Stream"
      >
        {#if isStreamPage}
          <img
            src="/icons/icon-group-fill.svg"
            alt=""
            class="w-6 h-6"
            style="filter: invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%);"
          />
        {:else}
          <img
            src="/icons/icon-group.svg"
            alt=""
            class="w-6 h-6"
            style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
          />
        {/if}
      </a>

      <!-- Settings (far right) -->
      <a
        href="/{courseId}/settings"
        class="flex items-center justify-center absolute right-4"
        aria-label="Settings"
      >
        {#if isSettingsPage}
          <img
            src="/icons/icon-settings-fill.svg"
            alt=""
            class="w-6 h-6"
            style="filter: invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%);"
          />
        {:else}
          <img
            src="/icons/icon-settings.svg"
            alt=""
            class="w-6 h-6"
            style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
          />
        {/if}
      </a>
    </nav>
  </div>
</footer>
