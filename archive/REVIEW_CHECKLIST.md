# Critical Fix #1: Branding - Review Checklist

**Date:** February 26, 2026  
**Status:** ⏳ Awaiting your review and approval

---

## 📋 What's Being Proposed

**Fix:** Complete branding transition from NewsLab to StoryFlam  
**Effort:** 30 minutes  
**Files affected:** 4  
**Critical issue addressed:** Android home screen showing "NewsLab" with wrong icon

---

## 📄 Documentation Provided

I've created 3 detailed review documents in the root directory:

### 1. `BRANDING_FIX_PROPOSAL.md`
- **Purpose:** Overview with questions for you
- **Contains:**
  - Inventory of all 11 changes needed
  - Logo file verification (what exists, what doesn't)
  - Questions asking for clarification before coding
  - Android home screen issue explanation

### 2. `BRANDING_CHANGES_DETAILED.md`
- **Purpose:** Exact specifications for implementation
- **Contains:**
  - Before/after for each change with code diffs
  - Complete manifest.json replacement code
  - Testing instructions for Android
  - Rollback plan if issues occur

### 3. This file (`REVIEW_CHECKLIST.md`)
- **Purpose:** Summary and approval checklist

---

## 🎯 The 4 Files to Change

### Change 1: Main Layout Title
```
File: src/routes/+layout.svelte
Line: 25
From: <title>NewsLab</title>
To:   <title>StoryFlam</title>
```

### Change 2: Login Page Title
```
File: src/routes/+page.svelte
Line: 114
From: <title>NewsLab - Login</title>
To:   <title>StoryFlam - Login</title>
```

### Change 3: Public Share Footer
```
File: src/routes/share/[teamName]/+page.svelte
Line: 268
From: Powered by <span>NewsLab</span>
To:   Powered by <span>StoryFlam</span>
```

### Change 4: PWA Manifest (Critical)
```
File: static/manifest.json
Changes: 8+ lines
- "name": "NewsLab" → "StoryFlam"
- "short_name": "NewsLab" → "StoryFlam"
- All icon paths updated to use files that exist
```

---

## ❓ Questions Before Approval

Please answer these before I proceed with coding:

### Question 1: Maskable Icon
**Is `/logos/logo-storyflam-maskable.png` the correct file for Android adaptive icon?**

Context: You mentioned the Android home screen icon wasn't showing the maskable logo. This file is what I'm proposing to use in the manifest for Android. Please confirm it's correct.

- [ ] Yes, use `/logos/logo-storyflam-maskable.png`
- [ ] No, use a different file (please specify)
- [ ] Need clarification

### Question 2: Manifest Description
**Should the manifest description stay as "Create. Collaborate. Innovate"?**

This appears in the install dialog and app listings.

- [ ] Yes, keep current description
- [ ] Change to: ____________
- [ ] No opinion, surprise me

### Question 3: SVG Icon Format
**In the manifest, I'm proposing to use `/logos/logo-storyflam-gen.svg` for the universal icon.**

SVG advantages: Scales to any size, smaller file  
PNG advantages: Better browser compatibility

- [ ] Use SVG (scalable, modern)
- [ ] Use PNG only (safer)
- [ ] Either is fine

### Question 4: Approval to Proceed
**Ready to make all 4 file changes?**

- [ ] **YES - Proceed with all changes**
- [ ] No - Need changes first
- [ ] No - Reject entirely
- [ ] Ask more questions

---

## 🔍 What I Verified

✅ **Correct in current code:**
- `src/app.html` - All icon references are correct
- iOS apple-touch-icon - Already using `logo-storyflam-apple.png`
- OG images - Already using `logo-storyflam-og.png`
- Favicon - Already using `logo-storyflam-favicon.svg`

❌ **Problems found:**
- `static/manifest.json` - References non-existent `/icons/logo-newslab-*.png` files
- Title tags - Still reference "NewsLab"
- Footer - Still references "NewsLab"

---

## 🧪 Testing Plan

After changes are made and deployed:

**On Android device:**
1. Clear app cache (Settings → Apps → StoryFlam → Storage → Clear Cache)
2. Remove app from home screen (if previously installed)
3. Visit https://storyflam.pages.dev
4. Install app or add to home screen
5. Verify:
   - [ ] App name shows "StoryFlam" (not "NewsLab")
   - [ ] Icon is the masked StoryFlam logo (not generic Android icon)
   - [ ] Description shows "Create. Collaborate. Innovate"

**In browser:**
1. Check browser tab titles:
   - [ ] Home page: "StoryFlam"
   - [ ] Login page: "StoryFlam - Login"
   - [ ] Public share: "[Publication Name] | StoryFlam"

---

## ⚠️ Known Caveats

1. **Manifest cache:** Android caches manifest aggressively. Users may need to:
   - Clear app cache, or
   - Uninstall and reinstall app, or
   - Wait 24-48 hours for automatic cache expiration

2. **Device testing:** Changes should be tested on a real Android device:
   - Chrome on Android
   - Samsung Internet
   - Other browsers may cache differently

3. **Deployment:** Cloudflare will cache manifest. May want to:
   - Add cache-busting headers
   - Or wait for natural cache expiration

---

## 📝 Sign-Off

```
Proposal prepared by: AI Code Agent
Date: February 26, 2026
Status: ⏳ AWAITING YOUR REVIEW & ANSWERS TO 4 QUESTIONS
```

---

## ✅ Next Steps

1. **Review** the two detailed documents:
   - `BRANDING_FIX_PROPOSAL.md`
   - `BRANDING_CHANGES_DETAILED.md`

2. **Answer** the 4 questions in this checklist

3. **Approve** the proposed changes

4. **I will code** the changes once approved

---

**Questions? Uncertainties? Ask before I start coding! That's what this proposal is for.**
