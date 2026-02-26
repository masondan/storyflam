# StoryFlam: Priority Fixes & Improvements

**Generated:** February 26, 2026  
**Status:** Post-refactor refinement phase

---

## 🔴 CRITICAL FIXES (Blocking/Breaking)

### 1. Complete Branding Transition
**Impact:** User confusion, inconsistent UX  
**Effort:** 30 minutes

- [ ] `src/routes/+layout.svelte` line 25: `<title>NewsLab</title>` → `<title>StoryFlam</title>`
- [ ] `src/routes/share/[teamName]/+page.svelte` line 268: "Powered by NewsLab" → "Powered by StoryFlam"
- [ ] `package.json` line 2: `"name": "newslab"` → `"name": "storyflam"`

**Why:** Users see "NewsLab" in browser tab/footer despite app being StoryFlam; breaks branding consistency.

---

### 2. Fix Storage & Folder Paths
**Impact:** Technical debt, inconsistency  
**Effort:** 15 minutes

- [ ] `src/lib/stores.ts` line 4: `const STORAGE_KEY = 'newslab_session'` → `'storyflam_session'`
- [ ] `src/lib/cloudinary.ts` line 16: `'newslab/images'` → `'storyflam/images'`
- [ ] `src/lib/cloudinary.ts` line 56: `'newslab/videos'` → `'storyflam/videos'`
- [ ] `src/components/TeamLogoUpload.svelte` line 37: `'newslab/logos'` → `'storyflam/logos'`

**Why:** Inconsistent with rebranding; Cloudinary folder organization should match app name.

**Note:** Existing `newslab_session` data in localStorage will be lost on this change. Consider migration strategy if existing users exist.

---

### 3. Fix Client-Side Image Upload Validation
**Impact:** Poor UX, silent failures  
**Effort:** 30 minutes

**Issue:** Large image uploads fail silently with no error message  
**Location:** `src/components/ImageUploader.svelte` and `src/lib/cloudinary.ts`

**Solution:**
```typescript
// Add before upload
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
if (file.size > MAX_FILE_SIZE) {
  showNotification('error', `File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB.`)
  return
}

// Add try-catch with specific error handling
try {
  const result = await uploadImage(file)
  if (!result.url) {
    showNotification('error', 'Upload failed. Please try again.')
  }
} catch (error) {
  showNotification('error', `Upload error: ${error.message}`)
}
```

---

### 4. Rename Route Parameter: `/share/[teamName]` → `/share/[publicationName]`
**Impact:** Route parameter misleading, inconsistent terminology  
**Effort:** 45 minutes

**Changes:**
- [ ] Rename route folder: `/share/[teamName]` → `/share/[publicationName]`
- [ ] Update all file references in page component
- [ ] Update variable: `teamName` → `publicationName` throughout
- [ ] Update prop references in any imported components

**Why:** Route parameter should match current data model; breaks semantic consistency.

---

### 5. Rename Component Files (Team → Publication)
**Impact:** Code clarity, searchability  
**Effort:** 1 hour

**Current → New:**
- [ ] `TeamStreamDrawer.svelte` → `PublicationStreamDrawer.svelte`
- [ ] `TeamsTab.svelte` → `PublicationsTab.svelte`
- [ ] `TeamExpandable.svelte` → `PublicationExpandable.svelte`
- [ ] `TeamMemberItem.svelte` → `ContributorItem.svelte` (optional, more semantic)
- [ ] `TeamLogoUpload.svelte` → `PublicationLogoUpload.svelte`
- [ ] `TeamLockToggle.svelte` → `PublicationLockToggle.svelte`

**After renaming, update all imports** in:
- `src/routes/[courseId]/settings/+page.svelte`
- `src/routes/[courseId]/stream/+page.svelte`
- `src/routes/[courseId]/home/+page.svelte`

---

### 6. Update Component Props & Variable Names
**Impact:** Code consistency, maintainability  
**Effort:** 1.5 hours

**Key updates needed:**

`StoryReaderDrawer.svelte`:
- [ ] Prop `teamName` → `publicationName`
- [ ] Prop `teamLogoUrl` → `publicationLogoUrl`
- [ ] Variable `displayTeamName` → `displayPublicationName`

`PreviewDrawer.svelte`:
- [ ] Variable: `teamColor` → `publicationColor` (or keep as internal; less critical)

All components using `teamName`, `team_name` variables → `publicationName`

---

## 🟡 HIGH PRIORITY (Important improvements)

### 7. Add Client-Side File Type Validation
**Impact:** UX, security  
**Effort:** 20 minutes

