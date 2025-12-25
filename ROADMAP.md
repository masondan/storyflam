# NewsLab v1.0 - Development Roadmap

**Target Audience:** AI Agents (Code Leads), Development Team  
**Document Purpose:** Phase-by-phase execution guide. Each phase is self-contained and buildable independently.  
**Status:** Ready for Phase 0 startup  
**Last Updated:** December 2025

---

## Overview

NewsLab is a mobile-first, collaborative CMS for journalism training. This roadmap breaks development into 8 phases, each with explicit deliverables, database changes, routes, components, and acceptance criteria.

**Key Principles:**
- Zero-login, room-based collaboration (single Course ID for all journalists)
- Separate Trainer ID and optional Guest Editor ID for elevated privileges
- Stories owned by individuals (drafts private, published visible to team)
- Editors (per team) control team themes, logos, and all team stream editing
- Auto-save every 3s (debounced) to localStorage + Supabase
- All stories sorted newest-first; pinned stories top of Team Stream only
- Maximum 3 pinned stories; oldest pin auto-removes when 4th added
- Public share URL per team: `newslab.app/team-name` (read-only)

**Design Reference:** All UI decisions follow DESIGN.md. Visual references (e.g., "See user1.png") point to `/info/visuals/` screenshots.

---

## Phase 0: Environment & Schema Setup

**Duration:** 1-2 days  
**Deliverables:**
- [ ] Svelte + Vite project initialized, Tailwind CSS configured
- [ ] Supabase project created, client SDK installed
- [ ] Cloudinary account configured with unsigned upload preset
- [ ] GitHub repo linked to Cloudflare Pages (auto-deploy on push)
- [ ] Database schema created and deployed to Supabase
- [ ] Environment variables configured (`.env.local`)
- [ ] TypeScript strict mode enabled
- [ ] SVG icons copied to `/static` (see icon list below)

**Database Schema Changes:**

```sql
-- NewsLabs (training sessions)
CREATE TABLE newslabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT UNIQUE NOT NULL,           -- e.g., "nigeria-0126"
  trainer_id TEXT UNIQUE NOT NULL,          -- Trainer password
  guest_editor_id TEXT UNIQUE,              -- Optional guest editor password
  fallback_image_url TEXT,                  -- Default thumbnail if story has no image
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Journalists (participants)
CREATE TABLE journalists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  name TEXT NOT NULL,
  team_name TEXT,
  is_editor BOOLEAN DEFAULT FALSE,          -- Can edit team settings & all stories
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(course_id, name),
  FOREIGN KEY(course_id) REFERENCES newslabs(course_id) ON DELETE CASCADE
);

-- Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  primary_color TEXT DEFAULT '5422b0',      -- Hex color for team theme
  secondary_color TEXT DEFAULT 'f0e6f7',    -- Lighter contrast color
  logo_url TEXT,                            -- Team logo (Cloudinary)
  public_share_token TEXT UNIQUE,           -- For public read-only URL
  share_enabled BOOLEAN DEFAULT FALSE,      -- Toggle sharing on/off
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(course_id, team_name),
  FOREIGN KEY(course_id) REFERENCES newslabs(course_id) ON DELETE CASCADE
);

-- Stories
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  author_name TEXT NOT NULL,                -- Original creator
  title TEXT NOT NULL,
  summary TEXT,
  featured_image_url TEXT,                  -- Cloudinary URL
  content JSONB,                            -- Rich text: { blocks: [{ type, text/url }] }
  status TEXT DEFAULT 'draft',              -- 'draft' or 'published'
  is_pinned BOOLEAN DEFAULT FALSE,
  pin_index INTEGER,                        -- Order for pinned stories (0, 1, 2)
  pin_timestamp TIMESTAMP,                  -- When pinned (for auto-removal of oldest)
  locked_by TEXT,                           -- Current editor's name (NULL if unlocked)
  locked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY(course_id) REFERENCES newslabs(course_id) ON DELETE CASCADE
);

-- Activity Log (trainer visibility)
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  team_name TEXT,
  journalist_name TEXT,
  action TEXT,                              -- 'published', 'unpublished', 'edited', 'joined_team', 'left_team', 'pinned', 'unpinned'
  story_id UUID,
  story_title TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY(course_id) REFERENCES newslabs(course_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_stories_course_team ON stories(course_id, team_name);
CREATE INDEX idx_stories_author ON stories(course_id, author_name);
CREATE INDEX idx_stories_status ON stories(course_id, status);
CREATE INDEX idx_journalists_course_team ON journalists(course_id, team_name);
CREATE INDEX idx_activity_course ON activity_log(course_id);
```

