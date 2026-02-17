# StoryFlam Refactor Log: Team → Publication

**Scope:** Complete find-replace mapping for NewsLab → StoryFlam rebranding

**Database Changes:** See [DATABASE_MIGRATION.md](DATABASE_MIGRATION.md)

---

## Key Rename Mappings

| Current | New | Context |
|---------|-----|---------|
| `team_name` | `publication_name` | Database column, TypeScript interface, variables |
| `teams` table | `publications` table | Database table |
| `teamName` | `publicationName` | JavaScript/TypeScript variables |
| `Team` type | `Publication` type | TypeScript interface |
| `team` (singular) | `publication` | Local/component variables |
| "Team Stream" | "My Publication" | UI labels |
| "Create Team" | "Create Publication" | UI labels |
| "Team members" | "Contributors" | UI labels |
| "Team lock" | "Lock publication" | UI labels |
| "Team logo" | "Publication logo" | UI labels |

---

## Files Requiring Changes

### Core Library Files

#### `src/lib/types.ts`
- [ ] Rename `Team` interface → `Publication`
- [ ] Rename `team_name` property → `publication_name`
- [ ] Update JSDoc comments

#### `src/lib/stores.ts`
- [ ] Update comments referencing "teams"
- [ ] Store names already generic (e.g., `teamColors` → could stay or rename to `publicationColors`)
- [ ] Session type: `teamName` → `publicationName`

#### `src/lib/stories.ts`
```typescript
// Functions that need updates:
- getTeamStream() → getPublicationStream()
- getTeamInfo() → getPublicationInfo()
- updateTeamSettings() → updatePublicationSettings()
- deleteTeamIfEmpty() → deletePublicationIfEmpty()
- getPublicTeamStream() → getPublicPublicationStream()

// Variable/parameter names:
- teamName → publicationName
- teamInfo → publicationInfo
- All database column references (team_name → publication_name)
- Comments and query filters
```

#### `src/lib/activity.ts`
- [ ] Update action labels:
  - `'joined_team'` → `'joined_publication'`
  - `'left_team'` → `'left_publication'`
  - `'promoted_editor'` → stays the same
  - `'demoted_editor'` → stays the same
- [ ] Function parameter comments

#### `src/lib/auth.ts`
- [ ] Comments only (no functional changes)

#### `src/lib/supabase.ts`
- [ ] No changes (generic table references)

---

### Component Files

#### Layout & Navigation

**`src/components/FooterNav.svelte`**
- [ ] Comments referencing teams

**`src/components/Notification.svelte`**
- [ ] No changes needed (uses generic notification system)

---

#### Team Management (→ Publication Management)