Add to image/video upload:
```typescript
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm']

if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
  showNotification('error', 'Image must be JPG, PNG, or WebP.')
  return
}
```

---

### 8. Implement Auto-Save for Drafts
**Impact:** User safety, experience  
**Effort:** 1 hour

**Implementation in WriteDrawer.svelte:**
```typescript
let autoSaveTimer: ReturnType<typeof setInterval> | null = null

onMount(() => {
  autoSaveTimer = setInterval(async () => {
    if (isDirty && storyId) {
      await saveStory(false) // Save without showing toast
      editingStory.markSaved()
    }
  }, 30000) // Every 30 seconds
})

onDestroy(() => {
  clearInterval(autoSaveTimer)
})
```

---

### 9. Fix Lock Refresh Timing
**Impact:** Reliability, UX  
**Effort:** 30 minutes

**Issue:** Lock refresh interval in WriteDrawer should be shorter than lock timeout  
**Current:** No client-side refresh of locks  
**Expected:** Refresh every 3 minutes to keep lock alive

**Implementation:**
```typescript
// In WriteDrawer.svelte, after acquiring lock
lockRefreshTimer = setInterval(async () => {
  if (storyId && userName) {
    await refreshLock(storyId, userName)
  }
}, 3 * 60 * 1000) // 3 minutes

// Cleanup on destroy
onDestroy(() => {
  clearInterval(lockRefreshTimer)
  releaseLock(storyId) // Always release on exit
})
```

---

### 10. Add Content-Length Limit Warnings
**Impact:** UX, performance  
**Effort:** 20 minutes

In editor, warn when:
- Title exceeds 100 characters
- Summary exceeds 300 characters
- Total content gets very large (1000+ blocks or massive HTML)

---

### 11. Implement Search Functionality
**Impact:** Usability, feature completeness  
**Effort:** 2 hours

Add search across stories by:
- Title
- Author (journalist name)
- Summary

**Location:** Add to `src/routes/[courseId]/stream/+page.svelte`  
**Implementation:** Client-side filtering of fetched stories (for now; could optimize later)

---

### 12. Add Revision/History Tracking (Optional but Important)
**Impact:** Accountability, editorial workflow  
**Effort:** 3 hours

Create `story_versions` table:
```sql
CREATE TABLE story_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  title TEXT,
  summary TEXT,
  content JSONB,
  author_name TEXT,
  edited_by TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_story_versions_story_id ON story_versions(story_id);
```

Add function to log version on every save.

---

## 🟢 MEDIUM PRIORITY (Nice to have)

### 13. Break Down WriteDrawer into Sub-Components
**Impact:** Maintainability, testability, readability  
**Effort:** 3-4 hours

**Current:** 1300+ line monolith  
**Target:** Split into:
- `Editor.svelte` (Quill initialization)
- `EditorToolbar.svelte` (Save/publish buttons)
- `FeaturedImageSection.svelte` (Image upload)
- `MetadataSection.svelte` (Title, summary)
- `LockWarning.svelte` (Already separate)
- `PublicationSelector.svelte` (Team/publication picker)

---

### 14. Add Unit Tests
**Impact:** Code quality, reliability  
**Effort:** 4-6 hours

Setup:
- [ ] Install Vitest + Svelte Testing Library
- [ ] Add tests for critical functions:
  - `src/lib/stories.ts` (CRUD operations)
  - `src/lib/auth.ts` (Auth flow)
  - `src/lib/content.ts` (Content rendering)
  - `src/components/StoryCard.svelte` (Component rendering)

---

### 15. Implement Pagination for Large Story Lists
**Impact:** Performance, scalability  
**Effort:** 2 hours

**Issue:** `getTeamStream()` fetches all stories; slow for 1000+ story teams  
**Solution:** Add cursor-based pagination to `stories.ts`

```typescript
export async function getPublicationStream(
  courseId: string,
  publicationName: string,
  limit: number = 20,
  cursor?: string
) {
  let query = supabase
    .from('stories')
    .select('*')
    .eq('course_id', courseId)
    .eq('publication_name', publicationName)
    .eq('status', 'published')
    .order('is_pinned', { ascending: false })
    .order('pin_timestamp', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit + 1)
  
  if (cursor) {
    query = query.lt('created_at', cursor)
  }
  
  const { data, error } = await query
  return { data, error, hasMore: data.length > limit }
}
```

---

### 16. Add Server-Side Authorization (Supabase RLS)
**Impact:** Security (major)  
**Effort:** 4-5 hours

**Issue:** All permission checks are client-side; malicious users can bypass  
**Solution:** Enable Row-Level Security (RLS) on all tables

