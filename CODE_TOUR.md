# FitTrack Code Tour

A guided walk through the codebase: what each part does, **why it's built that
way**, and the interview questions it prepares you for. Read it top to bottom
once, then use it as a reference. File paths are clickable in most editors.

---

## 1. The big picture

```
┌──────────── apps/mobile (Expo / React Native) ────────────┐
│ Screens (src/app, Expo Router)                              │
│   └─ hooks (TanStack Query)  ── server state, caching        │
│        └─ api.ts (Axios)     ── tokens, refresh, retries     │
│ Zustand ── session status, workout draft (client state)      │
│ SecureStore ── refresh token   AsyncStorage ── draft          │
└──────────────────────────────┬────────────────────────────┘
                               │ HTTPS JSON  /api/v1/...
┌──────────────────────────────▼──── apps/server (Express) ──┐
│ middleware: helmet → cors → pino-http → json → routes        │
│ *.routes.ts   parse input with Zod, call the service          │
│ *.service.ts  business rules (no req/res)                     │
│ Prisma 7 (pg adapter) ─────► PostgreSQL 17                    │
│ ioredis ───────────────────► Redis 7 (rate limits, cache)     │
│ errorHandler ── every error → { error: { code, message } }    │
└─────────────────────────────────────────────────────────────┘
```

**Monorepo with npm workspaces**: one lockfile, one `node_modules`, both apps in
one repo. *Why:* atomic commits across API + app, one CI pipeline, no extra tools
(Turborepo/Nx only pay off once builds are slow).

> **Interview:** *"Why a monorepo?"* → shared history and CI, changes to the API
> and the app that uses it land together; tooling stays minimal until needed.

---

## 2. Server foundations

### `src/config/env.ts`: validate config at the boundary
`process.env` values are untyped strings that may be missing. A Zod schema parses
them **once at startup**: typed values (`env.PORT` is a number), defaults, and a
crash with every problem listed if anything is wrong. Fail fast beats failing at
3am on the first request that needs the missing value.

### `src/app.ts` vs `src/server.ts`: build vs run
`createApp()` builds the Express app; `server.ts` calls `listen()` and handles
shutdown. Tests import `createApp()` and drive it with supertest, so no port, no
process. **Middleware order matters:** security headers → CORS → logging (so every
request is logged) → body parsing → routes → 404 → error handler (must be last).

### `src/middleware/errorHandler.ts`: one error contract
- `AppError` (expected: 404, 409…) → its status + code.
- `ZodError` → 400 with field-level details.
- Malformed JSON → 400 `INVALID_JSON`.
- **Anything else is a bug** → log it, return a generic 500. Never leak stack
  traces or messages (tested: the 500 body never contains the error text).

Express 5 forwards errors thrown in `async` handlers automatically, so routes
don't need try/catch.

### `src/server.ts`: graceful shutdown
On `SIGTERM` (Docker/Kubernetes deploys): stop accepting connections, let
in-flight requests finish, close Postgres + Redis, exit. A 10s timer force-exits
if something hangs. Unhandled promise rejections crash on purpose: the process
is in an unknown state; the orchestrator restarts it.

### `src/lib/logger.ts`
pino: JSON logs in production (searchable by field), pretty in dev, silent in
tests. `redact` replaces `Authorization` headers and cookies with `[Redacted]`.
Leaked tokens in logs are a real-world incident class.

### Health checks: liveness vs readiness (`routes/health.routes.ts`)
- `/health`: is the process alive? Touches nothing.
- `/health/ready`: can it serve traffic? Pings Postgres and Redis in parallel.

If liveness checked the DB, a DB outage would make the orchestrator restart
*every* API instance, which can't fix the DB and makes recovery slower.

> **Interview:** *"Liveness vs readiness?"*, *"How do you deploy without dropping
> requests?"* (readiness + graceful shutdown)

---

## 3. The database (`prisma/schema.prisma`)

| Choice | Why |
|---|---|
| UUIDv7 ids | Unguessable (no `/users/2` enumeration) **and** time-ordered, so inserts append to the index instead of landing randomly (unlike UUIDv4). Ordering by id ≈ ordering by creation time (used for comments). |
| `weightGrams Int` | Floats can't represent many decimals exactly (`2.01 * 1000 = 2009.9999999999998`). Integers are exact; the app converts for display. |
| `Follow` composite PK `(followerId, followingId)` | Duplicate follows are impossible; the PK doubles as the "who do I follow" index. `@@index([followingId])` serves "who follows me" (an index only helps queries on its *leading* column). |
| `Like` composite PK `(userId, workoutId)` | One like per user per workout, enforced by the DB. |
| `@@index([userId, startedAt(sort: Desc)])` | Exactly matches "a user's workouts, newest first". |
| `onDelete: Cascade` / `Restrict` | Deleting a user removes their data; an exercise used in someone's history can't be deleted. |
| Hand-written `CHECK` constraints (in migrations) | No self-follow, non-negative sets, `endedAt >= startedAt`, comment length. Zod validates in the API, but the DB is the last line of defence against bugs and scripts. |

