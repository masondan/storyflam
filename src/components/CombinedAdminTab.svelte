<script lang="ts">
  import { session, isTrainer } from '$lib/stores'
  import TeamsTab from './TeamsTab.svelte'
  import AdminTab from './AdminTab.svelte'

  export let courseId: string

  let adminExpanded = false

  $: showAdminSection = $isTrainer
</script>

<div class="space-y-6">
  <!-- Publications Section (visible to all) -->
  <div>
    <TeamsTab {courseId} />
  </div>

  <!-- Admin Section (trainer only) -->
  {#if showAdminSection}
    <div>
      <!-- Admin Dropdown Header -->
      <button
        type="button"
        on:click={() => adminExpanded = !adminExpanded}
        class="w-full flex items-center justify-between py-3 px-4 rounded-lg transition-colors"
        style="background-color: #5422b0;"
      >
        <span class="font-semibold text-white">Admin</span>
        <img
          src={adminExpanded ? '/icons/icon-collapse.svg' : '/icons/icon-expand.svg'}
          alt=""
          class="w-5 h-5"
          style="filter: invert(100%);"
        />
      </button>

      <!-- Admin Dropdown Content -->
      {#if adminExpanded}
        <div class="mt-3 p-4 bg-white rounded-lg border border-[#e0e0e0]">
          <AdminTab {courseId} />
        </div>
      {/if}
    </div>
  {/if}
</div>
