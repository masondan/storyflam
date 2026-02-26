# Bundle Size Optimization - Investigation & Proposal

**Date:** February 26, 2026  
**Status:** Analysis Complete

---

## Current State

### Total Bundle Size
- **Immutable assets:** 1.6 MB (uncompressed)
- **Largest JS chunk:** 127 KB (gzipped) — *BmrY2a7I.js*
- **Estimated initial load:** ~300-500 KB on 3G networks
- **Time to interactive:** ~2-3 seconds (slow)

### Target
- **Initial bundle:** < 200 KB gzipped
- **Time to interactive:** < 1.5 seconds

---

## Root Cause Analysis

### What's In That 127 KB Chunk?

Built chunk analysis reveals:
1. **Quill Editor** (~65 KB) — Rich text editor library
2. **Plyr Video Player** (~15 KB) — Video controls library
3. **jsPDF** (~25 KB) — PDF export library
4. **Supporting libraries** (~15 KB)

### Why It's Loaded Upfront (BAD)

#### Issue #1: Static Import of Export Functions
**Location:** `src/routes/[courseId]/home/+page.svelte` (line 6)
```typescript
import { exportToTxt, exportToPdf } from '$lib/export'
```

**Problem:**
- User lands on home page
- jsPDF is imported statically
- jsPDF loaded even if user never exports
- Adds ~25 KB to initial bundle

**Usage in file:**
- Lines 130-132: Click handler calls `exportToPdf()` or `exportToTxt()`
- These are only called on user interaction

---

#### Issue #2: Plyr Imported in Multiple Drawers
**Locations:**
- `src/components/StoryReaderDrawer.svelte` (line 6)
- `src/components/WriteDrawer.svelte` (line 16)
- `src/components/PreviewDrawer.svelte` (line 6)

**Current approach (GOOD):**
```typescript
import { initPlyrInContainer } from '$lib/plyr-init'
```

**Analysis:**
- ✅ Plyr is imported dynamically in `plyr-init.ts` (line 11)
- ✅ Smart caching with `PlyrConstructor` singleton
- ✅ Only loaded when video content exists
- **BUT:** These drawer components might be imported statically in parent pages

**Drawer import locations:**
- `src/routes/[courseId]/home/+page.svelte` (line 10): `import StoryReaderDrawer`
- `src/routes/[courseId]/stream/+page.svelte`: Similar import

**Result:** Since drawers are imported statically, all their dependencies come along.

---

#### Issue #3: Quill in WriteDrawer
**Location:** `src/components/WriteDrawer.svelte` (line 136)
```typescript
const Quill = (await import('quill')).default
```

**Status:** ✅ ALREADY CORRECTLY LAZY-LOADED

Quill is imported dynamically only when `initQuill()` is called (on editor open).

---

## The Real Problem

Component import chain:
```
Home Page
  └── import StoryReaderDrawer (static)
      └── import initPlyrInContainer (static)
          └── Plyr loaded on demand (good)
      └── BUT: Component bundled with home page

Also from Home Page:
  └── import exportToPdf, exportToTxt (static)
      └── jsPDF loaded on first render (bad!)
```

**SvelteKit's code splitting:**
- When you import a component statically, entire dependency tree gets bundled
- Home page imports StoryReaderDrawer → drawer bundled with home
- Home page imports exportToPdf → jsPDF bundled with home
- Result: Large initial chunk

---

## Solutions

### Solution #1: Lazy-Load Export Functions ⭐ RECOMMENDED
**Impact:** Saves ~25 KB (jsPDF)  
**Effort:** 30 minutes  
**Risk:** None

**Current code (home/+page.svelte):**
```typescript
import { exportToTxt, exportToPdf } from '$lib/export'

function handleExport(story: Story, format: 'pdf' | 'txt') {
  if (format === 'pdf') {
    await exportToPdf(story)
  } else {
    exportToTxt(story)
  }
}
```

**Fixed code:**
```typescript
// Remove static import
// import { exportToTxt, exportToPdf } from '$lib/export'

async function handleExport(story: Story, format: 'pdf' | 'txt') {
  const { exportToPdf, exportToTxt } = await import('$lib/export')
  
  if (format === 'pdf') {
    await exportToPdf(story)
  } else {
    exportToTxt(story)
  }
}
```