**`src/components/TeamsTab.svelte`** → Consider renaming to `PublicationsTab.svelte`
- [ ] File name (or keep current, it's in settings)
- [ ] Variable: `teams` → `publications`
- [ ] Variable: `expandedTeamId` → `expandedPublicationId`
- [ ] Variable: `previewTeamName` → `previewPublicationName`
- [ ] Variable: `teamsSubscription` → `publicationsSubscription`
- [ ] Function: `loadTeams()` → `loadPublications()`
- [ ] All UI labels ("Team", "Teams")
- [ ] Comments

**`src/components/TeamExpandable.svelte`** → Consider renaming to `PublicationExpandable.svelte`
- [ ] File name
- [ ] Props: `team: Team` → `publication: Publication`
- [ ] Variable: `team.team_name` → `publication.publication_name`
- [ ] Variable: `primaryColor`, `secondaryColor` (stay)
- [ ] Database queries: `.from('teams')` → `.from('publications')`
- [ ] Database filters: `.eq('team_name', ...)` → `.eq('publication_name', ...)`
- [ ] Function names: `handleTeamLockToggle()` → `handlePublicationLockToggle()`
- [ ] All UI labels
- [ ] Comments

**`src/components/TeamMemberItem.svelte`** → Consider renaming to `ContributorItem.svelte`
- [ ] File name
- [ ] Props (props don't reference team, but functions might)
- [ ] UI labels: "Leave team" → "Leave publication"
- [ ] Comments

**`src/components/TeamLogoUpload.svelte`** → Consider renaming to `PublicationLogoUpload.svelte`
- [ ] File name
- [ ] UI labels: "Upload a team logo" → "Upload a publication logo"

**`src/components/TeamLockToggle.svelte`** → Consider renaming to `PublicationLockToggle.svelte`
- [ ] File name
- [ ] UI labels: "Team lock" → "Publication lock"
- [ ] aria-label: "Lock team" → "Lock publication"

---

#### Stream/Publication View

**`src/components/TeamStreamDrawer.svelte`** → Rename to `PublicationStreamDrawer.svelte`
- [ ] File name (critical rename)
- [ ] Function: `getTeamStream()` → `getPublicationStream()` (in import)
- [ ] Function: `getTeamInfo()` → `getPublicationInfo()` (in import)
- [ ] Props: `teamNameToView` → `publicationNameToView`
- [ ] Variable: `teamName` → `publicationName`
- [ ] Variable: `teamLogoUrl` → `publicationLogoUrl`
- [ ] Function: `loadTeamData()` → `loadPublicationData()`
- [ ] Database column: `team_name` → `publication_name`
- [ ] UI labels: "Team Header" → "Publication Header"
- [ ] All references and comments

**`src/components/StoryReaderDrawer.svelte`**
- [ ] Props: `teamName` → `publicationName`, `teamLogoUrl` → `publicationLogoUrl`
- [ ] Variable: `displayTeamName` → `displayPublicationName`
- [ ] Session reference: `$session?.teamName` → `$session?.publicationName`
- [ ] UI text: "Team NewsLab" → "StoryFlam Publication" (or similar)

**`src/routes/[courseId]/stream/+page.svelte`** → Consider renaming to `my-publication`
- [ ] Route folder: `/stream` → `/my-publication` (or `/publication`)
- [ ] Component imports referencing TeamStreamDrawer
- [ ] All prop references

---

#### Story Editing & Preview

**`src/components/WriteDrawer.svelte`**
- [ ] Comments only (mostly functional)
- [ ] Check team/publication references in error messages

**`src/components/PreviewDrawer.svelte`**
- [ ] Variable: `teamColor` → `publicationColor`
- [ ] Comments

**`src/components/StoryCard.svelte`**
- [ ] Comments only

**`src/components/ThreeDotsMenu.svelte`**
- [ ] Variable: `teamColors` → `publicationColors` (or keep `teamColors` as store name)
- [ ] Comments

---

#### Modals & Settings

**`src/components/LinkModal.svelte`**
- [ ] Variable: `teamColors` → `publicationColors` (or keep)
- [ ] Comments

**`src/components/ColorPalette.svelte`**
- [ ] No changes (generic color selector)

**`src/components/ShareToggle.svelte`**
- [ ] No changes needed (unless team context in labels)

**`src/components/AdminTab.svelte`**
- [ ] Function: `.from('teams')` → `.from('publications')`
- [ ] UI label: "Delete all teams, members and stories" → "Delete all publications, contributors and stories"
- [ ] Variable: `teamsError` → `publicationsError`

---

### Page/Route Files

#### `src/routes/+page.svelte` (Splash/Login)
- [ ] Comments only
- [ ] No functional changes

#### `src/routes/[courseId]/home/+page.svelte`
- [ ] Comments
- [ ] Import: `TeamStreamDrawer` → `PublicationStreamDrawer`
- [ ] Component props
- [ ] Check error messages

#### `src/routes/[courseId]/stream/+page.svelte` → Rename route to `/my-publication`
- [ ] Route path change (critical)
- [ ] Component imports
- [ ] All props and logic

#### `src/routes/[courseId]/settings/+page.svelte`
- [ ] Comments
- [ ] Component imports: `TeamsTab` → `PublicationsTab` (if renamed)
- [ ] UI labels if any

#### `src/routes/[courseId]/+layout.svelte`
- [ ] Session property references: `teamName` → `publicationName`
- [ ] Comments

#### `src/routes/share/[teamName]/+page.svelte` → Rename to `[publicationName]`
- [ ] Route parameter: `[teamName]` → `[publicationName]`
- [ ] Variable references throughout
- [ ] Comments

---

### Database/Configuration Files

#### `src/lib/supabase.ts`
- [ ] No code changes (references are dynamic)
- [ ] Comments if any

#### `.env.local` / `.env.local.example`
- [ ] Add/update branding constants if not already present:
  - `VITE_APP_NAME=StoryFlam` (if not already set)
  - `VITE_CLOUDINARY_FOLDER=storyflam/images` (update path)

---

### Static Assets & Public Files

#### `/static/` directory
- [ ] Update favicon (if branded as NewsLab)
- [ ] Update logo files (wait for your new logos)
- [ ] Update any hardcoded image paths in HTML

#### `svelte.config.js`, `vite.config.js`, `tailwind.config.js`
- [ ] No changes needed

---

## Special Cases & Notes

### Abbreviations & Shorthand
- `TN` (Team Name) → `PN` (Publication Name) - update in comments only
- `tN` (camelCase) → `pN` - update in comments only

### Database References
All database `.from('teams')` → `.from('publications')`
All column filters `.eq('team_name', ...)` → `.eq('publication_name', ...)`

### User-Visible Labels

| Current | New | Location |
|---------|-----|----------|
| "Team Stream" | "My Publication" | Settings nav, page title |
| "Create Team" | "Create Publication" | Button text |
| "Team members" | "Contributors" | Settings tab |
| "Join team" | "Join publication" | Form label |
| "Leave team" | "Leave publication" | Button text |
| "Team lock" | "Publication lock" | Settings toggle |
| "Team logo" | "Publication logo" | Upload label |
| "Team newslab" (fallback) | "StoryFlam Publication" | Fallback text |

### Type Exports
In `src/lib/types.ts`, ensure type names are exported:
```typescript
export type Publication = {
  // ... old Team interface
}
```

---

## Execution Order

**Phase 1: Core Infrastructure**
1. Database migration (separate SQL script)
2. Update `src/lib/types.ts` (Publication type)
3. Update `src/lib/stores.ts` (session.publicationName)
4. Update `src/lib/stories.ts` (all queries + function names)
5. Update `src/lib/activity.ts` (action labels)

**Phase 2: Components & Pages**
6. Update all component files (sorted by dependency)
7. Update page/route files
8. Rename route folders as needed (`/stream` → `/my-publication`)
9. Rename component files as needed

**Phase 3: Testing**
10. Test database migration
11. Test authentication flow
12. Test publication creation/editing
13. Test stream/publication view
14. Test all UI labels

---

## Rollback Strategy

If issues arise:
1. `git revert HEAD` (if need to revert after push)
2. Restore from backup (if database migration went wrong)
3. Use git branches for intermediate changes

---

## Notes for Dan

- **Team Colors store:** Currently named `teamColors` in stores. We can either:
  - Keep the name (it's internal; doesn't affect UX)
  - Rename to `publicationColors` for consistency
  - **Recommendation:** Keep `teamColors` for now; it's a technical detail

- **Component file naming:** The pattern of `Team*.svelte` is consistent. Renaming to `Publication*.svelte` improves clarity. Examples:
  - `TeamExpandable.svelte` → `PublicationExpandable.svelte`
  - `TeamStreamDrawer.svelte` → `PublicationStreamDrawer.svelte`
  
- **Route changes:** Renaming `/stream` → `/my-publication` is a breaking change for users. Update any documentation/links.

- **New logos:** Once ready, place in `/static` and update paths in components where hardcoded image URLs exist.

---

## Estimated Effort

- **Type/store updates:** 1 hour
- **Library function updates:** 1.5 hours
- **Component updates:** 2 hours
- **Route/page updates:** 1 hour
- **Testing & debugging:** 1 hour

**Total: ~6.5 hours of focused work**

---

**Last Updated:** Feb 17, 2026  
**Status:** Ready for Phase 1 execution
