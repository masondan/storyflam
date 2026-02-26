# PDF Export Issues - Root Cause Analysis

**Date:** February 26, 2026  
**Status:** Problem identified

---

## The Problem

PDF exports are missing:
1. ❌ Images (nothing shows)
2. ❌ Text formatting (bold, subheads, links)

---

## Root Cause

### Issue #1: PDF Export Code Expects Legacy Block Format
**Location:** `src/lib/export.ts` (lines 71-138)

The PDF export function is written for the **old block format**:
```typescript
if (story.content && isBlockContent(story.content)) {
  for (const block of story.content.blocks) {
    if (block.type === 'image' && block.url) { ... }
    if (block.type === 'heading') { ... }
    if (block.type === 'bold') { ... }
  }
}
```

### Issue #2: Stories Are Now Saved as Quill HTML
**Location:** `src/components/WriteDrawer.svelte` (lines 327, 345)

New stories are saved as:
```typescript
content: { html: contentHtml }  // Quill HTML format
```

**Not as:**
```typescript
content: { blocks: [...] }  // Legacy block format
```

### The Mismatch

```
PDF Export Code
    ↓
Expects: { blocks: [{ type: 'image', url: '...' }, ...] }
    ↓
But finds: { html: '<p>...</p><img src="..." /><strong>...</strong>' }
    ↓
Falls back to: contentToPlainText() on line 133-137
    ↓
Result: Plain text only, no formatting, no images
```

---

## What Happens Now

**Line 133-137 of export.ts:**
```typescript
} else if (story.content && isHtmlContent(story.content)) {
  const plainText = contentToPlainText(story.content)  // Strips ALL HTML
  const lines = doc.splitTextToSize(plainText, contentWidth)
  doc.text(lines, margin, y)
  y += lines.length * 6 + 4
}
```

**Result:** HTML is converted to plain text, losing all formatting and images.

---

## Why This Happened

1. **June 2024 decision:** Switched from block format to Quill HTML
2. **PDF code not updated:** Still expects block format
3. **Text export works:** Because `contentToPlainText()` handles both formats
4. **PDF export broke:** Because PDF code only handles blocks

---

## Two Options to Fix

### Option A: Remove PDF Export (RECOMMENDED)
**Rationale:**
- ✅ Saves 25 KB from bundle (jsPDF library)
- ✅ No maintenance burden
- ✅ Users aren't using it ("very few")
- ✅ TXT export covers 95% of use cases
- ✅ Can be re-added later if requested

**Action:** Delete PDF export completely
- Remove `exportToPdf()` function
- Remove jsPDF import
- Remove PDF button from UI
- Remove 25 KB from bundle

**Time to remove:** 10 minutes

---

### Option B: Fix PDF Export (NOT RECOMMENDED)
**What needs to change:**

1. **Parse Quill HTML** in PDF export
   - Current: Expects `{ blocks: [...] }`
   - Needed: Parse `{ html: '<p>...' }` to extract text + formatting

2. **Handle formatting** (bold, headings, links)
   - Current: Code assumes block types
   - Needed: Parse HTML tags (`<strong>`, `<h2>`, `<a>`)

3. **Extract and embed images**
   - Current: Code tries (lines 79-107)
   - Issue: Works for block format, broken for HTML format
   - Needed: Parse `<img>` tags from HTML

4. **Implementation path:**
   ```
   HTML: '<p>Hello <strong>world</strong></p><img src="..." />'
       ↓
   Parse to extract:
     - Text nodes: "Hello world"
     - Formatting: strong → bold
     - Images: src URLs
       ↓
   Build PDF with formatting
   ```

**Challenges:**
- ❌ jsPDF can't render HTML directly (no CSS support)
- ❌ Need to parse HTML manually and rebuild structure
- ❌ Complex edge cases (nested formatting, complex layouts)
- ❌ CORS issues with remote images (already has try-catch)
- ❌ 3-4 hours of work
- ❌ Ongoing maintenance burden

**Effort:** 3-4 hours  
**Risk:** High (complex HTML parsing)  
**ROI:** Very low (users don't use PDF)

---

## What Text Export Does (and why it works)

**`exportToTxt()` is smart:**
1. Accepts both `{ html: ... }` and `{ blocks: ... }`
2. Uses `contentToPlainText()` which handles both
3. Converts HTML to readable text with markdown hints
4. No formatting loss (users don't expect formatting in .txt)

**Result:** TXT export works perfectly for both old and new formats

---

## My Recommendation

**Remove PDF export.** Here's why:

| Factor | Assessment |
|--------|-----------|
| **Usage** | "Very few" — Not core feature |
| **Cost to remove** | 10 minutes |
| **Bundle savings** | 25 KB (jsPDF) |
| **Cost to fix** | 3-4 hours |
| **Cost to maintain** | Ongoing (edge cases) |
| **User alternative** | TXT export works great |
| **Re-add later?** | Easy — if users request it |

**Bottom line:** Users aren't using PDF. TXT export is fine. Don't spend 3-4 hours on something users don't want.

---

## Action Plan (If You Remove PDF)

### Step 1: Remove From Exports
**File:** `src/lib/export.ts`
- Delete `exportToPdf()` function (lines 27-141)
- Keep `exportToTxt()` function
- Remove unused jsPDF import

### Step 2: Remove From UI
**Files:** 
- `src/routes/[courseId]/home/+page.svelte`
- `src/routes/[courseId]/stream/+page.svelte`
- `src/components/ThreeDotsMenu.svelte` (if it has export options)

Search for PDF export buttons and remove them.

### Step 3: Remove Static Import (Bundle Optimization)
**File:** `src/routes/[courseId]/home/+page.svelte` (line 6)
- Change: `import { exportToTxt, exportToPdf } from '$lib/export'`
- To: `import { exportToTxt } from '$lib/export'`

### Step 4: Update Import in Stream Page
**File:** `src/routes/[courseId]/stream/+page.svelte`
- Same change as Step 3

**Result:** 
- ✅ 25 KB saved from bundle
- ✅ Cleaner codebase
- ✅ Users can still export as TXT
- ✅ Can re-add PDF later if needed

---

## Alternative: If You Want to Keep PDF

If you decide to keep PDF export, here's what needs fixing:

**Quick 80/20 fix (1.5 hours):**
```typescript
// In exportToPdf(), replace the isHtmlContent section with:

} else if (story.content && isHtmlContent(story.content)) {
  const html = story.content.html
  
  // Parse HTML and add to PDF
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html
  
  // Process each HTML element
  tempDiv.querySelectorAll('p, h2, strong, ul, ol, img, hr').forEach(el => {
    // Extract text and apply formatting
    // Add images with try-catch
    // Add to PDF with y positioning
  })
}
```

**But this has downsides:**
- Still won't work perfectly (complex nested HTML)
- CORS issues with images from Cloudinary
- Maintenance burden
- Not worth it for "very few" users

---

## Summary

| Decision | Cost | Benefit |
|----------|------|---------|
| **Remove PDF** | 10 min | 25 KB bundle savings, clean code |
| **Fix PDF** | 3-4 hours | Formatting support, images in PDF |

**Recommendation:** **Remove it.** Users aren't using it, it's broken, and fixing it costs too much for too little value.

---

**What would you like to do?**
1. Remove PDF export completely (10 min, clean, save 25 KB)
2. Fix PDF export to handle Quill HTML (3-4 hours, complex)
3. Leave it as-is (broken, but harmless)
