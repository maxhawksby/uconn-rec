# Valence

A Strava-style fitness community for college students. Verify your school email, log any workout (lifting, runs, rides, pickup games, club practices, classes), and see what your friends, crews and campus are doing. It's independent and not affiliated with any university. The pilot campus is UConn; other schools join a waitlist.

React Native 0.86 · Expo SDK 57 · React Navigation 7 · TypeScript. Product spec: [`docs/BRIEF.md`](docs/BRIEF.md). Design system: [`docs/DESIGN.md`](docs/DESIGN.md).

## Run it

```bash
npm ci
npm start              # same Wi-Fi as your phone; scan the QR with Expo Go (SDK 57)
npm run start:tunnel   # any network, incl. campus Wi-Fi or cellular
```

The QR page is also served at http://localhost:8081/connect.html.

### Real backend (local Supabase in Docker)

```bash
npm run db:start       # start Supabase (ports 564xx); needs Docker running
npm run db:seed        # load the fictional demo campus (once, after a reset)
npm start              # connects to the local Supabase automatically
```

`npm start` uses the local Supabase whenever it's running, otherwise demo data on the phone (`npm start -- --demo` forces demo data). Sign-up codes are emailed to a local test inbox at http://localhost:56424, never to real inboxes. Seeded students sign in as `firstname.lastname@uconn.edu` (e.g. `jordan.reyes@uconn.edu`). Phones need the Windows firewall to allow port 56421 into WSL. The tunnel mode doesn't reach the local Supabase.

## Check it

```bash
npm run typecheck
npm test               # pure model checks: sign-up gating, feed, streaks, PRs, meetups, groups
npm run test:db        # database privacy rules, acting as different students (Supabase running)
```

## Code map

- `src/App.tsx` - fonts, store and navigation container.
- `src/navigation/` - root stack (onboarding gate plus detail routes) and the five tabs. Route types are in `types.ts`.
- `src/screens/` - one file per screen.
- `src/onboarding/` - school-first sign-up flow.
- `src/data/` - the model:
  - `types.ts` - domain types
  - `schools.ts` and `activities.ts` - catalogs
  - `selectors.ts` - pure reads
  - `actions.ts` - pure writes
  - `store.tsx` - the store contract and its demo backend (local, fictional data)
  - `remoteStore.tsx` and `remote.ts` - the Supabase backend: instant updates, server writes, live sync
  - `demo.ts` - fictional seed campus
- `supabase/` - database schema and privacy rules (`migrations/`), their tests (`tests/`) and local config. The schools migration is generated from `schools.ts` with `npm run gen:schools`.
- `src/ui/` - shared primitives. `src/theme.ts` - design tokens.

## Status

Milestone 2 (in progress): real accounts with emailed codes, and the feed, follows, kudos, comments, meetups, groups and chat sync live between phones. The server enforces every privacy rule. Still to come: tagging friends on any workout, and workout photos (the database side is built).
