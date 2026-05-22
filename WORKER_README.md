# StoryFlam Supabase Keep-Alive Worker

A Cloudflare Worker that automatically queries your Supabase project every 5 days to prevent it from being paused due to inactivity.

## Overview

Supabase free tier projects are paused after 7 days of inactivity. This worker keeps your project active by:

1. **Scheduled Query:** Runs every 5 days at midnight UTC
2. **Database Access:** Queries the `newslabs` table to trigger activity
3. **Logging:** Stores execution logs in Cloudflare KV for monitoring
4. **HTTP Endpoints:** Provides manual trigger and status check endpoints

## Files Created

```
├── wrangler.toml                 # Cloudflare Worker configuration
├── src/worker.ts                 # Worker script (TypeScript)
├── tsconfig.worker.json          # TypeScript config for worker
├── .env.worker.example           # Environment variables template
├── WORKER_SETUP.md               # Detailed setup guide
├── WORKER_QUICK_REFERENCE.md     # Quick reference
└── WORKER_README.md              # This file
```

## Quick Start

### 1. Install Dependencies

```bash
npm install --save-dev wrangler @cloudflare/workers-types
```

### 2. Authenticate with Cloudflare

```bash
wrangler login
```

### 3. Create KV Namespace

```bash
npm run worker:kv:create
```

Update `wrangler.toml` with the namespace IDs returned.

### 4. Configure Supabase Credentials

Edit `wrangler.toml` and add your Supabase credentials:

```toml
[env.production.vars]
SUPABASE_URL = "https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"
```

Get these from Supabase Dashboard > Settings > API.

### 5. Test Locally

```bash
npm run worker:dev
```

Test endpoints:
```bash
# Check status
curl http://localhost:8787/status

# Manual trigger
curl -X POST http://localhost:8787/trigger
```

### 6. Deploy

```bash
npm run worker:deploy
```

## NPM Scripts

| Command | Purpose |
|---------|---------|
| `npm run worker:dev` | Run worker locally for testing |
| `npm run worker:deploy` | Deploy to Cloudflare production |
| `npm run worker:logs` | View real-time logs from deployed worker |
| `npm run worker:kv:create` | Create KV namespace for logging |

## How It Works

### Scheduled Execution

The worker runs on a cron schedule defined in `wrangler.toml`:

```toml
[triggers]
crons = ["0 0 */5 * *"]  # Every 5 days at midnight UTC
```

### Keep-Alive Query

When triggered, the worker:

1. Validates Supabase credentials
2. Queries the `newslabs` table via Supabase REST API
3. Logs the result (success/error) to Cloudflare KV
4. Returns execution status

### HTTP Endpoints

#### GET `/status`
Returns the last keep-alive execution log.

**Response:**
```json
{
  "timestamp": "2026-05-22T07:09:00.000Z",
  "status": "success",
  "message": "Successfully queried newslabs table. Rows returned: 1",
  "rowsQueried": 1
}
```

#### POST `/trigger`
Manually execute the keep-alive query (useful for testing).

**Response:**
```json
{
  "status": "triggered",
  "message": "Keep-alive executed manually",
  "log": { ... }
}
```

## Monitoring

### View Logs in Cloudflare Dashboard

1. Go to Cloudflare Dashboard
2. Workers & Pages > storyflam-keep-alive
3. Click "Logs" tab
4. View real-time execution logs

### View Logs via CLI

```bash
npm run worker:logs
```

### Check Status via HTTP

```bash
curl https://your-worker-url.workers.dev/status
```

## Configuration

### Change Cron Schedule

Edit `wrangler.toml`:

```toml
[triggers]
crons = ["0 0 */5 * *"]  # Change this line
```

Common schedules:
- `0 0 * * *` — Daily at midnight UTC
- `0 */6 * * *` — Every 6 hours
- `0 0 */3 * *` — Every 3 days
- `0 0 1 * *` — Monthly on the 1st

### Change Query Target

Edit `src/worker.ts` and modify the query:

```typescript
// Current: queries newslabs table
const response = await fetch(`${env.SUPABASE_URL}/rest/v1/newslabs?limit=1`, {
  // ...
})

// Alternative: query any table
const response = await fetch(`${env.SUPABASE_URL}/rest/v1/stories?limit=1`, {
  // ...
})
```

## Security

### Service Role Key

The worker uses your Supabase **service role key**, which has full database access. This key is:

- Stored securely in Cloudflare environment variables
- Never exposed in client-side code
- Only used for the keep-alive query

**Best Practice:** Rotate your service role key periodically in Supabase Settings > API.

### Public Endpoints

The `/status` and `/trigger` endpoints are publicly accessible. To add authentication:

```typescript
// In src/worker.ts, add a secret check
const authHeader = request.headers.get('Authorization')
if (authHeader !== `Bearer ${env.WORKER_SECRET}`) {
  return new Response('Unauthorized', { status: 401 })
}
```

Then add to `wrangler.toml`:
```toml
[env.production.vars]
WORKER_SECRET = "your-secret-key"
```

## Troubleshooting

### "Missing Supabase credentials" Error

**Cause:** Environment variables not set in `wrangler.toml`

**Fix:** Add to `wrangler.toml`:
```toml
[env.production.vars]
SUPABASE_URL = "https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"
```

### "401 Unauthorized" Error

**Cause:** Invalid or expired service role key

**Fix:** Get a fresh key from Supabase Dashboard > Settings > API

### "KV namespace not found" Error

**Cause:** Namespace ID in `wrangler.toml` doesn't match created namespace

**Fix:** Run `npm run worker:kv:create` and update `wrangler.toml` with correct IDs

### Worker Not Running on Schedule

**Cause:** Cron trigger not configured or worker not deployed

**Fix:**
1. Verify cron expression in `wrangler.toml`
2. Check Cloudflare Dashboard > Workers > Triggers tab
3. Ensure worker is deployed: `npm run worker:deploy`

### Local Testing Shows Success but Deployed Worker Fails

**Cause:** Environment variables not set in production environment

**Fix:** Verify variables are in `wrangler.toml` under `[env.production.vars]`, not just local `.env.worker`

## Performance

- **Execution Time:** < 500ms (typically)
- **Cost:** Free tier (Cloudflare Workers includes 100,000 requests/month)
- **Reliability:** 99.9% uptime (Cloudflare SLA)

## Maintenance

### Update Worker Code

```bash
# Edit src/worker.ts
# Test locally
npm run worker:dev

# Deploy
npm run worker:deploy
```

### Rotate Supabase Key

1. Generate new service role key in Supabase Settings > API
2. Update `wrangler.toml` with new key
3. Deploy: `npm run worker:deploy`
4. Revoke old key in Supabase

### Delete Worker

```bash
wrangler delete --env production
```

To also delete KV namespace:
```bash
wrangler kv:namespace delete --binding KEEP_ALIVE_KV
```

## Additional Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [Supabase API Docs](https://supabase.com/docs/reference/api)
- [Cron Triggers](https://developers.cloudflare.com/workers/platform/triggers/cron-triggers/)

## Support

For issues or questions:

1. Check `WORKER_SETUP.md` for detailed setup instructions
2. Review `WORKER_QUICK_REFERENCE.md` for common commands
3. Check Cloudflare Dashboard logs for error details
4. Verify Supabase credentials are correct

## License

Part of StoryFlam project. See main project LICENSE for details.
