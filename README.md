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

Admins can give awards in the app. Only this script makes someone an admin (after they've signed up); `--founder` also gives the Founder crown:

```bash
npm run make-admin -- maxwell.hawksby@uconn.edu --founder
```

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
- `supabase/` - database schema and privacy rules (`migrations/`), their tests (`tests/`) and local config. The schools and majors migrations are generated from `schools.ts` and `majors.ts` with `npm run gen:catalog`.
- `src/ui/` - shared primitives. `src/theme.ts` - design tokens.

## Status

Milestone 2 (in progress): real accounts with emailed codes, and the feed, follows, kudos, comments, meetups, groups and chat sync live between phones. Tag the friends you trained with on any workout; once they accept, the post shows both names, lands on their profile, and everyone tagged can add photos (stored privately in Supabase Storage). The server enforces every privacy rule. Seeded students to try it as: `jordan.reyes@uconn.edu` has a tag request waiting from Kayla.
