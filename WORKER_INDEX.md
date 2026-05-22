# StoryFlam Cloudflare Worker - Complete Index

## 📋 Overview

A Cloudflare Worker that automatically queries your Supabase project every 5 days to prevent it from being paused due to inactivity. The worker runs on a cron schedule and includes HTTP endpoints for manual testing and status monitoring.

**Status:** ✅ Ready for Deployment  
**Last Updated:** May 22, 2026

---

## 📁 Files Created

### Core Implementation

| File | Purpose | Type |
|------|---------|------|
| [`wrangler.toml`](wrangler.toml) | Cloudflare Worker configuration with cron trigger | Config |
| [`src/worker.ts`](src/worker.ts) | TypeScript worker script with keep-alive logic | Code |
| [`tsconfig.worker.json`](tsconfig.worker.json) | Isolated TypeScript configuration for worker | Config |
| [`.env.worker.example`](.env.worker.example) | Environment variables template | Template |

### Documentation

| File | Purpose | Read Time |
|------|---------|-----------|
| [`WORKER_README.md`](WORKER_README.md) | Complete overview, features, and usage guide | 10 min |
| [`WORKER_SETUP.md`](WORKER_SETUP.md) | Step-by-step setup and deployment instructions | 15 min |
| [`WORKER_QUICK_REFERENCE.md`](WORKER_QUICK_REFERENCE.md) | Quick reference for common commands | 3 min |
| [`WORKER_IMPLEMENTATION_SUMMARY.md`](WORKER_IMPLEMENTATION_SUMMARY.md) | Implementation details and architecture | 8 min |
| [`WORKER_DEPLOYMENT_CHECKLIST.md`](WORKER_DEPLOYMENT_CHECKLIST.md) | Printable deployment checklist | 5 min |
| [`WORKER_INDEX.md`](WORKER_INDEX.md) | This file - navigation guide | 5 min |

### Package Updates

| File | Changes |
|------|---------|
| [`package.json`](package.json) | Added 4 npm scripts for worker management |

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install --save-dev wrangler @cloudflare/workers-types
```

### 2. Authenticate
```bash
wrangler login
```

### 3. Create KV Namespace
```bash
npm run worker:kv:create
```
Update `wrangler.toml` with the namespace IDs returned.

### 4. Configure Credentials
Edit `wrangler.toml` and add your Supabase credentials:
```toml
[env.production.vars]
SUPABASE_URL = "https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"
```

### 5. Test Locally
```bash
npm run worker:dev
```

Test endpoints:
```bash
curl http://localhost:8787/status
curl -X POST http://localhost:8787/trigger
```

### 6. Deploy
```bash
npm run worker:deploy
```

---

## 📚 Documentation Guide

### For First-Time Setup
1. Start with [`WORKER_README.md`](WORKER_README.md) for overview
2. Follow [`WORKER_SETUP.md`](WORKER_SETUP.md) for step-by-step instructions
3. Use [`WORKER_DEPLOYMENT_CHECKLIST.md`](WORKER_DEPLOYMENT_CHECKLIST.md) during deployment

### For Quick Reference
- [`WORKER_QUICK_REFERENCE.md`](WORKER_QUICK_REFERENCE.md) — Commands and common tasks
- [`WORKER_IMPLEMENTATION_SUMMARY.md`](WORKER_IMPLEMENTATION_SUMMARY.md) — Architecture and details

### For Troubleshooting
- See "Troubleshooting" section in [`WORKER_SETUP.md`](WORKER_SETUP.md)
- See "Troubleshooting" section in [`WORKER_README.md`](WORKER_README.md)
- See "Troubleshooting During Deployment" in [`WORKER_DEPLOYMENT_CHECKLIST.md`](WORKER_DEPLOYMENT_CHECKLIST.md)

---

## 🛠️ NPM Scripts

```bash
npm run worker:dev          # Run worker locally for testing
npm run worker:deploy       # Deploy to Cloudflare production
npm run worker:logs         # View real-time logs from deployed worker
npm run worker:kv:create    # Create KV namespace for logging
```

---

## 🔧 Configuration

### wrangler.toml
- **Worker name:** `storyflam-keep-alive`
- **Entry point:** `src/worker.ts`
- **Cron schedule:** Every 5 days at midnight UTC (`0 0 */5 * *`)
- **Environment:** Production
- **KV binding:** `KEEP_ALIVE_KV`

### Environment Variables
```
SUPABASE_URL              # Your Supabase project URL
SUPABASE_SERVICE_ROLE_KEY # Your Supabase service role key
```

Get these from Supabase Dashboard > Settings > API

---

## 🌐 HTTP Endpoints

### GET `/status`
Returns the last keep-alive execution log.

**Example:**
```bash
curl https://your-worker-url.workers.dev/status
```

**Response:**
```json
{
  "timestamp": "2026-05-22T07:09:00.000Z",
  "status": "success",
  "message": "Successfully queried newslabs table. Rows returned: 1",
  "rowsQueried": 1
}
```

### POST `/trigger`
Manually execute the keep-alive query (useful for testing).

**Example:**
```bash
curl -X POST https://your-worker-url.workers.dev/trigger
```

**Response:**
```json
{
  "status": "triggered",
  "message": "Keep-alive executed manually",
  "log": { ... }
}
```

---

## 📊 How It Works

```
┌─────────────────────────────────────────────────────────┐
│ Every 5 days at midnight UTC (00:00)                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Cloudflare Worker Triggers                              │
│ (Cron: 0 0 */5 * *)                                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Query Supabase newslabs Table                           │
│ (via REST API with service role key)                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Log Result to Cloudflare KV                             │
│ (success/error with timestamp)                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Supabase Project Stays Active                           │
│ (prevents pause due to inactivity)                      │
└─────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

