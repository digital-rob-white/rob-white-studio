# Security cleanup report

Date: 2026-08-19  
Supabase migration: `20260819173427 security_cleanup_v01`

## Fixed

- Fixed mutable function search paths and removed Data API execution from trigger-only functions.
- Replaced broad authenticated-user RLS policies with an administrator-provisioned Studio membership check.
- Removed browser self-enrollment into `public.users` and added an explicit application membership check after login.
- Restricted anonymous access to approved public columns and added narrow `security_invoker` views for public Artwork, Journal, and file data.
- Restricted private and estimate Storage writes to Studio members.
- Confirmed RLS is enabled on every table in the exposed `public` schema.
- Added `.env.example`, strengthened environment-file ignore rules, and found no credential-shaped values or committed `.env` files in either repository's current files or Git history.
- Pinned direct dependencies, upgraded Astro to a patched major version, applied narrow transitive security overrides, and retained the pnpm lockfile.
- Added least-privilege CI and weekly Dependabot checks for pnpm and GitHub Actions.

## Still open

- Supabase Auth still allows public user signup even though the Studio has no public signup flow.
- Supabase Auth still uses its default password requirements; raising them may require the existing Studio user to reset a password that no longer complies.
- Supabase Auth's Site URL is `http://localhost:3000` and the redirect allowlist is empty. Production and Netlify preview URLs need to be configured before using email links or OAuth redirects.
- GitHub branch protection, Actions default permissions, repository collaborators, environment secrets, and deployment-secret placement need a signed-in repository-settings review. The connected repository API did not expose those settings.
- A credentialed browser smoke test of Studio login and all private modules remains outstanding. Database rollback tests covered Artwork, costs, labor, Journal, file records, Studio Feed triggers, and unauthorized-user isolation.

## Recommended

- Require at least 12-character passwords, disable public sign-up, and configure explicit production and Netlify preview redirect URLs.
- Protect `main`: require pull requests, require the CI job, block force pushes/deletions, and restrict direct pushes.
- Review and remove merged feature branches after confirming no deployment depends on them.
- Add the foreign-key indexes reported by Supabase Performance Advisor after measuring current query patterns. Do not remove “unused” indexes yet; the database is new and has little usage history.
- Keep the public website interface limited to the `public_*` views. Do not add private fields to those views without an explicit publication decision.

## Repository status

- `digital-rob-white/rob-white-studio` is the active codebase and contains the Astro application, tests, Supabase schema, pnpm lockfile, and Netlify deployment configuration.
- `digital-rob-white/rob-white-studio-platform` is an earlier placeholder containing a few small static files and no package/deployment configuration. The active repository does not reference it. Archive it after confirming that the `cloudflare/workers-autoconfig` branch is not attached to a live deployment; do not delete it.
- Both repositories are public. No secrets were found, but the active repository includes the private Studio data model and operational code. Keep it public only if that source visibility is intentional; otherwise make it private after checking Netlify/GitHub integration access.

## Verification

- Supabase leaked-password protection enabled after the project moved to a paid plan.
- Supabase Security Advisor rerun: no findings.
- Supabase Performance Advisor rerun: informational unindexed-foreign-key and unused-index findings remain.
- RLS/grant audit: no public tables without RLS, no broad `authenticated ... using (true)` policies, and no anonymous access to sampled private columns/tables.
- Auth simulation: the enrolled Studio user is authorized; a non-member can read zero users, contacts, or private Journal rows.
- Trigger rollback tests: Artwork, cost allocation, labor totals, Journal/photo activity, and deleted-object cleanup completed without errors and left no test data.
- `pnpm audit --audit-level=moderate`: no known vulnerabilities.
- ESLint: passed.
- Astro check: 0 errors, warnings, or hints.
- Vitest: 22 tests passed.
- Astro production build: 17 pages built successfully.
