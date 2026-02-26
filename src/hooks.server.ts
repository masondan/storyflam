import type { Handle } from '@sveltejs/kit'
import { cleanupStaleLocks } from '$lib/stories'

let lockCleanupTimer: ReturnType<typeof setInterval> | null = null

/**
 * Initialize lock cleanup on server startup
 * Runs every 10 minutes to remove stale locks older than 10 minutes
 */
function initializeLockCleanup() {
  // Run cleanup immediately on startup
  cleanupStaleLocks().catch(err => console.error('Initial lock cleanup failed:', err))
  
  // Then run every 10 minutes
  lockCleanupTimer = setInterval(() => {
    cleanupStaleLocks().catch(err => console.error('Periodic lock cleanup failed:', err))
  }, 10 * 60 * 1000)
}

// Initialize on first request
let initialized = false

export const handle: Handle = async ({ event, resolve }) => {
  // Initialize lock cleanup on first server request
  if (!initialized) {
    initialized = true
    initializeLockCleanup()
  }

  return resolve(event)
}
