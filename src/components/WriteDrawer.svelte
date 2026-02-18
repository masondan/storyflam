<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte'
  import { fly } from 'svelte/transition'
  import {
    writeDrawerOpen,
    previewDrawerOpen,
    editingStory,
    session,
    teamColors,
    showNotification
  } from '$lib/stores'
  import { uploadImage, getOptimizedUrl, uploadVideo, getOptimizedVideoUrl } from '$lib/cloudinary'
  import { createStory, updateStory, publishStory, acquireLock, releaseLock, refreshLock } from '$lib/stories'
  import { logActivity } from '$lib/activity'
  import { renderContent } from '$lib/content'
  import PreviewDrawer from './PreviewDrawer.svelte'
  import LockWarning from './LockWarning.svelte'

  let title = ''
  let featuredImageUrl: string | null = null
  let featuredImageCaption = ''
  let fileInput: HTMLInputElement
  let imageFileInput: HTMLInputElement
  let videoFileInput: HTMLInputElement

  let showPublishToolbar = false
  let showSaveToolbar = false
  let saving = false
  let lastSavedTime: number | null = null
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

  // Quill editor
  let editorContainer: HTMLDivElement
  let quillInstance: any = null
  let uploadingVideo = false

  // Lock state
  let isLocked = false
  let lockedBy: string | null = null
  let lockRefreshTimer: ReturnType<typeof setInterval> | null = null

  const AUTOSAVE_DELAY = 3000
  const LOCK_REFRESH_INTERVAL = 60 * 1000

  // Keyboard detection for toolbar positioning
  let keyboardHeight = 0
  let isKeyboardVisible = false
  let toolbarBottomPosition = 0

  $: canPublish = title.trim().length > 0 && !!$session?.publicationName
  $: isEditingExisting = !!$editingStory.id
  $: isPublishedStory = $editingStory.status === 'published'

  // Reset state when drawer opens
  $: if ($writeDrawerOpen) {
    initializeDrawer()
  }

  async function initializeDrawer() {
    const story = $editingStory
    
    // Reset lock state
    isLocked = false
    lockedBy = null
    clearLockRefreshTimer()
    
    if (story.id) {
      if ($session) {
        const lockResult = await acquireLock(story.id, $session.name)
        if (!lockResult.success) {
          isLocked = true
          lockedBy = lockResult.error?.replace('Story is being edited by ', '') || 'another user'
        } else {
          startLockRefreshTimer(story.id)
        }
      }
      
      title = story.title
      featuredImageUrl = story.featuredImageUrl
      featuredImageCaption = story.featuredImageCaption
      lastSavedTime = story.lastSaved
    } else {
      title = ''
      featuredImageUrl = null
      featuredImageCaption = ''
      lastSavedTime = null
    }
    showPublishToolbar = false
    saving = false
    
    // Initialize Quill after DOM update
    await tick()
    await initQuill()
    
    // Load content into Quill
    if (quillInstance) {
      if (story.id) {
        if (story.contentHtml) {
          // New format: load HTML directly
          quillInstance.root.innerHTML = story.contentHtml
        } else if (story.content && story.content.length > 0) {
          // Legacy format: convert blocks to HTML and load
          const html = renderContent({ blocks: story.content }, $teamColors.primary)
          quillInstance.root.innerHTML = html
        } else {
          quillInstance.setText('')
        }
      } else {
        quillInstance.setText('')
      }
    }
  }

  async function initQuill() {
    if (quillInstance || !editorContainer) return
    
    const Quill = (await import('quill')).default
    
    // Register a custom video blot for Cloudinary videos
    const BlockEmbed = Quill.import('blots/block/embed') as any
    
    class VideoBlot extends BlockEmbed {
      static blotName = 'cloudinary-video'
      static tagName = 'div'
      static className = 'ql-video-wrapper'
      
      static create(value: string) {
        const node = super.create() as HTMLElement
        node.setAttribute('contenteditable', 'false')
        node.classList.add('my-4')
        
        const video = document.createElement('video')
        video.setAttribute('src', getOptimizedVideoUrl(value))
        video.setAttribute('controls', '')
        video.setAttribute('playsinline', '')
        video.classList.add('w-full', 'rounded-lg')
        video.style.maxHeight = '300px'
        
        node.appendChild(video)
        node.dataset.videoUrl = value
        return node
      }
      
      static value(node: HTMLElement): string {
        return node.dataset.videoUrl || node.querySelector('video')?.getAttribute('src') || ''
      }
    }
    
    Quill.register(VideoBlot)
    
    quillInstance = new Quill(editorContainer, {
      theme: 'bubble',
      placeholder: 'Start writing...',
      formats: ['bold', 'italic', 'underline', 'header', 'link', 'image', 'cloudinary-video'],
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline'],
          [{ header: 2 }],
          ['link', 'image']
        ],
        clipboard: {
          matchVisual: false
        }
      }
    })
    
    const toolbarModule = quillInstance.getModule('toolbar')
    
    // Override default image handler to use Cloudinary upload
    if (toolbarModule) {
      toolbarModule.addHandler('image', () => {
        imageFileInput.click()
      })
    }
    
    // Force tooltip visibility by monitoring for ql-hidden class
    quillInstance.on('selection-change', (range, oldRange, source) => {
      const tooltip = document.querySelector('.ql-tooltip')
      const toolbar = tooltip?.querySelector('.ql-toolbar')
      
      if (tooltip && range && range.length > 0) {
        // Use setProperty with priority to override Quill's inline styles
        tooltip.style.setProperty('display', 'block', 'important')
        tooltip.style.setProperty('visibility', 'visible', 'important')
        tooltip.style.setProperty('position', 'fixed', 'important')
        tooltip.style.setProperty('z-index', '70', 'important')
        tooltip.style.setProperty('background-color', '#333333', 'important')
        tooltip.style.setProperty('border-radius', '6px', 'important')
        tooltip.style.setProperty('box-shadow', '0 4px 16px rgba(0, 0, 0, 0.4)', 'important')
        tooltip.style.setProperty('padding', '6px 8px', 'important')
        tooltip.style.setProperty('margin-bottom', '10px', 'important')
        tooltip.classList.remove('ql-hidden')
        
        // Hide the input field container by default
        const editor = tooltip.querySelector('.ql-tooltip-editor')
        if (editor) {
          editor.style.setProperty('display', 'none', 'important')
        }
        
        // Force toolbar to have visible width
        if (toolbar) {
          toolbar.style.setProperty('display', 'inline-flex', 'important')
          toolbar.style.setProperty('flex-wrap', 'wrap', 'important')
          toolbar.style.setProperty('gap', '2px', 'important')
          toolbar.style.setProperty('width', 'auto', 'important')
          toolbar.style.setProperty('background', 'transparent', 'important')
          toolbar.style.setProperty('border', 'none', 'important')
          
          // Fix buttons display
          const buttons = toolbar.querySelectorAll('button')
          buttons.forEach(btn => {
            btn.style.setProperty('display', 'inline-block', 'important')
            btn.style.setProperty('float', 'none', 'important')
            btn.style.setProperty('width', '28px', 'important')
            btn.style.setProperty('height', '24px', 'important')
            btn.style.setProperty('padding', '2px', 'important')
            
            // Make SVG strokes white
            const svg = btn.querySelector('svg')
            if (svg) {
              const paths = svg.querySelectorAll('path, circle, line, rect')
              paths.forEach(path => {
                path.style.setProperty('stroke', 'white', 'important')
                path.style.setProperty('fill', 'white', 'important')
              })
            }
          })
        }
      } else if (tooltip) {
        tooltip.style.setProperty('display', 'none', 'important')
      }
    })
    
    // Listen for text changes to trigger auto-save
    quillInstance.on('text-change', () => {
      scheduleAutoSave()
    })
  }

  function startLockRefreshTimer(storyId: string) {
    if (lockRefreshTimer) clearInterval(lockRefreshTimer)
    lockRefreshTimer = setInterval(async () => {
      if ($session) {
        await refreshLock(storyId, $session.name)
      }
    }, LOCK_REFRESH_INTERVAL)
  }

  function clearLockRefreshTimer() {
    if (lockRefreshTimer) {
      clearInterval(lockRefreshTimer)
      lockRefreshTimer = null
    }
  }

  function handleViewportResize() {
    if (!window.visualViewport) return
    
    const viewport = window.visualViewport
    const windowHeight = window.innerHeight
    const viewportHeight = viewport.height
    
    const heightDiff = windowHeight - viewportHeight
    isKeyboardVisible = heightDiff > 100
    keyboardHeight = isKeyboardVisible ? heightDiff : 0
    
    if (isKeyboardVisible) {
      toolbarBottomPosition = windowHeight - viewport.height - viewport.offsetTop
    } else {
      toolbarBottomPosition = 0
    }
  }

  onMount(() => {
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize)
      window.visualViewport.addEventListener('scroll', handleViewportResize)
    }
  })

  onDestroy(() => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    clearLockRefreshTimer()
    
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', handleViewportResize)
      window.visualViewport.removeEventListener('scroll', handleViewportResize)
    }
    
    if (quillInstance) {
      quillInstance = null
    }
  })

  function getEditorHtml(): string {
    if (!quillInstance) return ''
    const html = quillInstance.root.innerHTML
    // Quill uses <p><br></p> for empty — treat as empty
    if (html === '<p><br></p>' || html === '<p></p>') return ''
    return html
  }

  function getWordCount(): number {
    let text = title + ' '
    if (quillInstance) {
      text += quillInstance.getText()
    }
    const words = text.trim().split(/\s+/).filter((w: string) => w.length > 0)
    return words.length
  }

  function scheduleAutoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    autoSaveTimer = setTimeout(saveToDatabase, AUTOSAVE_DELAY)
    saveToLocalStorage()
  }

  function saveToLocalStorage() {
    if (!$session) return
    const key = `draft_${$session.courseId}_${$editingStory.id || 'new'}`
    const data = {
      title,
      featuredImageUrl,
      featuredImageCaption,
      contentHtml: getEditorHtml(),
      savedAt: Date.now()
    }
    localStorage.setItem(key, JSON.stringify(data))
  }

  async function saveToDatabase(): Promise<string | null> {
    if (!$session || !title.trim()) return null
    saving = true

    const contentHtml = getEditorHtml()
    const storyData = {
      title,
      summary: '',
      featuredImageUrl,
      content: { html: contentHtml },
      publicationName: $session.publicationName || 'Unassigned'
    }

    let storyId: string | null = $editingStory.id || null

    try {
      if ($editingStory.id) {
        const result = await updateStory($editingStory.id, storyData)
        if (result.error) throw new Error(result.error)
        storyId = $editingStory.id
      } else {
        const result = await createStory({
          courseId: $session.courseId,
          publicationName: $session.publicationName || 'Unassigned',
          authorName: $session.name,
          title,
          summary: '',
          featuredImageUrl,
          content: { html: contentHtml },
          status: 'draft'
        })
        if (result.error) throw new Error(result.error)
        if (result.data) {
          storyId = result.data.id
          editingStory.update(s => ({ ...s, id: result.data!.id }))
        }
      }
      lastSavedTime = Date.now()
      editingStory.markSaved()
    } catch (err) {
      console.error('Save failed:', err)
      saving = false
      return null
    }
    saving = false
    return storyId
  }

  async function handleImageUpload(event: Event) {
    const input = event.target as HTMLInputElement
    if (!input.files?.length) return

    const file = input.files[0]
    try {
      const result = await uploadImage(file)
      featuredImageUrl = result.url
      scheduleAutoSave()
    } catch {
      showNotification('error', 'Failed to upload image')
    }
    input.value = ''
  }

  async function handleInlineImageUpload(event: Event) {
    const input = event.target as HTMLInputElement
    if (!input.files?.length || !quillInstance) return

    const file = input.files[0]
    
    try {
      const result = await uploadImage(file)
      if (result.url) {
        const range = quillInstance.getSelection(true)
        quillInstance.insertEmbed(range.index, 'image', getOptimizedUrl(result.url))
        quillInstance.setSelection(range.index + 1)
      }
    } catch {
      showNotification('error', 'Failed to upload image')
    }
    input.value = ''
  }

  async function handleVideoUpload(event: Event) {
    const input = event.target as HTMLInputElement
    if (!input.files?.length || !quillInstance) return

    const file = input.files[0]
    
    // Check file size (100MB limit on free Cloudinary plan)
    if (file.size > 100 * 1024 * 1024) {
      showNotification('error', 'Video must be under 100MB')
      input.value = ''
      return
    }
    
    uploadingVideo = true
    
    try {
      const result = await uploadVideo(file)
      if (result.error) {
        showNotification('error', result.error)
      } else if (result.url) {
        const range = quillInstance.getSelection(true)
        quillInstance.insertEmbed(range.index, 'cloudinary-video', result.url)
        quillInstance.setSelection(range.index + 1)
        scheduleAutoSave()
      }
    } catch {
      showNotification('error', 'Failed to upload video')
    }
    
    uploadingVideo = false
    input.value = ''
  }

  function openPreview() {
    const html = getEditorHtml()
    previewDrawerOpen.set(true)
  }

  function togglePublishToolbar() {
    showPublishToolbar = !showPublishToolbar
  }

  async function handlePublish() {
    if (!canPublish) return
    
    const storyId = await saveToDatabase()
    
    if (!storyId) {
      showNotification('error', 'Failed to save story')
      return
    }
    
    const result = await publishStory(storyId)
    if (result.error) {
      showNotification('error', 'Failed to publish')
      return
    }
    
    if ($session) {
      await logActivity(
        $session.courseId,
        $session.publicationName,
        'published',
        $session.name,
        storyId,
        title
      )
    }
    
    showNotification('success', 'Published!')
    await releaseAndClose()
  }

  async function handleSaveChanges() {
    const storyId = await saveToDatabase()
    
    if (!storyId) {
      showNotification('error', 'Failed to save')
      return
    }
    
    if ($session && isEditingExisting) {
      await logActivity(
        $session.courseId,
        $session.publicationName,
        'edited',
        $session.name,
        storyId,
        title
      )
    }
    
    showNotification('success', 'Changes saved!')
    await releaseAndClose()
  }

  async function releaseAndClose() {
    if ($editingStory.id && !isLocked) {
      await releaseLock($editingStory.id)
    }
    clearLockRefreshTimer()
    
    // Destroy Quill instance
    if (quillInstance) {
      quillInstance = null
    }
    
    editingStory.reset()
    writeDrawerOpen.set(false)
    showPublishToolbar = false
    showSaveToolbar = false
  }

  function toggleSaveToolbar() {
    showSaveToolbar = !showSaveToolbar
  }

  async function closeDrawer() {
    if ($editingStory.isDirty && !isLocked) {
      if (!confirm('You have unsaved changes. Discard them?')) return
    }
    await releaseAndClose()
  }

  function handleLockGoBack() {
    if (quillInstance) {
      quillInstance = null
    }
    editingStory.reset()
    writeDrawerOpen.set(false)
  }

  function removeFeaturedImage() {
    featuredImageUrl = null
    scheduleAutoSave()
  }

  function formatTimeAgo(timestamp: number | null): string {
    if (!timestamp) return ''
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return 'Saved'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `Saved ${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `Saved ${hours}h ago`
  }

  function hexToFilter(hex: string): string {
    const colorFilters: Record<string, string> = {
      '5422b0': 'invert(14%) sepia(95%) saturate(3500%) hue-rotate(256deg) brightness(75%) contrast(90%)',
      '02441f': 'invert(25%) sepia(100%) saturate(1500%) hue-rotate(120deg) brightness(40%) contrast(100%)',
      '004269': 'invert(20%) sepia(100%) saturate(2000%) hue-rotate(200deg) brightness(50%) contrast(95%)',
      '935D00': 'invert(35%) sepia(90%) saturate(1200%) hue-rotate(30deg) brightness(70%) contrast(85%)',
      '801c00': 'invert(25%) sepia(100%) saturate(2500%) hue-rotate(10deg) brightness(50%) contrast(100%)',
      'ab0000': 'invert(20%) sepia(100%) saturate(3000%) hue-rotate(0deg) brightness(50%) contrast(100%)',
      '333333': 'invert(18%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(45%) contrast(90%)'
    }
    
    const cleanHex = hex.replace('#', '').toLowerCase()
    return colorFilters[cleanHex] || 'invert(14%) sepia(95%) saturate(3500%) hue-rotate(256deg) brightness(75%) contrast(90%)'
  }

  // Reactive word count
  $: wordCount = getWordCount()
</script>

{#if $writeDrawerOpen}
  <div
    class="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-[480px] w-full z-50 bg-white flex flex-col h-svh"
    transition:fly={{ y: '100%', duration: 300 }}
    style="--selection-color: #{$teamColors.secondary};"
  >
    <!-- Header -->
    <header class="flex items-center justify-between px-4 py-3 shrink-0 border-b border-[#efefef]">
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
      
      <div class="flex items-center gap-2 text-sm text-[#777777]">
        {#if uploadingVideo}
          <span>Uploading video...</span>
        {:else if saving}
          <span>Saving...</span>
        {:else if lastSavedTime}
          <span>{formatTimeAgo(lastSavedTime)}</span>
        {/if}
      </div>
    </header>

    <!-- Content -->
    <main 
      class="flex-1 px-4 overflow-y-auto pb-4"
      style={isKeyboardVisible ? `padding-bottom: 80px;` : ''}
    >
      <!-- Title Input -->
      <div class="bg-white -mx-4 px-4 py-4 pt-5">
        <textarea
          bind:value={title}
          on:input={() => scheduleAutoSave()}
          placeholder="Title"
          class="title-input w-full text-2xl font-semibold text-[#333333] outline-none placeholder:text-[#999999] resize-none overflow-hidden"
          rows="1"
          maxlength="200"
          on:input={(e) => {
            const target = e.currentTarget;
            target.style.height = 'auto';
            target.style.height = target.scrollHeight + 'px';
          }}
        ></textarea>
      </div>

      <div class="pt-0">
        <!-- Featured Image -->
        {#if featuredImageUrl}
          <div class="relative">
            <img
              src={getOptimizedUrl(featuredImageUrl)}
              alt="Featured"
              class="w-full rounded-lg"
            />
            <button
              on:click={removeFeaturedImage}
              class="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
              aria-label="Remove image"
            >
              <img src="/icons/icon-close.svg" alt="" class="w-3 h-3 invert" />
            </button>
            <input
              type="text"
              bind:value={featuredImageCaption}
              on:input={() => scheduleAutoSave()}
              placeholder="Tap to add caption"
              class="w-full text-sm text-center text-[#777777] mt-2 outline-none placeholder:text-[#999999]"
            />
          </div>
        {/if}

        <!-- Quill Editor -->
        <div
          bind:this={editorContainer}
          class="editor-content relative min-h-[200px] text-base text-[#333333] leading-relaxed -mt-2"
        ></div>
      </div>

      <!-- Word Count -->
      {#if wordCount > 0}
        <div class="text-sm text-[#777777] mt-2 text-right">
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </div>
      {/if}
    </main>

    <!-- Bottom Toolbar Wrapper -->
    <div 
      class="toolbar-wrapper shrink-0 bg-white max-w-[480px] w-full"
      class:fixed={isKeyboardVisible}
      class:z-[60]={isKeyboardVisible}
      style={isKeyboardVisible ? `left: 50%; transform: translateX(-50%); bottom: ${toolbarBottomPosition}px;` : ''}
    >
      <!-- Publish Toolbar -->
      {#if showPublishToolbar}
        <div class="px-4 pb-2" transition:fly={{ y: 20, duration: 150 }}>
          <div class="flex items-center gap-3 rounded-full px-4 py-2 w-fit ml-auto" style="background-color: #{$teamColors.primary};">
            <button
              on:click={() => showPublishToolbar = false}
              class="w-6 h-6 bg-white rounded-full flex items-center justify-center"
              aria-label="Cancel"
            >
              <img src="/icons/icon-close.svg" alt="" class="w-3 h-3" style="filter: invert(14%) sepia(95%) saturate(3500%) hue-rotate(256deg) brightness(75%) contrast(90%);" />
            </button>
            <button
              on:click={handlePublish}
              disabled={!canPublish}
              class="text-white font-medium disabled:opacity-50"
            >
              Publish Now?
            </button>
          </div>
        </div>
      {/if}

      <!-- Save Changes Toolbar -->
      {#if showSaveToolbar}
        <div class="px-4 pb-2" transition:fly={{ y: 20, duration: 150 }}>
          <div class="flex items-center gap-3 rounded-full px-4 py-2 w-fit ml-auto" style="background-color: #{$teamColors.primary};">
            <button
              on:click={() => showSaveToolbar = false}
              class="w-6 h-6 bg-white rounded-full flex items-center justify-center"
              aria-label="Cancel"
            >
              <img src="/icons/icon-close.svg" alt="" class="w-3 h-3" style="filter: invert(14%) sepia(95%) saturate(3500%) hue-rotate(256deg) brightness(75%) contrast(90%);" />
            </button>
            <button
              on:click={handleSaveChanges}
              disabled={!title.trim()}
              class="text-white font-medium disabled:opacity-50"
            >
              Save Changes?
            </button>
          </div>
        </div>
      {/if}

      <!-- Toolbar -->
      <footer class="border-t border-[#efefef] px-4 py-3 bg-white">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button on:click={() => imageFileInput.click()} class="p-2" aria-label="Add image">
            <img
              src="/icons/icon-image.svg"
              alt=""
              class="w-5 h-5"
              style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
            />
          </button>
          <input
            bind:this={imageFileInput}
            type="file"
            accept="image/*"
            class="hidden"
            on:change={handleInlineImageUpload}
          />

          <button 
            on:click={() => videoFileInput.click()} 
            class="p-2" 
            aria-label="Add video"
            disabled={uploadingVideo}
          >
            <img
              src="/icons/icon-video.svg"
              alt=""
              class="w-5 h-5"
              class:animate-pulse={uploadingVideo}
              style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
            />
          </button>
          <input
            bind:this={videoFileInput}
            type="file"
            accept="video/*"
            class="hidden"
            on:change={handleVideoUpload}
          />

          <button on:click={() => fileInput.click()} class="p-2" aria-label="Featured image">
            <img
              src="/icons/icon-upload.svg"
              alt=""
              class="w-5 h-5"
              style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
            />
          </button>
        </div>

        <div class="w-px h-6 bg-[#999999]"></div>

        <div class="flex items-center gap-3">
          <button on:click={openPreview} class="p-2" aria-label="Preview">
            <img
              src="/icons/icon-preview.svg"
              alt=""
              class="w-5 h-5"
              style="filter: {hexToFilter($teamColors.primary)};"
            />
          </button>
          {#if isPublishedStory}
            <button
              on:click={toggleSaveToolbar}
              class="p-2 outline-none focus:outline-none"
              aria-label="Save Changes"
            >
              <img
                src={showSaveToolbar ? '/icons/icon-publish-fill.svg' : '/icons/icon-publish.svg'}
                alt=""
                class="w-5 h-5"
                style="filter: {hexToFilter($teamColors.primary)};"
              />
            </button>
          {:else}
            <button
              on:click={togglePublishToolbar}
              class="p-2 outline-none focus:outline-none"
              aria-label="Publish"
            >
              <img
                src={showPublishToolbar ? '/icons/icon-publish-fill.svg' : '/icons/icon-publish.svg'}
                alt=""
                class="w-5 h-5"
                style="filter: {hexToFilter($teamColors.primary)};"
              />
            </button>
          {/if}
        </div>
      </div>
      </footer>
    </div>

    <!-- Hidden file input for featured image -->
    <input
      bind:this={fileInput}
      type="file"
      accept="image/*"
      class="hidden"
      on:change={handleImageUpload}
    />
  </div>

  <!-- Preview Drawer -->
  {#if $previewDrawerOpen}
    <PreviewDrawer
      {title}
      summary=""
      {featuredImageUrl}
      {featuredImageCaption}
      contentHtml={getEditorHtml()}
    />
  {/if}

  <!-- Lock Warning Modal -->
  {#if isLocked && lockedBy}
    <LockWarning {lockedBy} on:goback={handleLockGoBack} />
  {/if}
{/if}

<style>
  .title-input {
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: pre-wrap;
  }

  .title-input::selection {
    background-color: var(--selection-color) !important;
  }

  /* Quill Bubble theme overrides for our app */
  .editor-content :global(.ql-editor) {
    padding: 0;
    font-size: 1rem;
    line-height: 1.625;
    color: #333333;
    min-height: 200px;
  }

  .editor-content :global(.ql-editor.ql-blank::before) {
    color: #999999;
    font-style: normal;
    left: 0;
    right: 0;
  }

  .editor-content :global(.ql-editor p) {
    margin-bottom: 1rem;
  }

  .editor-content :global(.ql-editor strong) {
    font-weight: 700;
  }

  .editor-content :global(.ql-editor em) {
    font-style: italic;
  }

  .editor-content :global(.ql-editor u) {
    text-decoration: underline;
  }

  .editor-content :global(.ql-editor h2) {
    font-size: 1.25rem;
    font-weight: 700;
    margin-top: 1rem;
    margin-bottom: 1rem;
  }

  .editor-content :global(.ql-editor img) {
    max-width: 100%;
    border-radius: 0.5rem;
    margin: 1rem 0;
  }

  .editor-content :global(.ql-editor .ql-video-wrapper) {
    margin: 1rem 0;
  }

  .editor-content :global(.ql-editor video) {
    max-width: 100%;
    border-radius: 0.5rem;
  }

  .editor-content :global(.ql-editor a) {
    text-decoration: underline;
  }

  .editor-content :global(.ql-editor hr) {
    border: none;
    border-top: 1px solid #999999;
    width: 50%;
    margin: 1.5rem auto;
  }

  /* Bubble tooltip (toolbar) styling */
  .editor-content :global(.ql-tooltip) {
    display: block !important;
  }

  .editor-content :global(.ql-tooltip.ql-hidden) {
    display: block !important;
  }

  .editor-content :global(.ql-bubble .ql-tooltip) {
    position: fixed;
    z-index: 70;
    background-color: #333333;
    border-radius: 4px;
    color: white;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  }

  .editor-content :global(.ql-toolbar) {
    width: auto !important;
    background: transparent;
    border: none;
    display: flex !important;
    min-width: 200px;
  }

  .editor-content :global(.ql-bubble .ql-tooltip-arrow) {
    display: block;
  }

  .editor-content :global(.ql-bubble .ql-tooltip button) {
    color: white;
  }

  .editor-content :global(.ql-bubble .ql-tooltip button svg) {
    fill: white !important;
  }

  .editor-content :global(.ql-bubble .ql-tooltip button:hover) {
    color: #ffffff;
  }

  .editor-content :global(.ql-bubble .ql-tooltip button.ql-active) {
    color: #ffffff;
  }

  .editor-content :global(.ql-bubble .ql-tooltip-editor input) {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: none;
  }

  .editor-content :global(.ql-bubble .ql-tooltip-editor input::placeholder) {
    color: rgba(255, 255, 255, 0.6);
  }

  .editor-content :global(.ql-out-bottom),
  .editor-content :global(.ql-out-top) {
    visibility: visible !important;
  }

  .editor-content :global(*)::selection {
    background-color: var(--selection-color) !important;
  }
</style>
