<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { goto } from '$app/navigation'
  import { session, showNotification, teamColors, isTrainer, isGuestEditor } from '$lib/stores'
  import { supabase } from '$lib/supabase'
  import { logActivity } from '$lib/activity'
  import type { Publication, Journalist } from '$lib/types'
  import ConfirmationToolbar from '$components/ConfirmationToolbar.svelte'
  import ColorPalette from '$components/ColorPalette.svelte'
  import TeamMemberItem from '$components/TeamMemberItem.svelte'
  import PublicationLogoUpload from '$components/PublicationLogoUpload.svelte'
  import ShareToggle from '$components/ShareToggle.svelte'
  import PublicationLockToggle from '$components/PublicationLockToggle.svelte'
  import CombinedAdminTab from '$components/CombinedAdminTab.svelte'

  type TabType = 'settings' | 'admin'
  type ConfirmationAction = null | 'create-team' | 'leave-team' | 'make-editor'

  let activeTab: TabType = 'settings'

  // Byline state
  let bylineName = ''
  let originalBylineName = ''
  let bylineEditing = false
  let bylineValidating = false
  let bylineValid = true
  let bylineError = ''
  let bylineSaving = false

  // Create team state
  let createTeamInput = ''
  let createTeamEditing = false
  let createTeamValidating = false
  let createTeamValid: boolean | null = null
  let createTeamError = ''
  let createTeamSaving = false

  // Rename publication state (editor only)
  let publicationRenaming = false
  let publicationRenameInput = ''
  let publicationRenameValid: boolean | null = null
  let publicationRenameError = ''
  let publicationRenameSaving = false
  let publicationRenameValidating = false

  // Join team state (inline toolbar)
  let availableTeams: Publication[] = []
  let joiningTeamId: string | null = null
  let joiningTeamName: string | null = null
  let joiningTeamLocked = false
  let isJoiningTeam = false

  // Team data
  let team: Publication | null = null
  let teamMembers: Journalist[] = []
  let currentUserIsEditor = false

  // Accordion state
  let allPublicationsOpen = false
  let membersOpen = false
  let publicationSettingsOpen = false

  // Toggle accordion with mutual exclusivity
  function toggleAccordion(accordion: 'all' | 'members' | 'settings') {
    allPublicationsOpen = accordion === 'all' ? !allPublicationsOpen : false
    membersOpen = accordion === 'members' ? !membersOpen : false
    publicationSettingsOpen = accordion === 'settings' ? !publicationSettingsOpen : false
  }

  // Confirmation & modals
  let confirmationAction: ConfirmationAction = null
  let selectedMemberForRemoval: string | null = null
  let selectedMemberForEditor: { name: string; willBeEditor: boolean } | null = null
  let confirmationLoading = false
  let deleteTeamConfirming = false

  // Realtime subscription
  let journalistsSubscription: ReturnType<typeof supabase.channel> | null = null
  let teamsSubscription: ReturnType<typeof supabase.channel> | null = null

  // Inline leave confirmation state
  let leavingMemberName: string | null = null
  let isLeaving = false

  // Inline editor toggle confirmation state
  let editorToggleMember: { name: string; willBeEditor: boolean } | null = null
  let isTogglingEditor = false

  // Advisory modals for last editor/member edge cases
  let showLastEditorAdvisory = false
  let showLastMemberAdvisory = false
  let showJoinWithoutLeavingAdvisory = false

  $: courseId = $session?.courseId || ''
  $: currentUserName = $session?.name || ''
  $: currentTeamName = $session?.publicationName || null
  $: primaryColor = team?.primary_color || '5422b0'
  $: secondaryColor = team?.secondary_color || 'f0e6f7'
  $: showAdminTab = $isTrainer || $isGuestEditor

  onMount(async () => {
    bylineName = $session?.name || ''
    originalBylineName = bylineName

    await loadAvailableTeams()
    
    if ($session?.publicationName) {
      await loadTeamData()
    }

    setupRealtimeSubscription()
  })

  onDestroy(() => {
    if (journalistsSubscription) {
      supabase.removeChannel(journalistsSubscription)
    }
    if (teamsSubscription) {
      supabase.removeChannel(teamsSubscription)
    }
  })

  function setupRealtimeSubscription() {
    journalistsSubscription = supabase
      .channel('journalists-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'journalists',
          filter: `course_id=eq.${courseId}`
        },
        () => {
          if (currentTeamName) {
            loadTeamMembers()
          }
        }
      )
      .subscribe()

    teamsSubscription = supabase
      .channel('teams-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
          filter: `course_id=eq.${courseId}`
        },
        () => {
          loadAvailableTeams()
        }
      )
      .subscribe()
  }

  async function loadAvailableTeams() {
    if (!courseId) return

    const { data } = await supabase
      .from('publications')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })

    if (data) {
      availableTeams = data
    }
  }

  async function loadTeamData(teamNameOverride?: string) {
    const teamToLoad = teamNameOverride || currentTeamName
    if (!teamToLoad || !courseId) return

    const { data: teamData } = await supabase
      .from('publications')
      .select('*')
      .eq('course_id', courseId)
      .eq('publication_name', teamToLoad)
      .single()

    if (teamData) {
      team = teamData
      teamColors.set({ primary: teamData.primary_color, secondary: teamData.secondary_color })
    }

    await loadTeamMembers(teamToLoad)
  }

  async function loadTeamMembers(teamNameOverride?: string) {
    const teamToLoad = teamNameOverride || currentTeamName
    if (!teamToLoad || !courseId) return

    const { data } = await supabase
      .from('journalists')
      .select('*')
      .eq('course_id', courseId)
      .eq('publication_name', teamToLoad)
      .order('created_at', { ascending: true })

    if (data) {
      teamMembers = data
      const currentUser = data.find(j => j.name === currentUserName)
      currentUserIsEditor = currentUser?.is_editor || false
    }
  }

  // Byline validation with debounce
  let bylineDebounceTimer: ReturnType<typeof setTimeout>

  function handleBylineInput(event: Event) {
    const input = event.target as HTMLInputElement
    bylineName = input.value

    if (bylineName === originalBylineName) {
      bylineValid = true
      bylineError = ''
      return
    }

    clearTimeout(bylineDebounceTimer)
    bylineValidating = true
    bylineDebounceTimer = setTimeout(validateByline, 300)
  }

  async function validateByline() {
    if (!bylineName.trim() || bylineName === originalBylineName) {
      bylineValidating = false
      bylineValid = true
      bylineError = ''
      return
    }

    const { data } = await supabase
      .from('journalists')
      .select('id')
      .eq('course_id', courseId)
      .eq('name', bylineName.trim())

    bylineValidating = false
    if (data && data.length > 0) {
      bylineValid = false
      bylineError = 'Name taken. Try again'
    } else {
      bylineValid = true
      bylineError = ''
    }
  }

  function startBylineEdit() {
    bylineEditing = true
    bylineValid = true
    bylineError = ''
  }

  function cancelBylineEdit() {
    bylineName = originalBylineName
    bylineEditing = false
    bylineValid = true
    bylineError = ''
  }

  async function saveByline() {
    if (!bylineValid || bylineSaving || bylineName === originalBylineName) return

    bylineSaving = true
    const newName = bylineName.trim()
    const oldName = originalBylineName

    // Update journalist record
    const { error } = await supabase
      .from('journalists')
      .update({ name: newName, updated_at: new Date().toISOString() })
      .eq('course_id', courseId)
      .eq('name', oldName)

    if (error) {
      showNotification('error', 'Failed to save. Try again.')
      bylineSaving = false
      return
    }

    // Update author_name in all stories by this journalist
    const { error: storiesError } = await supabase
      .from('stories')
      .update({ author_name: newName, updated_at: new Date().toISOString() })
      .eq('course_id', courseId)
      .eq('author_name', oldName)

    if (storiesError) {
      console.error('Failed to update stories author_name:', storiesError)
    }

    session.set({
      ...$session!,
      name: newName
    })

    originalBylineName = newName
    bylineEditing = false
    bylineSaving = false
    showNotification('success', 'Byline changed')
  }

  // Create team validation with debounce
  let createTeamDebounceTimer: ReturnType<typeof setTimeout>
  let publicationRenameDebounceTimer: ReturnType<typeof setTimeout>

  function handleCreateTeamInput(event: Event) {
    const input = event.target as HTMLInputElement
    createTeamInput = input.value

    if (!createTeamInput.trim()) {
      createTeamValid = null
      createTeamError = ''
      return
    }

    clearTimeout(createTeamDebounceTimer)
    createTeamValidating = true
    createTeamDebounceTimer = setTimeout(validateCreateTeamName, 300)
  }

  async function validateCreateTeamName() {
    if (!createTeamInput.trim()) {
      createTeamValidating = false
      createTeamValid = null
      createTeamError = ''
      return
    }

    const { data } = await supabase
      .from('publications')
      .select('id')
      .eq('course_id', courseId)
      .eq('publication_name', createTeamInput.trim())

    createTeamValidating = false

    if (data && data.length > 0) {
      createTeamValid = false
      createTeamError = 'Team already exists'
    } else {
      createTeamValid = true
      createTeamError = ''
    }
  }

  function startTeamNameEdit() {
    if (currentTeamName) {
      showJoinWithoutLeavingAdvisory = true
      return
    }
    createTeamEditing = true
    createTeamValid = null
    createTeamError = ''
  }

  function cancelTeamNameEdit() {
    createTeamInput = ''
    createTeamEditing = false
    createTeamValid = null
    createTeamError = ''
  }

  // Publication rename (editor only)
  function startPublicationRename() {
    if (!currentUserIsEditor || !currentTeamName) return
    publicationRenaming = true
    publicationRenameInput = currentTeamName
    publicationRenameValid = null
    publicationRenameError = ''
  }

  function cancelPublicationRename() {
    publicationRenaming = false
    publicationRenameInput = ''
    publicationRenameValid = null
    publicationRenameError = ''
  }

  function handlePublicationRenameInput(event: Event) {
    const input = event.target as HTMLInputElement
    publicationRenameInput = input.value

    if (publicationRenameInput === currentTeamName) {
      publicationRenameValid = null
      publicationRenameError = ''
      return
    }

    if (!publicationRenameInput.trim()) {
      publicationRenameValid = null
      publicationRenameError = ''
      return
    }

    clearTimeout(publicationRenameDebounceTimer)
    publicationRenameValidating = true
    publicationRenameDebounceTimer = setTimeout(validatePublicationRename, 300)
  }

  async function validatePublicationRename() {
    if (!publicationRenameInput.trim() || publicationRenameInput === currentTeamName) {
      publicationRenameValidating = false
      publicationRenameValid = null
      publicationRenameError = ''
      return
    }

    const { data } = await supabase
      .from('publications')
      .select('id')
      .eq('course_id', courseId)
      .eq('publication_name', publicationRenameInput.trim())

    publicationRenameValidating = false
    if (data && data.length > 0) {
      publicationRenameValid = false
      publicationRenameError = 'Name taken. Try again'
    } else {
      publicationRenameValid = true
      publicationRenameError = ''
    }
  }

  async function savePublicationRename() {
    if (!publicationRenameValid || publicationRenameSaving || !currentTeamName) return
    if (publicationRenameInput.trim() === currentTeamName) return

    publicationRenameSaving = true
    const newName = publicationRenameInput.trim()
    const oldName = currentTeamName

    try {
      const { error: pubError } = await supabase
        .from('publications')
        .update({ publication_name: newName, updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('publication_name', oldName)

      if (pubError) throw pubError

      const { error: journalistError } = await supabase
        .from('journalists')
        .update({ publication_name: newName, updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('publication_name', oldName)

      if (journalistError) console.error('Failed to update journalists:', journalistError)

      const { error: storiesError } = await supabase
        .from('stories')
        .update({ publication_name: newName, updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('publication_name', oldName)

      if (storiesError) console.error('Failed to update stories:', storiesError)

      session.set({
        ...$session!,
        publicationName: newName
      })

      if (team) {
        team = { ...team, publication_name: newName }
      }

      publicationRenaming = false
      publicationRenameInput = ''
      publicationRenameValid = null

      await loadAvailableTeams()
      await loadTeamData(newName)
      showNotification('success', 'Publication renamed')
    } catch (error) {
      console.error('Rename publication error:', error)
      showNotification('error', 'Failed to rename. Try again.')
    } finally {
      publicationRenameSaving = false
    }
  }

  function autoFocusEnd(node: HTMLInputElement) {
    node.focus()
    node.setSelectionRange(node.value.length, node.value.length)
  }

  function openCreateTeamConfirmation() {
    if (createTeamValid && createTeamInput.trim()) {
      confirmationAction = 'create-team'
    }
  }

  async function createTeamDirectly() {
    if (!createTeamValid || createTeamSaving || !createTeamInput.trim()) return

    createTeamSaving = true
    const trimmedName = createTeamInput.trim()

    try {
      const shareToken = crypto.randomUUID()

      const { error: teamError } = await supabase
        .from('publications')
        .insert({
          course_id: courseId,
          publication_name: trimmedName,
          public_share_token: shareToken
        })

      if (teamError) throw teamError

      const { error: journalistError } = await supabase
        .from('journalists')
        .update({
          publication_name: trimmedName,
          is_editor: true,
          updated_at: new Date().toISOString()
        })
        .eq('course_id', courseId)
        .eq('name', currentUserName)

      if (journalistError) throw journalistError

      session.set({
        ...$session!,
        publicationName: trimmedName
      })

      createTeamInput = ''
      createTeamValid = null
      createTeamEditing = false
      showNotification('success', 'Team created')
      await loadAvailableTeams()
      await loadTeamData(trimmedName)
    } catch (error) {
      console.error('Create team error:', error)
      showNotification('error', 'Failed to create team. Try again.')
    } finally {
      createTeamSaving = false
    }
  }

  function openJoinTeamConfirmation(team: Publication) {
    // Check if journalist is already in a different team
    if (currentTeamName && currentTeamName !== team.publication_name) {
      showJoinWithoutLeavingAdvisory = true
      return
    }

    joiningTeamId = team.id
    joiningTeamName = team.publication_name
    joiningTeamLocked = team.team_lock ?? false
  }

  function cancelJoinTeam() {
    joiningTeamId = null
    joiningTeamName = null
    joiningTeamLocked = false
  }

  async function confirmJoinTeamInline() {
    if (!joiningTeamName || isJoiningTeam) return

    isJoiningTeam = true

    try {
      const { error } = await supabase
        .from('journalists')
        .update({
          publication_name: joiningTeamName,
          is_editor: false,
          updated_at: new Date().toISOString()
        })
        .eq('course_id', courseId)
        .eq('name', currentUserName)

      if (error) throw error

      session.set({
        ...$session!,
        publicationName: joiningTeamName
      })

      const joinedName = joiningTeamName
      joiningTeamId = null
      joiningTeamName = null
      joiningTeamLocked = false
      showNotification('success', `Joined "${joinedName}"`)
      
      // Log the join activity
      await logActivity(courseId, joinedName, 'joined_publication', currentUserName)
      
      await loadTeamData(joinedName)
    } catch (error) {
      console.error('Join team error:', error)
      showNotification('error', 'Failed to join team. Try again.')
    } finally {
      isJoiningTeam = false
    }
  }

  function openLeaveTeamConfirmation(memberName: string) {
    selectedMemberForRemoval = memberName
    confirmationAction = 'leave-team'
  }

  function openMakeEditorConfirmation(memberName: string, willBeEditor: boolean) {
    selectedMemberForEditor = { name: memberName, willBeEditor }
    confirmationAction = 'make-editor'
  }

  async function confirmCreateTeam() {
    if (!createTeamValid || createTeamSaving || !createTeamInput.trim()) return

    confirmationLoading = true
    const trimmedName = createTeamInput.trim()

    try {
      const shareToken = crypto.randomUUID()

      const { error: teamError } = await supabase
        .from('publications')
        .insert({
          course_id: courseId,
          publication_name: trimmedName,
          public_share_token: shareToken
        })

      if (teamError) throw teamError

      const { error: journalistError } = await supabase
        .from('journalists')
        .update({
          publication_name: trimmedName,
          is_editor: true,
          updated_at: new Date().toISOString()
        })
        .eq('course_id', courseId)
        .eq('name', currentUserName)

      if (journalistError) throw journalistError

      session.set({
        ...$session!,
        publicationName: trimmedName
      })

      createTeamInput = ''
      createTeamValid = null
      confirmationAction = null
      showNotification('success', `Created team "${trimmedName}"`)
      await loadAvailableTeams()
      await loadTeamData(trimmedName)
    } catch (error) {
      console.error('Create team error:', error)
      showNotification('error', 'Failed to create team. Try again.')
    } finally {
      confirmationLoading = false
    }
  }

  async function confirmLeaveTeam() {
    if (!selectedMemberForRemoval || confirmationLoading) return

    confirmationLoading = true
    const memberToRemove = selectedMemberForRemoval

    try {
      const { error } = await supabase
        .from('journalists')
        .update({
          team_name: null,
          is_editor: false,
          updated_at: new Date().toISOString()
        })
        .eq('course_id', courseId)
        .eq('name', memberToRemove)

      if (error) throw error

      if (teamMembers.length === 1) {
        await supabase
          .from('publications')
          .delete()
          .eq('course_id', courseId)
          .eq('publication_name', currentTeamName)
      }

      // Log the leave activity
      await logActivity(courseId, currentTeamName, 'left_publication', memberToRemove)

      if (memberToRemove === currentUserName) {
        session.set({
          ...$session!,
          publicationName: null
        })
        team = null
        teamMembers = []
        currentUserIsEditor = false
        teamColors.set({ primary: '5422b0', secondary: 'f0e6f7' })
        await loadAvailableTeams()
        showNotification('info', 'You left the team. Join or create another.')
      } else {
        await loadTeamMembers()
        showNotification('success', `Removed ${memberToRemove}`)
      }

      confirmationAction = null
      selectedMemberForRemoval = null
    } catch (error) {
      console.error('Leave team error:', error)
      showNotification('error', 'Failed to leave team. Try again.')
    } finally {
      confirmationLoading = false
    }
  }

  function handleStartLeave(event: CustomEvent<{ name: string }>) {
    // If this is the last member in the team, show advisory modal instead
    if (teamMembers.length === 1 && event.detail.name === currentUserName) {
      showLastMemberAdvisory = true
      return
    }
    leavingMemberName = event.detail.name
  }

  function handleCancelLeave() {
    leavingMemberName = null
  }

  async function handleConfirmLeave(event: CustomEvent<{ name: string }>) {
    if (isLeaving) return
    
    isLeaving = true
    const memberName = event.detail.name

    try {
      const { error } = await supabase
        .from('journalists')
        .update({
          team_name: null,
          is_editor: false,
          updated_at: new Date().toISOString()
        })
        .eq('course_id', courseId)
        .eq('name', memberName)

      if (error) throw error

      if (teamMembers.length === 1) {
        await supabase
          .from('publications')
          .delete()
          .eq('course_id', courseId)
          .eq('publication_name', currentTeamName)
      }

      session.set({
        ...$session!,
        publicationName: null
      })
      team = null
      teamMembers = []
      currentUserIsEditor = false
      teamColors.set({ primary: '5422b0', secondary: 'f0e6f7' })
      await loadAvailableTeams()
      showNotification('info', 'You left the team. Join or create another.')
      leavingMemberName = null
    } catch (error) {
      console.error('Leave team error:', error)
      showNotification('error', 'Failed to leave team. Try again.')
    } finally {
      isLeaving = false
    }
  }

  async function confirmMakeEditor() {
    if (!selectedMemberForEditor || confirmationLoading) return

    confirmationLoading = true
    const { name, willBeEditor } = selectedMemberForEditor

    if (!willBeEditor) {
      const editorCount = teamMembers.filter(m => m.is_editor).length
      if (editorCount === 1) {
        showNotification('error', 'Teams must have at least one editor. Add another then try again.')
        confirmationAction = null
        selectedMemberForEditor = null
        confirmationLoading = false
        return
      }
    }

    try {
      const { error } = await supabase
        .from('journalists')
        .update({ is_editor: willBeEditor, updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('name', name)

      if (error) throw error

      await loadTeamMembers()
      const action = willBeEditor ? 'promoted to editor' : 'demoted from editor'
      showNotification('success', `${name} ${action}`)

      // Log the editor status change
      const logAction = willBeEditor ? 'promoted_editor' : 'demoted_editor'
      await logActivity(courseId, currentTeamName, logAction, name)

      confirmationAction = null
      selectedMemberForEditor = null
    } catch (error) {
      console.error('Make editor error:', error)
      showNotification('error', 'Failed to update. Try again.')
    } finally {
      confirmationLoading = false
    }
  }

  function cancelConfirmation() {
    confirmationAction = null
    selectedMemberForRemoval = null
    selectedMemberForEditor = null
    confirmationLoading = false
  }

  function handleStartEditorToggle(event: CustomEvent<{ name: string; willBeEditor: boolean }>) {
    const { name, willBeEditor } = event.detail
    
    // If trying to remove editor status and this is the only editor, show advisory modal
    if (!willBeEditor) {
      const editorCount = teamMembers.filter(m => m.is_editor).length
      if (editorCount === 1) {
        showLastEditorAdvisory = true
        return
      }
    }
    
    editorToggleMember = event.detail
  }

  function handleCancelEditorToggle() {
    editorToggleMember = null
  }

  async function handleConfirmEditorToggle(event: CustomEvent<{ name: string; willBeEditor: boolean }>) {
    if (isTogglingEditor) return
    
    const { name, willBeEditor } = event.detail

    if (!willBeEditor) {
      const editorCount = teamMembers.filter(m => m.is_editor).length
      if (editorCount === 1) {
        showNotification('error', 'Teams must have at least one editor. Add another then try again.')
        editorToggleMember = null
        return
      }
    }

    isTogglingEditor = true

    try {
      const { error } = await supabase
        .from('journalists')
        .update({ is_editor: willBeEditor, updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('name', name)

      if (error) throw error

      await loadTeamMembers()
      showNotification('success', willBeEditor ? 'Editor added.' : 'Editor removed.')
      editorToggleMember = null
    } catch (error) {
      console.error('Editor toggle error:', error)
      showNotification('error', 'Failed to update. Try again.')
    } finally {
      isTogglingEditor = false
    }
  }

  async function handleColorSelect(event: CustomEvent<{ primary: string; secondary: string }>) {
    if (!team || !currentUserIsEditor) return

    const { primary, secondary } = event.detail

    try {
      const { error } = await supabase
        .from('publications')
        .update({ 
          primary_color: primary, 
          secondary_color: secondary,
          updated_at: new Date().toISOString()
        })
        .eq('course_id', courseId)
        .eq('publication_name', currentTeamName)

      if (error) throw error

      team = { ...team, primary_color: primary, secondary_color: secondary }
      teamColors.set({ primary, secondary })
    } catch (error) {
      console.error('Color update error:', error)
      showNotification('error', 'Failed to update color')
    }
  }

  async function handleLogoUpload(event: CustomEvent<{ url: string }>) {
    if (!team || !currentUserIsEditor) return

    try {
      const { error } = await supabase
        .from('publications')
        .update({ logo_url: event.detail.url, updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('publication_name', currentTeamName)

      if (error) throw error

      team = { ...team, logo_url: event.detail.url }
      showNotification('success', 'Logo uploaded')
    } catch (error) {
      console.error('Logo upload error:', error)
      showNotification('error', 'Failed to save logo')
    }
  }

  async function handleLogoRemove() {
    if (!team || !currentUserIsEditor) return

    try {
      const { error } = await supabase
        .from('publications')
        .update({ logo_url: null, updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('publication_name', currentTeamName)

      if (error) throw error

      team = { ...team, logo_url: null }
      showNotification('success', 'Logo removed')
    } catch (error) {
      console.error('Logo remove error:', error)
      showNotification('error', 'Failed to remove logo')
    }
  }

  async function handleShareToggle(event: CustomEvent<{ enabled: boolean }>) {
    if (!team || !currentUserIsEditor) return

    try {
      const { error } = await supabase
        .from('publications')
        .update({ share_enabled: event.detail.enabled, updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('publication_name', currentTeamName)

      if (error) throw error

      team = { ...team, share_enabled: event.detail.enabled }
    } catch (error) {
      console.error('Share toggle error:', error)
      showNotification('error', 'Failed to update sharing')
    }
  }

  async function handleTeamLockToggle(event: CustomEvent<{ locked: boolean }>) {
    if (!team || !currentUserIsEditor) return

    try {
      const { error } = await supabase
        .from('publications')
        .update({ team_lock: event.detail.locked, updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('publication_name', currentTeamName)

      if (error) throw error

      team = { ...team, team_lock: event.detail.locked }
      showNotification('success', event.detail.locked ? 'Team locked' : 'Team unlocked')
    } catch (error) {
      console.error('Team lock toggle error:', error)
      showNotification('error', 'Failed to update team lock')
    }
  }

  async function handleDeleteTeam() {
    if (!currentTeamName || !currentUserIsEditor) return

    deleteTeamConfirming = true

    try {
      // Revert all published stories in team to drafts
      const { error: updateStoriesError } = await supabase
        .from('stories')
        .update({ status: 'draft', updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('publication_name', currentTeamName)
        .eq('status', 'published')

      if (updateStoriesError) throw updateStoriesError

      // Delete the team
      const { error: deleteTeamError } = await supabase
        .from('publications')
        .delete()
        .eq('course_id', courseId)
        .eq('publication_name', currentTeamName)

      if (deleteTeamError) throw deleteTeamError

      // Remove team from all members
      const { error: updateJournalistsError } = await supabase
        .from('journalists')
        .update({ publication_name: null, is_editor: false, updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('publication_name', currentTeamName)

      if (updateJournalistsError) throw updateJournalistsError

      // Update session if current user was in this team
      session.set({
        ...$session!,
        publicationName: null
      })

      team = null
      teamMembers = []
      currentUserIsEditor = false
      teamColors.set({ primary: '5422b0', secondary: 'f0e6f7' })
      await loadAvailableTeams()
      deleteTeamConfirming = false

      showNotification('success', 'Team deleted')
    } catch (error) {
      console.error('Delete team error:', error)
      showNotification('error', 'Failed to delete team. Try again.')
      deleteTeamConfirming = false
    }
  }

  function handleLogout() {
    session.logout()
    goto('/')
  }

  function hexToFilter(hex: string): string {
    // Mapping of color palettes to their filter values
    const colorFilters: Record<string, string> = {
      '5422b0': 'invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%)',     // Indigo
      '02441f': 'invert(28%) sepia(95%) saturate(1800%) hue-rotate(120deg) brightness(45%) contrast(100%)',    // Black Forest
      '004269': 'invert(22%) sepia(95%) saturate(2200%) hue-rotate(200deg) brightness(55%) contrast(95%)',      // Yale Blue
      '935D00': 'invert(38%) sepia(85%) saturate(1400%) hue-rotate(30deg) brightness(75%) contrast(85%)',        // Golden Earth
      '801c00': 'invert(28%) sepia(95%) saturate(2800%) hue-rotate(10deg) brightness(55%) contrast(100%)',      // Molten Lava
      'ab0000': 'invert(23%) sepia(95%) saturate(3300%) hue-rotate(0deg) brightness(55%) contrast(100%)',       // Inferno
      '333333': 'invert(20%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(50%) contrast(90%)'             // Graphite
    }
    
    const cleanHex = hex.replace('#', '').toLowerCase()
    return colorFilters[cleanHex] || 'invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%)'
  }
</script>

<svelte:head>
  <title>StoryFlam | Settings</title>
</svelte:head>

<div class="relative min-h-screen bg-white flex flex-col pb-[60px]">
  <main class="flex-1 px-4 py-4">
    <!-- Tab Navigation -->
    <div class="flex items-center gap-6 mb-6">
      <button
        type="button"
        on:click={() => activeTab = 'settings'}
        class="text-xl font-semibold transition-colors pb-1 border-b-2"
        class:text-[#777777]={activeTab !== 'settings'}
        class:border-transparent={activeTab !== 'settings'}
        style={activeTab === 'settings' ? `color: #${primaryColor}; border-bottom-color: #${primaryColor};` : ''}
      >
        Settings
      </button>
      
      {#if showAdminTab}
        <button
          type="button"
          on:click={() => activeTab = 'admin'}
          class="text-xl font-semibold transition-colors pb-1 border-b-2"
          class:text-[#777777]={activeTab !== 'admin'}
          class:border-transparent={activeTab !== 'admin'}
          style={activeTab === 'admin' ? `color: #${primaryColor}; border-bottom-color: #${primaryColor};` : ''}
        >
          Admin
        </button>
      {/if}
    </div>

    <!-- Settings Tab Content -->
    {#if activeTab === 'settings'}
      <div class="space-y-6">
        <!-- Byline Section -->
        <div>
          <div class="flex items-start gap-2">
            <!-- Left column: label, input, helper text -->
            <div class="flex-1">
              <div class="flex items-center justify-between mb-2">
                <label for="byline-input" class="text-sm text-[#777777]">Byline</label>
                <span class="text-xs text-[#999999]">{bylineName.length} / 30</span>
              </div>
              
              <input
                id="byline-input"
                type="text"
                value={bylineName}
                on:input={handleBylineInput}
                on:focus={startBylineEdit}
                maxlength="30"
                class="w-full bg-white rounded-lg px-4 py-3 text-sm outline-none transition-all border"
                class:ring-2={bylineEditing}
                style={bylineEditing ? `border-color: #${primaryColor}; ring-color: #${primaryColor}; --tw-ring-color: #${primaryColor}; --placeholder-color: #888888;` : 'border-color: #999999;'}
                placeholder="Enter your byline"
              />
              
              <!-- Helper text -->
              {#if bylineEditing}
                <p class="text-sm mt-2" style="color: #{bylineValid ? (bylineName !== originalBylineName && bylineName.trim().length > 0 ? '057373' : '777777') : '996633'};">
                  {#if !bylineValid}
                    Name taken. Try again
                  {:else if bylineName !== originalBylineName && bylineName.trim().length > 0}
                    Name available
                  {:else}
                    Choose a new byline
                  {/if}
                </p>
              {/if}
            </div>

            <!-- Right column: icon (fixed position aligned with input center) -->
            <div class="flex items-center" style="margin-top: 42px; height: 20px;">
              {#if bylineValidating}
                <div 
                  class="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                  style="border-color: #{primaryColor}; border-top-color: transparent;"
                ></div>
              {:else if bylineEditing}
                {#if bylineValid && bylineName !== originalBylineName && bylineName.trim().length > 0}
                  <img
                    src="/icons/icon-check.svg"
                    alt="Available"
                    class="w-5 h-5"
                    style="filter: {hexToFilter(primaryColor)};"
                  />
                {:else if !bylineValid}
                  <img
                    src="/icons/icon-close-circle-fill.svg"
                    alt="Not available"
                    class="w-5 h-5"
                    style="filter: {hexToFilter(primaryColor)};"
                  />
                {:else}
                  <img
                    src="/icons/icon-circle.svg"
                    alt=""
                    class="w-5 h-5"
                    style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
                  />
                {/if}
              {:else}
                <img
                  src="/icons/icon-check.svg"
                  alt="Verified"
                  class="w-5 h-5"
                  style="filter: {hexToFilter(primaryColor)};"
                />
              {/if}
            </div>
          </div>

          <!-- Toolbar row (aligned with input, not full width) -->
          {#if bylineEditing}
            <div class="flex justify-end mt-1 mr-7">
              <div 
                class="flex items-center rounded-full px-4 py-2 text-white text-sm font-medium"
                style="background-color: #{primaryColor};"
              >
                <button
                  type="button"
                  on:click={saveByline}
                  disabled={!bylineValid || bylineName === originalBylineName || bylineName.trim().length === 0 || bylineSaving}
                  class="transition-opacity"
                  class:opacity-50={!bylineValid || bylineName === originalBylineName || bylineName.trim().length === 0 || bylineSaving}
                >
                  {bylineSaving ? 'Saving...' : 'Change name'}
                </button>
                <span class="mx-3 opacity-60">|</span>
                <button
                  type="button"
                  on:click={cancelBylineEdit}
                  class="transition-opacity hover:opacity-80"
                >
                  Cancel
                </button>
              </div>
            </div>
          {/if}
        </div>

        <!-- My Publication Section -->
        <div>
            <div class="flex items-start gap-2">
              <!-- Left column: label, input -->
              <div class="flex-1">
                <div class="flex items-center justify-between mb-2">
                  <label for="publication-input" class="text-sm text-[#777777]">My publication</label>
                  <span class="text-xs text-[#999999]">
                    {#if publicationRenaming}
                      {publicationRenameInput.length} / 30
                    {:else if currentTeamName}
                      {currentTeamName.length} / 30
                    {:else}
                      {createTeamInput.length} / 30
                    {/if}
                  </span>
                </div>
                
                {#if currentTeamName && !publicationRenaming}
                   <!-- Has publication, not renaming: show name -->
                   <button
                     type="button"
                     on:click={() => { if (currentUserIsEditor) startPublicationRename() }}
                     class="w-full bg-white rounded-lg px-4 py-3 text-sm text-left text-[#333333] outline-none border"
                     class:cursor-default={!currentUserIsEditor}
                     style="border-color: #999999;"
                   >
                     {currentTeamName}
                   </button>
                {:else if publicationRenaming}
                   <!-- Renaming publication (editor only) -->
                   <input
                     id="publication-input"
                     type="text"
                     value={publicationRenameInput}
                     on:input={handlePublicationRenameInput}
                     use:autoFocusEnd
                     maxlength="30"
                     class="w-full bg-white rounded-lg px-4 py-3 text-sm outline-none transition-all border ring-2"
                     style="border-color: #{primaryColor}; --tw-ring-color: #{primaryColor}"
                   />
                  
                  <p class="text-sm mt-2" style="color: #{publicationRenameValid === true ? '057373' : (publicationRenameValid === false ? '996633' : '777777')};">
                    {#if publicationRenameValid === false}
                      {publicationRenameError}
                    {:else if publicationRenameValid === true}
                      Name available
                    {:else}
                      Choose a new name
                    {/if}
                  </p>
                {:else}
                   <!-- No publication: create mode -->
                   <input
                     id="publication-input"
                     type="text"
                     value={createTeamInput}
                     on:input={handleCreateTeamInput}
                     on:focus={startTeamNameEdit}
                     maxlength="30"
                     placeholder="Create a new publication or skip to join a publication"
                     class="w-full bg-white rounded-lg px-4 py-3 text-sm outline-none transition-all border"
                     class:ring-2={createTeamEditing}
                     style={createTeamEditing ? `border-color: #${primaryColor}; ring-color: #${primaryColor}; --tw-ring-color: #${primaryColor}` : 'border-color: #999999;'}
                   />
                  
                  {#if createTeamEditing}
                    <p class="text-sm mt-2" style="color: #{createTeamValid === true ? '057373' : (createTeamValid === false ? '996633' : '777777')};">
                      {#if createTeamValid === false}
                        Name taken. Try again
                      {:else if createTeamValid === true}
                        Name available
                      {:else}
                        Choose a publication name
                      {/if}
                    </p>
                  {/if}
                {/if}
              </div>

              <!-- Right column: icon -->
              <div class="flex items-center" style="margin-top: 42px; height: 20px;">
                {#if currentTeamName && !publicationRenaming}
                  <img
                    src="/icons/icon-check.svg"
                    alt="Current publication"
                    class="w-5 h-5"
                    style="filter: {hexToFilter(primaryColor)};"
                  />
                {:else if publicationRenaming}
                  {#if publicationRenameValidating}
                    <div 
                      class="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                      style="border-color: #{primaryColor}; border-top-color: transparent;"
                    ></div>
                  {:else if publicationRenameValid === true}
                    <img src="/icons/icon-check.svg" alt="Available" class="w-5 h-5" style="filter: {hexToFilter(primaryColor)};" />
                  {:else if publicationRenameValid === false}
                    <img src="/icons/icon-close-circle-fill.svg" alt="Not available" class="w-5 h-5" style="filter: {hexToFilter(primaryColor)};" />
                  {:else}
                    <img src="/icons/icon-circle.svg" alt="" class="w-5 h-5" style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);" />
                  {/if}
                {:else}
                  {#if createTeamValidating}
                    <div 
                      class="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                      style="border-color: #{primaryColor}; border-top-color: transparent;"
                    ></div>
                  {:else if createTeamEditing}
                    {#if createTeamValid === true}
                      <img src="/icons/icon-check.svg" alt="Available" class="w-5 h-5" style="filter: {hexToFilter(primaryColor)};" />
                    {:else if createTeamValid === false}
                      <img src="/icons/icon-close-circle-fill.svg" alt="Not available" class="w-5 h-5" style="filter: {hexToFilter(primaryColor)};" />
                    {:else}
                      <img src="/icons/icon-circle.svg" alt="" class="w-5 h-5" style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);" />
                    {/if}
                  {:else}
                    <img src="/icons/icon-circle.svg" alt="" class="w-5 h-5" style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);" />
                  {/if}
                {/if}
              </div>
            </div>

            <!-- Toolbar row -->
            {#if publicationRenaming}
              <div class="flex justify-end mt-1 mr-7">
                <div 
                  class="flex items-center rounded-full px-4 py-2 text-white text-sm font-medium"
                  style="background-color: #{primaryColor};"
                >
                  <button
                    type="button"
                    on:click={savePublicationRename}
                    disabled={publicationRenameValid !== true || publicationRenameInput.trim() === currentTeamName || publicationRenameInput.trim().length === 0 || publicationRenameSaving}
                    class="transition-opacity"
                    class:opacity-50={publicationRenameValid !== true || publicationRenameInput.trim() === currentTeamName || publicationRenameInput.trim().length === 0 || publicationRenameSaving}
                  >
                    {publicationRenameSaving ? 'Saving...' : 'Change name'}
                  </button>
                  <span class="mx-3 opacity-60">|</span>
                  <button
                    type="button"
                    on:click={cancelPublicationRename}
                    class="transition-opacity hover:opacity-80"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            {:else if createTeamEditing}
              <div class="flex justify-end mt-1 mr-7">
                <div 
                  class="flex items-center rounded-full px-4 py-2 text-white text-sm font-medium"
                  style="background-color: #{primaryColor};"
                >
                  <button
                    type="button"
                    on:click={createTeamDirectly}
                    disabled={createTeamValid !== true || createTeamInput.trim().length === 0 || createTeamSaving}
                    class="transition-opacity"
                    class:opacity-50={createTeamValid !== true || createTeamInput.trim().length === 0 || createTeamSaving}
                  >
                    {createTeamSaving ? 'Creating...' : 'Create Publication'}
                  </button>
                  <span class="mx-3 opacity-60">|</span>
                  <button
                    type="button"
                    on:click={cancelTeamNameEdit}
                    class="transition-opacity hover:opacity-80"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            {/if}
          </div>

        <!-- All Publications Accordion -->
        <div>
            <button
              type="button"
              on:click={() => toggleAccordion('all')}
              class="w-full flex items-center justify-between"
            >
              <span class="text-sm text-[#777777]">All publications</span>
              <img
                src="/icons/icon-expand.svg"
                alt=""
                class="w-4 h-4 transition-transform"
                class:rotate-180={allPublicationsOpen}
                style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
              />
            </button>
            <div class="w-full border-b border-[#e0e0e0] mt-2"></div>

            {#if allPublicationsOpen}
              {#if availableTeams.length > 0}
                <div>
                  {#each availableTeams as availTeam (availTeam.id)}
                    <div>
                      <button
                        type="button"
                        on:click={() => availTeam.publication_name !== currentTeamName && joiningTeamId !== availTeam.id && openJoinTeamConfirmation(availTeam)}
                        class="w-full flex items-center justify-between py-3 text-left transition-colors border-b border-[#e0e0e0]"
                        class:hover:bg-[#f5f5f5]={availTeam.publication_name !== currentTeamName && joiningTeamId !== availTeam.id}
                        class:cursor-default={availTeam.publication_name === currentTeamName || joiningTeamId === availTeam.id}
                      >
                        <span class="text-base text-[#333333]">{availTeam.publication_name}</span>
                        {#if availTeam.publication_name === currentTeamName}
                          <img
                            src="/icons/icon-check-fill.svg"
                            alt="Current publication"
                            class="w-5 h-5"
                            style="filter: {hexToFilter(primaryColor)};"
                          />
                        {:else}
                          <img
                            src="/icons/icon-circle.svg"
                            alt=""
                            class="w-5 h-5"
                            style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
                          />
                        {/if}
                      </button>

                      <!-- Inline join toolbar -->
                      {#if joiningTeamId === availTeam.id}
                        <div class="flex justify-end py-2 border-b border-[#e0e0e0]">
                          {#if joiningTeamLocked}
                            <div 
                              class="flex items-center rounded-full px-4 py-2 text-white text-sm font-medium"
                              style="background-color: #{primaryColor};"
                            >
                              <span class="opacity-70">Team locked</span>
                              <span class="mx-3 opacity-60">|</span>
                              <button
                                type="button"
                                on:click={cancelJoinTeam}
                                class="transition-opacity hover:opacity-80"
                              >
                                OK
                              </button>
                            </div>
                          {:else}
                            <div 
                              class="flex items-center rounded-full px-4 py-2 text-white text-sm font-medium"
                              style="background-color: #{primaryColor};"
                            >
                              <button
                                type="button"
                                on:click={confirmJoinTeamInline}
                                disabled={isJoiningTeam}
                                class="transition-opacity"
                                class:opacity-50={isJoiningTeam}
                              >
                                {isJoiningTeam ? 'Joining...' : 'Join team'}
                              </button>
                              <span class="mx-3 opacity-60">|</span>
                              <button
                                type="button"
                                on:click={cancelJoinTeam}
                                disabled={isJoiningTeam}
                                class="transition-opacity hover:opacity-80"
                              >
                                Cancel
                              </button>
                            </div>
                          {/if}
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
                <p class="text-sm text-[#999999] mt-3">You can create or join one publication only.</p>
              {:else}
                <p class="text-center text-[#999999] text-sm py-6">All publications appear here</p>
              {/if}
            {/if}
          </div>

        <!-- Members Accordion -->
        <div>
            <button
              type="button"
              on:click={() => toggleAccordion('members')}
              class="w-full flex items-center justify-between"
            >
              <span class="text-sm text-[#777777]">Members</span>
              <img
                src="/icons/icon-expand.svg"
                alt=""
                class="w-4 h-4 transition-transform"
                class:rotate-180={membersOpen}
                style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
              />
            </button>
            <div class="w-full border-b border-[#e0e0e0] mt-2"></div>

            {#if membersOpen}
              {#if teamMembers.length > 0}
                <div class="flex items-center justify-end mt-2">
                  <span class="text-sm text-[#777777]">Editor</span>
                </div>
                <div>
                  {#each teamMembers as member (member.id)}
                    <TeamMemberItem
                      name={member.name}
                      isEditor={member.is_editor}
                      isCurrentUser={member.name === currentUserName}
                      canRemove={currentUserIsEditor || member.name === currentUserName}
                      canToggleEditor={currentUserIsEditor}
                      {primaryColor}
                      {secondaryColor}
                      isConfirmingLeave={leavingMemberName === member.name && member.name === currentUserName}
                      {isLeaving}
                      isConfirmingEditorToggle={editorToggleMember?.name === member.name}
                      {isTogglingEditor}
                      on:remove={() => openLeaveTeamConfirmation(member.name)}
                      on:startLeave={handleStartLeave}
                      on:confirmLeave={handleConfirmLeave}
                      on:cancelLeave={handleCancelLeave}
                      on:startEditorToggle={handleStartEditorToggle}
                      on:confirmEditorToggle={handleConfirmEditorToggle}
                      on:cancelEditorToggle={handleCancelEditorToggle}
                    />
                  {/each}
                </div>
                <p class="text-sm text-[#999999] mt-3">
                  Editors and contributors appear here. Editors can add other editors and change settings. If you delete or leave a publication, published stories revert to drafts.
                </p>
              {:else}
                <p class="text-center text-[#999999] text-sm py-6">Members appear here</p>
              {/if}
            {/if}
          </div>

          <!-- Publication Settings Accordion (editor only) -->
          {#if currentUserIsEditor}
            <div>
              <button
                type="button"
                on:click={() => toggleAccordion('settings')}
                class="w-full flex items-center justify-between"
              >
                <span class="text-sm text-[#777777]">Publication settings</span>
                <img
                  src="/icons/icon-expand.svg"
                  alt=""
                  class="w-4 h-4 transition-transform"
                  class:rotate-180={publicationSettingsOpen}
                  style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
                />
              </button>
              <div class="w-full border-b border-[#e0e0e0] mt-2"></div>

              {#if publicationSettingsOpen}
                <div class="space-y-6 mt-4">
                  <ColorPalette
                    selectedColor={team?.primary_color || '5422b0'}
                    disabled={false}
                    on:select={handleColorSelect}
                  />

                  <PublicationLogoUpload
                    logoUrl={team?.logo_url || null}
                    disabled={false}
                    {primaryColor}
                    fullWidth={true}
                    on:upload={handleLogoUpload}
                    on:remove={handleLogoRemove}
                  />

                  <ShareToggle
                    enabled={team?.share_enabled || false}
                    publicationName={currentTeamName}
                    disabled={false}
                    {primaryColor}
                    on:toggle={handleShareToggle}
                  />

                  <PublicationLockToggle
                    locked={team?.team_lock || false}
                    disabled={false}
                    {primaryColor}
                    on:toggle={handleTeamLockToggle}
                  />

                  <!-- Delete Publication -->
                  <div>
                    <button
                      type="button"
                      on:click={() => (deleteTeamConfirming = true)}
                      disabled={deleteTeamConfirming}
                      class="w-full py-2 px-4 rounded-lg text-sm font-medium transition-opacity border-2 border-red-600 text-red-600"
                      class:opacity-50={deleteTeamConfirming}
                    >
                      {deleteTeamConfirming ? 'Deleting...' : 'Delete publication'}
                    </button>
                    <p class="text-sm text-[#999999] mt-2 text-center">
                      Published stories revert to author drafts
                    </p>
                  </div>
                </div>
              {/if}
            </div>
          {/if}

        <!-- Log out Button -->
        <div class="mt-6 flex justify-center">
          <button
            type="button"
            on:click={handleLogout}
            class="py-2 px-6 rounded-lg text-sm font-medium transition-opacity border-2"
            style="color: #{primaryColor}; border-color: #{primaryColor};"
          >
            Log out
          </button>
        </div>
      </div>
    {/if}

    {#if confirmationAction === 'leave-team'}
      <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-[#efefef] p-4">
        <ConfirmationToolbar
          message={selectedMemberForRemoval === currentUserName ? 'Leave the team?' : 'Remove from team?'}
          {primaryColor}
          isLoading={confirmationLoading}
          on:cancel={cancelConfirmation}
          on:confirm={confirmLeaveTeam}
        />
      </div>
    {/if}



    <!-- Last Editor Advisory Modal -->
    {#if showLastEditorAdvisory}
      <div class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl p-6 max-w-[280px]">
          <p class="text-sm text-[#333333] mb-4">Teams must have at least one editor. Add another then try again.</p>
          <div class="flex justify-end">
            <button
              type="button"
              on:click={() => (showLastEditorAdvisory = false)}
              class="text-sm font-medium"
              style="color: #{primaryColor};"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- Last Member Advisory Modal -->
    {#if showLastMemberAdvisory}
      <div class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl p-6 max-w-[280px]">
          <p class="text-sm text-[#333333] mb-4">Publications must have at least one editor. Add another to leave, or delete the publication</p>
          <div class="flex justify-end">
            <button
              type="button"
              on:click={() => (showLastMemberAdvisory = false)}
              class="text-sm font-medium"
              style="color: #{primaryColor};"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- Delete Team Confirmation Modal -->
    {#if deleteTeamConfirming}
      <div class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl p-6 mx-4 max-w-sm">
          <h2 class="text-lg font-semibold text-[#333333] mb-2">Delete publication</h2>
          <p class="text-sm text-[#666666] mb-6">Are you sure? This cannot be undone.</p>

          <div class="flex gap-3">
            <button
              type="button"
              on:click={() => (deleteTeamConfirming = false)}
              class="flex-1 px-4 py-2 rounded-full text-[#333333] text-sm font-medium transition-all border border-[#ddd]"
            >
              Cancel
            </button>
            <button
              type="button"
              on:click={handleDeleteTeam}
              class="flex-1 px-4 py-2 rounded-full text-white text-sm font-medium transition-all bg-red-600 hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- Join Without Leaving Advisory Modal -->
    {#if showJoinWithoutLeavingAdvisory}
      <div class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl p-6 max-w-[280px]">
          <p class="text-sm text-[#333333] mb-4">Please leave your current team before creating or joining a new team. If you are the only editor, assign another before leaving or close the team.</p>
          <div class="flex justify-end">
            <button
              type="button"
              on:click={() => (showJoinWithoutLeavingAdvisory = false)}
              class="text-sm font-medium"
              style="color: #{primaryColor};"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- Admin Tab Content -->
    {#if activeTab === 'admin' && showAdminTab}
      <CombinedAdminTab {courseId} />
    {/if}
  </main>
</div>
