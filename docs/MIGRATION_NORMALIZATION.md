# Supabase Migration History Normalization

Last updated: 2026-04-02

## Current State

- **44 SQL migration files** in `supabase/migrations/`
- All use descriptive names (e.g., `supabase-phase35-migrations.sql`), not timestamps
- The remote Supabase project (`fjnpzjjyhnpmunfoycrp`) tracks migrations using timestamp-based naming in `supabase_migrations.schema_migrations`
- **All 44 migrations have been applied** to the live production database
- `supabase db push --include-all` fails because local names don't match the remote migration history format
- Current workaround: apply new SQL via `supabase db query --linked -f <file>` (direct execution)

## Why This Matters

Without normalization, every new schema change requires the manual `db query` workaround instead of the standard `supabase db push` path. This increases the risk of drift and makes it harder to track which migrations have been applied.

## Normalization Strategy

### Recommended: Fresh Baseline + Forward-Only Timestamps

Since all 44 migrations are already applied, the cleanest path is:

1. **Keep existing files as historical reference** — rename `supabase/migrations/` to `supabase/migrations-archive/`
2. **Create a fresh baseline** — dump the current production schema as a single timestamped migration
3. **Sync the remote history** — clear the remote migration table and insert the baseline entry
4. **Go forward with timestamps** — all future migrations use `supabase migration new <name>`

### Step-by-step

```bash
# 1. Archive old migrations
mv supabase/migrations supabase/migrations-archive

# 2. Create fresh migrations directory
mkdir supabase/migrations

# 3. Dump current production schema as baseline
#    (requires Supabase CLI linked to the project)
supabase db dump --linked > supabase/migrations/20260402000000_baseline.sql

# 4. Clear remote migration history and register the baseline
#    Run via Supabase SQL Editor or psql:
#
#    TRUNCATE supabase_migrations.schema_migrations;
#    INSERT INTO supabase_migrations.schema_migrations (version, name)
#    VALUES ('20260402000000', 'baseline');

# 5. Verify sync
supabase db push --dry-run

# 6. Future migrations
supabase migration new add_feature_x
# Edit the generated timestamped file, then:
supabase db push
```

### Alternative: Rename-in-Place

If preserving full file-level git history matters more:

1. Rename each file to a timestamp (preserving order): `supabase-schema.sql` → `20260324000001_schema.sql`, etc.
2. Update remote migration history to match all 44 entries
3. This is more work and more error-prone, but keeps `git log --follow` intact

**Recommendation: Use the baseline approach.** The 44 historical files remain in the archive for reference, and the migration system starts clean.

## New Migration Workflow (Post-Normalization)

```bash
# Create a new migration
supabase migration new descriptive_name
# → creates supabase/migrations/20260402123456_descriptive_name.sql

# Edit the file with your SQL

# Test locally (if using local Supabase)
supabase db reset

# Apply to production
supabase db push

# Or apply directly if push still has issues:
supabase db query --linked -f supabase/migrations/20260402123456_descriptive_name.sql
```

## Pre-Requisites

- Supabase CLI installed and linked (`supabase link --project-ref fjnpzjjyhnpmunfoycrp`)
- `SUPABASE_SERVICE_ROLE_KEY` available (for schema dump)
- Database access (for migration history table operations)
