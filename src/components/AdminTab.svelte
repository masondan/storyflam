<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase'
  import { showNotification, session } from '$lib/stores'
  import { uploadImage } from '$lib/cloudinary'

  export let courseId: string

  let trainerId = ''
  let displayCourseId = ''
  let guestEditorId = ''
  let fallbackImageUrl: string | null = null

  let trainerIdEditing = false
  let trainerIdSaving = false
  let guestEditorEditing = false
  let guestEditorSaving = false
  let deleteConfirmText = ''
  let deleting = false
  let uploadingFallback = false
  let deleteStep: 'initial' | 'confirm' | 'final' = 'initial'

  let courseIdEditing = false
  let courseIdSaving = false
  let courseIdStep: 'initial' | 'confirm' = 'initial'
  let editedCourseId = ''
  let dataLoaded = false

  const CONFIRM_WORD = 'Rudiment'

  $: canDelete = deleteConfirmText.toLowerCase() === CONFIRM_WORD.toLowerCase()
  $: canChangeCourseId = editedCourseId.trim() !== '' && editedCourseId.trim() !== displayCourseId

  function startDelete() {
    deleteStep = 'confirm'
    deleteConfirmText = ''
  }

  function cancelDelete() {
    deleteStep = 'initial'
    deleteConfirmText = ''
  }

  async function loadAdminData() {
    if (!courseId) return
    
    const { data, error } = await supabase
      .from('newslabs')
      .select('trainer_id, course_id, guest_editor_id, fallback_image_url')
      .eq('course_id', courseId)
      .single()

    if (error) {
      console.error('[AdminTab] Failed to load admin data:', error)
      return
    }

    if (data) {
      trainerId = data.trainer_id
      displayCourseId = data.course_id
      editedCourseId = data.course_id
      guestEditorId = data.guest_editor_id || ''
      fallbackImageUrl = data.fallback_image_url
      dataLoaded = true
    }
  }

  // Load on mount
  onMount(() => {
    loadAdminData()
  })
  
  // Also reload if courseId changes after mount
  $: if (courseId && !dataLoaded) loadAdminData()

  function startTrainerIdEdit() {
    trainerIdEditing = true
  }

  function cancelTrainerIdEdit() {
    trainerIdEditing = false
    loadAdminData()
  }

  async function saveTrainerId() {
    if (trainerIdSaving) return

    trainerIdSaving = true

    const { error } = await supabase
      .from('newslabs')
      .update({ 
        trainer_id: trainerId.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('course_id', courseId)

    if (error) {
      showNotification('error', 'Failed to save. Try again.')
    } else {
      showNotification('success', 'Saved')
      trainerIdEditing = false
    }

    trainerIdSaving = false
  }

  function startGuestEditorEdit() {
    guestEditorEditing = true
  }

  function cancelGuestEditorEdit() {
    guestEditorEditing = false
    loadAdminData()
  }

  async function saveGuestEditorId() {
    if (guestEditorSaving) return

    guestEditorSaving = true

    const { error } = await supabase
      .from('newslabs')
      .update({ 
        guest_editor_id: guestEditorId.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('course_id', courseId)

    if (error) {
      showNotification('error', 'Failed to save. Try again.')
    } else {
      showNotification('success', 'Saved')
      guestEditorEditing = false
    }

    guestEditorSaving = false
  }

  function startCourseIdEdit() {
    courseIdEditing = true
  }

  function cancelCourseIdEdit() {
    courseIdEditing = false
    courseIdStep = 'initial'
    editedCourseId = displayCourseId
  }

  function proceedToCourseIdConfirm() {
    if (!canChangeCourseId) return
    courseIdStep = 'confirm'
  }

  async function saveCourseId() {
    if (courseIdSaving) return

    courseIdSaving = true

    const newCourseId = editedCourseId.trim()

    const { error } = await supabase
      .from('newslabs')
      .update({ 
        course_id: newCourseId,
        updated_at: new Date().toISOString()
      })
      .eq('course_id', courseId)

    if (error) {
      showNotification('error', 'Failed to change course ID. Try again.')
    } else {
      showNotification('success', 'Course ID changed')
      displayCourseId = newCourseId
      courseIdEditing = false
      courseIdStep = 'initial'
    }

    courseIdSaving = false
  }

  async function handleFallbackImageUpload(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    uploadingFallback = true

    try {
      const result = await uploadImage(file)
      if (result.error) {
        showNotification('error', result.error)
        return
      }

      const { error } = await supabase
        .from('newslabs')
        .update({ 
          fallback_image_url: result.url,
          updated_at: new Date().toISOString()
        })
        .eq('course_id', courseId)

      if (error) {
        showNotification('error', 'Failed to save image')
      } else {
        fallbackImageUrl = result.url
        showNotification('success', 'Fallback image uploaded')
      }
    } catch (err) {
      console.error('Upload error:', err)
      showNotification('error', 'Upload failed')
    } finally {
      uploadingFallback = false
      input.value = ''
    }
  }

  async function removeFallbackImage() {
    const { error } = await supabase
      .from('newslabs')
      .update({ 
        fallback_image_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('course_id', courseId)

    if (error) {
      showNotification('error', 'Failed to remove image')
    } else {
      fallbackImageUrl = null
      showNotification('success', 'Fallback image removed')
    }
  }

  async function clearCourse() {
    if (!canDelete || deleting) return

    deleting = true

    try {
      const { error: activityError } = await supabase
        .from('activity_log')
        .delete()
        .eq('course_id', courseId)

      if (activityError) throw activityError

      const { error: storiesError } = await supabase
        .from('stories')
        .delete()
        .eq('course_id', courseId)

      if (storiesError) throw storiesError

      const { error: journalistsError } = await supabase
        .from('journalists')
        .delete()
        .eq('course_id', courseId)

      if (journalistsError) throw journalistsError

      const { error: teamsError } = await supabase
        .from('publications')
        .delete()
        .eq('course_id', courseId)

      if (teamsError) throw teamsError

      // Broadcast course_cleared event to all connected clients
      await supabase.channel(`course-cleared-${courseId}`).send({
        type: 'broadcast',
        event: 'course_cleared',
        payload: {}
      })

      showNotification('success', 'Course cleared successfully')
      deleteConfirmText = ''
      deleteStep = 'initial'

      // Reload the trainer's page as well
      window.location.reload()
    } catch (error) {
      console.error('Clear course error:', error)
      showNotification('error', 'Failed to clear course')
    } finally {
      deleting = false
    }
  }
</script>

<div class="space-y-6">
  <!-- Trainer ID (editable) -->
  <div>
    <label for="trainer-id" class="block text-sm text-[#777777] mb-2">Trainer ID</label>
    <div class="flex items-center gap-2">
      <div class="flex-1">
        <input
          id="trainer-id"
          type="text"
          bind:value={trainerId}
          on:focus={startTrainerIdEdit}
          placeholder="Enter trainer ID..."
          class="w-full bg-[#efefef] rounded-lg px-4 py-3 text-base outline-none transition-all"
          class:ring-2={trainerIdEditing}
          class:ring-[#5422b0]={trainerIdEditing}
        />
      </div>
      {#if trainerId.trim()}
        <img
          src="/icons/icon-check-fill.svg"
          alt="Set"
          class="w-5 h-5"
          style="filter: invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%);"
        />
      {:else}
        <img
          src="/icons/icon-circle.svg"
          alt="Not set"
          class="w-5 h-5"
          style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
        />
      {/if}
    </div>

    {#if trainerIdEditing}
      <div class="flex items-center gap-2 mt-2">
        <button
          type="button"
          on:click={cancelTrainerIdEdit}
          class="p-1"
          aria-label="Cancel"
        >
          <img
            src="/icons/icon-close-circle-fill.svg"
            alt=""
            class="w-6 h-6"
            style="filter: invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%);"
          />
        </button>
        <button
          type="button"
          on:click={saveTrainerId}
          disabled={trainerIdSaving}
          class="px-4 py-1 rounded-full bg-[#5422b0] text-white text-sm font-medium transition-opacity"
          class:opacity-50={trainerIdSaving}
        >
          {trainerIdSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    {/if}
  </div>

  <!-- Guest Editor ID (editable) -->
  <div>
    <label for="guest-editor-id" class="block text-sm text-[#777777] mb-2">Guest editor ID</label>
    <div class="flex items-center gap-2">
      <div class="flex-1">
        <input
          id="guest-editor-id"
          type="text"
          bind:value={guestEditorId}
          on:focus={startGuestEditorEdit}
          placeholder="Enter guest editor ID..."
          class="w-full bg-[#efefef] rounded-lg px-4 py-3 text-base outline-none transition-all"
          class:ring-2={guestEditorEditing}
          class:ring-[#5422b0]={guestEditorEditing}
        />
      </div>
      {#if guestEditorId.trim()}
        <img
          src="/icons/icon-check-fill.svg"
          alt="Set"
          class="w-5 h-5"
          style="filter: invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%);"
        />
      {:else}
        <img
          src="/icons/icon-circle.svg"
          alt="Not set"
          class="w-5 h-5"
          style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
        />
      {/if}
    </div>

    {#if guestEditorEditing}
      <div class="flex items-center gap-2 mt-2">
        <button
          type="button"
          on:click={cancelGuestEditorEdit}
          class="p-1"
          aria-label="Cancel"
        >
          <img
            src="/icons/icon-close-circle-fill.svg"
            alt=""
            class="w-6 h-6"
            style="filter: invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%);"
          />
        </button>
        <button
          type="button"
          on:click={saveGuestEditorId}
          disabled={guestEditorSaving}
          class="px-4 py-1 rounded-full bg-[#5422b0] text-white text-sm font-medium transition-opacity"
          class:opacity-50={guestEditorSaving}
        >
          {guestEditorSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    {/if}
  </div>

  <!-- Story Fallback Image -->
  <div>
    <span class="block text-sm text-[#777777] mb-2">Story fallback image</span>
    
    {#if fallbackImageUrl}
      <div class="relative w-24 h-24">
        <img
          src={fallbackImageUrl}
          alt="Fallback"
          class="w-full h-full object-cover rounded-lg"
        />
        <button
          type="button"
          on:click={removeFallbackImage}
          class="absolute -top-2 -right-2 w-5 h-5 bg-white rounded-full shadow flex items-center justify-center"
          aria-label="Remove image"
        >
          <img
            src="/icons/icon-close.svg"
            alt=""
            class="w-3 h-3"
            style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
          />
        </button>
      </div>
    {:else}
      <label 
        class="w-24 h-24 border-2 border-dashed border-[#777777] rounded-lg flex items-center justify-center cursor-pointer hover:border-[#5422b0] transition-colors"
        class:opacity-50={uploadingFallback}
      >
        <input
          type="file"
          accept="image/*"
          on:change={handleFallbackImageUpload}
          class="sr-only"
          disabled={uploadingFallback}
        />
        {#if uploadingFallback}
          <div class="w-6 h-6 border-2 border-[#777777] border-t-transparent rounded-full animate-spin"></div>
        {:else}
          <img
            src="/icons/icon-upload.svg"
            alt="Upload"
            class="w-6 h-6"
            style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
          />
        {/if}
      </label>
    {/if}
  </div>

  <!-- Danger Zone -->
  <div class="mt-8">
    <span class="text-sm text-[#777777]">Danger zone</span>
    
    <div class="mt-3 space-y-4">
      <!-- Course ID (dangerous - in danger zone) -->
      <div>
        <label for="course-id" class="block text-sm text-[#777777] mb-2">Course ID</label>
        
        {#if courseIdStep === 'initial'}
          <div class="relative">
            <input
              id="course-id"
              type="text"
              bind:value={editedCourseId}
              on:focus={startCourseIdEdit}
              class="w-full bg-[#efefef] border border-[#d60202] rounded-lg pl-4 pr-12 py-3 text-base outline-none transition-all"
              class:ring-2={courseIdEditing}
              class:ring-[#d60202]={courseIdEditing}
            />
            <button
              type="button"
              on:click={proceedToCourseIdConfirm}
              disabled={!canChangeCourseId}
              class="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity"
              class:opacity-30={!canChangeCourseId}
              aria-label="Change course ID"
            >
              <img
                src="/icons/icon-login-fill.svg"
                alt=""
                class="w-6 h-6"
                style="filter: invert(12%) sepia(97%) saturate(6000%) hue-rotate(360deg) brightness(95%) contrast(115%);"
              />
            </button>
          </div>
          {#if courseIdEditing}
            <button
              type="button"
              on:click={cancelCourseIdEdit}
              class="w-full text-[#777777] text-sm py-2"
            >
              Cancel
            </button>
          {/if}
          <p class="text-sm text-[#d60202] mt-2">Warning: Do not change the course ID during training</p>
        {:else if courseIdStep === 'confirm'}
          <button
            type="button"
            on:click={saveCourseId}
            disabled={courseIdSaving}
            class="w-full bg-[#d60202] text-white py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-opacity"
            class:opacity-50={courseIdSaving}
          >
            <span>{courseIdSaving ? 'Changing...' : 'Change course ID? Are you sure?'}</span>
            <img
              src="/icons/icon-login-fill.svg"
              alt=""
              class="w-5 h-5"
              style="filter: invert(100%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%);"
            />
          </button>
          <button
            type="button"
            on:click={cancelCourseIdEdit}
            disabled={courseIdSaving}
            class="w-full text-[#777777] text-sm py-2"
          >
            Cancel
          </button>
        {/if}
      </div>

      <!-- Delete all content -->
      {#if deleteStep === 'initial'}
        <button
          type="button"
          on:click={startDelete}
          class="w-full bg-[#d60202] text-white py-3 px-4 rounded-lg text-center text-sm font-medium"
        >
          Delete all teams, members and stories
        </button>
      {:else if deleteStep === 'confirm'}
        <div class="relative">
          <input
            type="text"
            bind:value={deleteConfirmText}
            placeholder="Type the word: {CONFIRM_WORD}"
            class="w-full bg-white border-2 border-[#d60202] rounded-lg pl-4 pr-12 py-3 text-base outline-none"
          />
          <button
            type="button"
            on:click={() => { if (canDelete) deleteStep = 'final' }}
            disabled={!canDelete}
            class="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity"
            class:opacity-30={!canDelete}
            aria-label="Confirm"
          >
            <img
              src="/icons/icon-login-fill.svg"
              alt=""
              class="w-6 h-6"
              style="filter: invert(12%) sepia(97%) saturate(6000%) hue-rotate(360deg) brightness(95%) contrast(115%);"
            />
          </button>
        </div>
        <button
          type="button"
          on:click={cancelDelete}
          class="w-full text-[#777777] text-sm py-2"
        >
          Cancel
        </button>
      {:else if deleteStep === 'final'}
        <button
          type="button"
          on:click={clearCourse}
          disabled={deleting}
          class="w-full bg-[#d60202] text-white py-3 px-4 rounded-lg text-sm font-medium uppercase transition-opacity"
          class:opacity-50={deleting}
        >
          {deleting ? 'DELETING...' : 'DELETE EVERYTHING. ARE YOU SURE'}
        </button>
        <button
          type="button"
          on:click={cancelDelete}
          disabled={deleting}
          class="w-full text-[#777777] text-sm py-2"
        >
          Cancel
        </button>
      {/if}
    </div>
  </div>
</div>
