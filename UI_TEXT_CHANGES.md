# StoryFlam UI Text Changes Checklist

**Purpose:** Replace all user-facing "team" terminology with "publication"

---

## Components

### `src/components/TeamsTab.svelte`
- [ ] Line 32: Channel name `'teams-changes-admin'` → `'publications-changes-admin'`
- [ ] Line 38: Table reference `table: 'teams'` → `table: 'publications'`
- [ ] Line 50: `.from('teams')` → `.from('publications')`
- [ ] Line 79: Text `"Teams and members appear here"` → `"Publications and contributors appear here"`
- [ ] Line 82: Label `"Teams"` → `"Publications"`

### `src/components/ColorPalette.svelte`
- [ ] Line 18: Label `"Pick a team theme"` → `"Pick a publication theme"`

### `src/components/ShareToggle.svelte`
- [ ] Line 38: Label `"Share team stream"` → `"Share publication"`
- [ ] Line 50: aria-label `"Share team stream"` → `"Share publication"`

### `src/components/FooterNav.svelte`
- [ ] Line 61: aria-label `"Team Stream"` → `"My Publication"` (or `"Publication Stream"`)

### `src/components/StoryCard.svelte`
- [ ] Line 74: Comment/fallback reference `'logo-teamstream-fallback.png'` — update if needed (asset name)

---

## Pages

### `src/routes/[courseId]/settings/+page.svelte`

**Type definitions & constants:**
- [ ] Line 18: Type `'teams'` → `'publications'`
- [ ] Line 18: Action type `'create-team'` → `'create-publication'`
- [ ] Line 18: Action type `'leave-team'` → `'leave-publication'`

**Subscriptions:**
- [ ] Line 125: Channel name `'teams-changes'` → `'publications-changes'`
- [ ] Line 131: Table reference `table: 'teams'` → `table: 'publications'`

**Error/Success Messages:**
- [ ] Line 325: Error `'Team already exists'` → `'Publication already exists'`
- [ ] Line 394: Toast `'Team created'` → `'Publication created'`
- [ ] Line 398: Console `'Create team error'` → `'Create publication error'`
- [ ] Line 399: Error `'Failed to create team. Try again.'` → `'Failed to create publication. Try again.'`
- [ ] Line 457: Console `'Join team error'` → `'Join publication error'`
- [ ] Line 458: Error `'Failed to join team. Try again.'` → `'Failed to join publication. Try again.'`
- [ ] Line 513: Toast `'Created team'` → `'Created publication'`
- [ ] Line 517: Console `'Create team error'` → `'Create publication error'`
- [ ] Line 518: Error `'Failed to create team. Try again.'` → `'Failed to create publication. Try again.'`
- [ ] Line 564: Info `'You left the team. Join or create another.'` → `'You left the publication. Join or create another.'`
- [ ] Line 573: Console `'Leave team error'` → `'Leave publication error'`
- [ ] Line 574: Error `'Failed to leave team. Try again.'` → `'Failed to leave publication. Try again.'`
- [ ] Line 629: Info `'You left the team. Join or create another.'` → `'You left the publication. Join or create another.'`
- [ ] Line 632: Console `'Leave team error'` → `'Leave publication error'`
- [ ] Line 633: Error `'Failed to leave team. Try again.'` → `'Failed to leave publication. Try again.'`
- [ ] Line 648: Error `'Teams must have at least one editor. Add another then try again.'` → `'Publications must have at least one editor. Add another then try again.'`
- [ ] Line 717: Error `'Teams must have at least one editor. Add another then try again.'` → `'Publications must have at least one editor. Add another then try again.'`
- [ ] Line 843: Toast `'Team locked'` / `'Team unlocked'` → `'Publication locked'` / `'Publication unlocked'`
- [ ] Line 845: Console `'Team lock toggle error'` → `'Publication lock toggle error'`
- [ ] Line 846: Error `'Failed to update team lock'` → `'Failed to update publication lock'`
- [ ] Line 897: Toast `'Team deleted'` → `'Publication deleted'`
- [ ] Line 899: Console `'Delete team error'` → `'Delete publication error'`
- [ ] Line 900: Error `'Failed to delete team. Try again.'` → `'Failed to delete publication. Try again.'`

