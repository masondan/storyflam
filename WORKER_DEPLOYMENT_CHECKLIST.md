# Cloudflare Worker Deployment Checklist

**Project:** StoryFlam Supabase Keep-Alive Worker  
**Date Started:** _______________  
**Date Completed:** _______________  

---

## Pre-Deployment (Local Setup)

### Prerequisites
- [ ] Node.js 18+ installed
- [ ] Cloudflare account created
- [ ] Supabase project created
- [ ] Git repository initialized

### Installation
- [ ] Run: `npm install --save-dev wrangler @cloudflare/workers-types`
- [ ] Verify installation: `wrangler --version`
- [ ] Authenticate: `wrangler login`
- [ ] Browser opens for Cloudflare authentication
- [ ] Authentication successful

### KV Namespace Setup
- [ ] Run: `npm run worker:kv:create`
- [ ] Copy production namespace ID: `_________________________`
- [ ] Copy preview namespace ID: `_________________________`
- [ ] Update `wrangler.toml` with both IDs
- [ ] Verify IDs are correct in file

---

## Configuration

### Supabase Credentials
- [ ] Open Supabase Dashboard
- [ ] Navigate to Settings > API
- [ ] Copy Project URL: `_________________________`
- [ ] Copy Service Role Key: `_________________________`
- [ ] (Keep service role key secure - never commit to git)

### Update wrangler.toml
- [ ] Add `SUPABASE_URL` to `[env.production.vars]`
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` to `[env.production.vars]`
- [ ] Add KV namespace IDs to `[[env.production.kv_namespaces]]`
- [ ] Verify all values are correct
- [ ] Save file

### Environment File
- [ ] Copy `.env.worker.example` to `.env.worker`
- [ ] Add `SUPABASE_URL` to `.env.worker`
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.worker`
- [ ] Verify `.env.worker` is in `.gitignore`
- [ ] Do NOT commit `.env.worker` to git

---

## Local Testing

### Start Development Server
- [ ] Run: `npm run worker:dev`
- [ ] Server starts on `http://localhost:8787`
- [ ] No errors in console

### Test Status Endpoint
- [ ] Open new terminal
- [ ] Run: `curl http://localhost:8787/status`
- [ ] Response received (may be empty if first run)
- [ ] Response is valid JSON

### Test Manual Trigger
- [ ] Run: `curl -X POST http://localhost:8787/trigger`
- [ ] Response received
- [ ] Status shows "triggered" or "success"
- [ ] Message indicates query was executed
- [ ] Row count is returned (e.g., "Rows returned: 1")

### Verify Success Response
- [ ] Response includes `timestamp`
- [ ] Response includes `status: "success"`
- [ ] Response includes `message` with row count
- [ ] Response includes `rowsQueried` number

### Test Error Handling
- [ ] Stop development server
- [ ] Edit `wrangler.toml` and remove `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Run: `npm run worker:dev`
- [ ] Run: `curl -X POST http://localhost:8787/trigger`
- [ ] Response shows error message
- [ ] Error is descriptive (e.g., "Missing Supabase credentials")
- [ ] Restore `SUPABASE_SERVICE_ROLE_KEY` to `wrangler.toml`

### Cleanup
- [ ] Stop development server (Ctrl+C)
- [ ] Verify no errors in console

---

## Pre-Deployment Review

### Code Review
- [ ] Review `src/worker.ts` for any issues
- [ ] Check TypeScript compiles: `npx tsc --project tsconfig.worker.json --noEmit`
- [ ] No TypeScript errors
- [ ] Code follows project conventions

### Configuration Review
- [ ] Review `wrangler.toml` for correctness
- [ ] Verify cron schedule: `0 0 */5 * *` (every 5 days)
- [ ] Verify environment: `production`
- [ ] Verify all required vars are present
- [ ] No hardcoded secrets in config

### Documentation Review
- [ ] `WORKER_README.md` is complete
- [ ] `WORKER_SETUP.md` is complete
- [ ] `WORKER_QUICK_REFERENCE.md` is complete
- [ ] All documentation is accurate

### Security Review
- [ ] Service role key is NOT in version control
- [ ] `.env.worker` is in `.gitignore`
- [ ] No secrets in `wrangler.toml` (only env var names)
- [ ] No secrets in code comments
- [ ] No secrets in documentation

---

## Deployment

### Deploy to Production
- [ ] Run: `npm run worker:deploy`
- [ ] Deployment starts
- [ ] No errors during deployment
- [ ] Deployment completes successfully
- [ ] Worker URL displayed: `_________________________`

### Verify Deployment
- [ ] Open Cloudflare Dashboard
- [ ] Navigate to Workers & Pages
- [ ] Find `storyflam-keep-alive` worker
- [ ] Worker status shows "Active"
- [ ] Deployment date is today

### Test Deployed Worker
- [ ] Run: `curl https://[your-worker-url].workers.dev/status`
- [ ] Response received
- [ ] Response is valid JSON
- [ ] Status shows success or no_data (first run)

### Test Manual Trigger on Deployed Worker
- [ ] Run: `curl -X POST https://[your-worker-url].workers.dev/trigger`
- [ ] Response received
- [ ] Status shows "triggered"
- [ ] Message indicates successful execution
- [ ] Row count is returned