Example for stories table:
```sql
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view published stories" ON stories
  FOR SELECT
  USING (status = 'published');

CREATE POLICY "Authors can edit their own drafts" ON stories
  FOR UPDATE
  USING (author_name = current_user_id AND status = 'draft');
```

---

### 17. Implement Server-Side Lock Timeout Cleanup
**Impact:** Data integrity, reliability  
**Effort:** 2-3 hours

**Issue:** Locks depend on client checking expiration; crashes can hold locks indefinitely  
**Solution:** Database trigger + scheduled job

```sql
-- Cleanup locks older than 10 minutes
UPDATE stories 
SET locked_by = NULL, locked_at = NULL
WHERE locked_at < NOW() - INTERVAL '10 minutes';
```

---

### 18. Add Internationalization (i18n) Foundation
**Impact:** Scalability for global use  
**Effort:** 2 hours

Since app is deployed in Africa and beyond, consider:
- [ ] Add `svelte-i18n` or similar
- [ ] Extract all user-facing strings to translation files
- [ ] Support English + at least one African language (Swahili, French, etc.)

---

## 🔵 LOW PRIORITY (Polish)

### 19. Improve Mobile Keyboard Handling
**Impact:** Mobile UX  
**Effort:** 1 hour

Currently uses `visualViewport` event. Enhance:
- [ ] Test on iOS 13+ and Android 8+
- [ ] Ensure toolbar stays above keyboard on all devices
- [ ] Add haptic feedback for button presses (if supported)

---

### 20. Add Bulk Export Feature
**Impact:** Admin workflow  
**Effort:** 2 hours

Allow trainers to export:
- All stories as CSV
- All stories as ZIP (individual PDFs)
- Activity log as CSV

---

### 21. Optimize Bundle Size
**Impact:** Performance, load time  
**Effort:** 2 hours

Current target: < 200KB gzipped  
**Actions:**
- [ ] Lazy-load Quill only when editor opens
- [ ] Lazy-load jsPDF only when export called
- [ ] Tree-shake unused Quill modules
- [ ] Analyze with `npm run build -- --analyze` (if available)

---

### 22. Add Service Worker & PWA Support
**Impact:** Offline capability, installability  
**Effort:** 3 hours

- [ ] Create service worker with cache-first strategy
- [ ] Add manifest.json with app icons
- [ ] Cache critical assets on first load
- [ ] Gracefully degrade when offline (read-only mode)

---

### 23. Add Comments/Feedback System
**Impact:** Collaboration feature  
**Effort:** 4+ hours

Allow readers to leave comments on published stories:
- [ ] Create `story_comments` table
- [ ] Add comment form below published story
- [ ] Realtime notifications for new comments
- [ ] Moderation dashboard (trainer-only)

---

### 24. Enhance Cloudinary Video Features
**Impact:** UX, feature richness  
**Effort:** 2 hours

Currently: Native HTML5 video  
**Enhancement:**
- [ ] Integrate Plyr player (already in deps) for better controls
- [ ] Add video thumbnail extraction
- [ ] Display video duration
- [ ] Add video trimming (if Cloudinary supports)

---

## 📋 Execution Roadmap

### Week 1 (High Impact)
1. Complete branding (15 min)
2. Fix storage paths (15 min)
3. Image validation (30 min)
4. Route parameter rename (45 min)
5. Component file renames (1 hour)
6. Component prop updates (1.5 hours)

**Total: 4 hours** ✅ Can complete in 1 focused session

---

### Week 2 (Important Improvements)
7. File type validation (20 min)
8. Auto-save drafts (1 hour)
9. Lock refresh (30 min)
10. Content warnings (20 min)
11. Search functionality (2 hours)

**Total: 4 hours 20 min**

---

### Week 3 (Quality & Safety)
12. Revision tracking (3 hours)
13. WriteDrawer refactor (3-4 hours)
14. Unit tests (4-6 hours)

**Total: 10-13 hours** (Distribute over week)

---

### Future (Longer-term)
15. Pagination (2 hours)
16. Server-side RLS (4-5 hours)
17. Lock cleanup job (2-3 hours)
18. i18n foundation (2 hours)
19-24. Polish & features (varies)

---

## 🎯 Quick Wins (Do First)

If you have 1-2 hours, prioritize in this order:

1. ✅ **Branding fixes** (30 min) - Quick, visible impact
2. ✅ **Image validation** (30 min) - Solves user pain point
3. ✅ **Auto-save drafts** (1 hour) - Major UX improvement
4. ✅ **Lock refresh** (30 min) - Stability fix

**Total: ~2.5 hours, significant improvement to user experience**

---

**Last Updated:** February 26, 2026
