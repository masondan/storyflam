# Cloudflare Worker Quick Reference

## Files Created

| File | Purpose |
|------|---------|
| `wrangler.toml` | Cloudflare Worker configuration with cron trigger (every 5 days) |
| `src/worker.ts` | Worker script with keep-alive logic and HTTP endpoints |
| `.env.worker.example` | Environment variables template |
| `WORKER_SETUP.md` | Complete setup and deployment guide |

## What the Worker Does

✅ **Scheduled Task:** Runs every 5 days at midnight UTC  
✅ **Keep-Alive Query:** Queries `newslabs` table to prevent Supabase project pause  
✅ **Logging:** Stores execution logs in Cloudflare KV (5-day retention)  
✅ **HTTP Endpoints:** Manual trigger and status check endpoints  

## Quick Start Commands

```bash
# Install dependencies
npm install --save-dev wrangler @cloudflare/workers-types

# Login to Cloudflare
wrangler login

# Create KV namespace
wrangler kv:namespace create "KEEP_ALIVE_KV"
wrangler kv:namespace create "KEEP_ALIVE_KV" --preview

# Test locally
wrangler dev

# Deploy to production
wrangler deploy --env production

# View logs
wrangler tail --env production
```

## Configuration Steps

1. **Update `wrangler.toml`** with KV namespace IDs and Supabase credentials
2. **Copy `.env.worker.example`** to `.env.worker` and fill in values
3. **Add to `.gitignore`:** `.env.worker` (never commit secrets)

## HTTP Endpoints

### Check Status
```bash
GET /status
```
Returns last keep-alive execution log.

### Manual Trigger
```bash
POST /trigger
```
Manually execute keep-alive (useful for testing).

## Cron Schedule

**Current:** Every 5 days at midnight UTC (`0 0 */5 * *`)

To change, edit `wrangler.toml`:
```toml
[triggers]
crons = ["0 0 */5 * *"]
```

## Environment Variables Required

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get these from Supabase Dashboard > Settings > API

## Monitoring

- **Cloudflare Dashboard:** Workers & Pages > storyflam-keep-alive > Logs
- **CLI:** `wrangler tail --env production`
- **HTTP:** `curl https://your-worker-url.workers.dev/status`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Missing Supabase credentials" | Add vars to `wrangler.toml` `[env.production.vars]` |
| "401 Unauthorized" | Check service role key is valid in Supabase |
| "KV namespace not found" | Update namespace ID in `wrangler.toml` |
| Worker not running on schedule | Verify cron expression and check Cloudflare Dashboard |

## Key Features

- **Lightweight:** Minimal code, fast execution
- **Reliable:** Error handling with detailed logging
- **Secure:** Uses service role key (stored in Cloudflare secrets)
- **Observable:** HTTP endpoints for manual testing and status checks
- **Maintainable:** TypeScript with full type safety

## Next Steps

1. Follow `WORKER_SETUP.md` for detailed setup instructions
2. Test locally with `wrangler dev`
3. Deploy with `wrangler deploy --env production`
4. Monitor logs in Cloudflare Dashboard