---

## Post-Deployment Verification

### Check Cloudflare Dashboard
- [ ] Go to Workers & Pages > storyflam-keep-alive
- [ ] Click "Logs" tab
- [ ] View recent execution logs
- [ ] Logs show successful queries
- [ ] No error messages in logs

### Check Cron Trigger
- [ ] Go to Workers & Pages > storyflam-keep-alive
- [ ] Click "Triggers" tab
- [ ] Verify cron trigger is listed
- [ ] Cron expression shows: `0 0 */5 * *`
- [ ] Trigger status shows "Active"

### Monitor First Execution
- [ ] Wait for next scheduled execution (or use manual trigger)
- [ ] Check logs: `npm run worker:logs`
- [ ] Verify execution completed
- [ ] Verify no errors in logs
- [ ] Verify row count returned

### Document Deployment
- [ ] Record deployment date: `_________________________`
- [ ] Record worker URL: `_________________________`
- [ ] Record KV namespace ID: `_________________________`
- [ ] Save this checklist for future reference

---

## Ongoing Maintenance

### Weekly Monitoring
- [ ] Check logs: `npm run worker:logs`
- [ ] Verify recent executions
- [ ] Check for any errors
- [ ] Verify row counts are returned

### Monthly Review
- [ ] Review Cloudflare Dashboard for any issues
- [ ] Check worker execution history
- [ ] Verify cron schedule is still correct
- [ ] Review logs for patterns or errors

### Quarterly Maintenance
- [ ] Rotate Supabase service role key
- [ ] Update `wrangler.toml` with new key
- [ ] Deploy updated worker
- [ ] Verify new key works
- [ ] Revoke old key in Supabase

### Annual Review
- [ ] Review worker code for improvements
- [ ] Check for Cloudflare Workers updates
- [ ] Update dependencies if needed
- [ ] Review security practices
- [ ] Update documentation if needed

---

## Troubleshooting During Deployment

### Issue: "Missing Supabase credentials"
- [ ] Check `wrangler.toml` has `[env.production.vars]` section
- [ ] Verify `SUPABASE_URL` is present
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is present
- [ ] Verify values are not empty
- [ ] Redeploy: `npm run worker:deploy`

### Issue: "401 Unauthorized"
- [ ] Verify service role key is correct in Supabase
- [ ] Check key hasn't expired
- [ ] Get fresh key from Supabase Settings > API
- [ ] Update `wrangler.toml`
- [ ] Redeploy: `npm run worker:deploy`

### Issue: "KV namespace not found"
- [ ] Verify namespace ID in `wrangler.toml`
- [ ] Run: `wrangler kv:namespace list`
- [ ] Compare IDs with output
- [ ] Update `wrangler.toml` with correct ID
- [ ] Redeploy: `npm run worker:deploy`

### Issue: Worker not executing on schedule
- [ ] Check Cloudflare Dashboard > Triggers tab
- [ ] Verify cron trigger is listed and active
- [ ] Verify cron expression is correct: `0 0 */5 * *`
- [ ] Check worker is deployed to production
- [ ] Wait for next scheduled time (or use manual trigger)

### Issue: Local test works, deployed fails
- [ ] Verify env vars are in `wrangler.toml`, not just `.env.worker`
- [ ] Check `wrangler.toml` has `[env.production.vars]` section
- [ ] Verify all required vars are present
- [ ] Redeploy: `npm run worker:deploy`

---

## Rollback Plan

If deployment fails or causes issues:

### Immediate Actions
- [ ] Check Cloudflare Dashboard for error messages
- [ ] Review worker logs: `npm run worker:logs`
- [ ] Identify the issue from logs
- [ ] Do NOT attempt to fix in production

### Rollback Steps
- [ ] Revert code changes: `git checkout src/worker.ts`
- [ ] Revert config changes: `git checkout wrangler.toml`
- [ ] Redeploy: `npm run worker:deploy`
- [ ] Verify worker is working again
- [ ] Review logs to confirm

### Post-Rollback
- [ ] Identify root cause of failure
- [ ] Fix issue locally
- [ ] Test thoroughly with `npm run worker:dev`
- [ ] Redeploy when confident

---

## Sign-Off

**Deployed By:** ___________________________  
**Date:** ___________________________  
**Worker URL:** ___________________________  
**Status:** ☐ Successful ☐ Failed (see notes)  

**Notes:**
```
_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
```

**Verified By:** ___________________________  
**Date:** ___________________________  

---

## Quick Reference

### Essential Commands
```bash
npm run worker:dev          # Test locally
npm run worker:deploy       # Deploy to production
npm run worker:logs         # View live logs
npm run worker:kv:create    # Create KV namespace
```

### Essential URLs
- Cloudflare Dashboard: https://dash.cloudflare.com
- Supabase Dashboard: https://app.supabase.com
- Worker Logs: Cloudflare Dashboard > Workers & Pages > storyflam-keep-alive > Logs

### Essential Files
- Configuration: `wrangler.toml`
- Worker Code: `src/worker.ts`
- Documentation: `WORKER_README.md`
- Setup Guide: `WORKER_SETUP.md`

---

**Keep this checklist for future deployments and updates.**
