# UConn Rec — interactive mobile MVP

React Native 0.86 / Expo SDK 57 / React Navigation 7 / TypeScript. An independent UConn Rec concept focused on design and student community.

## Get started

Clone the private repository with your authorized GitHub account, then run:

```powershell
git clone https://github.com/maxhawksby/uconn-rec.git
cd uconn-rec
npm ci
npx expo login --browser
npx expo whoami
npm start
```

The launcher generates a new Expo QR for the current LAN address.

- Desktop: http://localhost:8081/
- iPhone QR: http://localhost:8081/connect.html
- Use Expo Go supporting SDK 57 on the same network. If sign-in is requested, use the same Expo account on the computer and phone.
- Leave the server running for Fast Refresh. Windows cannot run the native iOS Simulator; use the physical iPhone for native review.
- Fresh installation: `npm ci`, then `npm start`.

## Walkthrough

1. A first visit opens the animated dark welcome. Existing profiles can choose **Profile → Replay welcome & preferences**.
2. Enter a sample UConn email, choose a preferred first name and class year.
3. Search the 101 interest options from published UConn Rec offerings, grouped into six sections. Named classes also match their broader activity family.
4. Preview optional sample-contact matching and connect with demo students. Both are optional.
5. Join a suggested group, such as **New students - Weightlifting**, then enter Home.
6. In **Activity**, enter sets or a duration and save privately. Individual sets are retained for new workouts.
7. Use the share icon in workout history to select a group or connected friend. Confirm the summary; private notes are excluded.
8. In **Community**, explore Feed, Friends, and Chats. Send local messages, share a saved workout, leave a group, or remove a connection through conversation details.
9. Browse sample classes and reserve/cancel a local demo spot. Update interests directly from Profile.

## Scope

The activity catalog is a curated snapshot of UConn Recreation public pages, reviewed September 17, 2026. Seasonal availability is not live. Identity, students, messages, posts, class times, reservations, and occupancy are demo data. No university sign-in, real contact access, network messaging, or actual registrations are connected.

Workouts, profiles, posts, reservations, friends, and chats persist locally. They do not sync between browser and phone. The provided Rec photo is used on welcome and Home; the other fitness images are illustrative.

## Check

- `npm run typecheck`
- `npm test` (onboarding + social/model checks)
- `npm run export:web`
- `npx expo export --platform ios`

## Code and notes

- `src/Main.tsx`: navigation, Home, Activity, Classes, Community, Profile.
- `src/onboarding/`: profile, campus catalog, welcome and interest picker.
- `src/socialModel.ts`: fictional students, activity families, matching, message validation.
- `src/social.tsx`: local community state and suggestion cards.
- `src/Conversation.tsx`: keyboard-aware conversations and explicit workout sharing.
- `src/useLocalData.ts`: serialized local persistence with validation and read-failure preservation.
- `COMMUNITY-MVP.md`: matching and integration design.
- `IDENTITY-INTEGRATION.md`: approved university identity integration still needed.
- `VALIDATION.md`: checks and physical-device review limits.

## GitHub and normal terminal workflow

The source repository is [maxhawksby/uconn-rec](https://github.com/maxhawksby/uconn-rec). Local Expo settings, credentials, environment files, generated QR images and dependencies are ignored.

Run development from this same application folder. GitHub stores version history; Expo runs locally in your terminal. Codex can continue editing these same files while Expo Fast Refresh displays changes on the phone.

```powershell
npx expo login --browser
npx expo whoami
npm start
```

The launchers use normal per-user Expo settings. A login made with `npx expo login` is shared by `npm start` and `node scripts/dev.mjs`. The optional `node scripts/login.mjs` helper follows the same convention.

Leave the terminal running while reviewing the app. Expo login and GitHub login are separate. A successful Expo login still requires the phone and computer to have a reachable development-server connection.
