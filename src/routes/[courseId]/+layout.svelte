<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { page } from '$app/stores'
  import { session, isLoggedIn, showNotification } from '$lib/stores'
  import { goto } from '$app/navigation'
  import { supabase } from '$lib/supabase'
  import type { ActivityLogEntry } from '$lib/activity'
  import FooterNav from '$components/FooterNav.svelte'
  import WriteDrawer from '$components/WriteDrawer.svelte'
  import StoryReaderDrawer from '$components/StoryReaderDrawer.svelte'

  let activitySubscription: ReturnType<typeof supabase.channel> | null = null
  let currentCourseId = ''
  let currentTeamName: string | null = null

  $: {
    if (!$isLoggedIn) {
      goto('/')
    }
  }

  $: {
    if ($session?.courseId) {
      currentCourseId = $session.courseId
    }
    if ($session?.teamName) {
      currentTeamName = $session.teamName
      setupActivitySubscription()
    } else if (activitySubscription) {
      // User left team, unsubscribe
      supabase.removeChannel(activitySubscription)
      activitySubscription = null
    }
  }

  function setupActivitySubscription() {
    if (!currentCourseId || !currentTeamName) return

    // Clean up existing subscription if switching teams
    if (activitySubscription) {
      supabase.removeChannel(activitySubscription)
    }

    activitySubscription = supabase
      .channel(`activity-${currentCourseId}-${currentTeamName}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
          filter: `course_id=eq.${currentCourseId} AND team_name=eq.${currentTeamName}`
        },
        (payload) => {
          const activity = payload.new as ActivityLogEntry

          // Show toast for team-relevant actions
          if (activity.action === 'joined_team') {
            showNotification(
              'info',
              `${activity.journalist_name} joined ${activity.team_name}`
            )
          } else if (activity.action === 'left_team') {
            showNotification(
              'info',
              `${activity.journalist_name} left ${activity.team_name}`
            )
          } else if (activity.action === 'promoted_editor') {
            showNotification(
              'info',
              `${activity.journalist_name} is now an editor`
            )
          } else if (activity.action === 'demoted_editor') {
            showNotification(
              'info',
              `${activity.journalist_name} is no longer an editor`
            )
          }
        }
      )
      .subscribe()
  }

  onDestroy(() => {
    if (activitySubscription) {
      supabase.removeChannel(activitySubscription)
    }
  })
</script>

<div class="min-h-screen bg-white">
  <slot />
  <FooterNav />
  <WriteDrawer />
  <StoryReaderDrawer />
</div>
