<script lang="ts">
  import { writeDrawerOpen, previewDrawerOpen } from '$lib/stores'
  import { fly } from 'svelte/transition'

  function closeDrawer() {
    writeDrawerOpen.set(false)
  }
</script>

{#if $writeDrawerOpen}
  <div
    class="fixed inset-0 z-50 bg-white flex flex-col"
    transition:fly={{ y: '100%', duration: 300 }}
  >
    <!-- Header -->
    <header class="flex items-center justify-between px-4 py-3">
      <button
        on:click={closeDrawer}
        class="w-8 h-8 rounded-full bg-[#efefef] flex items-center justify-center"
        aria-label="Close"
      >
        <img
          src="/icons/icon-close.svg"
          alt=""
          class="w-4 h-4"
          style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
        />
      </button>
      <div class="flex-1"></div>
    </header>

    <!-- Content (placeholder - will be built in Phase 4) -->
    <main class="flex-1 px-4 overflow-y-auto">
      <div class="space-y-4">
        <!-- Title placeholder -->
        <div class="text-2xl font-normal text-[#777777]">
          Title
        </div>

        <!-- Text placeholder -->
        <div class="text-base text-[#777777]">
          Text
        </div>
      </div>
    </main>

    <!-- Toolbar (placeholder - will be built in Phase 4) -->
    <footer class="border-t border-[#efefef] px-4 py-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button class="p-2" aria-label="Add image">
            <img
              src="/icons/icon-image.svg"
              alt=""
              class="w-5 h-5"
              style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
            />
          </button>
          <button class="p-2" aria-label="Add heading">
            <img
              src="/icons/icon-heading.svg"
              alt=""
              class="w-5 h-5"
              style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
            />
          </button>
          <button class="p-2" aria-label="Bold text">
            <img
              src="/icons/icon-bold.svg"
              alt=""
              class="w-5 h-5"
              style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
            />
          </button>
          <button class="p-2" aria-label="Add separator">
            <img
              src="/icons/icon-separator.svg"
              alt=""
              class="w-5 h-5"
              style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
            />
          </button>
          <button class="p-2" aria-label="Add YouTube">
            <img
              src="/icons/icon-youtube.svg"
              alt=""
              class="w-5 h-5"
              style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
            />
          </button>
          <button class="p-2" aria-label="Add link">
            <img
              src="/icons/icon-link.svg"
              alt=""
              class="w-5 h-5"
              style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
            />
          </button>
        </div>

        <div class="w-px h-6 bg-[#efefef]"></div>

        <div class="flex items-center gap-4">
          <button class="p-2" aria-label="Preview">
            <img
              src="/icons/icon-preview.svg"
              alt=""
              class="w-5 h-5"
              style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
            />
          </button>
          <button class="p-2" aria-label="Publish">
            <img
              src="/icons/icon-publish.svg"
              alt=""
              class="w-5 h-5"
              style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
            />
          </button>
        </div>
      </div>
    </footer>
  </div>
{/if}