**Prisma 7** uses a driver adapter (`@prisma/adapter-pg`): queries go through the
standard `pg` driver instead of a Rust engine binary. The generated client lives
in `src/generated/` (git-ignored, regenerated on `postinstall`).

> **Interview:** *"Why CHECK constraints if you validate in the API?"*,
> *"UUID vs auto-increment?"*, *"Why store grams?"*

---

## 4. Authentication (`modules/auth/`, `middleware/requireAuth.ts`)

### Two tokens
| | Access token | Refresh token |
|---|---|---|
| Format | JWT (HS256) | 256 random bits, opaque |
| Lifetime | 15 min | 30 days |
| Checked by | crypto only (`jose`), no DB | DB lookup (by SHA-256 hash) |
| Revocable? | No (that's why it's short) | Yes |

The refresh token isn't a JWT: we must hit the DB to check revocation anyway, so
a JWT would add nothing.

### Rotation + reuse detection (`auth.service.ts → refresh`)
Every refresh revokes the old token and issues a new one in the same **family**.
If a revoked token is presented again, someone has a copy → revoke the entire
family. The real user logs in again; the attacker is locked out.

The rotation is an **atomic compare-and-swap**: `updateMany({ where: { id,
revokedAt: null } })`. Of two simultaneous refreshes, only one gets `count === 1`.

### Passwords
Argon2id (memory-hard → expensive to crack on GPUs). Unknown emails still run a
dummy verify so response time doesn't reveal which emails exist, and both cases
return the same message. Passwords capped at 128 chars (no hashing a 10 MB string).

### JWT hardening
`algorithms: ["HS256"]` pinned (blocks `alg: none` / algorithm confusion),
issuer + audience checked, secret ≥ 32 chars and not the placeholder (env schema).

### Rate limiting (`middleware/rateLimit.ts`)
10 login/register attempts per IP per 15 minutes, counters in **Redis**, so the
limit holds across all instances and survives restarts.

> **Interview:** *"JWT vs sessions?"*, *"How do you revoke a JWT?"* (you don't;
> keep it short-lived + revocable refresh tokens), *"What is refresh token
> rotation and why?"*, *"How do you prevent user enumeration?"*

---

## 5. Workouts (`modules/workouts/`)

- **Saved in one request**: the app builds the whole workout locally and POSTs
  it once; a single nested Prisma `create` is one transaction → never
  half-saved. Works with bad gym Wi-Fi (no per-set requests).
- **Positions and set numbers come from array order**, server-side, so the client
  can't send gaps or duplicates.
- **Exercise ids validated up front** → 400 instead of a foreign-key 500.
- **PUT replaces children wholesale** inside a transaction (simpler and safer
  than diffing nested lists).
- **Ownership inside the write**: `deleteMany({ where: { id, userId } })`. The
  check and the action are one statement, so there's no gap between them.

### Cursor pagination (`listWorkouts`)
`orderBy [startedAt desc, id desc]`, `take: limit + 1` (the extra row tells us
if there's a next page), `cursor: { id }, skip: 1`. *Why not OFFSET?* New
workouts shift every page (duplicates/skips while scrolling), and `OFFSET 10000`
still scans 10,000 rows. The `id` tie-break makes the order fully deterministic.

---

## 6. Social (`workouts/visibility.ts`, `modules/social/`, `modules/users/`)

### `visibleTo(viewerId)`: one rule, used everywhere
Own workouts + anyone's PUBLIC + FOLLOWERS-only from people you follow, written
as a **Prisma `where` filter**. Feed, profiles, detail, likes and comments all
use it, so the rule can't drift between endpoints. 404 (not 403) when you can't
see something, so the API doesn't confirm it exists.

### Feed: fan-out on read
The feed is a query at read time: "visible workouts by me or people I follow,
newest first". Always consistent, simple. At large scale (accounts with millions
of followers), you'd switch to **fan-out on write**: push each new workout id
into followers' precomputed feeds (e.g. Redis lists), often a hybrid where
celebrities stay fan-out-on-read.