**Tab Labels & Navigation:**
- [ ] Line 949: Tab option `activeTab = 'teams'` → variable stays, but visual label changes
- [ ] Lines 951-953: Tab styling references to `'teams'` → update class bindings to `'publications'`
- [ ] Line 1088: Label `"Create team"` → `"Create publication"`
- [ ] Line 1093: ID `"create-team-input"` → `"create-publication-input"` (optional, internal)
- [ ] Line 1174: Button text `'Create team'` → `'Create publication'`
- [ ] Line 1192: Section label `"Teams"` → `"Publications"`
- [ ] Line 1214: Alt text `"Current team"` → `"Current publication"`
- [ ] Line 1236: Badge text `"Team locked"` → `"Publication locked"`
- [ ] Line 1258: Button text `'Join team'` → `'Join publication'`
- [ ] Line 1277: Empty state `"All teams appear here"` → `"All publications appear here"`
- [ ] Line 1284: Section label `"Team members"` → `"Contributors"` (or `"Publication members"`)
- [ ] Line 1315: Empty state `"Team members appear here"` → `"Contributors appear here"`
- [ ] Line 1389: Button text `'Delete the team'` → `'Delete the publication'`
- [ ] Line 1402: Confirmation message `'Leave the team?'` / `'Remove from team?'` → `'Leave the publication?'` / `'Remove from publication?'`
- [ ] Line 1417: Advisory `"Teams must have at least one editor..."` → `"Publications must have at least one editor..."`
- [ ] Line 1436: Advisory `"Teams must have at least one editor. Delete the team..."` → `"Publications must have at least one editor. Delete the publication..."`
- [ ] Line 1455: Modal title `"Delete the team"` → `"Delete the publication"`
- [ ] Line 1482: Advisory `"Please leave your current team before creating or joining a new team. If you are the only editor, assign another before leaving or close the team."` → Update to publication terminology

**Other references (code variables, comments):**
- [ ] Line 351: Action `'create-team'` → `'create-publication'` (if changing type)
- [ ] Line 466: Action `'leave-team'` → `'leave-publication'` (if changing type)

### `src/routes/[courseId]/home/+page.svelte`
- [ ] Line 341: Help text `"...create or join a team in settings"` → `"...create or join a publication in settings"`

### `src/routes/[courseId]/stream/+page.svelte`
- [ ] Line 238: Page title `"NewsLab - Team Stream"` → `"StoryFlam - My Publication"`
- [ ] Line 249: Alt text `"Team logo"` → `"Publication logo"`
- [ ] Line 264: Empty state `"No team yet."` → `"No publication yet."`

---

## Components (Reusable, might need UI adjustments)

### `src/components/TeamExpandable.svelte`
- **Note:** This component handles publication expansion. Internal variable names are OK (teamName, etc.), but check for user-facing text:
  - Search for any UI text strings that say "team"

### `src/components/TeamMemberItem.svelte`
- **Note:** Check for aria-labels or user-visible text mentioning "team"

### `src/components/TeamLogoUpload.svelte`
- [ ] Label might say "Upload a team logo" → `"Upload a publication logo"`

### `src/components/TeamLockToggle.svelte`
- [ ] Label might say "Team lock" → `"Publication lock"`
- [ ] aria-label `"Lock team"` → `"Lock publication"`

---

## Assets & Icons (No changes needed, but note for future)

- `logo-teamstream-fallback.png` — Could rename to `logo-publication-fallback.png` (future refactor)
- Footer icon aria-label references → Update as listed above

---

## Database Subscriptions (Code changes, not UI)

These are already updated in code, but listed for context:
- Channel names: `'teams-changes'` → `'publications-changes'`
- Table names: `.from('teams')` → `.from('publications')`

---

## Summary by Change Type

### Text Replacements (Find & Replace)
- "Team" → "Publication"
- "team" → "publication" (in UI text)
- "Teams" → "Publications"
- "teams" → "publications" (in UI text)

### Contextual Changes
- "Team members" → "Contributors" (optional, more user-friendly)
- "Team Stream" / "Team NewsLab" → "My Publication" / "StoryFlam Publication"
- "Join team" → "Join publication"
- "Create team" → "Create publication"
- "Team locked" → "Publication locked"

---

## Testing Checklist

After changes, test:
- [ ] All navigation tabs display correct labels
- [ ] All toast/error messages use new terminology
- [ ] All empty states display correct messages
- [ ] All modals and confirmations use new terminology
- [ ] All buttons and form labels are updated
- [ ] aria-labels updated for accessibility

---

**Status:** Ready for implementation  
**Estimated Effort:** 1-2 hours (mostly find & replace)
