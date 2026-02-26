# Critical Fix #1: Complete Branding Transition
## Proposed Changes for Review

**Issue:** App shows "NewsLab" in title tags, browser tabs, home screen, and manifest while deployed as StoryFlam

---

## 📋 Inventory of Required Changes

### A. HTML Title Tags (3 files)

| File | Current | Proposed | Line |
|------|---------|----------|------|
| `src/routes/+layout.svelte` | `<title>NewsLab</title>` | `<title>StoryFlam</title>` | 25 |
| `src/routes/+page.svelte` | `<title>NewsLab - Login</title>` | `<title>StoryFlam - Login</title>` | 114 |
| `src/routes/share/[teamName]/+page.svelte` | `...Powered by <span>NewsLab</span>` | `...Powered by <span>StoryFlam</span>` | 268 |

**Why:** Browser tab, page history, and footer currently show old brand name.

---

### B. PWA Manifest (Critical Issue)

**File:** `static/manifest.json`

**Current problems:**
```json
{
  "name": "NewsLab",                              // ❌ App name on home screen
  "short_name": "NewsLab",                        // ❌ Install prompt
  "icons": [
    { "src": "/icons/logo-newslab-round.png" },  // ❌ Files don't exist
    { "src": "/icons/logo-newslab-maskable.png" } // ❌ Files don't exist
  ],
  "screenshots": [
    { "src": "/icons/logo-newslab-round.png" }   // ❌ File doesn't exist
  ],
  "shortcuts": [
    { "icons": [{ "src": "/icons/logo-newslab-maskable.png" }] } // ❌ File doesn't exist
  ]
}
```

**Proposed changes:**

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

**Why:**
- Fixes Android home screen app name (currently "NewsLab")
- Uses correct icon files that exist (`/logos/` not `/icons/`)
- `logo-storyflam-maskable.png` is the correct maskable icon (192x512 supported)
- `logo-storyflam-gen.svg` works as universal icon
- `logo-storyflam-og.png` for preview/screenshots

---

### C. App HTML Meta Tags (Already correct, verified)

**File:** `src/app.html`

**Status:** ✅ Already correct
- Line 16: `apple-mobile-web-app-title` = "StoryFlam"
- Line 17: Apple icon = `/logos/logo-storyflam-apple.png` ✅
- Line 8: Favicon = `/logos/logo-storyflam-favicon.svg` ✅
- Line 34: OG image = `/logos/logo-storyflam-og.png` ✅
- Line 49: Default title = "StoryFlam" ✅

**No changes needed here.**

---

## 🎨 Logo Files Available

Located in `/static/logos/`:

| File | Purpose | Size | Status |
|------|---------|------|--------|
| `logo-storyflam-favicon.svg` | Browser tab icon | SVG | ✅ Used |
| `logo-storyflam-apple.png` | iOS home screen | 180x180 | ✅ Used |
| `logo-storyflam-maskable.png` | Android adaptive icon | 512x512 | ⚠️ Not used in manifest |
| `logo-storyflam-gen.svg` | Universal icon | SVG | ⚠️ Not used in manifest |
| `logo-storyflam-og.png` | Social sharing | 1200x630 | ✅ Used |
| `logo-storyflam-logotype-white.png` | App UI | - | Used in components |
| `logo-storyflam-logotype.png` | App UI | - | Used in components |

**Missing (referenced in old manifest):**
- ❌ `/icons/logo-newslab-round.png`
- ❌ `/icons/logo-newslab-maskable.png`

---

## 📱 Android Home Screen Issue Explained

**Current symptom:** App adds to home screen as "NewsLab" with generic icon

**Root cause:** `manifest.json` has:
1. `"name": "NewsLab"` (wrong name)
2. Icon paths point to non-existent `/icons/logo-newslab-*.png` files
3. Android falls back to favicon or generic Android icon

**Fix:** Update manifest with correct name and existing logo files

**Note on maskable icon:** 
- `logo-storyflam-maskable.png` is already in `/logos/`
- It's designed for adaptive icons (safe zone + fallback)
- Best choice for Android `purpose: "maskable"`

---

## ❓ Questions Before Implementation

1. **Maskable icon clarity:** You mentioned "logo.storyflam.maskable.png" - is this the file in `/logos/logo-storyflam-maskable.png`? (Note: underscore vs dot in filename)

2. **SVG vs PNG for manifest:** Should we prioritize SVG (`logo-storyflam-gen.svg`) or PNG (`logo-storyflam-maskable.png`) for the primary icon? SVG scales better, PNG is more compatible.

3. **App description:** Current manifest says "Create. Collaborate. Innovate" - should this stay or change to something more descriptive?

4. **Shortcut icon:** The "Create Story" shortcut uses maskable. Is this correct, or should it use a different icon?

5. **Cache concern:** Android caches manifest aggressively. After deploy, should users:
   - Uninstall and reinstall app? (Nuclear option)
   - Clear app cache in Settings? (Middle option)
   - Wait 24-48 hours for cache refresh? (Passive option)

---

## 🔄 Summary of Proposed Changes

| File | Changes | Impact |
|------|---------|--------|
| `src/routes/+layout.svelte` | 1 line (title) | Browser tab title |
| `src/routes/+page.svelte` | 1 line (title) | Login page title |
| `src/routes/share/[teamName]/+page.svelte` | 1 line (footer) | Public share footer |
| `static/manifest.json` | 8+ lines (name, icons, paths) | Home screen app name + icon |
| `src/app.html` | 0 changes | Already correct |

**Total effort:** 30 minutes  
**Testing:** Need to verify on Android device after deploy + cache clear

---

## ✅ Approval Checklist

Before coding, please confirm:

- [ ] The file at `/logos/logo-storyflam-maskable.png` is correct for Android home screen
- [ ] Description "Create. Collaborate. Innovate" should remain in manifest
- [ ] Proceed with all 4 file changes listed above
- [ ] Clarify any questions about maskable icon or cache behavior

---

**Ready for approval or questions?**
