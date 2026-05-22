# Cloudflare Worker Setup Guide: Supabase Keep-Alive

This guide walks you through setting up and deploying the Cloudflare Worker that keeps your Supabase project active by querying the `newslabs` table every 5 days.

## Prerequisites

- Cloudflare account with Workers enabled
- Supabase project with API credentials
- Node.js 18+ installed locally
- `wrangler` CLI installed globally: `npm install -g wrangler`

## Step 1: Install Dependencies

```bash
npm install --save-dev wrangler @cloudflare/workers-types
```

## Step 2: Authenticate with Cloudflare

```bash
wrangler login
```

This opens a browser window to authenticate your Cloudflare account.

## Step 3: Create KV Namespace

The worker uses Cloudflare KV to store keep-alive logs. Create a namespace:

```bash
wrangler kv:namespace create "KEEP_ALIVE_KV"
wrangler kv:namespace create "KEEP_ALIVE_KV" --preview
```

This outputs namespace IDs. Update `wrangler.toml` with these values:

```toml
[[env.production.kv_namespaces]]
binding = "KEEP_ALIVE_KV"
id = "your-namespace-id-here"
preview_id = "your-preview-namespace-id-here"
```

## Step 4: Configure Environment Variables

Copy the example file and fill in your Supabase credentials:

```bash
cp .env.worker.example .env.worker
```

Edit `.env.worker` and add:
- `SUPABASE_URL`: Your Supabase project URL (from Settings > API)
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (from Settings > API)

**Important:** Never commit `.env.worker` to version control. Add it to `.gitignore`.

Update `wrangler.toml` with these values:

```toml
[env.production.vars]
SUPABASE_URL = "https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"
```

## Step 5: Test Locally

Run the worker locally to test the keep-alive logic:

```bash
wrangler dev
```

This starts a local development server. Test the endpoints:

**Check status:**
```bash
curl http://localhost:8787/status
```

**Manually trigger keep-alive:**
```bash
curl -X POST http://localhost:8787/trigger
```

Expected response on success:
```json
{
  "status": "success",
  "message": "Successfully queried newslabs table. Rows returned: 1",
  "rowsQueried": 1,
  "timestamp": "2026-05-22T07:09:00.000Z"
}
```

## Step 6: Deploy to Cloudflare

Deploy the worker to production:

```bash
wrangler deploy --env production
```

The worker is now live and will run automatically every 5 days at midnight UTC (cron: `0 0 */5 * *`).

## Step 7: Verify Deployment

Check the worker is running:

```bash
wrangler tail --env production
```

This shows real-time logs from your deployed worker.

## Monitoring

### Check Last Keep-Alive Status

```bash
curl https://your-worker-url.workers.dev/status
```

### View Worker Logs

In Cloudflare Dashboard:
1. Go to Workers & Pages
2. Select `storyflam-keep-alive`
3. Click "Logs" tab
4. View real-time execution logs

### Manual Trigger (Testing)

```bash
curl -X POST https://your-worker-url.workers.dev/trigger
```

## Cron Schedule

The worker runs on this schedule:
- **Frequency:** Every 5 days
- **Time:** Midnight UTC (00:00)
- **Cron expression:** `0 0 */5 * *`

To change the schedule, edit `wrangler.toml`:

```toml
[triggers]
crons = ["0 0 */5 * *"]  # Change this line
```

Common cron expressions:
- `0 0 * * *` — Daily at midnight UTC
- `0 */6 * * *` — Every 6 hours
- `0 0 */3 * *` — Every 3 days
- `0 0 1 * *` — Monthly on the 1st

## Troubleshooting

### "Missing Supabase credentials" error

Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in `wrangler.toml` under `[env.production.vars]`.

### "Supabase API error: 401" error

Your service role key is invalid or expired. Get a fresh one from Supabase Settings > API.

### "KV namespace not found" error

Ensure the KV namespace ID in `wrangler.toml` matches the output from `wrangler kv:namespace create`.

### Worker not executing on schedule

1. Verify the cron expression in `wrangler.toml`
2. Check Cloudflare Dashboard > Workers > Triggers tab
3. Ensure the worker is deployed to production environment

## Security Notes

- **Service Role Key:** This key has full database access. Store it securely in Cloudflare secrets, not in version control.
- **KV Storage:** Keep-alive logs are stored in KV with a 5-day TTL. No sensitive data is logged.
- **API Endpoint:** The `/status` and `/trigger` endpoints are public. Consider adding authentication if needed.

## Updating the Worker

To update the worker code:

```bash
# Make changes to src/worker.ts
# Test locally
wrangler dev

# Deploy to production
wrangler deploy --env production
```

## Removing the Worker

To delete the worker:

```bash
wrangler delete --env production
```

To delete the KV namespace:

```bash
wrangler kv:namespace delete --binding KEEP_ALIVE_KV
```

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [Supabase API Documentation](https://supabase.com/docs/reference/api)
- [Cron Trigger Documentation](https://developers.cloudflare.com/workers/platform/triggers/cron-triggers/)
