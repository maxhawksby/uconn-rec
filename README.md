# Dean's Lift

A Strava-style fitness community for college students. Verify your school email, log any workout (lifting, runs, rides, pickup games, club practices, classes), and see what your friends, crews and campus are doing. It's independent and not affiliated with any university. The pilot campus is UConn; other schools join a waitlist.

React Native 0.86 · Expo SDK 57 · React Navigation 7 · TypeScript. Product spec: [`docs/BRIEF.md`](docs/BRIEF.md). Design system: [`docs/DESIGN.md`](docs/DESIGN.md).

## Run it

```bash
npm ci
npm start              # same Wi-Fi as your phone; scan the QR with Expo Go (SDK 57)
npm run start:tunnel   # any network, incl. campus Wi-Fi or cellular
```

The QR page is also served at http://localhost:8081/connect.html.

## Check it

```bash
npm run typecheck
npm test               # pure model checks: sign-up gating, feed, streaks, PRs, meetups, groups
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
  - `store.tsx` - React store with local persistence
  - `demo.ts` - fictional seed campus
- `src/ui/` - shared primitives. `src/theme.ts` - design tokens.

## Status

Milestone 1 (pitch build): all data is local and fictional. Codes are shown on screen instead of emailed, and nothing syncs between phones. Milestone 2 swaps the local store for Supabase behind the same actions API.
