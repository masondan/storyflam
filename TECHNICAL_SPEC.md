# NewsLab v1.0 - Technical Specification

**Purpose:** Complete technical reference for AI agents implementing NewsLab.  
**Audience:** Code leads, developers  
**Status:** Ready for implementation  
**Last Updated:** December 2025

---

## Table of Contents

1. [Database Schema](#database-schema)
2. [Permission Matrix](#permission-matrix)
3. [Authentication & Session Model](#authentication--session-model)
4. [Core Algorithms](#core-algorithms)
5. [API & Realtime Subscriptions](#api--realtime-subscriptions)
6. [Rich Text Editor Data Structure](#rich-text-editor-data-structure)
7. [State Management](#state-management)
8. [Error Handling](#error-handling)
9. [Performance Constraints](#performance-constraints)
10. [Component Architecture](#component-architecture)

---

## Database Schema

### newslabs
```sql
CREATE TABLE newslabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT UNIQUE NOT NULL,                    -- e.g., "nigeria-0126"
  trainer_id TEXT UNIQUE NOT NULL,                   -- Trainer password
  guest_editor_id TEXT UNIQUE,                       -- Optional guest editor password
  fallback_image_url TEXT,                           -- Default thumbnail for stories without images
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_newslabs_course_id ON newslabs(course_id);
CREATE UNIQUE INDEX idx_newslabs_trainer_id ON newslabs(trainer_id);
CREATE UNIQUE INDEX idx_newslabs_guest_editor_id ON newslabs(guest_editor_id) WHERE guest_editor_id IS NOT NULL;
```

**Constraints:**
- `course_id`: Alphanumeric, 3-20 characters, unique globally
- `trainer_id`: Alphanumeric, 8-20 characters, unique globally
- `guest_editor_id`: Optional, unique if present

---

### journalists
```sql
CREATE TABLE journalists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  name TEXT NOT NULL,                                -- Personal name, max 30 characters
  team_name TEXT,                                   -- NULL if not in a team yet
  is_editor BOOLEAN DEFAULT FALSE,                  -- Can edit team settings + all stories in team stream
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(course_id, name),
  FOREIGN KEY(course_id) REFERENCES newslabs(course_id) ON DELETE CASCADE
);

-- Indexes
CREATE UNIQUE INDEX idx_journalists_course_name ON journalists(course_id, name);
CREATE INDEX idx_journalists_course_team ON journalists(course_id, team_name);
CREATE INDEX idx_journalists_course ON journalists(course_id);
```

**Constraints:**
- `name`: Max 30 characters, unique per course
- `team_name`: Can be NULL (journalist not yet in a team)
- `is_editor`: Boolean flag; only editors can modify team settings + team stream stories

---

### teams
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  team_name TEXT NOT NULL,                          -- Unique per course
  primary_color TEXT DEFAULT '5422b0',              -- Hex color (dark theme)
  secondary_color TEXT DEFAULT 'f0e6f7',            -- Hex color (light contrast)
  logo_url TEXT,                                    -- Cloudinary URL, square image
  public_share_token TEXT UNIQUE,                   -- UUID for public read-only URL
  share_enabled BOOLEAN DEFAULT FALSE,              -- Toggle public sharing on/off
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(course_id, team_name),
  FOREIGN KEY(course_id) REFERENCES newslabs(course_id) ON DELETE CASCADE
);

-- Indexes
CREATE UNIQUE INDEX idx_teams_course_name ON teams(course_id, team_name);
CREATE INDEX idx_teams_course ON teams(course_id);
CREATE UNIQUE INDEX idx_teams_share_token ON teams(public_share_token) WHERE public_share_token IS NOT NULL;
```

**Constraints:**
- `team_name`: Max 50 characters, unique per course
- `primary_color` / `secondary_color`: Hex format (#RRGGBB)
- `public_share_token`: UUID, generated on team creation, can be regenerated
- `share_enabled`: Only editors can toggle; affects `/share/[team-name]` route access

**Color Palette (6 options):**
```javascript
const COLOR_PALETTES = [
  { name: 'Indigo Bloom', primary: '5422b0', secondary: 'f0e6f7' },      // Default
  { name: 'Stormy Teal', primary: '057373', secondary: 'd6ebdd' },
  { name: 'Baltic Blue', primary: '00639c', secondary: 'dbeffa' },
  { name: 'Royal Orchid', primary: '9100ae', secondary: 'f0cbf6' },
  { name: 'Oxidized Iron', primary: 'b12e09', secondary: 'f6d4cb' },
  { name: 'Brick Ember', primary: 'd60202', secondary: 'ffd6d6' }
];
```

---

### stories
```sql
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  team_name TEXT NOT NULL,                          -- Team where story appears
  author_name TEXT NOT NULL,                        -- Creator's name
  title TEXT NOT NULL,                              -- Headline (required)
  summary TEXT,                                     -- Optional summary
  featured_image_url TEXT,                          -- Cloudinary URL
  content JSONB,                                    -- Rich text blocks (see below)
  status TEXT DEFAULT 'draft',                      -- 'draft' or 'published'
  is_pinned BOOLEAN DEFAULT FALSE,                  -- Pinned in team stream
  pin_index INTEGER,                                -- Order for pinned stories (0=newest, 2=oldest)
  pin_timestamp TIMESTAMP,                          -- When pinned (for auto-rotation)
  locked_by TEXT,                                   -- Current editor's name (NULL if unlocked)
  locked_at TIMESTAMP,                              -- When lock acquired
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY(course_id) REFERENCES newslabs(course_id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_stories_course_status ON stories(course_id, status);
CREATE INDEX idx_stories_course_team_status ON stories(course_id, team_name, status);
CREATE INDEX idx_stories_author ON stories(course_id, author_name);
CREATE INDEX idx_stories_pinned ON stories(course_id, team_name, is_pinned) WHERE is_pinned = true;
```

**Constraints:**
- `title`: Required, non-empty
- `status`: 'draft' or 'published'
- `content`: JSONB with blocks structure (see Rich Text section)
- `locked_by`: NULL if unlocked; prevents concurrent edits
- `is_pinned`: Only team editors can set/unset
- Max 3 pinned stories per team (enforced at application level)

---

### activity_log
```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  team_name TEXT,
  journalist_name TEXT,
  action TEXT,                                      -- 'published', 'unpublished', 'edited', 'pinned', 'unpinned', 'deleted', 'joined_team', 'left_team', 'promoted_editor', 'demoted_editor'
  story_id UUID,
  story_title TEXT,
  details JSONB,                                    -- Additional context as needed
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY(course_id) REFERENCES newslabs(course_id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_activity_course ON activity_log(course_id);
CREATE INDEX idx_activity_course_team ON activity_log(course_id, team_name);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);
```

**Sample activity_log entries:**
```javascript
// Story published
{
  action: 'published',
  journalist_name: 'Zainab',
  team_name: 'Team Lagos',
  story_id: '...',
  story_title: 'Nigeria Elections Analysis'
}

// Editor promoted
{
  action: 'promoted_editor',
  journalist_name: 'Ahmed',
  team_name: 'Team Lagos',
  details: { promoted_by: 'Zainab' }
}
```

---

## Permission Matrix

**Legend:** ✅ Allowed, ❌ Denied, ⚠️ Conditional

| Action | Journalist (Non-Editor) | Journalist (Editor) | Trainer | Guest Editor |
|--------|-----------|--------|---------|--------------|
| **View/Edit Own Drafts** | ✅ | ✅ | N/A | N/A |
| **View/Edit Own Published** | ✅ | ✅ | N/A | N/A |
| **Edit Own Published from Home Tab** | ✅ | ✅ | N/A | N/A |
| **View Team Stream** | ✅ | ✅ | ✅ | ✅ |
| **Edit Stories in Team Stream** | ❌ | ✅ (all) | ✅ (all) | ✅ (all) |
| **Pin Stories** | ❌ | ✅ | ✅ | ✅ |
| **Unpin Stories** | ❌ | ✅ | ✅ | ✅ |
| **Delete Stories from Team Stream** | ❌ | ✅ (all) | ✅ (all) | ✅ (all) |
| **Unpublish Own Story** | ✅ | ✅ | N/A | N/A |
| **Edit Team Settings (Color, Logo, Name)** | ❌ | ✅ (own team) | ✅ (all) | ❌ |
| **Promote/Demote Editors** | ❌ | ❌ | ✅ | ❌ |
| **Access Teams Tab in Settings** | ❌ | ❌ | ✅ | ✅ |
| **Access Admin Tab in Settings** | ❌ | ❌ | ✅ | ❌ |
| **View Activity Log** | ❌ | ❌ | ✅ | ❌ |
| **Clear Course** | ❌ | ❌ | ✅ | ❌ |
| **View Public Team Stream** | ✅ | ✅ | ✅ | ✅ |

**Notes:**
- "Journalist (Editor)" = journalist with `is_editor = true` in their team
- "Journalist (Non-Editor)" = journalist with `is_editor = false`
- Editors can only edit settings for their own team, not other teams
- Trainer can edit all team settings across all teams
- Guest Editor is role-based on password match; not tied to a specific team

---

## Authentication & Session Model

### Session Storage (localStorage)

```javascript
// localStorage key: 'newslab_session'
{
  courseId: "nigeria-0126",           // From splash screen
  name: "Zainab",                     // Unique per course
  role: "journalist|trainer|guest_editor",
  teamName: "Team Lagos",             // Populated after settings
  sessionToken: "uuid",               // Client-side session ID
  loginTimestamp: 1703001600000       // UTC milliseconds
}
```

### Login Flow

**Journalist:**
1. User enters `courseId` on splash
2. Query: Verify `courseId` exists in `newslabs`
3. User enters personal name
4. Query: Verify name unique in `journalists` table for this course
5. Create journalist record: `INSERT INTO journalists (course_id, name, is_editor=false, team_name=NULL)`
6. Store session in localStorage
7. Redirect to `/[courseId]/home`

**Trainer:**
1. User enters `courseId` + `trainerPassword` on splash
2. Query: Verify `newslabs.trainer_id = trainerPassword`
3. Detect role = 'trainer'
4. Store session in localStorage
5. Redirect to `/[courseId]/home` (same UI, but with Teams + Admin tabs visible)

**Guest Editor:**
1. User enters `courseId` + `guestEditorPassword` on splash
2. Query: Verify `newslabs.guest_editor_id = guestEditorPassword`
3. Detect role = 'guest_editor'
4. Store session in localStorage
5. Redirect to `/[courseId]/home` (Teams tab visible, Admin tab hidden)

### Session Validation

Every protected route checks:
```javascript
const session = JSON.parse(localStorage.getItem('newslab_session'))
if (!session || !session.courseId || !session.name) {
  redirect to '/'
}

// Optional: Verify session still valid in Supabase
const { data } = await supabase
  .from('journalists')
  .select('*')
  .eq('course_id', session.courseId)
  .eq('name', session.name)
  .single()

if (!data && session.role === 'journalist') {
  // Journalist deleted or course cleared
  redirect to '/'
}
```

---

## Core Algorithms

### Pin Management (Max 3 Pins per Team)

**When editor pins a story:**

```javascript
async function pinStory(courseId, teamName, storyId) {
  // 1. Get current pinned stories
  const { data: currentPins } = await supabase
    .from('stories')
    .select('id, pin_timestamp, pin_index')
    .eq('course_id', courseId)
    .eq('team_name', teamName)
    .eq('is_pinned', true)
    .order('pin_timestamp', { ascending: false })

  // 2. If 3 already pinned, unpin oldest
  if (currentPins.length >= 3) {
    const oldestPin = currentPins[2]  // Index 2 is oldest
    await supabase
      .from('stories')
      .update({ is_pinned: false, pin_index: null, pin_timestamp: null })
      .eq('id', oldestPin.id)
    
    // Log unpinning action
    await logActivity(courseId, teamName, 'unpinned', oldestPin.id, null)
  }

  // 3. Pin new story
  const now = new Date()
  await supabase
    .from('stories')
    .update({ is_pinned: true, pin_timestamp: now, pin_index: 0 })
    .eq('id', storyId)

  // 4. Re-index all pins (0 = newest, 2 = oldest)
  const { data: allPins } = await supabase
    .from('stories')
    .select('id')
    .eq('course_id', courseId)
    .eq('team_name', teamName)
    .eq('is_pinned', true)
    .order('pin_timestamp', { ascending: false })

  for (let i = 0; i < allPins.length; i++) {
    await supabase
      .from('stories')
      .update({ pin_index: i })
      .eq('id', allPins[i].id)
  }

  // Log pinning action
  await logActivity(courseId, teamName, 'pinned', storyId, story.title)
}
```

**When editor unpins a story:**

```javascript
async function unpinStory(courseId, teamName, storyId) {
  // 1. Unpin the story
  await supabase
    .from('stories')
    .update({ is_pinned: false, pin_index: null, pin_timestamp: null })
    .eq('id', storyId)

  // 2. Re-index remaining pins
  const { data: allPins } = await supabase
    .from('stories')
    .select('id')
    .eq('course_id', courseId)
    .eq('team_name', teamName)
    .eq('is_pinned', true)
    .order('pin_timestamp', { ascending: false })

  for (let i = 0; i < allPins.length; i++) {
    await supabase
      .from('stories')
      .update({ pin_index: i })
      .eq('id', allPins[i].id)
  }

  // Log unpinning action
  await logActivity(courseId, teamName, 'unpinned', storyId, story.title)
}
```

**Team Stream Sort Order:**

```javascript
// Fetch stories for team stream
const { data: stories } = await supabase
  .from('stories')
  .select('*')
  .eq('course_id', courseId)
  .eq('team_name', teamName)
  .eq('status', 'published')
  .order('is_pinned', { ascending: false })      // Pinned first
  .order('pin_timestamp', { ascending: false })  // Newest pin first
  .order('created_at', { ascending: false })     // Then by creation date

// Result: Pinned stories (0, 1, 2) at top, then unpinned by date
```

---

### Story Locking (Prevent Concurrent Edits)

**When journalist/editor opens story for edit:**

```javascript
async function acquireLock(courseId, storyId, journalistName) {
  // 1. Check if already locked by another user
  const { data: story } = await supabase
    .from('stories')
    .select('locked_by, locked_at')
    .eq('id', storyId)
    .single()

  if (story.locked_by && story.locked_by !== journalistName) {
    // Check if lock is stale (> 5 minutes old)
    const lockAge = Date.now() - new Date(story.locked_at).getTime()
    if (lockAge < 5 * 60 * 1000) {
      throw new Error(`Story is being edited by ${story.locked_by}`)
    }
    // Else: Lock is stale, proceed to acquire new lock
  }

  // 2. Acquire lock
  const now = new Date()
  await supabase
    .from('stories')
    .update({ locked_by: journalistName, locked_at: now })
    .eq('id', storyId)

  return { locked: true, lockedBy: journalistName }
}
```

**When journalist/editor saves story:**

```javascript
async function releaseLock(storyId) {
  await supabase
    .from('stories')
    .update({ locked_by: null, locked_at: null })
    .eq('id', storyId)
}
```

**Auto-unlock after 5 minutes (Supabase Function):**

```sql
-- PostgreSQL function (run via cron or trigger)
CREATE OR REPLACE FUNCTION auto_unlock_stories()
RETURNS void AS $$
BEGIN
  UPDATE stories
  SET locked_by = NULL, locked_at = NULL
  WHERE locked_at < NOW() - INTERVAL '5 minutes'
  AND locked_by IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger via pg_cron extension
SELECT cron.schedule('auto_unlock_stories', '*/1 * * * *', 'SELECT auto_unlock_stories()');
```

---

### Auto-save (3-Second Debounce)

```javascript
// Write drawer state
let autoSaveTimer = null
const AUTOSAVE_DELAY = 3000  // 3 seconds

function scheduleAutosave(storyData) {
  // Clear existing timer
  if (autoSaveTimer) clearTimeout(autoSaveTimer)

  // Set new timer
  autoSaveTimer = setTimeout(async () => {
    try {
      // 1. Save to localStorage (instant)
      const draftKey = `draft_${courseId}_${teamName}`
      localStorage.setItem(draftKey, JSON.stringify(storyData))

      // 2. Save to Supabase (async, non-blocking)
      const { error } = await supabase
        .from('stories')
        .upsert({
          id: storyData.id,
          course_id: courseId,
          team_name: teamName,
          author_name: currentName,
          title: storyData.title,
          summary: storyData.summary,
          featured_image_url: storyData.featuredImageUrl,
          content: storyData.content,
          status: 'draft'
        })

      if (!error) {
        // 3. Show "Saved" indicator
        showAutoSaveIndicator()
      }
    } catch (err) {
      console.error('Auto-save failed:', err)
      // Silent fail; user can manually save
    }
  }, AUTOSAVE_DELAY)
}

// On every keystroke/change
editorElement.addEventListener('input', () => {
  scheduleAutosave(getCurrentStoryData())
})
```

---

### Team Editor Auto-promotion

**First journalist to create team becomes editor:**

```javascript
async function createOrJoinTeam(courseId, teamName, journalistName) {
  // 1. Check if team exists
  const { data: existingTeam } = await supabase
    .from('teams')
    .select('*')
    .eq('course_id', courseId)
    .eq('team_name', teamName)
    .single()

  let isFirstMember = false

  if (!existingTeam) {
    // 2. Create team if new
    await supabase.from('teams').insert({
      course_id: courseId,
      team_name: teamName,
      primary_color: '5422b0',
      secondary_color: 'f0e6f7',
      public_share_token: crypto.randomUUID()
    })
    isFirstMember = true
  } else {
    // Check member count
    const { data: members, count } = await supabase
      .from('journalists')
      .select('id', { count: 'exact' })
      .eq('course_id', courseId)
      .eq('team_name', teamName)
    
    isFirstMember = count === 0
  }

  // 3. Add journalist to team
  await supabase
    .from('journalists')
    .update({
      team_name: teamName,
      is_editor: isFirstMember  // First member auto-becomes editor
    })
    .eq('course_id', courseId)
    .eq('name', journalistName)

  // 4. Log team join
  await logActivity(courseId, teamName, 'joined_team', null, {
    journalist: journalistName,
    isFirstMember: isFirstMember
  })
}
```

---

### Publish Story

```javascript
async function publishStory(courseId, storyId, storyData, pin = false) {
  const now = new Date()

  // 1. Update story to published
  const { data: story, error } = await supabase
    .from('stories')
    .update({
      status: 'published',
      updated_at: now,
      is_pinned: pin,
      pin_timestamp: pin ? now : null,
      pin_index: pin ? 0 : null  // If pinning on publish, set to newest
    })
    .eq('id', storyId)
    .select()
    .single()

  if (error) throw error

  // 2. If pinning, enforce max 3 pins (see pinStory function above)
  if (pin) {
    await pinStory(courseId, story.team_name, storyId)
  }

  // 3. Log publish action
  await logActivity(courseId, story.team_name, 'published', storyId, story.title, {
    author: story.author_name
  })

  // 4. Clear localStorage draft
  const draftKey = `draft_${courseId}_${story.team_name}`
  localStorage.removeItem(draftKey)

  return story
}
```

---

### Unpublish Story

```javascript
async function unpublishStory(courseId, storyId, storyData) {
  // 1. Move story back to draft
  const { data: story, error } = await supabase
    .from('stories')
    .update({
      status: 'draft',
      is_pinned: false,
      pin_index: null,
      pin_timestamp: null
    })
    .eq('id', storyId)
    .select()
    .single()

  if (error) throw error

  // 2. If story was pinned, re-index other pins
  if (storyData.is_pinned) {
    const { data: allPins } = await supabase
      .from('stories')
      .select('id')
      .eq('course_id', courseId)
      .eq('team_name', story.team_name)
      .eq('is_pinned', true)
      .order('pin_timestamp', { ascending: false })

    for (let i = 0; i < allPins.length; i++) {
      await supabase
        .from('stories')
        .update({ pin_index: i })
        .eq('id', allPins[i].id)
    }
  }

  // 3. Log unpublish action
  await logActivity(courseId, story.team_name, 'unpublished', storyId, story.title)

  return story
}
```

---

### Delete Story

```javascript
async function deleteStory(courseId, storyId, storyData) {
  // 1. Delete story
  const { error } = await supabase
    .from('stories')
    .delete()
    .eq('id', storyId)

  if (error) throw error

  // 2. If story was pinned, re-index remaining pins
  if (storyData.is_pinned) {
    const { data: allPins } = await supabase
      .from('stories')
      .select('id')
      .eq('course_id', courseId)
      .eq('team_name', storyData.team_name)
      .eq('is_pinned', true)
      .order('pin_timestamp', { ascending: false })

    for (let i = 0; i < allPins.length; i++) {
      await supabase
        .from('stories')
        .update({ pin_index: i })
        .eq('id', allPins[i].id)
    }
  }

  // 3. Log delete action
  await logActivity(courseId, storyData.team_name, 'deleted', storyId, storyData.title)
}
```

---

## API & Realtime Subscriptions

### Realtime Subscriptions

**Subscribe to team stream updates (journalist view):**

```javascript
const session = JSON.parse(localStorage.getItem('newslab_session'))

const subscription = supabase
  .from(`stories`)
  .on('*', (payload) => {
    // Filter for this team & published stories only
    if (
      payload.new.course_id === session.courseId &&
      payload.new.team_name === session.teamName &&
      payload.new.status === 'published'
    ) {
      handleStoryUpdate(payload)
    }
  })
  .subscribe()
```

**Subscribe to team members (settings page):**

```javascript
const subscription = supabase
  .from(`journalists`)
  .on('*', (payload) => {
    if (
      payload.new.course_id === session.courseId &&
      payload.new.team_name === session.teamName
    ) {
      // Update team members list
      updateTeamMembers()
    }
  })
  .subscribe()
```

**Subscribe to activity log (trainer only):**

```javascript
const subscription = supabase
  .from(`activity_log`)
  .on('INSERT', (payload) => {
    if (payload.new.course_id === session.courseId) {
      addActivityLogEntry(payload.new)
    }
  })
  .subscribe()
```

### Key Queries

**Validate Course ID:**
```sql
SELECT id FROM newslabs WHERE course_id = $1
```

**Validate journalist name (availability):**
```sql
SELECT id FROM journalists WHERE course_id = $1 AND name = $2
```

**Get team members:**
```sql
SELECT name, is_editor FROM journalists
WHERE course_id = $1 AND team_name = $2
ORDER BY created_at ASC
```

**Get drafts for journalist:**
```sql
SELECT id, title, summary, featured_image_url, created_at, updated_at
FROM stories
WHERE course_id = $1 AND author_name = $2 AND status = 'draft'
ORDER BY updated_at DESC
```

**Get published stories for journalist:**
```sql
SELECT id, title, summary, featured_image_url, created_at, is_pinned
FROM stories
WHERE course_id = $1 AND author_name = $2 AND status = 'published'
ORDER BY created_at DESC
```

**Get team stream:**
```sql
SELECT id, title, summary, featured_image_url, author_name, created_at, is_pinned, pin_index
FROM stories
WHERE course_id = $1 AND team_name = $2 AND status = 'published'
ORDER BY is_pinned DESC, pin_timestamp DESC, created_at DESC
```

**Get story by ID:**
```sql
SELECT * FROM stories WHERE id = $1 AND course_id = $2
```

**Get team by name:**
```sql
SELECT * FROM teams WHERE course_id = $1 AND team_name = $2
```

**Get public team stream (by team name, no auth):**
```sql
SELECT id, title, summary, featured_image_url, author_name, created_at, is_pinned
FROM stories
WHERE course_id = (SELECT course_id FROM teams WHERE team_name = $1)
AND team_name = $1
AND status = 'published'
AND (SELECT share_enabled FROM teams WHERE course_id = $2 AND team_name = $1)
ORDER BY is_pinned DESC, pin_timestamp DESC, created_at DESC
```

**Get activity log:**
```sql
SELECT journalist_name, team_name, action, story_title, created_at
FROM activity_log
WHERE course_id = $1
ORDER BY created_at DESC
LIMIT 100
```

---

## Rich Text Editor Data Structure

### Content Format (JSONB)

```javascript
// Example story content
{
  blocks: [
    {
      type: 'paragraph',
      text: 'This is a paragraph with some text.'
    },
    {
      type: 'heading',
      text: 'This is an H2 subheading'
    },
    {
      type: 'bold',
      text: 'Bold text portion'
    },
    {
      type: 'list',
      listType: 'unordered',  // 'ordered' or 'unordered'
      items: [
        'First item',
        'Second item',
        'Third item'
      ]
    },
    {
      type: 'separator'
    },
    {
      type: 'image',
      url: 'https://cloudinary.com/image.jpg',
      caption: 'Image caption text',
      width: 800,
      height: 450,
      aspectRatio: '16:9'
    },
    {
      type: 'youtube',
      url: 'https://youtube.com/watch?v=xxx',
      thumbnailUrl: 'https://cloudinary.com/thumb.jpg',  // Optional custom
      title: 'Video title'
    },
    {
      type: 'vimeo',
      url: 'https://vimeo.com/xxx',
      title: 'Video title'
    },
    {
      type: 'link',
      url: 'https://example.com',
      text: 'Link text',
      color: '5422b0'  // Hex color (team primary or default)
    }
  ]
}
```

### Rendering

```javascript
// When rendering published story, convert blocks to HTML
function renderStory(content, teamPrimaryColor) {
  return content.blocks.map(block => {
    switch (block.type) {
      case 'paragraph':
        return `<p>${escapeHtml(block.text)}</p>`
      case 'heading':
        return `<h2>${escapeHtml(block.text)}</h2>`
      case 'bold':
        return `<strong>${escapeHtml(block.text)}</strong>`
      case 'list':
        const tag = block.listType === 'ordered' ? 'ol' : 'ul'
        return `<${tag}>${block.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</${tag}>`
      case 'separator':
        return `<hr style="width: 50%; margin: 20px auto;" />`
      case 'image':
        return `<figure><img src="${block.url}" alt="Story image" style="width: 100%; height: auto; aspect-ratio: ${block.aspectRatio};" /><figcaption>${block.caption || ''}</figcaption></figure>`
      case 'youtube':
        return `<iframe width="100%" height="400" src="https://youtube.com/embed/${extractVideoId(block.url)}" frameborder="0" allowfullscreen></iframe>`
      case 'vimeo':
        return `<iframe src="${block.url}" width="100%" height="400" frameborder="0" allowfullscreen></iframe>`
      case 'link':
        return `<a href="${block.url}" style="color: #${block.color};">${escapeHtml(block.text)}</a>`
      default:
        return ''
    }
  }).join('')
}
```

---

## State Management

### Svelte Stores

```javascript
// lib/stores.ts
import { writable, derived } from 'svelte/store'

// Session
export const session = writable({
  courseId: null,
  name: null,
  role: null,
  teamName: null
})

// UI State
export const activeDrawer = writable('none')  // 'write' | 'preview' | 'story_reader' | 'none'
export const activeTab = writable('home')      // 'home' | 'stream' | 'settings'
export const selectedStory = writable(null)

// Draft state
export const currentStory = writable({
  id: null,
  title: '',
  summary: '',
  featuredImageUrl: null,
  content: { blocks: [] }
})

// UI feedback
export const autoSaveStatus = writable('saved')  // 'saving' | 'saved' | 'error'
export const notification = writable({ type: null, message: '' })

// Derived stores
export const isLoggedIn = derived(session, $session => !!$session.courseId)
export const isTrainer = derived(session, $session => $session.role === 'trainer')
export const isGuestEditor = derived(session, $session => $session.role === 'guest_editor')
export const isTeamEditor = derived(session, $session => $session.role === 'journalist' && someEditorFlag)
```

### localStorage Keys

```javascript
// Session
'newslab_session'  // { courseId, name, role, teamName }

// Drafts (auto-save)
'draft_${courseId}_${teamName}'  // JSON stringified story

// UI preferences (optional)
'newslab_ui_preferences'  // { sidebarCollapsed, theme, etc }
```

---

## Error Handling

### Error Types & User Messages

```javascript
// Network errors
if (error.code === 'NETWORK_ERROR') {
  showNotification({
    type: 'error',
    message: 'Network error. Please check your connection.'
  })
}

// Validation errors
if (error.code === 'VALIDATION_ERROR') {
  showNotification({
    type: 'error',
    message: 'Please fill in all required fields.'
  })
}

// Authentication errors
if (error.code === 'UNAUTHORIZED') {
  showNotification({
    type: 'error',
    message: 'Your session has expired. Please log in again.'
  })
  redirectTo('/')
}

// Conflict errors (lock, concurrency)
if (error.code === 'STORY_LOCKED') {
  showNotification({
    type: 'warning',
    message: `Story is being edited by ${error.lockedBy}`
  })
}

// Cloudinary upload errors
if (error.type === 'UPLOAD_ERROR') {
  showNotification({
    type: 'error',
    message: 'Failed to upload image. Please try again.'
  })
}
```

### Try-Catch Patterns

```javascript
try {
  const result = await someAsyncOperation()
} catch (error) {
  console.error('Operation failed:', error)
  if (error.message.includes('FOREIGN KEY')) {
    // Database constraint violation
    showNotification({ type: 'error', message: 'Invalid team. Please select a valid team.' })
  } else if (error.message.includes('UNIQUE')) {
    // Unique constraint violation
    showNotification({ type: 'error', message: 'That name is already taken.' })
  } else {
    // Generic error
    showNotification({ type: 'error', message: 'Something went wrong. Please try again.' })
  }
}
```

---

## Performance Constraints

### Lighthouse Targets
- **Score:** >= 85 (mobile)
- **First Contentful Paint:** < 2s
- **Largest Contentful Paint:** < 2.5s
- **Interaction to Next Paint:** < 200ms
- **Cumulative Layout Shift:** < 0.1

### Image Optimization
- **Featured images:** Max 800px width, lossy compression (q_80)
- **Team logos:** Square (1:1), max 200KB
- **Thumbnails:** 300px max, lossy compression
- **Cloudinary transformations:** Use `w_800,q_80,f_auto` for web

### Bundle Size Targets
- **Initial bundle:** < 200KB gzipped
- **Dependencies:** Minimal; prefer native APIs
- **Code splitting:** Lazy-load drawers and heavy components

### Database Query Limits
- **Story list pagination:** Fetch 10 stories per page
- **Activity log:** Fetch 100 entries at a time
- **No N+1 queries:** Use JOINs and single queries where possible

---

## Component Architecture

### Core Components

**Layout:**
- `MainLayout.svelte` — Wrapper with footer nav, drawer system
- `FooterNav.svelte` — 4-button footer (home, write, stream, settings)

**Pages:**
- `HomePage.svelte` — Drafts/Published tabs
- `DraftsTab.svelte` — List of personal drafts
- `PublishedTab.svelte` — List of personal published stories
- `TeamStreamPage.svelte` — Team published stories + pinned
- `SettingsPage.svelte` — Personal + team settings, Teams/Admin tabs

**Drawers/Modals:**
- `WriteDrawer.svelte` — Full-screen editor (bottom-to-top slide)
- `PreviewDrawer.svelte` — Full-screen preview (left-to-right slide)
- `StoryDetailDrawer.svelte` — Full-screen story view (bottom-to-top slide)
- `ExportModal.svelte` — PDF/TXT export options
- `ConfirmDialog.svelte` — Generic confirmation (delete, clear, unpublish)

**Form Components:**
- `HeadlineInput.svelte` — Title input
- `SummaryInput.svelte` — Summary textarea
- `ImageUploader.svelte` — Featured image upload
- `RichTextEditor.svelte` — Main text editor
- `ToolbarBottom.svelte` — Formatting + embed buttons
- `TeamNameInput.svelte` — Team name input with validation
- `ColorPalette.svelte` — 6-color selector

**Cards & Lists:**
- `StoryCard.svelte` — Thumbnail + metadata (Drafts/Published/Team Stream)
- `ThreeDotsMenu.svelte` — Context menu for stories
- `TeamMemberItem.svelte` — Member name + remove/editor buttons
- `ActivityLogRow.svelte` — Single activity log entry

### Component Communication

**Props:** Use typed props for data passing
```javascript
// StoryCard.svelte
export let story: Story
export let isEditor: boolean
export let onEdit: (storyId: string) => void
export let onDelete: (storyId: string) => void
```

**Events:** Emit custom events for actions
```javascript
// ThreeDotsMenu.svelte
const dispatch = createEventDispatcher()
const handleEdit = () => dispatch('edit', { storyId })
const handleDelete = () => dispatch('delete', { storyId })
```

**Stores:** Shared state via Svelte stores
```javascript
// Write drawer updates global story state
currentStory.set(storyData)

// Other components subscribe
const story = currentStory.subscribe(data => ...)
```

---

## Cloudinary Integration

### Unsigned Upload Configuration

```javascript
// Environment variable
VITE_CLOUDINARY_UPLOAD_PRESET=newslab_unsigned

// Upload widget
async function uploadImage(file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET)
  formData.append('folder', 'newslab/images')
  formData.append('resource_type', 'image')
  formData.append('transformation', [
    { width: 800, crop: 'limit', quality: 'auto' }  // Max width 800px
  ])

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )

  const data = await response.json()
  return {
    url: data.secure_url,
    width: data.width,
    height: data.height,
    publicId: data.public_id
  }
}
```

---

**End of Technical Specification.**