### Idempotent writes
Likes and follows use `PUT` / `DELETE` (with `createMany({ skipDuplicates })`),
not a POST "toggle". A retried toggle flips back; a retried PUT is harmless.

### Counts + caching (`lib/cache.ts`)
`_count` and `likes: { where: { userId: viewer }, take: 1 }` are part of the
same query (no N+1). Profile counts use **cache-aside** in Redis: 60s TTL plus
explicit invalidation on follow/unfollow/new workout. Redis errors fall back to
the DB: a cache must never become a hard dependency.

### Privacy details
Other users never see `email` (`profileSelect` / `authorSelect` vs
`publicUserSelect`). Reserved usernames (`me`, `search`…) so `/users/:username`
can't shadow static routes.

> **Interview:** *"Design a social feed"*, *"Cache invalidation strategy?"*,
> *"How do you avoid N+1 queries?"*, *"403 vs 404?"*

---

## 6b. Photos (Phase 7: `lib/storage.ts`, `modules/uploads/`, `features/uploads/`)

### Pre-signed URLs: the bytes never touch the API
1. `POST /uploads { kind, contentType, size }`: the server picks the key
   (`<kind>/<userId>/<uuid>.jpg`), stores it as a **pending** row in `uploads`,
   and returns a 5-minute PUT link.
2. The phone PUTs the file straight to storage. Content-Type **and** byte size
   are part of the signature, so storage rejects anything else (403).
3. The phone saves the workout with `photoKeys`. `assertUploaded` checks every key
   is the caller's pending upload of the right kind AND that the file arrived
   (HEAD). `consumeUploads` deletes the pending rows inside the save transaction
   with a count check, so two racing saves can't attach the same file
   (`UNIQUE(key)` on `workout_photos` is the backstop).

Why: the API stays fast (no 5 MB bodies through Express), storage scales on its
own, and "who owns this file" is proven by the server's own records, never by
anything the client says.

### Private bucket, links minted after `visibleTo`
Workout photo links are signed when a workout is **serialized**, which only
happens after the visibility check. A Followers-only photo is as private as the
workout. Signed links change on every response, so the app caches images by the
**storage key** (`expo-image` `cacheKey`), not the URL.

