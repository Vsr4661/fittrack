# FitTrack

Social fitness tracking app, built as a resume project. **The owner must be able
to explain every line in an interview**, so every change comes with the *why*.

## Working agreement

1. **Plan before code.** For any non-trivial change, propose the approach (and
   simpler alternatives) first; code only after the owner picks one.
2. **Small steps.** One feature or layer per commit. Never mix server and mobile
   work in one commit unless they're inseparable.
3. **Test after every change.** Add/adjust tests with the code. For security- or
   correctness-critical logic, break it on purpose and confirm a test fails
   (mutation check). A test that can't fail is not a test.
4. **Explain decisions** briefly in comments where the reason isn't obvious, and in
   the summary after each step.
5. **Never guess library APIs.** Check the installed version's types/docs first
   (Expo, Prisma 7 and TypeScript 6/7 all changed recently).
6. **No new packages without asking.** Name the package, why it's needed, and what
   the no-dependency alternative would be. The stack above is the budget.
7. **Don't touch auth without asking.** `modules/auth/`, `middleware/requireAuth.ts`,
   `mobile/src/features/auth/session.ts` and `lib/api.ts` interceptors are
   security-critical; changes need explicit approval and their tests must stay green.
8. **Ask before deleting** anything that isn't freshly generated scaffolding:
   files, database rows, migrations, git history. Look at the target first.
9. **Secrets only in env vars**, validated by `config/env.ts`. Never hard-code keys,
   never commit `.env`. `.env.example` documents every variable with a placeholder.
10. **Test the money paths hardest.** Auth, permissions/visibility, and (Phase 9)
    payments + webhooks get the most tests, including mutation checks.
11. **Show real errors.** Report actual command output and failing tests verbatim;
    never claim something works without having run it.
12. **Reuse before writing.** Check `src/components` / existing services before
    creating something new; extract a shared piece once a pattern repeats 3 times.
13. **Keep files under ~300 lines**; split by responsibility when one grows past that.
14. **Stop and ask when unsure** about requirements; don't guess and build.

## Layout

```
apps/server   Express 5 + TypeScript 7 (NodeNext ESM) + Prisma 7 + Postgres + Redis
apps/mobile   Expo SDK 57 + Expo Router + TypeScript 6 + Zustand + TanStack Query + Axios
docker-compose.yml   Postgres 17 + Redis 7 for local dev
```

## Commands

```bash
docker compose up -d --wait           # Postgres + Redis
npm run dev       -w apps/server      # API on :4000 (tsx watch)
npm test          -w apps/server      # migrates fittrack_test, then Jest
npm run typecheck -w apps/server
npm run db:migrate -w apps/server     # after editing prisma/schema.prisma
npm run ios       -w apps/mobile      # Metro on :8082 (8081 is used by another local project)
npm test          -w apps/mobile
npm run typecheck -w apps/mobile
```

## Server conventions

- Validate every input with Zod at the top of the route handler (`schema.parse`);
  the global error handler turns `ZodError` into 400.
- Error responses always look like `{ error: { code, message, details? } }`.
  Throw `AppError` for expected errors; anything else becomes a generic 500.
- Layers: `*.routes.ts` (HTTP only) → `*.service.ts` (logic, no req/res) → Prisma.
- Select fields explicitly. Other users never see `email`; nobody sees `passwordHash`
  (`publicUserSelect` = me, `profileSelect` / `authorSelect` = others).
- **Workout visibility always goes through `visibleTo(viewerId)`** in
  `modules/workouts/visibility.ts`. Never re-implement the rule.
- Ownership checks go inside the write (`deleteMany({ where: { id, userId } })`).
- Return 404 (not 403) for resources the viewer may not see.
- Mutations that a client may retry are idempotent (PUT/DELETE, `skipDuplicates`).
- Cursor pagination (`take: limit + 1`, deterministic `orderBy` with an `id` tiebreak).
- Cached data uses `lib/cache.ts` (cache-aside + explicit invalidation + short TTL).
- Weights are integer grams, durations integer seconds.
- Routers mounted on a broad path (e.g. `/api/v1`) attach `requireAuth` per route.

## Mobile conventions

- Server state lives in TanStack Query (use the key factories); Zustand holds only
  client state (session, workout draft). Never copy server data into Zustand.
- All HTTP goes through `src/lib/api.ts`; features never touch tokens.
- Every screen handles loading, error (with retry) and empty states.
- Install native packages with `npx expo install`, never plain `npm i`.

## Pinned versions / known issues — don't "fix" without checking

- `prisma` / `@prisma/client` pinned to 7.10.0 (npm `latest` points at an 8.0 RC).
- Root `overrides.react = 19.2.3`: RN 0.86 needs exactly this; two Reacts = crashes.
- Don't upgrade `pg` to v9 yet: Prisma 7.10 runs parallel queries on one
  transaction connection (deprecation warning in tests), which pg 9 will reject.
- Server uses TypeScript 7 (no JS API → tests use @swc/jest, not ts-jest).
  Mobile uses TypeScript 6 (Expo's supported version).
- Install scripts are approved explicitly (`allowScripts` in root package.json);
  prebuilt binaries mean most don't need approval.

## Commits

Conventional Commits (`feat(server): …`, `fix(mobile): …`). Never commit `.env`,
`dist/`, or `apps/server/src/generated/`.
