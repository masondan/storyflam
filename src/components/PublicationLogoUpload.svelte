<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { compressImage, MAX_IMAGE_FILE_SIZE, ALLOWED_IMAGE_TYPES } from '$lib/cloudinary'
  import { showNotification } from '$lib/stores'

  export let logoUrl: string | null = null
  export let disabled: boolean = false
  export let primaryColor: string = '5422b0'
  export let fullWidth: boolean = false

  const dispatch = createEventDispatcher<{ upload: { url: string }; remove: void }>()

  let uploading = false
  let fileInput: HTMLInputElement

  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file || disabled) return

    // Check file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      showNotification('error', 'Image must be JPG, PNG, or WebP.')
      input.value = ''
      return
    }

    // Check file size limit
    if (file.size > MAX_IMAGE_FILE_SIZE) {
      showNotification('error', 'Image is too big. Reduce to max 10MB and try again.')
      input.value = ''
      return
    }

    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    
    img.onload = async () => {
      URL.revokeObjectURL(objectUrl)
      
      if (img.width !== img.height) {
        showNotification('error', 'Please upload a square image (same width and height)')
        input.value = ''
        return
      }

      uploading = true
      try {
        // Compress image before upload
        const compressedFile = await compressImage(file)

        const formData = new FormData()
        formData.append('file', compressedFile)
        formData.append('upload_preset', UPLOAD_PRESET)
        formData.append('folder', 'storyflam/logos')

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
          { method: 'POST', body: formData }
        )

        if (!response.ok) {
          showNotification('error', 'Upload failed. Please try again.')
          return
        }

        const data = await response.json()
        dispatch('upload', { url: data.secure_url })
      } catch (error) {
        console.error('Logo upload failed:', error)
        showNotification('error', 'Upload failed. Please try again.')
      } finally {
        uploading = false
        input.value = ''
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      showNotification('error', 'Failed to load image')
      input.value = ''
    }

    img.src = objectUrl
  }

  function handleRemove() {
    dispatch('remove')
  }

  function triggerFileInput() {
    if (!disabled) fileInput.click()
  }
</script>

<div class="space-y-3">
  <div class="flex items-baseline justify-between pb-1 border-b border-[#e0e0e0]">
    <span class="text-sm text-[#777777]">Logo (square image only)</span>
  </div>

  <input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    on:change={handleFileSelect}
    class="hidden"
  />

  {#if logoUrl}
    <div class="relative w-20 h-20">
      <img
        src={logoUrl}
        alt="Team logo"
        class="w-full h-full object-cover rounded-lg border border-[#efefef]"
      />
      {#if !disabled}
        <button
          type="button"
          on:click={handleRemove}
          class="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white border border-[#777777] flex items-center justify-center"
          aria-label="Remove logo"
        >
          <img
            src="/icons/icon-close.svg"
            alt=""
            class="w-3 h-3"
            style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
          />
        </button>
      {/if}
    </div>
  {:else}
    <button
      type="button"
      on:click={triggerFileInput}
      disabled={disabled || uploading}
      class="border-2 border-dashed border-[#777777] rounded-lg flex items-center justify-center transition-colors"
      class:w-full={fullWidth}
      class:h-20={true}
      class:w-20={!fullWidth}
      class:opacity-50={disabled}
      class:cursor-not-allowed={disabled}
      class:hover:border-[#5422b0]={!disabled}
      style={!disabled ? `--hover-color: #${primaryColor}` : ''}
    >
      {#if uploading}
        <div class="w-6 h-6 border-2 border-[#777777] border-t-transparent rounded-full animate-spin"></div>
      {:else}
        <img
          src="/icons/icon-upload.svg"
          alt="Upload"
          class="w-6 h-6"
          style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
        />
      {/if}
    </button>
  {/if}
</div>