### Avatars: a computed field and a stable public link
`users.avatarKey` stores a key, never a URL (links expire, domains change). A Prisma
**result extension** in `lib/prisma.ts` computes `avatarUrl` on every read,
nested ones too, so the ~10 places that select a user didn't change. The link is
`/api/v1/media/avatars/...`, which 302s to a fresh signed URL, but only for a
user's **current** avatar. The base URL comes from `PUBLIC_API_URL`, never the
`Host` header (a forged Host would point other people's avatar links elsewhere).

### On the phone
- `prepareImage` resizes (1600 px / 512 px) and re-encodes to JPEG, which **drops
  EXIF including GPS**. Verified: a GPS-tagged photo uploaded from the simulator
  is stored with no metadata. The server can't strip it; it never sees the bytes.
- The draft (persisted, v4) holds `photos: [{ id, uri, key }]`; upload progress
  lives in a separate, **non-persisted** store, because an in-flight upload can't
  survive the app being killed. On relaunch, photos without a key re-upload.
- Abandoned uploads are swept hourly after 24 h (rows kept if the delete fails,
  so the next run retries).

> **Interview:** *"Why not upload through your API?"*, *"How do you stop someone
> attaching another user's file?"*, *"How are private photos kept private?"*

---

## 7. Mobile app (`apps/mobile/src`)

### Where state lives (the most important mobile decision)
| State | Where | Why |
|---|---|---|
| Server data (workouts, profiles…) | TanStack Query cache | caching, refetching, pagination, invalidation built in |
| Session (`status`, access token) | Zustand (memory) | tiny, synchronous, readable outside React (interceptors) |
| Refresh token | SecureStore (Keychain/Keystore) | encrypted by the OS |
| Workout in progress | Zustand + AsyncStorage (`persist`) | survives the app being killed mid-workout |

Server data is never copied into Zustand, so it can't go stale or out of sync.

### `lib/api.ts` + `features/auth/session.ts`: the token lifecycle
- Request interceptor attaches the access token; features never touch tokens.
- On 401: refresh **once** and retry. **Single-flight**: 5 parallel 401s share
  one refresh call (otherwise rotation would reject 4 and trip reuse detection).
- No refresh for unauthenticated requests (a 401 from login = wrong password).
- Refresh/logout use a separate Axios instance with no interceptors (no loops).
- Network errors keep you signed in; only a 401 from the server ends the session.
- Logout clears local state first (instant, offline-safe), clears the query
  cache (no data leaks to the next user) and the workout draft.

### Routing (`src/app`, Expo Router)
File-based routes. `Stack.Protected guard={status === "signedIn"}` means
login/logout just flip `status` and the router redirects. Note: guards only
control what's *shown*; real security is the server's `requireAuth`.

### Optimistic updates (`features/social/hooks.ts`, `cache.ts`)
Tap ❤️ → every cached copy of that workout (feed, history, profile list, detail)
updates **immediately** via `setQueriesData` over the `["workouts", …]` key
namespace. Snapshot first; on error roll back; on success reconcile with the
server's counts, but only if no newer tap for the same workout is in flight.

### Workout logger (`features/workouts/draftStore.ts`)
Inputs stay strings until save (typing "82." isn't mangled); `draftToInput`
validates and converts (commas accepted, kg → integer grams with rounding).
The persisted draft has a **schema version + migration**, so drafts saved by an
older app version still load.

> **Interview:** *"Server state vs client state?"*, *"How does your app refresh
> tokens?"*, *"What is an optimistic update and how do you roll it back?"*,
> *"How do you persist data across app restarts?"*

---

## 8. Testing strategy

- **Server:** Jest + supertest against a real Postgres (`fittrack_test`) and
  Redis DB 1, never mocks of the database. A setup guard refuses to run if the
  URLs don't point at test databases. Files run serially (shared DB).
- **Mobile:** jest-expo; logic-heavy code (interceptor, draft, cache updates) is
  tested as pure functions / with axios-mock-adapter.
- **Mutation checks:** for critical rules, the code was broken on purpose to
  confirm a test fails. This found weak tests (a race test that never raced,
  a retry test that hung instead of failing, a float test that proved nothing).
- **CI** (`.github/workflows/ci.yml`): every push runs typecheck, build and all
  tests with real Postgres/Redis service containers.

> **Interview:** *"How do you know your tests actually test something?"*
> (mutation testing), *"Mocks vs real DB in tests?"*

---

## 9. Lessons from bugs we hit (great interview stories)

| Bug | Root cause | Fix / lesson |
|---|---|---|
| Two Reacts → would crash | npm hoisted `react@19.3.1` beside RN's required `19.2.3` | root `overrides`; dedupe in monorepos |
| "Failed to parse manifest JSON" | another project's Metro owned port 8081 | pin Metro to 8082 |
| App showed 404 for new routes | API process predated the code | run the server in watch mode |
| Unknown routes returned 401 | `router.use(requireAuth)` on a router mounted at `/api/v1` | per-route auth on broadly-mounted routers |
| `npm ci` failed on fresh clones | Prisma's `env()` throws when `DATABASE_URL` is unset; `generate` didn't need it | read it optionally; test in a clean clone |
| Jest hung 5 min after passing | TanStack Query GC timers in a test `QueryClient` | `gcTime: Infinity` in tests |
| Every pre-signed upload failed (BadDigest) | AWS SDK ≥3.729 signs a CRC32 checksum by default; a presigned URL is signed before the body exists, so it signed an EMPTY body's checksum | `requestChecksumCalculation: "WHEN_REQUIRED"`; test against real storage |
| Docker crashing, images segfaulting | the Mac's disk was full (135 MB free); an image downloaded mid-crisis was corrupted | free space, re-pull; check `df -h` before blaming the tool |
| Race test passed with its guard removed | `UNIQUE(key)` still blocked the double attach, but losers got a 500 | assert losers get a clean 4xx, not just "one winner" |

---

## 10. Self-check: can you answer these?

1. Walk through what happens, end to end, when the access token expires mid-scroll.
2. Why is the refresh token opaque and the access token a JWT?
3. Two phones refresh with the same token at the same moment. What happens, and why?
4. Why does `visibleTo` return a `where` object instead of a boolean?
5. What breaks with OFFSET pagination on a live feed?
6. When would you move the feed to fan-out on write?
7. How do you keep cached profile counts correct?
8. Why are likes `PUT`/`DELETE` instead of `POST /toggle`?
9. A user likes a workout offline. What does the UI do, and how does it recover?
10. Why does `/health` not check the database?
11. Walk through a photo upload. Which step proves the file is yours, and which proves it arrived?
12. Why are workout photo links signed per response but avatar links stable?