**Environment Variables:**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-unsigned-preset
```

**Required SVG Icons** (place in `/static/icons/`):
- `icon-user.svg`, `icon-user-fill.svg` (home tab inactive/active)
- `icon-group.svg`, `icon-group-fill.svg` (team stream inactive/active)
- `icon-settings.svg`, `icon-settings-fill.svg` (settings inactive/active)
- `icon-newstory.svg` (write button, filled white)
- `icon-more.svg` (three-dot menu)
- `icon-trash.svg`, `icon-delete.svg` (delete button)
- `icon-edit.svg` (edit button)
- `icon-export.svg` (export button)
- `icon-pin.svg`, `icon-pin-fill.svg` (pin toggle, outline/filled)
- `icon-unpublish.svg` (unpublish button)
- `icon-select-all.svg`, `icon-select-all-fill.svg` (select all inactive/active)
- `icon-radio.svg` (selected radio button)
- `icon-circle.svg` (unselected radio button)
- `icon-check.svg` (green checkmark for validation)
- `icon-close.svg`, `icon-close-circle.svg` (close/remove button)
- `icon-image.svg`, `icon-heading.svg`, `icon-bold.svg`, `icon-list.svg` (text editing)
- `icon-separator.svg` (horizontal rule)
- `icon-youtube.svg`, `icon-link.svg` (embeds)
- `icon-preview.svg`, `icon-preview-fill.svg` (preview toggle)
- `icon-publish.svg`, `icon-publish-fill.svg` (publish toggle)
- `icon-time.svg` (timestamp icon)
- `icon-arrow-left.svg` (back arrow)
- `icon-expand.svg`, `icon-collapse.svg` (expand/collapse dropdown)
- `icon-upload.svg` (upload button)
- `icon-custom-upload.svg` (custom image upload)
- `newslab-textlogo-white.png` (main logo for splash)

**Acceptance Criteria:**
- [ ] Database schema deployed to Supabase without errors
- [ ] All tables have appropriate indexes
- [ ] Environment variables load correctly in dev & build
- [ ] SVG icons load without 404s
- [ ] TypeScript compiles with strict mode enabled

---

## Phase 1: Identity & Gatekeeper

**Duration:** 2-3 days  
**Dependencies:** Phase 0  
**Deliverables:**
- [ ] Splash screen with Course ID input (See DESIGN.md, splash1.png, splash2.png)
- [ ] Course ID validation (check newslabs table)
- [ ] Trainer password detection (separate from Course ID)
- [ ] Guest Editor ID detection (separate password)
- [ ] Personal name entry & validation (check journalists table)
- [ ] localStorage persistence: `{ courseId, name, role, teamName }`
- [ ] Role detection: 'journalist', 'trainer', 'guest_editor'
- [ ] Route guards for protected pages
- [ ] Logout functionality (clear localStorage)

**Routes to Create:**
- `GET /` — Splash screen (entry point)
- `GET /[course-id]/home` — Redirect target (after login)
- `GET /[course-id]/*` — Protected routes (require valid localStorage)

**Components to Build:**
- `SplashScreen.svelte` — Course ID input, trainer password detection
- `NameValidation.svelte` — Name input with real-time validation feedback
- `GatekeeperGuard.svelte` — Route protection logic

**Supabase Queries:**
- Validate Course ID exists: `SELECT id FROM newslabs WHERE course_id = $1`
- Check name availability: `SELECT id FROM journalists WHERE course_id = $1 AND name = $2`
- Auto-create journalist record on first login

**localStorage Schema:**
```javascript
{
  courseId: "nigeria-0126",
  name: "Zainab",
  role: "journalist|trainer|guest_editor",
  teamName: null,  // Populated after team join
  session_token: "uuid"  // For validation
}
```

**Design References:**
- Splash screen: See splash1.png, splash2.png (DESIGN.md section "1 Splash screen")
- Name validation: Part of Settings flow (DESIGN.md section "5. Settings")

**Acceptance Criteria:**
- [ ] Invalid Course ID shows error message
- [ ] Valid Course ID advances to name validation
- [ ] Duplicate name shows red X; available name shows green ✓
- [ ] Trainer ID detected; role set to 'trainer' in localStorage
- [ ] Guest Editor ID detected; role set to 'guest_editor'
- [ ] Page refresh: user stays logged in (localStorage persists)
- [ ] Logout button clears all localStorage
- [ ] All routes require valid `courseId` + `name` in localStorage

---

## Phase 2: Core Navigation & Drawer System

**Duration:** 2-3 days  
**Dependencies:** Phase 1  
**Deliverables:**
- [ ] Footer navigation tabs (User Home, Write, Team Stream, Settings)
- [ ] Footer button state (active/inactive styling per DESIGN.md)
- [ ] Write drawer (rises bottom-to-top, full screen)
- [ ] Story reader drawer (rises bottom-to-top for Team Stream detail)
- [ ] Preview drawer (slides left-to-right from Write)
- [ ] Responsive mobile layout (no desktop optimizations yet)
- [ ] Tab switching without data loss (maintain scroll position)

**Routes:**
- `GET /[course-id]/home` — User Home (default, Drafts/Published tabs)
- `GET /[course-id]/stream` — Team Stream
- `GET /[course-id]/settings` — Settings
- Modals/Drawers handled by Svelte state (not routes)

**Components to Build:**
- `FooterNav.svelte` — 4-button footer, active state tracking
- `WriteDrawer.svelte` — Full-screen modal (initially empty, content in Phase 4)
- `StoryReaderDrawer.svelte` — Full-screen modal for story detail
- `PreviewDrawer.svelte` — Preview modal (left-to-right slide)
- `MainLayout.svelte` — Wrapper with footer, tab content, drawer management

**State Management:**
- Use Svelte stores for drawer visibility, active tab, scroll position
- Example: `activeDrawer: 'none' | 'write' | 'preview' | 'story_reader'`

**Design References:**
- Footer nav: DESIGN.md section "2 User Home", visual user1.png (footer visible in all)
- Write drawer: DESIGN.md section "3 Write Page", write1.png
- Story reader: DESIGN.md section "4. Team Stream", team1.png, team2.png
- Preview drawer: DESIGN.md section "3 Write Page", write5.png

**Acceptance Criteria:**
- [ ] Footer appears on all pages with correct icons (See DESIGN.md visual references)
- [ ] Clicking footer button opens correct drawer/page
- [ ] Drawers slide in from correct direction (bottom-to-top for Write, left-to-right for Preview)
- [ ] Close button (X) closes drawer
- [ ] Tab switching maintains scroll position (no jump to top)
- [ ] Active tab button is #5422b0 (or team color if set); inactive #777777
- [ ] Write button is larger, white-on-purple circle (See user1.png)

---

## Phase 3: Settings & Team Management

**Duration:** 3-4 days  
**Dependencies:** Phase 2  
**Deliverables:**
- [ ] Settings page: Personal name (read-only), Team Name input
- [ ] Team name validation (real-time, check teams table)
- [ ] Team Members list (all journalists in current team)
- [ ] Leave team button (X next to own name)
- [ ] Editor status checkbox (next to each team member's name)
- [ ] Team logo upload (Cloudinary, square, max 1 per team)
- [ ] Team color selector (6 color circles, see DESIGN.md)
- [ ] Team share toggle (if editor, show toggle + copy URL button)
- [ ] Auto-deletion: When last member leaves, delete team
- [ ] Real-time updates: When new member joins, Team Members list updates via Realtime subscription
- [ ] Editor promotion logic: Only existing editors can toggle editor status
- [ ] Team name editing: Only editors can change team name

**Routes:**
- `GET /[course-id]/settings` — Settings page

**Components to Build:**
- `SettingsPage.svelte` — Main settings container
- `PersonalSettings.svelte` — Name display (read-only)
- `TeamSettings.svelte` — Team name input, member list, color picker
- `TeamMemberItem.svelte` — Member name + remove button + editor checkbox
- `TeamLogoUpload.svelte` — Image upload with preview
- `ColorPalette.svelte` — 6 color circles with selection indicator
- `ShareToggle.svelte` — Public URL toggle + copy button (editors only)

**Supabase Queries:**
- Get team members: `SELECT * FROM journalists WHERE course_id = $1 AND team_name = $2 ORDER BY created_at`
- Create team: `INSERT INTO teams (course_id, team_name) VALUES ($1, $2) RETURNING *`
- Update journalist team: `UPDATE journalists SET team_name = $1 WHERE course_id = $2 AND name = $3`
- Update team theme: `UPDATE teams SET primary_color = $1, secondary_color = $2 WHERE course_id = $3 AND team_name = $4`
- Toggle editor: `UPDATE journalists SET is_editor = NOT is_editor WHERE course_id = $1 AND name = $2 AND team_name = $3`
- Realtime subscription on journalists table for team changes

**Cloudinary Integration:**
- Logo upload: Cloudinary unsigned upload to `/team-logos/` folder
- Auto-crop to square (aspect ratio 1:1)
- Max size: 200KB

**Permission Model:**
- Non-editors: Can view Team Name, Member list, see Share URL (but can't change settings)
- Editors: Can change Team Name, Team Color, upload logo, toggle editor status, enable/disable sharing
- Team name change blocked for non-editors (disable input field)

**Design References:**
- Settings layout: DESIGN.md section "5. Settings", settings1.png, settings2.png, settings3.png, settings4.png
- Team color palette: DESIGN.md color list and settings1.png (bottom of page)
- Team logo upload area: settings1.png
- Public share toggle: Will be added to DESIGN by user (coordinate with visuals)

**Acceptance Criteria:**
- [ ] Team name field populated if user in a team, empty if not
- [ ] Real-time validation: New team name shows green ✓, taken name shows red X
- [ ] Team Members list shows all members (including self)
- [ ] "X" next to own name triggers "Leave team?" confirmation
- [ ] Leaving team removes journalist from database, redirects to empty settings
- [ ] Last member leaves: Team deleted from database
- [ ] Editor checkbox visible next to each member's name
- [ ] Non-editors: Cannot toggle editor status (checkbox disabled/hidden)
- [ ] Only editors can change team name (field disabled for non-editors)
- [ ] Color selector shows 6 circles; selected color has ring indicator
- [ ] Color change updates app theme in real-time (buttons, icons, active states)
- [ ] Logo upload shows preview, accepts square images only
- [ ] Share toggle visible to editors only; generates URL `newslab.app/[team-name]`
- [ ] Copy URL button copies to clipboard

---

## Phase 4: Story Editor & Auto-save (Write Drawer)

**Duration:** 4-5 days  
**Dependencies:** Phase 3  
**Deliverables:**
- [ ] Write drawer opens from bottom, full screen (See write1.png)
- [ ] Headline input (required, placeholder "Title")
- [ ] Summary input (optional, textarea, placeholder "Text")
- [ ] Featured image upload (Cloudinary, auto-resize to max 800px width, any aspect ratio)
- [ ] Image caption support (placeholder "[Tap to add caption]", disappears if empty)
- [ ] Rich text editor: Bold, H2 subheading, lists, separators
- [ ] Toolbar at bottom with formatting + embed buttons (See write1.png toolbar)
- [ ] YouTube/Vimeo URL input modals
- [ ] Custom thumbnail upload for YouTube (square, stored separately)
- [ ] Link insertion (using team color/default purple for link text)
- [ ] Auto-paste formatting removal (plain text only)
- [ ] Auto-save every 3s (debounced) to localStorage
- [ ] Auto-save to Supabase (draft with status='draft')
- [ ] Word count display (bottom of write drawer, not in published story)
- [ ] Preview drawer (slides left-to-right, shows formatted story with team branding)
- [ ] Close drawer button (X icon) with unsaved changes confirmation

**Routes:** Handled as drawer modal in Phase 2

**Components to Build:**
- `WriteDrawer.svelte` — Main editor container
- `HeadlineInput.svelte` — Title input field
- `SummaryInput.svelte` — Summary textarea
- `ImageUploader.svelte` — Featured image upload with resize preview
- `ImageCaption.svelte` — Caption input (appears after image selected)
- `RichTextEditor.svelte` — Main text editor with formatting
- `ToolbarBottom.svelte` — Formatting buttons + embed buttons (See write1.png)
- `YouTubeModal.svelte` — URL input + custom thumbnail upload
- `LinkModal.svelte` — URL + link text input
- `PreviewDrawer.svelte` — Read-only formatted story view with team branding
- `AutoSaveIndicator.svelte` — "Saved" text feedback (brief, bottom-right)
- `WordCounter.svelte` — Word count display

**Rich Text Storage:**
```javascript
// stories.content structure
{
  blocks: [
    { type: 'paragraph', text: 'Some text' },
    { type: 'heading', text: 'Subheading' },
    { type: 'bold', text: 'Bold text' },
    { type: 'list', items: ['item 1', 'item 2'] },
    { type: 'separator' },
    { type: 'image', url: 'cloudinary-url', caption: 'Caption text' },
    { type: 'youtube', url: 'https://youtube.com/...', thumbnailUrl: 'optional' },
    { type: 'link', url: 'https://...', text: 'Link text', color: 'team-primary' }
  ]
}
```

**Auto-save Logic:**
```javascript
// Debounced function
const debouncedSave = debounce(() => {
  // 1. Save to localStorage (instant)
  localStorage.setItem('draft_' + courseId, JSON.stringify(storyData))
  // 2. Save to Supabase (async, non-blocking)
  supabase.from('stories').upsert({ ...storyData, status: 'draft' })
  // 3. Show "Saved" indicator for 1s, then fade
}, 3000)

// On every keystroke/change
editor.addEventListener('input', debouncedSave)
```

**Cloudinary Integration:**
- Featured images: Max 800px width, any aspect ratio, lossy compression (q_80)
- Logo images: Square (1:1), max 200KB
- YouTube custom thumbnail: Square, max 200KB

**Design References:**
- Write drawer layout: DESIGN.md section "3 Write Page", write1.png, write2.png
- Toolbar buttons: write1.png (bottom toolbar)
- YouTube custom upload: write4.png
- Link modal: write3.png
- Preview drawer: write5.png (includes team header with logo, theme color, team name)
- Publish toolbar: write6.png (will use in Phase 5)

**Acceptance Criteria:**
- [ ] Headline input appears at top, placeholder "Title" disappears on focus
- [ ] Summary textarea appears below headline
- [ ] Image upload button opens file picker, resizes to max 800px width
- [ ] Image preview shows below upload button
- [ ] Caption field appears below image with placeholder text
- [ ] All formatting buttons (bold, H2, list, separator) work on selected text
- [ ] YouTube/Vimeo/Link modals open and close correctly
- [ ] Custom thumbnail upload for YouTube works (shows filename after upload)
- [ ] Pasted text is plain text (no formatting retained)
- [ ] Auto-save fires every 3s (debounced on keystroke)
- [ ] "Saved" indicator appears briefly after successful Supabase sync
- [ ] Word count updates in real-time, displays at bottom of drawer
- [ ] Preview drawer shows formatted story with team branding (logo, color, name)
- [ ] Close button (X) closes drawer; unsaved changes show confirmation dialog
- [ ] Draft restored from localStorage on page refresh

---

## Phase 5: Publishing & Team Stream Display

**Duration:** 3-4 days  
**Dependencies:** Phase 4  
**Deliverables:**
- [ ] Publish button in Write drawer (becomes active when headline filled)
- [ ] Publish toolbar (pin toggle + confirmation, See write6.png)
- [ ] Publish confirmation & save to Supabase with status='published'
- [ ] Story appears in author's Published tab immediately
- [ ] Story appears in Team Stream immediately (Realtime subscription)
- [ ] Team Stream displays all published stories from team (most recent first)
- [ ] Pinned stories appear at top of Team Stream (most recent pin first)
- [ ] User Home: Drafts tab (personal drafts only)
- [ ] User Home: Published tab (personal published stories)
- [ ] Story card layout (thumbnail, headline, summary, author, timestamp, See user8.png)
- [ ] Three-dot menu in Team Stream (editors only, See team1.png)
- [ ] Three-dot menu in Published tab (author only, See user9.png)
- [ ] Unpublish button (moves story back to Drafts)
- [ ] Delete button (remove story from database)
- [ ] Edit button (loads editor with pre-filled data)
- [ ] Story detail drawer (bottom-to-top, full story view, See team2.png)
- [ ] Pinned badge indicator (if is_pinned=true, See user10.png)
- [ ] Select all functionality (bulk delete from Drafts/Published, See user7.png)
- [ ] Real-time updates via Supabase Realtime subscription
- [ ] Activity log entries created for publish/unpublish/delete/pin/unpin

**Routes:**
- `GET /[course-id]/home` — User Home (update with Drafts/Published tabs)
- `GET /[course-id]/stream` — Team Stream (update with pinned stories + stories)

**Components to Build:**
- `PublishToolbar.svelte` — Pin toggle + confirmation (See write6.png, write7.png)
- `UserHome.svelte` — Container for Drafts/Published tabs
- `DraftsTab.svelte` — List of personal draft stories
- `PublishedTab.svelte` — List of personal published stories
- `TeamStream.svelte` — List of team's published stories (pinned + unpinned)
- `StoryCard.svelte` — Thumbnail + metadata preview (See user8.png, team1.png)
- `ThreeDotsMenu.svelte` — Context menu (Export/Edit/Delete for drafts; Unpublish/Export/Edit/Pin/Delete for published)
- `StoryDetailDrawer.svelte` — Full-screen story view (See team2.png)
- `SelectAllToggle.svelte` — Multi-select mode for bulk delete (See user7.png)
- `TeamHeader.svelte` — Team name + logo + color (appears at top of Team Stream, See team1.png)

**Supabase Queries:**
- Get drafts: `SELECT * FROM stories WHERE course_id = $1 AND author_name = $2 AND status = 'draft' ORDER BY updated_at DESC`
- Get published: `SELECT * FROM stories WHERE course_id = $1 AND author_name = $2 AND status = 'published' ORDER BY created_at DESC`
- Get team stream: `SELECT * FROM stories WHERE course_id = $1 AND team_name = $2 AND status = 'published' ORDER BY is_pinned DESC, pin_timestamp DESC, created_at DESC`
- Publish story: `UPDATE stories SET status = 'published', is_pinned = FALSE WHERE id = $1 RETURNING *`
- Unpublish story: `UPDATE stories SET status = 'draft' WHERE id = $1 RETURNING *`
- Pin story (editors only): See Phase 5 pin logic below
- Realtime subscriptions on stories table (filtered by course_id, team_name)

**Pin Logic (Editors Only):**
```javascript
// When editor pins a story:
const currentPins = await supabase
  .from('stories')
  .select('*')
  .eq('course_id', courseId)
  .eq('team_name', teamName)
  .eq('is_pinned', true)
  .order('pin_timestamp', { ascending: false })

if (currentPins.length >= 3) {
  // Auto-unpin oldest
  const oldestPin = currentPins[2]
  await supabase.from('stories').update({ is_pinned: false, pin_index: null }).eq('id', oldestPin.id)
}

// Then pin new story
await supabase.from('stories').update({
  is_pinned: true,
  pin_timestamp: new Date(),
  pin_index: 0
}).eq('id', storyId)

// Re-index remaining pins
const pins = await supabase.from('stories').select('*').eq('is_pinned', true).order('pin_timestamp', { ascending: false })
for (let i = 0; i < pins.length; i++) {
  await supabase.from('stories').update({ pin_index: i }).eq('id', pins[i].id)
}
```

**Activity Log:**
Create entry for: published, unpublished, edited, pinned, unpinned, deleted

**Design References:**
- Publish toolbar: write6.png, write7.png
- User Home Drafts tab: user3.png (empty), user4.png (with stories)
- User Home Published tab: user8.png (empty), user9.png (with stories)
- Team Stream: team1.png, team2.png
- Story card layout: user8.png, team1.png (shows thumbnail, headline, summary, author, timestamp)
- Three-dot menu in Published tab: user9.png
- Three-dot menu in Team Stream (editors only): team1.png right side
- Pinned badge: user10.png (small icon next to headline)
- Story detail drawer: team2.png (full-screen story view)
- Select all: user7.png, user11.png, user12.png

**Acceptance Criteria:**
- [ ] Publish button disabled until headline filled
- [ ] Clicking Publish shows toolbar with pin toggle
- [ ] Toggling pin shows "Pin this story?" option
- [ ] Publish confirmation saves story with status='published'
- [ ] Story appears in author's Published tab within 1s
- [ ] Story appears in Team Stream within 1s (Realtime)
- [ ] Team Stream sorted: pinned stories first (newest pin first), then unpinned (newest first)
- [ ] Three-dot menu visible to editors in Team Stream (all stories)
- [ ] Three-dot menu visible to authors in Published tab (own stories only)
- [ ] Unpublish moves story back to Drafts
- [ ] Pinned story shows badge/indicator
- [ ] Max 3 pins enforced; 4th pin auto-removes oldest
- [ ] Delete story removes from database + Team Stream + Published tab
- [ ] Story detail drawer shows full formatted story (matching DESIGN.md layout)
- [ ] Select all mode: shows radio buttons, trash icon activates, deletion confirmed
- [ ] Activity log entries created for all actions

---

## Phase 6: Story Editing, Locking & Concurrency

**Duration:** 3 days  
**Dependencies:** Phase 5  
**Deliverables:**
- [ ] Edit button loads story in Write drawer (pre-filled data)
- [ ] Story lock mechanism (set locked_by + locked_at on edit load)
- [ ] Lock check: If story locked by another journalist, show "Story is being edited by [Name]" message
- [ ] No editor access if locked by other journalist (disable all inputs, show "Go Back" button)
- [ ] Lock held by self (from previous session): Auto-unlock on load
- [ ] Auto-unlock: 5-minute timeout without activity (Supabase function or client-side check)
- [ ] Save story: Update database + set locked_by = NULL
- [ ] Edit restrictions for non-editors:
  - [ ] Authors can edit their own published stories from Published tab
  - [ ] Authors CANNOT edit stories from Team Stream (no edit button shown)
  - [ ] Non-editors cannot edit Team Stream stories at all
- [ ] Editors can edit any story from Team Stream (no lock restriction on editors)
- [ ] Discard changes confirmation (if unsaved changes)

**Routes:** Handled as drawer modal (Phase 2)

**Components:**
- Update `WriteDrawer.svelte` to accept pre-filled story data
- Add `LockWarning.svelte` — Banner showing lock status
- Update `ToolbarBottom.svelte` — "Save Changes" button (instead of "Publish")

**Supabase Queries:**
- Check lock: `SELECT locked_by, locked_at FROM stories WHERE id = $1`
- Set lock: `UPDATE stories SET locked_by = $1, locked_at = NOW() WHERE id = $2`
- Release lock: `UPDATE stories SET locked_by = NULL WHERE id = $1`
- Get story: `SELECT * FROM stories WHERE id = $1 RETURNING *`

**Lock Auto-unlock (Supabase Edge Function):**
```sql
-- Periodic function (cron job, every 1 minute)
CREATE OR REPLACE FUNCTION auto_unlock_stories() RETURNS void AS $$
BEGIN
  UPDATE stories
  SET locked_by = NULL
  WHERE locked_at < NOW() - INTERVAL '5 minutes'
  AND locked_by IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger on Postgres (via cron extension or external scheduler)
```

**Permission Model (Edit Access):**
| Role | Own Draft | Own Published | Team Stream All | Team Stream Own |
|------|-----------|---------------|-----------------|-----------------|
| Journalist (non-editor) | Yes | Yes | No | No |
| Journalist (editor) | Yes | Yes | Yes | Yes |
| Trainer | Yes | Yes | Yes | Yes |
| Guest Editor | N/A | N/A | Yes | N/A |

**Design References:**
- Edit flow: Part of DESIGN.md section "3 Write Page" (same Write drawer, but pre-filled)
- Lock warning: CHECKLIST.md mentions "Story is being edited by [Name]" message

**Acceptance Criteria:**
- [ ] Edit button in Published tab opens Write drawer with pre-filled data
- [ ] Edit button in Team Stream (editors only) opens Write drawer
- [ ] Story lock set when edit drawer opens
- [ ] If locked by other journalist: Lock warning banner shown, inputs disabled
- [ ] If locked by self (previous session): Lock auto-removed, editor loads normally
- [ ] Save Changes button updates story + releases lock
- [ ] Lock released after 5 minutes inactivity
- [ ] Non-editors: No edit button visible in Team Stream
- [ ] Editors: Edit button visible for all stories in Team Stream
- [ ] Unsaved changes confirmation on close/discard

---

## Phase 7: Trainer Dashboard, Admin Panel & Guest Editors

**Duration:** 4-5 days  
**Dependencies:** Phase 6  
**Deliverables:**
- [ ] Trainer login detection (separate Trainer ID password)
- [ ] Trainer dashboard (shows all teams, all stories, activity log)
- [ ] Teams tab in Settings (visible to trainer + guest editors only)
- [ ] Teams tab displays all teams as expandable dropdowns
- [ ] Each team shows: name, member count, story count, expand chevron
- [ ] Expand team: show all members with X button (remove any member)
- [ ] Preview icon (eye) next to team name: Opens Team Stream drawer for that team
- [ ] Trainer can view/edit all stories (no lock restriction)
- [ ] Trainer can pin/unpin any story
- [ ] Trainer can delete any story
- [ ] Activity log displayed (Journalist, Team, Action, Story, Timestamp)
- [ ] Admin tab (visible to trainer only, NOT guest editors)
- [ ] Admin tab: Set Trainer ID, set Course ID, set Guest Editor ID
- [ ] Admin tab: Display fallback thumbnail image upload
- [ ] Admin tab: Danger Zone — Clear Course (destructive)
- [ ] Clear Course flow: Confirmation dialog + type "DELETE" + final confirmation
- [ ] After Clear: Delete all data (newslabs, teams, stories, journalists, activity_log), redirect to splash
- [ ] Guest Editor login detection (separate Guest Editor ID password)
- [ ] Guest Editor role: Can access Teams tab (same as trainer) + view/edit/pin all stories
- [ ] Guest Editor role: NO Admin tab (cannot clear course or set IDs)
- [ ] Edit team settings from trainer Teams tab (change color, upload logo, team name, manage editors)
- [ ] Trainer/Guest Editor can toggle team member editor status

**Routes:**
- `GET /[course-id]/settings` — Update with Teams + Admin tabs (conditional display)
- Drawers: Team Stream preview, Story detail

**Components to Build:**
- Update `SettingsPage.svelte` to add Teams + Admin tabs
- `TeamsTab.svelte` — List of all teams with expand/collapse
- `TeamExpandedView.svelte` — Member list, preview icon, edit team settings
- `AdminTab.svelte` — ID inputs, fallback image, danger zone
- Update `ThreeDotsMenu.svelte` — Trainer/Guest Editor can edit any story
- `ActivityLog.svelte` — Table view of recent actions
- `ActivityLogRow.svelte` — Single log entry
- `FallbackImageUpload.svelte` — Fallback thumbnail for stories without images
- `ClearCourseModal.svelte` — Destructive deletion confirmation

**Supabase Queries:**
- Get all teams: `SELECT * FROM teams WHERE course_id = $1 ORDER BY created_at`
- Get team members: `SELECT * FROM journalists WHERE course_id = $1 AND team_name = $2 ORDER BY created_at`
- Remove member: `DELETE FROM journalists WHERE course_id = $1 AND name = $2`
- Update team settings: `UPDATE teams SET primary_color = $1, secondary_color = $2, logo_url = $3, team_name = $4 WHERE course_id = $5 AND team_name = $6`
- Get activity log: `SELECT * FROM activity_log WHERE course_id = $1 ORDER BY created_at DESC LIMIT 100`
- Clear course: `DELETE FROM newslabs WHERE course_id = $1 CASCADE` (triggers cascade deletes)
- Update IDs: `UPDATE newslabs SET trainer_id = $1, guest_editor_id = $2 WHERE course_id = $3`

**Permission Model (Trainer vs Guest Editor vs Journalist):**

| Action | Journalist | Editor | Trainer | Guest Editor |
|--------|-----------|--------|---------|--------------|
| View own drafts | Yes | Yes | N/A | N/A |
| View own published | Yes | Yes | N/A | N/A |
| Edit own published | Yes | Yes | N/A | N/A |
| View Team Stream | Yes | Yes | Yes* | Yes |
| Edit stories in Team Stream | No | Yes | Yes | Yes |
| Pin stories | No | Yes | Yes | Yes |
| View Teams tab | No | No | Yes | Yes |
| Edit team settings (color, logo, name) | No | No | Yes | No |
| Toggle editor status | No | No | Yes | No |
| Remove team members | No | No | Yes | No |
| View Activity Log | No | No | Yes | No |
| View Admin tab | No | No | Yes | No |
| Clear Course | No | No | Yes | No |

*Trainer can view all teams' streams via Teams tab preview icon

**Design References:**
- Teams tab: DESIGN.md section "6 Trainer Settings", trainer2.png, trainer3.png
- Team expanded view: trainer3.png
- Teams tab with edit options: User will provide updated visual
- Activity log: CHECKLIST.md mentions; table format with columns: Journalist, Team, Action, Story Title, Timestamp
- Admin tab: DESIGN.md section "6 Trainer Settings", trainer4.png, trainer5.png
- Danger Zone: Trainer4.png shows "Danger zone" with "Clear NewsLab" button

**Acceptance Criteria:**
- [ ] Trainer password detected at login; role set to 'trainer'
- [ ] Guest Editor password detected; role set to 'guest_editor'
- [ ] Trainer sees Teams + Admin tabs in Settings
- [ ] Guest Editor sees Teams tab only (no Admin tab)
- [ ] Teams tab lists all teams with member count, story count
- [ ] Expanding team shows all members with X button
- [ ] X next to member removes them from team
- [ ] Last member removed: Team auto-deleted
- [ ] Preview icon opens Team Stream for that team in drawer
- [ ] Trainer can edit team color, logo, name, editor status from Teams tab
- [ ] Trainer can view/edit all stories (no lock warning)
- [ ] Trainer can pin/unpin any story
- [ ] Trainer can delete any story
- [ ] Activity log shows all actions (publish, unpublish, edit, pin, unpin, delete, join, leave)
- [ ] Admin tab: ID inputs with validation checkmarks
- [ ] Admin tab: Fallback image upload + preview
- [ ] Clear Course flow: Confirmation dialog → "DELETE" input → Final confirmation
- [ ] After Clear Course: All data deleted, redirect to splash
- [ ] Guest Editor sees Teams tab, can edit all stories, cannot see Admin tab
- [ ] Guest Editor can pin/unpin, cannot clear course

---

## Phase 8: Export, Public Share & Polish

**Duration:** 4-5 days  
**Dependencies:** Phase 7  
**Deliverables:**
- [ ] PDF export (individual story): Title, image, body, author, date
- [ ] PDF export (team stream): All published stories, one per page, team name + member list
- [ ] PDF generation client-side (jsPDF + html2canvas)
- [ ] Export button in three-dot menus (Draft, Published, Team Stream, Activity Log)
- [ ] Export options dropdown (PDF / TXT formats)
- [ ] TXT export: Plain text version of story
- [ ] Public share feature: Toggle "Share Team" in Settings (editors only)
- [ ] Public share URL: `newslab.app/team-name` (read-only)
- [ ] Public URL route: `GET /share/[team-name]` (no auth required)
- [ ] Public view displays Team Stream preview only (no edit menus, no draft access)
- [ ] Public view shows team branding (logo, color, name, members list)
- [ ] Accessibility: WCAG 2.1 AA (color contrast 4.5:1, focus states, aria labels)
- [ ] Mobile testing: iOS Safari, Android Chrome (min width 390px)
- [ ] Performance: Lighthouse > 85 (mobile), FCP < 2s, LCP < 2.5s
- [ ] TypeScript strict types on all functions
- [ ] Error handling: User-friendly messages for all failures
- [ ] E2E tests (Playwright or Cypress): Full journalist flow, trainer admin, offline sync
- [ ] Documentation: README with setup + deployment instructions

**Routes:**
- `GET /share/[team-name]` — Public Team Stream (no auth)
- All existing routes remain protected

**Components to Build:**
- `ExportButton.svelte` — Dropdown with export format options
- `PDFExporter.svelte` — Client-side PDF generation (jsPDF + html2canvas)
- `PublicTeamStream.svelte` — Read-only Team Stream view (no edit menus)
- `AccessibilityAudit.svelte` — Component testing focus/contrast

**Supabase Queries:**
- Get team by share token: `SELECT * FROM teams WHERE public_share_token = $1`
- Get stories for public view: `SELECT * FROM stories WHERE course_id = $1 AND team_name = $2 AND status = 'published' AND share_enabled = true`

**Public Share URL Generation:**
```javascript
// When team is created:
const public_share_token = crypto.randomUUID()
await supabase.from('teams').update({ public_share_token }).where('...')

// Public URL: newslab.app/share/team-name
// Route handler fetches team by team_name + course_id
// Validates share_enabled = true before rendering
```

**PDF Export Logic:**
```javascript
// Individual story PDF
const element = document.getElementById('story-content')
const canvas = await html2canvas(element)
const pdf = new jsPDF()
pdf.addImage(canvas.toDataURL(), 'PNG', 0, 0, 210, 297)
pdf.save('story-title.pdf')

// Team stream PDF
// Loop through all stories, add each as new page with page break
```

**Accessibility Checklist:**
- [ ] Color contrast >= 4.5:1 for all text
- [ ] Focus states visible on all interactive elements
- [ ] Aria labels on buttons, icons
- [ ] Keyboard navigation (Tab, Enter, Escape work)
- [ ] No color-only indicators (combine with icons/text)
- [ ] Images have alt text (Cloudinary images use title as fallback)

**Performance Targets:**
- [ ] Lighthouse score >= 85 (mobile)
- [ ] First Contentful Paint < 2s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Interaction to Next Paint < 200ms
- [ ] Cumulative Layout Shift < 0.1

**Testing Checklist:**
- [ ] Create story → Publish → Appears in Team Stream within 1s
- [ ] Concurrent edit: User A editing → User B sees "being edited" message
- [ ] Offline: Edit draft → Go online → Auto-syncs to Supabase
- [ ] Team join/leave: Real-time updates
- [ ] Trainer clear: All data deleted
- [ ] PDF export: Renders all content types (images, text, links, embeds)
- [ ] Mobile responsive: 390px (iPhone SE) + 768px (iPad)
- [ ] Public share: Non-authenticated user can access team stream, no edit access

**Design References:**
- Export dropdown: User9.png (three-dot menu shows Export option)
- Public Team Stream: Same as team1.png (read-only version)
- Public view header: Show team branding (logo, color, name, members)

**Deployment:**
- [ ] GitHub Actions CI/CD configured (tests on PR)
- [ ] Cloudflare Pages: Auto-deploy on push to main
- [ ] Environment secrets configured in Cloudflare Pages
- [ ] Supabase production database tested
- [ ] Cloudinary production account verified

**Acceptance Criteria:**
- [ ] Export button visible in three-dot menus
- [ ] PDF export downloads cleanly with correct filename
- [ ] TXT export shows plain text (no HTML)
- [ ] Public URL accessible without login
- [ ] Public Team Stream displays stories + team branding
- [ ] Public view has no edit buttons/menus
- [ ] All text meets WCAG AA contrast requirements
- [ ] Focus indicators visible on all buttons (Tab key)
- [ ] Aria labels on all interactive elements
- [ ] Mobile layout works at 390px width
- [ ] Lighthouse score >= 85
- [ ] E2E test suite passes (full flows)
- [ ] README contains setup + deployment steps

---

## Summary: Phase Dependencies

```
Phase 0 (Setup)
  ↓
Phase 1 (Gatekeeper)
  ↓
Phase 2 (Navigation)
  ↓
Phase 3 (Settings + Team Mgmt)
  ↓
Phase 4 (Write Editor)
  ↓
Phase 5 (Publishing + Team Stream)
  ↓
Phase 6 (Story Editing + Locking)
  ↓
Phase 7 (Trainer + Guest Editors)
  ↓
Phase 8 (Export + Public Share + Polish)
```

---

## Progress Tracking Template

Use this template at the start of each phase:

```markdown
## Phase X: [Name]

**Status:** In Progress / Complete
**Started:** [Date]
**Completed:** [Date]

### Deliverables
- [x] Task 1
- [ ] Task 2
- [ ] Task 3

### Known Issues
- Issue 1
- Issue 2

### Next Phase Blockers
None / Issue blocking Phase Y
```

---

**End of Roadmap. Ready for Phase 0 execution.**
