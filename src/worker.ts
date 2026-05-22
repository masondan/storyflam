/**
 * Cloudflare Worker: Supabase Keep-Alive
 * Runs every 5 days to query the newslabs table and prevent project pause
 */

/// <reference types="@cloudflare/workers-types" />

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  KEEP_ALIVE_KV: KVNamespace
}

interface KeepAliveLog {
  timestamp: string
  status: 'success' | 'error'
  message: string
  rowsQueried?: number
  error?: string
}

/**
 * Main scheduled handler - runs on cron trigger
 */
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleKeepAlive(env))
  },

  /**
   * Optional: HTTP endpoint for manual trigger/status check
   * GET /status - returns last keep-alive log
   * POST /trigger - manually trigger keep-alive
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/status' && request.method === 'GET') {
      return handleStatusCheck(env)
    }

    if (url.pathname === '/trigger' && request.method === 'POST') {
      return handleManualTrigger(env)
    }

    return new Response('Not Found', { status: 404 })
  }
}

/**
 * Core keep-alive logic
 */
async function handleKeepAlive(env: Env): Promise<void> {
  const log: KeepAliveLog = {
    timestamp: new Date().toISOString(),
    status: 'success',
    message: 'Keep-alive query executed'
  }

  try {
    // Validate environment variables
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase credentials in environment variables')
    }

    // Query the newslabs table to keep project active
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/newslabs?limit=1`, {
      method: 'GET',
      headers: {
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Supabase API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json() as Array<Record<string, unknown>>
    log.rowsQueried = data.length
    log.message = `Successfully queried newslabs table. Rows returned: ${data.length}`

    console.log(`[Keep-Alive] ${log.message}`)
  } catch (error) {
    log.status = 'error'
    log.error = error instanceof Error ? error.message : String(error)
    log.message = `Keep-alive query failed: ${log.error}`

    console.error(`[Keep-Alive Error] ${log.message}`)
  }

  // Store log in KV for monitoring
  try {
    await env.KEEP_ALIVE_KV.put(
      'last_keep_alive',
      JSON.stringify(log),
      { expirationTtl: 432000 } // 5 days
    )
  } catch (kvError) {
    console.error('[KV Error] Failed to store keep-alive log:', kvError)
  }
}

/**
 * HTTP handler: Check status of last keep-alive
 */
async function handleStatusCheck(env: Env): Promise<Response> {
  try {
    const lastLog = await env.KEEP_ALIVE_KV.get('last_keep_alive', 'json') as KeepAliveLog | null

    if (!lastLog) {
      return new Response(
        JSON.stringify({
          status: 'no_data',
          message: 'No keep-alive logs found yet'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(JSON.stringify(lastLog), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

/**
 * HTTP handler: Manually trigger keep-alive (useful for testing)
 */
async function handleManualTrigger(env: Env): Promise<Response> {
  try {
    await handleKeepAlive(env)

    const lastLog = await env.KEEP_ALIVE_KV.get('last_keep_alive', 'json') as KeepAliveLog | null

    return new Response(
      JSON.stringify({
        status: 'triggered',
        message: 'Keep-alive executed manually',
        log: lastLog
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