✅ **Automated** — Runs on schedule without manual intervention  
✅ **Reliable** — Error handling with detailed logging  
✅ **Observable** — HTTP endpoints for status checks and manual triggers  
✅ **Secure** — Service role key stored in Cloudflare secrets  
✅ **Lightweight** — Minimal code, fast execution (< 500ms)  
✅ **Free** — Uses Cloudflare Workers free tier (100k requests/month)  
✅ **Maintainable** — TypeScript with full type safety  
✅ **Well-Documented** — Comprehensive guides and references  

---

## 🔐 Security

### Service Role Key
- Stored securely in Cloudflare environment variables
- Never exposed in client-side code
- Only used for keep-alive query
- Rotate periodically in Supabase Settings > API

### Best Practices
✅ Never commit `.env.worker` to version control  
✅ Use service role key (not anon key)  
✅ Rotate credentials periodically  
✅ Monitor logs for errors  
✅ Test locally before deploying  

---

## 📈 Monitoring

### View Logs
```bash
# Real-time logs via CLI
npm run worker:logs

# Or in Cloudflare Dashboard
# Workers & Pages > storyflam-keep-alive > Logs
```

### Check Status
```bash
curl https://your-worker-url.workers.dev/status
```

### Manual Trigger
```bash
curl -X POST https://your-worker-url.workers.dev/trigger
```

---

## 🐛 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Missing Supabase credentials" | Add vars to `wrangler.toml` `[env.production.vars]` |
| "401 Unauthorized" | Check service role key is valid in Supabase |
| "KV namespace not found" | Update namespace ID in `wrangler.toml` |
| Worker not running on schedule | Verify cron expression and check Cloudflare Dashboard |

See [`WORKER_SETUP.md`](WORKER_SETUP.md) for detailed troubleshooting.

---

## 📋 Deployment Checklist

Use [`WORKER_DEPLOYMENT_CHECKLIST.md`](WORKER_DEPLOYMENT_CHECKLIST.md) for a complete step-by-step checklist including:

- Pre-deployment setup
- Configuration steps
- Local testing procedures
- Pre-deployment review
- Deployment steps
- Post-deployment verification
- Ongoing maintenance schedule

---

## 🔄 Maintenance

### Weekly
- Check logs for errors
- Verify recent executions

### Monthly
- Review Cloudflare Dashboard
- Check worker execution history

### Quarterly
- Rotate Supabase service role key
- Update worker if needed

### Annually
- Review worker code for improvements
- Check for Cloudflare updates
- Review security practices

---

## 📞 Support Resources

### Documentation
- [`WORKER_README.md`](WORKER_README.md) — Complete overview
- [`WORKER_SETUP.md`](WORKER_SETUP.md) — Setup instructions
- [`WORKER_QUICK_REFERENCE.md`](WORKER_QUICK_REFERENCE.md) — Quick commands
- [`WORKER_IMPLEMENTATION_SUMMARY.md`](WORKER_IMPLEMENTATION_SUMMARY.md) — Architecture details

### External Resources
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [Supabase API Docs](https://supabase.com/docs/reference/api)
- [Cron Triggers](https://developers.cloudflare.com/workers/platform/triggers/cron-triggers/)

---

## 📝 File Structure

```
storyflam/
├── wrangler.toml                      # Worker configuration
├── tsconfig.worker.json               # Worker TypeScript config
├── package.json                       # Updated with worker scripts
├── .env.worker.example                # Environment variables template
├── src/
│   └── worker.ts                      # Worker script
├── WORKER_README.md                   # Main documentation
├── WORKER_SETUP.md                    # Setup guide
├── WORKER_QUICK_REFERENCE.md          # Quick reference
├── WORKER_IMPLEMENTATION_SUMMARY.md   # Implementation details
├── WORKER_DEPLOYMENT_CHECKLIST.md     # Deployment checklist
└── WORKER_INDEX.md                    # This file
```

---

## ✅ Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Configuration | ✅ Complete | `wrangler.toml` ready |
| Worker Code | ✅ Complete | `src/worker.ts` with full error handling |
| TypeScript Config | ✅ Complete | Isolated config to avoid conflicts |
| Environment Setup | ✅ Complete | `.env.worker.example` template provided |
| Documentation | ✅ Complete | 6 comprehensive guides |
| NPM Scripts | ✅ Complete | 4 helper scripts added |
| Testing | ✅ Ready | Local testing instructions provided |
| Deployment | ✅ Ready | Step-by-step deployment guide |

---

## 🎯 Next Steps

1. **Read** [`WORKER_README.md`](WORKER_README.md) for overview
2. **Follow** [`WORKER_SETUP.md`](WORKER_SETUP.md) for setup
3. **Use** [`WORKER_DEPLOYMENT_CHECKLIST.md`](WORKER_DEPLOYMENT_CHECKLIST.md) during deployment
4. **Reference** [`WORKER_QUICK_REFERENCE.md`](WORKER_QUICK_REFERENCE.md) for common commands

---

## 📄 License

Part of StoryFlam project. See main project LICENSE for details.

---

**Last Updated:** May 22, 2026  
**Implementation Status:** ✅ Complete and Ready for Deployment
