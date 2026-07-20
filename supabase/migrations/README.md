# Migration history

## The gap (found 2026-07-20)

The live project (`umtoseyxvszdxbuvuyuk`) had 54 migrations applied
(`001_companies_profiles_core` through `054b_revoke_notification_trigger_execute`),
but this directory didn't exist in git — every schema change from Phase 1
onward was applied straight to the remote database (via the Supabase
dashboard or an MCP tool) and never committed as a file. `db.types.ts` was
regenerated and committed each time, so the *shape* of the schema was
visible in git, but the actual SQL — RLS policies, RPC bodies, triggers —
existed only in the hosted project's migration history, with no local
record and no way to replay it onto a fresh project or review it in a PR
diff.

## The fix

Every schema change from `055_office_admin_role` onward is written as a
numbered `.sql` file here *and* applied via `apply_migration`, in that
order, so the repo and the remote history never drift apart again. Follow
the existing numbering scheme (numbers reference the *content* of the
migration, not this file's timestamp prefix — the prefix only exists so
filenames sort correctly).

The pre-existing 001–054 migrations were not backfilled as files — doing
so accurately would mean reconstructing exact historical SQL with no
source of truth beyond `pg_proc`/`pg_policies` snapshots of the *current*
state, which wouldn't reflect what problem each one actually fixed at the
time (several exist specifically to correct an earlier one, e.g. `031`
dropping `030`'s function overload). If a from-scratch schema replay is
ever needed, generate one baseline migration from `pg_dump --schema-only`
against the live project rather than guessing at the numbered history.
