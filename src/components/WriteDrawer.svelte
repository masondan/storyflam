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
  import { uploadImage, getOptimizedUrl, uploadVideo, getOptimizedVideoUrl, compressImage, MAX_IMAGE_FILE_SIZE, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES } from '$lib/cloudinary'
  import { createStory, updateStory, publishStory, acquireLock, releaseLock, refreshLock } from '$lib/stories'
  import { logActivity } from '$lib/activity'
  import { renderContent } from '$lib/content'
  import { initPlyrInContainer, stripPlyrMarkup } from '$lib/plyr-init'
  import PreviewDrawer from './PreviewDrawer.svelte'
  import LockWarning from './LockWarning.svelte'
  import LinkModal from './LinkModal.svelte'

  let title = ''
  let imageFileInput: HTMLInputElement
  let videoFileInput: HTMLInputElement

  let showPublishToolbar = false
  let showSaveToolbar = false
  let saving = false
  let lastSavedTime: number | null = null
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
  let periodicAutoSaveTimer: ReturnType<typeof setInterval> | null = null

  // Quill editor
  let editorContainer: HTMLDivElement
  let quillInstance: any = null
  let uploadingVideo = false
  let uploadingImage = false

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

  // Link modal state
  let showLinkModal = false
  let linkInitialText = ''

  // Media delete overlay state
  let deleteOverlay: { type: 'image' | 'video', element: HTMLElement } | null = null

  // Plyr cleanup for editor videos
  let cleanupPlyr: (() => void) | null = null

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
      lastSavedTime = story.lastSaved
    } else {
      title = ''
      lastSavedTime = null
    }
    showPublishToolbar = false
    saving = false
    
    // Clean up any existing Plyr instances
    if (cleanupPlyr) { cleanupPlyr(); cleanupPlyr = null }
    
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
      // Initialize Plyr on any videos in loaded content
      await initEditorPlyr()
    }
  }

  async function initEditorPlyr() {
    if (!editorContainer) return
    if (cleanupPlyr) { cleanupPlyr(); cleanupPlyr = null }
    await tick()
    cleanupPlyr = await initPlyrInContainer(editorContainer)
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
        node.classList.add('my-4', 'relative', 'group', 'w-full')
        // Set aspect ratio via inline style for consistent shimmer height
        node.style.aspectRatio = '16/9'
        
        const video = document.createElement('video')
        video.setAttribute('playsinline', '')
        video.classList.add('w-full', 'h-full', 'rounded-lg', 'opacity-0')
        video.style.pointerEvents = 'none'
        video.controls = false
        
        // Only create source element if value is a real URL, not a placeholder
        if (value && !value.startsWith('video-placeholder-')) {
          const source = document.createElement('source')
          source.setAttribute('src', getOptimizedVideoUrl(value))
          source.setAttribute('type', 'video/mp4')
          video.appendChild(source)
        }
        
        node.appendChild(video)
        node.dataset.videoUrl = value
        // Don't initialize Plyr here - store raw video HTML only
        // Plyr will be initialized in the views (PreviewDrawer, StoryReaderDrawer)
        
        return node
      }
      
      static value(node: HTMLElement): string {
        return node.dataset.videoUrl || node.querySelector('source')?.getAttribute('src') || ''
      }
    }
    
    Quill.register(VideoBlot)
    
    // Register a custom divider (horizontal rule) blot
    class DividerBlot extends BlockEmbed {
      static blotName = 'divider'
      static tagName = 'hr'
    }
    Quill.register(DividerBlot)
    
    quillInstance = new Quill(editorContainer, {
      theme: 'snow',
      placeholder: 'Text',
      formats: ['bold', 'header', 'link', 'image', 'cloudinary-video', 'divider'],
      modules: {
        toolbar: false,
        clipboard: {
          matchVisual: false
        }
      }
    })
    
    // Listen for text changes to trigger auto-save
    quillInstance.on('text-change', () => {
      scheduleAutoSave()
    })
  }

  function startPeriodicAutoSave() {
    if (periodicAutoSaveTimer) clearInterval(periodicAutoSaveTimer)
    periodicAutoSaveTimer = setInterval(async () => {
      if ($editingStory.isDirty && $editingStory.id) {
        await saveToDatabase()
        editingStory.markSaved()
      }
    }, 30000) // Every 30 seconds
  }

  function stopPeriodicAutoSave() {
    if (periodicAutoSaveTimer) {
      clearInterval(periodicAutoSaveTimer)
      periodicAutoSaveTimer = null
    }
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

  onMount(async () => {
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize)
      window.visualViewport.addEventListener('scroll', handleViewportResize)
    }
    
    // Start periodic auto-save
    startPeriodicAutoSave()
  })

  onDestroy(() => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    stopPeriodicAutoSave()
    clearLockRefreshTimer()
    if (cleanupPlyr) { cleanupPlyr(); cleanupPlyr = null }
    
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
    // Strip any Plyr DOM wrappers so only clean video HTML is saved
    return stripPlyrMarkup(html)
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

  async function handleInlineImageUpload(event: Event) {
    const input = event.target as HTMLInputElement
    if (!input.files?.length || !quillInstance) return

    const file = input.files[0]

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

    uploadingImage = true

    try {
      // Compress image before upload
      const compressedFile = await compressImage(file)
      const result = await uploadImage(compressedFile)

      if (result.error) {
        showNotification('error', 'Upload failed. Please try again.')
        uploadingImage = false
        input.value = ''
        return
      }

      if (result.url) {
        const range = quillInstance.getSelection(true)
        quillInstance.insertEmbed(range.index, 'image', getOptimizedUrl(result.url))
        // Insert a new paragraph after the image and move cursor to it
        quillInstance.insertText(range.index + 1, '\n')
        quillInstance.setSelection(range.index + 2)
        scheduleAutoSave()
      }
    } catch (err) {
      console.error('Image upload error:', err)
      showNotification('error', 'Upload failed. Please try again.')
    } finally {
      uploadingImage = false
      input.value = ''
    }
  }

  async function handleVideoUpload(event: Event) {
    const input = event.target as HTMLInputElement
    if (!input.files?.length || !quillInstance) return

    const file = input.files[0]
    
    // Check file type
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      showNotification('error', 'Video must be MP4 or WebM.')
      input.value = ''
      return
    }
    
    // Check file size (100MB limit on free Cloudinary plan)
    if (file.size > 100 * 1024 * 1024) {
      showNotification('error', 'Video must be under 100MB')
      input.value = ''
      return
    }
    
    uploadingVideo = true
    
    try {
      // Get current cursor position before we insert anything
      const range = quillInstance.getSelection(true)
      
      // DEBUG: Log initial state
      let initialVideos = quillInstance.root.querySelectorAll('[data-video-url]')
      console.log(`[Video Upload] BEFORE insert: ${initialVideos.length} video elements`)
      
      // Insert a placeholder shimmer at the cursor position
      // Use a video URL as placeholder to maintain type consistency
      const placeholderId = `video-placeholder-${Date.now()}`
      quillInstance.insertEmbed(range.index, 'cloudinary-video', placeholderId)
      // Block embeds automatically create newlines; just move cursor after the embed
      quillInstance.setSelection(range.index + 1)
      
      // Now get the placeholder element and add shimmer animation
      const placeholderElement = quillInstance.root.querySelector(`[data-video-url="${placeholderId}"]`)
      if (placeholderElement) {
        placeholderElement.classList.add('animate-shimmer')
      }
      
      // DEBUG: Check how many shimmer elements exist globally
      const allShimmers = document.querySelectorAll('.animate-shimmer')
      console.log(`[Video Upload] Elements with animate-shimmer class: ${allShimmers.length}`)
      allShimmers.forEach((s, i) => {
        console.log(`  Shimmer ${i}: ${s.tagName} ${s.className}`)
      })
      
      // DEBUG: Log how many video wrappers exist
      const allVideos = quillInstance.root.querySelectorAll('[data-video-url]')
      console.log(`[Video Upload] AFTER insert: ${allVideos.length} video elements`)
      allVideos.forEach((v, i) => {
        const dataUrl = v.getAttribute('data-video-url')
        const sourceUrl = v.querySelector('source')?.getAttribute('src')
        console.log(`  Video ${i}:`)
        console.log(`    data-video-url="${dataUrl}"`)
        console.log(`    <source src="${sourceUrl}">`)
        console.log(`    classes="${v.className}"`)
      })
      
      // Upload in the background
      const result = await uploadVideo(file)
      
      if (result.error) {
        // Remove placeholder and show error
        const toDelete = quillInstance.root.querySelector(`[data-video-url="${placeholderId}"]`)
        if (toDelete) {
          toDelete.remove()
        }
        showNotification('error', result.error)
      } else if (result.url) {
       // Replace the placeholder with the actual video URL
       const placeholderNode = quillInstance.root.querySelector(`[data-video-url="${placeholderId}"]`)
       console.log(`[Video Upload] Upload complete. Found placeholder node:`, !!placeholderNode)
       if (placeholderNode) {
         const video = placeholderNode.querySelector('video')
         console.log(`[Video Upload] Found video element:`, !!video)
         
         // Update the dataset to the real URL
         placeholderNode.dataset.videoUrl = result.url
         console.log(`[Video Upload] Updated data-video-url to: ${result.url}`)
         
         // Create source element if it doesn't exist (it won't for placeholders)
         let sourceElement = placeholderNode.querySelector('source')
         if (!sourceElement && video) {
           sourceElement = document.createElement('source')
           sourceElement.setAttribute('type', 'video/mp4')
           video.appendChild(sourceElement)
         }
         
         // Update the source URL
         if (sourceElement) {
           sourceElement.setAttribute('src', getOptimizedVideoUrl(result.url))
         }
         
         // Remove shimmer animation
         placeholderNode.classList.remove('animate-shimmer')
         
         // Initialize Plyr on just this video instead of scanning entire editor
         if (video) {
           await tick()
           const Plyr = (await import('plyr')).default
           try {
             const player = new Plyr(video, {
               controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen']
             })
             
             // Hide Plyr controls until video is ready
             const plyrWrapper = video.closest('.plyr')
             if (plyrWrapper) {
               plyrWrapper.style.opacity = '0'
               plyrWrapper.style.pointerEvents = 'none'
             }
             
             // Show when ready
             const onCanPlay = () => {
               video.style.pointerEvents = 'auto'
               video.classList.remove('opacity-0')
               video.classList.add('animate-fade-in')
               if (plyrWrapper) {
                 plyrWrapper.style.opacity = '1'
                 plyrWrapper.style.pointerEvents = 'auto'
               }
               video.removeEventListener('canplay', onCanPlay)
             }
             
             video.addEventListener('canplay', onCanPlay)
             video.addEventListener('error', onCanPlay, { once: true })
           } catch (err) {
             console.error('[Plyr] Failed to initialize:', err)
           }
         }
       }
       
       // DEBUG: Final state
       const finalVideos = quillInstance.root.querySelectorAll('[data-video-url]')
       console.log(`[Video Upload] AFTER update: ${finalVideos.length} video elements`)
       finalVideos.forEach((v, i) => {
         const dataUrl = v.getAttribute('data-video-url')
         const sourceUrl = v.querySelector('source')?.getAttribute('src')
         console.log(`  Video ${i}:`)
         console.log(`    data-video-url="${dataUrl}"`)
         console.log(`    <source src="${sourceUrl}">`)
         console.log(`    classes="${v.className}"`)
       })
       
       scheduleAutoSave()
       }
       } catch {
       showNotification('error', 'Failed to upload video')
       }
       
       uploadingVideo = false
       input.value = ''
       }

  // Bottom toolbar formatting functions
  function toggleBold() {
    if (!quillInstance) return
    const format = quillInstance.getFormat()
    quillInstance.format('bold', !format.bold)
  }

  function toggleHeading() {
    if (!quillInstance) return
    const format = quillInstance.getFormat()
    quillInstance.format('header', format.header === 2 ? false : 2)
  }

  function openLinkModal() {
    if (!quillInstance) return
    const range = quillInstance.getSelection()
    if (range && range.length > 0) {
      linkInitialText = quillInstance.getText(range.index, range.length)
    } else {
      linkInitialText = ''
    }
    showLinkModal = true
  }

  function handleLinkAdd(event: CustomEvent<{ text: string; url: string }>) {
    if (!quillInstance) return
    const { text, url } = event.detail
    const range = quillInstance.getSelection(true)
    
    if (range.length > 0) {
      // Replace selected text with link
      quillInstance.deleteText(range.index, range.length)
    }
    quillInstance.insertText(range.index, text, 'link', url)
    quillInstance.setSelection(range.index + text.length)
    showLinkModal = false
    scheduleAutoSave()
  }

  function handleMediaClick(e: MouseEvent) {
    const target = e.target as HTMLElement
    const img = target.closest('img') as HTMLImageElement
    
    // Only show delete overlay for images, not videos (Plyr player needs to work)
    if (img && img.closest('.ql-editor')) {
      e.preventDefault()
      deleteOverlay = {
        type: 'image',
        element: img
      }
    }
  }

  function deleteMedia() {
    if (!deleteOverlay || !quillInstance) return

    const element = deleteOverlay.element
    const blot = quillInstance.constructor.find(element)
    if (blot) {
      blot.remove()
      scheduleAutoSave()
    }
    deleteOverlay = null
  }

  function insertSeparator() {
    if (!quillInstance) return
    const range = quillInstance.getSelection(true)
    quillInstance.insertText(range.index, '\n')
    quillInstance.insertEmbed(range.index + 1, 'divider', true)
    quillInstance.setSelection(range.index + 2)
    scheduleAutoSave()
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
        {#if uploadingImage}
          <span>Uploading image...</span>
        {:else if uploadingVideo}
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

      <div class="pt-0 relative">

        <!-- Quill Editor -->
         <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
         <div
           bind:this={editorContainer}
           class="editor-content relative text-base text-[#333333] leading-relaxed -mt-2"
           on:click={(e) => {
             handleMediaClick(e)
             if (quillInstance) quillInstance.focus()
           }}
         ></div>

         <!-- Media Delete Button -->
         {#if deleteOverlay}
           <button
             on:click={deleteMedia}
             class="absolute w-8 h-8 rounded-full flex items-center justify-center z-50"
             style="top: {deleteOverlay.element.offsetTop + 16}px; left: {deleteOverlay.element.offsetLeft + deleteOverlay.element.offsetWidth - 46}px; background-color: #777777;"
             aria-label="Delete {deleteOverlay.type}"
           >
             <img src="/icons/icon-close.svg" alt="" class="w-4 h-4 invert" />
           </button>
         {/if}
      </div>

      <!-- Video Upload Shimmer (while uploading, before video appears) -->
      {#if uploadingVideo}
        <div class="my-4 w-full aspect-video rounded-lg bg-gradient-to-r from-[#d0d0d0] via-[#e8e8e8] to-[#d0d0d0] bg-[length:200%_100%] animate-shimmer"></div>
      {/if}

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
          <button on:click={toggleBold} class="p-2" aria-label="Bold text">
            <img
              src="/icons/icon-bold.svg"
              alt=""
              class="w-5 h-5"
              style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
            />
          </button>
          <button on:click={toggleHeading} class="p-2" aria-label="Add subhead">
            <img
              src="/icons/icon-heading.svg"
              alt=""
              class="w-5 h-5"
              style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
            />
          </button>
          <button on:click={openLinkModal} class="p-2" aria-label="Add link">
            <img
              src="/icons/icon-link.svg"
              alt=""
              class="w-5 h-5"
              style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
            />
          </button>
          <button on:click={insertSeparator} class="p-2" aria-label="Add separator">
            <img
              src="/icons/icon-separator.svg"
              alt=""
              class="w-5 h-5"
              style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
            />
          </button>
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
          <button on:click={() => imageFileInput.click()} class="p-2" aria-label="Add image" disabled={uploadingImage}>
            <img
              src="/icons/icon-image.svg"
              alt=""
              class="w-5 h-5"
              class:animate-pulse={uploadingImage}
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

  </div>

  <!-- Preview Drawer -->
  {#if $previewDrawerOpen}
    <PreviewDrawer
      {title}
      summary=""
      contentHtml={getEditorHtml()}
    />
  {/if}

  <!-- Link Modal -->
  <LinkModal
    open={showLinkModal}
    initialText={linkInitialText}
    on:add={handleLinkAdd}
    on:close={() => showLinkModal = false}
  />

  <!-- Lock Warning Modal -->
  {#if isLocked && lockedBy}
    <LockWarning {lockedBy} on:goback={handleLockGoBack} />
  {/if}
{/if}

<style>
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

:global(.animate-shimmer) {
  background: linear-gradient(
    90deg,
    #f0f0f0 0%,
    #e0e0e0 50%,
    #f0f0f0 100%
  );
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}

:global(.animate-shimmer video) {
  opacity: 0 !important;
}

:global(.animate-fade-in) {
  animation: fadeIn 0.3s ease-in-out forwards;
}

  .title-input {
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: pre-wrap;
  }

  .title-input::selection {
    background-color: var(--selection-color) !important;
  }

  /* Quill editor styling — Snow theme with toolbar disabled, all chrome hidden */
  .editor-content {
    display: block;
    width: 100%;
    min-height: calc(100vh - 320px);
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
  }

  .editor-content :global(.ql-container.ql-snow),
  .editor-content :global(.ql-snow),
  .editor-content :global(.ql-container),
  .editor-content :global(.ql-editor),
  .editor-content :global(.ql-editor:focus),
  .editor-content :global(.ql-editor.ql-focused) {
    border: none !important;
    border-top: none !important;
    border-right: none !important;
    border-bottom: none !important;
    border-left: none !important;
    outline: none !important;
    outline-width: 0 !important;
    box-shadow: none !important;
    background-color: transparent !important;
  }

  .editor-content :global(.ql-container) {
    height: 100%;
    border: none !important;
  }

  .editor-content :global(.ql-container::before),
  .editor-content :global(.ql-container::after) {
    display: none !important;
  }

  .editor-content :global(.ql-tooltip) {
    display: none !important;
  }

  .editor-content :global(.ql-editor) {
    padding: 0;
    font-size: 1rem;
    line-height: 1.625;
    color: #333333;
    min-height: 100%;
    height: 100%;
  }

  .editor-content :global(.ql-editor.ql-blank::before) {
    color: #999999;
    font-style: normal;
    left: 0;
    right: 0;
  }

  .editor-content :global(.ql-editor p) {
    margin-bottom: 0.5rem;
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
    cursor: pointer;
  }

  .editor-content :global(.ql-editor .ql-video-wrapper) {
    margin: 1rem 0;
  }

  .editor-content :global(.ql-editor video) {
    width: 100%;
    border-radius: 0.5rem;
  }

  .editor-content :global(.plyr) {
    --plyr-color-main: #5422b0;
    border-radius: 0.5rem;
    overflow: hidden;
    background: transparent;
  }

  .editor-content :global(.plyr__video-wrapper) {
    background: transparent;
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

  .editor-content :global(*)::selection {
    background-color: var(--selection-color) !important;
  }
</style>
