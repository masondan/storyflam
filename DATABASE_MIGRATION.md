# Database Migration: NewsLab → StoryFlam

**Scope:** Rename `teams` table → `publications`, and all related columns

**Status:** Ready to execute (database is empty; no data loss)

---

## Pre-Migration Checklist

- [ ] Database backup taken (if any data exists)
- [ ] Code changes NOT yet deployed (deploy AFTER migration)
- [ ] Supabase project accessible
- [ ] Migration tested locally (optional, but recommended)

---

## Migration SQL

### Step 1: Rename Table

```sql
-- Rename teams table to publications
ALTER TABLE teams RENAME TO publications;
```

### Step 2: Rename Columns in publications Table

```sql
-- In publications table
ALTER TABLE publications RENAME COLUMN team_name TO publication_name;
```

### Step 3: Rename Columns in journalists Table

```sql
-- In journalists table
ALTER TABLE journalists RENAME COLUMN team_name TO publication_name;
```

### Step 4: Rename Columns in stories Table

```sql
-- In stories table
ALTER TABLE stories RENAME COLUMN team_name TO publication_name;
```

### Step 5: Rename Columns in activity_log Table

```sql
-- In activity_log table
ALTER TABLE activity_log RENAME COLUMN team_name TO publication_name;
```

### Step 6: Rename Indexes

```sql
-- In publications table
ALTER INDEX idx_teams_course_name RENAME TO idx_publications_course_name;
ALTER INDEX idx_teams_course RENAME TO idx_publications_course;
ALTER INDEX idx_teams_share_token RENAME TO idx_publications_share_token;

-- In journalists table
ALTER INDEX idx_journalists_course_team RENAME TO idx_journalists_course_publication;

-- In stories table
ALTER INDEX idx_stories_course_team_status RENAME TO idx_stories_course_publication_status;
ALTER INDEX idx_stories_pinned RENAME TO idx_stories_publication_pinned;
```

### Step 7: Rename Foreign Keys (if applicable)

```sql
-- Check existing constraints (if any)
-- Most likely constraint is implicit; may not need renaming
-- Run this to verify:
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'publications' AND constraint_type = 'UNIQUE';
```

---

## How to Execute

### Option A: Supabase Dashboard (Recommended for small migrations)

1. **Log in to Supabase**
2. Go to your project → **SQL Editor**
3. **Create new query**
4. **Copy entire migration script below:**

```sql
-- NewsLab → StoryFlam Database Migration
-- Created: Feb 17, 2026

-- Step 1: Rename table
ALTER TABLE teams RENAME TO publications;

-- Step 2: Rename columns in publications
ALTER TABLE publications RENAME COLUMN team_name TO publication_name;

-- Step 3: Rename columns in journalists
ALTER TABLE journalists RENAME COLUMN team_name TO publication_name;

-- Step 4: Rename columns in stories
ALTER TABLE stories RENAME COLUMN team_name TO publication_name;

-- Step 5: Rename columns in activity_log
ALTER TABLE activity_log RENAME COLUMN team_name TO publication_name;

-- Step 6: Rename indexes
ALTER INDEX idx_teams_course_name RENAME TO idx_publications_course_name;
ALTER INDEX idx_teams_course RENAME TO idx_publications_course;
ALTER INDEX idx_teams_share_token RENAME TO idx_publications_share_token;
ALTER INDEX idx_journalists_course_team RENAME TO idx_journalists_course_publication;
ALTER INDEX idx_stories_course_team_status RENAME TO idx_stories_course_publication_status;
ALTER INDEX idx_stories_pinned RENAME TO idx_stories_publication_pinned;

-- Done!
-- Verify: SELECT * FROM publications LIMIT 1;
```

5. **Run the query**
6. **Verify success:** Run `SELECT * FROM publications LIMIT 1;` → should return empty result set with correct columns

### Option B: CLI (If using Supabase CLI)

```bash
# Connect to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migration
supabase db push

# Or manually via psql if you have CLI access
psql postgres://user:password@host/database << EOF
[paste migration SQL above]
EOF
```

---

## Post-Migration Verification

### Verify Columns Are Renamed

```sql
-- Check publications table
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'publications' AND column_name LIKE '%publication%';
-- Should return: publication_name, public_share_token, share_enabled, team_lock, etc.

-- Check journalists table
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'journalists' AND column_name LIKE '%publication%';
-- Should return: publication_name

-- Check stories table
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'stories' AND column_name LIKE '%publication%';
-- Should return: publication_name

-- Check activity_log table
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'activity_log' AND column_name LIKE '%publication%';
-- Should return: publication_name
```

### Verify Indexes Are Renamed

```sql
-- List all indexes on publications table
SELECT indexname FROM pg_indexes WHERE tablename = 'publications';
-- Should show: idx_publications_* (not idx_teams_*)

-- List all indexes on journalists table
SELECT indexname FROM pg_indexes WHERE tablename = 'journalists';
-- Should show: idx_journalists_course_publication
```

### Verify Foreign Keys Still Work

```sql
-- Try inserting a test record to verify relationships
INSERT INTO newslabs (course_id, trainer_id) 
VALUES ('test-migration', 'trainer123');

INSERT INTO publications (course_id, publication_name, primary_color, secondary_color)
VALUES ('test-migration', 'Test Pub', '5422b0', 'f0e6f7');

INSERT INTO journalists (course_id, name, publication_name)
VALUES ('test-migration', 'Test Journalist', 'Test Pub');

-- Verify
SELECT * FROM publications WHERE course_id = 'test-migration';
SELECT * FROM journalists WHERE course_id = 'test-migration';

-- Cleanup
DELETE FROM journalists WHERE course_id = 'test-migration';
DELETE FROM publications WHERE course_id = 'test-migration';
DELETE FROM newslabs WHERE course_id = 'test-migration';
```

---

## Rollback Instructions (If Needed)

If migration fails or causes issues, rollback by running reverse operations:

```sql
-- Reverse migration (restore old names)
ALTER INDEX idx_publications_course_name RENAME TO idx_teams_course_name;
ALTER INDEX idx_publications_course RENAME TO idx_teams_course;
ALTER INDEX idx_publications_share_token RENAME TO idx_teams_share_token;
ALTER INDEX idx_journalists_course_publication RENAME TO idx_journalists_course_team;
ALTER INDEX idx_stories_course_publication_status RENAME TO idx_stories_course_team_status;
ALTER INDEX idx_stories_publication_pinned RENAME TO idx_stories_pinned;

ALTER TABLE activity_log RENAME COLUMN publication_name TO team_name;
ALTER TABLE stories RENAME COLUMN publication_name TO team_name;
ALTER TABLE journalists RENAME COLUMN publication_name TO team_name;
ALTER TABLE publications RENAME COLUMN publication_name TO team_name;
ALTER TABLE publications RENAME TO teams;
```

---

## Deployment Order

**Critical:** Database migration must complete **BEFORE** new code is deployed.

### Timeline:

1. **Morning:** Execute database migration (this doc)
2. **Verify:** Check all tables/columns renamed correctly
3. **Afternoon:** Deploy code changes (from code refactor)
4. **Evening:** Test in staging environment
5. **Next day:** Monitor production for issues

---

## Notes

- **Zero data loss:** Currently database is empty (reset after training course)
- **No service downtime required:** Renames are instant
- **No application downtime:** Can execute while code is still live (old code will fail, but no data is lost—just don't use the app until code is deployed)

---

**Migration prepared by:** AI Agent  
**Date:** Feb 17, 2026  
**Status:** Ready to execute