**Benefit:** jsPDF loaded only on export button click

---

### Solution #2: Lazy-Load Drawers (Optional)
**Impact:** Saves ~15-20 KB (Plyr + overhead)  
**Effort:** 1 hour  
**Risk:** Low (drawers already use transitions)

Use SvelteKit's `import()` with `ssr: false`:
```typescript
// Instead of:
// import StoryReaderDrawer from '$components/StoryReaderDrawer.svelte'

// Use dynamic import only when needed:
let StoryReaderDrawer: typeof import('$components/StoryReaderDrawer.svelte').default | null = null

onMount(async () => {
  const mod = await import('$components/StoryReaderDrawer.svelte')
  StoryReaderDrawer = mod.default
})
```

**Trade-off:** Slight delay when opening drawer (usually < 50ms)

---

### Solution #3: Configure Vite Chunk Splitting
**Impact:** Better code splitting  
**Effort:** 30 minutes  
**Risk:** None (optimization only)

**Location:** `vite.config.js`

```javascript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'quill': ['quill'],
          'plyr': ['plyr'],
          'jspdf': ['jspdf']
        }
      }
    }
  }
})
```

**Effect:** Forces these libraries into separate chunks (only loaded when needed)

---

## Recommended Action Plan

### Phase 1 (HIGH PRIORITY - 30 minutes)
✅ **Lazy-load export functions** (Solution #1)
- Edit: `src/routes/[courseId]/home/+page.svelte` (4 lines)
- Edit: `src/routes/[courseId]/stream/+page.svelte` (4 lines)
- Expected savings: ~25 KB
- No risk

### Phase 2 (OPTIONAL - 30 minutes)
⚠️ **Configure Vite chunk splitting** (Solution #3)
- Edit: `vite.config.js` (add manualChunks)
- Test build output
- Expected savings: ~10-15 KB further reduction
- Very low risk

### Phase 3 (NOT RECOMMENDED - 1 hour)
❌ **Lazy-load drawers** (Solution #2)
- More complex
- Minimal additional savings
- Could introduce race conditions
- Skip this

---

## Expected Results

| Metric | Before | After Phase 1 | After Phase 1+2 |
|--------|--------|---------------|-----------------|
| **jsPDF in bundle** | Yes (bundled) | No (on-demand) | No (separate chunk) |
| **Initial JS** | ~127 KB | ~102 KB | ~85 KB |
| **Load savings** | Baseline | ~25 KB | ~35-40 KB |
| **User impact** | 2-3s load | 1.8-2.2s load | 1.5-1.8s load |

---

## Implementation Order

1. **Phase 1 NOW:** Lazy-load export functions (30 min, high value)
2. **Phase 2 OPTIONAL:** Vite chunk splitting (30 min, medium effort)
3. **Test on slow network** to verify improvement

---

## Code Changes Needed

### File 1: `src/routes/[courseId]/home/+page.svelte`

**Remove line 6:**
```diff
- import { exportToTxt, exportToPdf } from '$lib/export'
```

**Update export handler (around line 130):**
```typescript
async function handleExport(story: Story, format: 'pdf' | 'txt') {
  const { exportToPdf, exportToTxt } = await import('$lib/export')
  
  try {
    if (format === 'pdf') {
      await exportToPdf(story)
    } else {
      exportToTxt(story)
    }
  } catch (error) {
    console.error('Export failed:', error)
    showNotification('error', 'Export failed. Please try again.')
  }
}
```

### File 2: `src/routes/[courseId]/stream/+page.svelte`

Same changes as above (remove import, lazy-load in handler).

### File 3: `vite.config.js` (Optional)

Add to existing config:
```javascript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'editor': ['quill'],
        'video': ['plyr'],
        'pdf': ['jspdf']
      }
    }
  }
}
```

---

## Summary

**Root Cause:** Export functions (jsPDF) and drawers imported statically  
**Impact:** 25-40 KB of unused code on page load  
**Fix:** Lazy-load jsPDF (5 min change, 25 KB savings)  
**ROI:** Very high — improves load time for all users, especially mobile

---

**Next Step:** Shall I implement Phase 1 (lazy-load export functions)?
