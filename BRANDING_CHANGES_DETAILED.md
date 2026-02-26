# Critical Fix #1: Branding Changes - Detailed Specification

## Change 1: Main Layout Title Tag

**File:** `src/routes/+layout.svelte`  
**Line:** 25

```diff
- <title>NewsLab</title>
+ <title>StoryFlam</title>
```

**Why:** This is the default page title for all routes. Appears in browser tab, browser history, bookmarks, and tab completion.

---

## Change 2: Login Page Title Tag

**File:** `src/routes/+page.svelte`  
**Line:** 114

```diff
- <title>NewsLab - Login</title>
+ <title>StoryFlam - Login</title>
```

**Why:** Explicitly sets title for login page. Appears when user visits site before logging in.

---

## Change 3: Public Share Page Footer

**File:** `src/routes/share/[teamName]/+page.svelte`  
**Line:** 268

```diff
- Powered by <span class="font-medium" style="color: #{primaryColor};">NewsLab</span>
+ Powered by <span class="font-medium" style="color: #{primaryColor};">StoryFlam</span>
```

**Why:** Footer text on public-facing share page. External users see this branding.

---

## Change 4: PWA Manifest (Critical for Home Screen)

**File:** `static/manifest.json`

### The Problem

Currently referencing non-existent files in `/icons/` directory:
```json
{
  "name": "NewsLab",
  "short_name": "NewsLab",
  "icons": [
    { "src": "/icons/logo-newslab-round.png" },      // ❌ Doesn't exist
    { "src": "/icons/logo-newslab-maskable.png" }    // ❌ Doesn't exist
  ]
}
```

When Android can't find these files, it:
1. Falls back to favicon (small, not ideal)
2. Uses generic Android icon
3. Shows app name as "NewsLab" (from manifest `name` field)

### Complete Replacement

Replace entire manifest.json with:

```json
{
  "name": "StoryFlam",
  "short_name": "StoryFlam",
  "description": "Create. Collaborate. Innovate",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#5422b0",
  "theme_color": "#5422b0",
  "icons": [
    {
      "src": "/logos/logo-storyflam-gen.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any"
    },
    {
      "src": "/logos/logo-storyflam-maskable.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/logos/logo-storyflam-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/logos/logo-storyflam-og.png",
      "sizes": "540x720",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ],
  "categories": ["productivity"],
  "shortcuts": [
    {
      "name": "Create Story",
      "short_name": "Create",
      "description": "Create a new story",
      "url": "/create",
      "icons": [
        {
          "src": "/logos/logo-storyflam-maskable.png",
          "sizes": "192x192",
          "type": "image/png",
          "purpose": "maskable"
        }
      ]
    }
  ]
}
```

### What Changed in Manifest

| Field | Old | New | Reason |
|-------|-----|-----|--------|
| `name` | NewsLab | StoryFlam | Home screen app name |
| `short_name` | NewsLab | StoryFlam | Install dialog text |
| `icons[0].src` | /icons/logo-newslab-round.png | /logos/logo-storyflam-gen.svg | File exists, SVG scales |
| `icons[1].src` | /icons/logo-newslab-maskable.png | /logos/logo-storyflam-maskable.png | File exists, adaptive |
| `icons[2].src` | /icons/logo-newslab-maskable.png | /logos/logo-storyflam-maskable.png | File exists, adaptive |
| `screenshots[0].src` | /icons/logo-newslab-round.png | /logos/logo-storyflam-og.png | Better OG image |
| `shortcuts[0].icons[0].src` | /icons/logo-newslab-maskable.png | /logos/logo-storyflam-maskable.png | File exists |

---

## Icon File Verification

✅ **Files that exist and are correct:**
- `/logos/logo-storyflam-favicon.svg` - Used in app.html
- `/logos/logo-storyflam-apple.png` - Used in app.html
- `/logos/logo-storyflam-maskable.png` - **NEW in manifest** (192x512, adaptive icon)
- `/logos/logo-storyflam-gen.svg` - **NEW in manifest** (universal SVG)
- `/logos/logo-storyflam-og.png` - Used for OG/social

❌ **Files referenced in OLD manifest but don't exist:**
- `/icons/logo-newslab-round.png`
- `/icons/logo-newslab-maskable.png`

---

## Why Maskable Icon?

Android 11+ uses "adaptive icons" which can:
- Crop the center of circular icons
- Apply safe zone constraints

The `logo-storyflam-maskable.png` is designed with this in mind:
- Fits within a safe circle
- Looks good when cropped
- Optimized for adaptive display

---

## Testing After Deploy

**For Android users:**

1. **Clear manifest cache:**
   - Settings → Apps → StoryFlam → Storage → Clear Cache
   - Or: Uninstall app completely

2. **Test install:**
   - Visit `https://storyflam.pages.dev` in browser
   - Menu → "Install app" or "Add to Home Screen"
   - Verify:
     - App name: **"StoryFlam"** (not "NewsLab")
     - Icon: **Masked StoryFlam logo** (not generic Android icon)
     - Description: "Create. Collaborate. Innovate"

3. **Launch app:**
   - Tap home screen icon
   - Should open StoryFlam in standalone mode

**For iOS users:**
- No manifest change affects iOS
- Apple uses `<link rel="apple-touch-icon">` from app.html
- Already correct: `/logos/logo-storyflam-apple.png`

---

## Browser Tab Verification

After deploy, verify all pages show correct title:

| Page | Expected Title | Verify |
|------|---|---|
| Home page | StoryFlam | Browser tab |
| Login | StoryFlam - Login | Browser tab |
| Public share | Publication Name \| StoryFlam | Browser tab |
| Stories | StoryFlam \| Stories | Browser tab |

---

## Summary Table

| Component | File | Changes | Impact |
|-----------|------|---------|--------|
| Main layout | src/routes/+layout.svelte | 1 line | All pages tab title |
| Login page | src/routes/+page.svelte | 1 line | Login page tab title |
| Share footer | src/routes/share/[teamName]/+page.svelte | 1 line | Public page footer |
| PWA manifest | static/manifest.json | 8+ lines | ⭐ Home screen name + icon |
| HTML meta | src/app.html | 0 lines | Already correct |

---

## Rollback Plan (If Issues)

If after deploy users report issues:

1. **App still shows "NewsLab" on home screen:**
   - Likely cache issue, not a code issue
   - Advise users to clear app cache or reinstall
   - May take 24-48 hours for manifest cache to expire

2. **Icon is wrong/generic:**
   - Check manifest.json was deployed correctly
   - Verify file paths in manifest match actual files
   - PNG files may need 24-48 hours to cache-bust

3. **Quick revert (if critical):**
   - Revert manifest.json to old version
   - Revert title tag changes
   - Clear cache on deploy
   - But this would show old "NewsLab" branding again

---

**Status:** Ready for review and approval
