# Supabase Keepalive — Implementation Plan

**Goal:** Stop StoryFlam's Supabase free-tier project from pausing due to inactivity, using a scheduled GitHub Actions workflow that pings the database once a week. No changes to the app itself.

This document is written to be handed to Claude running in VS Code (with repo access) to implement the code parts, and to guide you (Dan) through the two manual steps that only you can do — because they involve pasting a secret key into your GitHub account, and confirming things in dashboards Claude can't see.

---

## Overview of steps

| Step | Who does it | What happens |
|---|---|---|
| 1 | **Claude (VS Code)** | Creates the workflow file in the repo |
| 2 | **You** | Add two secrets to GitHub (the Supabase URL and anon key) |
| 3 | **Claude (VS Code)** | Commits and pushes the workflow file |
| 4 | **You** | Manually trigger the workflow once to test it |
| 5 | **You** | Confirm in the Supabase dashboard that it worked |

Steps 2, 4, and 5 need you specifically — they involve your GitHub login and your Supabase dashboard, which Claude cannot access.

---

## Instructions for Claude in VS Code

Copy everything in this section into your chat with Claude in VS Code.

> You are working in the StoryFlam repo (SvelteKit + Supabase, deployed on Cloudflare Pages). I want you to add a GitHub Actions workflow that pings our Supabase database once a week so the free-tier project doesn't get paused due to inactivity.
>
> **Task:**
> 1. Create a new file at `.github/workflows/supabase-keepalive.yml` in the repo root, with this exact content:
>
> ```yaml
> name: Supabase Keepalive
>
> on:
>   schedule:
>     - cron: '0 6 * * 1'   # every Monday 06:00 UTC
>   workflow_dispatch:        # allows manual trigger from the GitHub Actions tab
>
> jobs:
>   ping:
>     runs-on: ubuntu-latest
>     steps:
>       - name: Ping Supabase
>         run: |
>           curl -s -o /dev/null -w "HTTP status: %{http_code}\n" \
>             "${{ secrets.SUPABASE_URL }}/rest/v1/activity_log?select=id&limit=1" \
>             -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" \
>             -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
> ```
>
> 2. Do **not** create or modify a `.env` file for this — the workflow reads two GitHub repository secrets called `SUPABASE_URL` and `SUPABASE_ANON_KEY`, which I will add myself directly on GitHub. You don't need to see the actual key values.
> 3. Stage and commit the new file with the message: `Add weekly Supabase keepalive workflow`.
> 4. Push the commit to the repo's default branch (or open a PR if that's our normal workflow — ask me which I prefer if you're not sure).
> 5. Once pushed, tell me the exact URL path to the repo's **Actions** tab so I can trigger and check it.
>
> Don't touch any other files. This should be a single new file and a single commit.

---

## ⏸️ PAUSE — Step 2: Add your Supabase key to GitHub (you do this, not Claude)

Claude can write the workflow file, but it cannot log into your GitHub account to add secrets — and shouldn't, since that's your credential to control. Do this yourself, in your browser:

1. Go to your StoryFlam repository on **github.com**.
2. Click the **Settings** tab (top right of the repo, not your account settings).
3. In the left sidebar, click **Secrets and variables** → **Actions**.
4. Click the green **New repository secret** button.
5. Add the first secret:
   - **Name:** `SUPABASE_URL`
   - **Value:** paste your Supabase project URL — the same value you have as `VITE_SUPABASE_URL` in your local `.env.local` file and in your Cloudflare Pages environment variables. It looks like `https://xxxxxxxxxxxx.supabase.co`.
   - Click **Add secret**.
6. Click **New repository secret** again. Add the second secret:
   - **Name:** `SUPABASE_ANON_KEY`
   - **Value:** paste your Supabase anon/public key — the same value as `VITE_SUPABASE_ANON_KEY` in `.env.local` / Cloudflare. This is a long string starting with `eyJ...`.
   - Click **Add secret**.

**Important — which key to use:** Only ever paste the **anon/public** key here, never the **service_role** key. The anon key is the same one already shipped inside your frontend app bundle (anyone using the PWA can see it in browser dev tools), so putting it in a GitHub secret doesn't create any new exposure. The service_role key is far more powerful and should never go in GitHub secrets, workflow files, or anywhere outside Supabase's own dashboard and your server-only environment variables (which you don't currently have on Cloudflare, per your setup).

Once both secrets are added, message Claude in VS Code again and say: **"Secrets are added, please continue."** Claude will then do Step 3 (commit and push).

---

## ⏸️ PAUSE — Step 4: Test the workflow manually (you do this)

Once Claude confirms the file is pushed:

1. Go to your repo on GitHub.
2. Click the **Actions** tab (top of the repo, next to "Pull requests").
3. In the left sidebar, click **Supabase Keepalive** (the workflow name).
4. Click the **Run workflow** dropdown button on the right, then the green **Run workflow** button that appears.
5. Wait about 10–20 seconds, then refresh the page. You should see a new run appear in the list.
6. Click on that run, then click the **ping** job, then **Ping Supabase** step to expand the log.
7. Look for `HTTP status: 200`. That means it worked.

If you see anything other than `200` (e.g. `401`, `404`, or a blank result), stop and paste the full log output back to Claude — that will tell us exactly what's wrong (usually a mistyped secret name or a wrong key).

---

## ⏸️ PAUSE — Step 5: Confirm in Supabase (you do this)

1. Log into your Supabase dashboard.
2. Open the StoryFlam project.
3. Check the project's activity/status indicator — it should reflect that a request just came in.

That's it — from this point on, the workflow runs automatically every Monday, and you should stop getting the weekly "will be paused" warning emails. You never need to touch it again unless GitHub changes something or you rotate your Supabase keys (in which case you'd just update the two secrets in Step 2 with the new values).

---

## If you ever rotate your Supabase anon key

Repeat Step 2 only — go back to the same GitHub secrets page and click into each secret to update its value. No code changes needed.
