# Valence - Brief

*October 9, 2026, renamed from Dean's Lift on October 10. Replaces the UConn Rec concept. Valence is the chemistry term for how many bonds an atom can form: fitness plus connection.*

## What & why

UConn Rec declined to partner because they are committed to their vendor, Fusion. So Valence is an independent app, not tied to any one school. It is a Strava-style fitness community built only for college students. Students verify their school email, log every kind of workout (lifting first, plus runs, rides, pickup games, club practices and classes), and see what their friends, teams and campus are doing. Gym apps run by schools handle bookings and capacity. Valence owns the social layer that schools will never build: friends, crews, student-run meetups, and campus-vs-campus challenges. We launch at one campus (UConn, unofficially) to build a dense community, then expand school by school.

## Scope (v1)

- **New brand.** The name Valence, our own colors and imagery (neutral white, black and grey base with one accent). All UConn names, colors, photos and copied Rec content are removed.
- **School-first onboarding.** Search for your school, then verify with a one-time code sent to your .edu email. Pilot-school students get in. Everyone else joins a waitlist with a progress message ("your campus unlocks at 50 students").
- **Home is the friends feed.** Workouts from friends and groups, with kudos and comments.
- **Record any workout:**
  - lifting (exercises, sets, reps, weight)
  - runs and rides with a GPS route map, pace and distance
  - pickup sports and intramurals (sport, duration, who you played with)
  - classes, club practices and other cardio (type and duration)
- **Workout together.** Tag the friends you trained with on any workout, not just sports. The post shows both names ("Caleb Menash & Hannah Weiss"), lands on each person's profile once they accept the tag, and everyone tagged can add photos to it. Photos also show on the workout's detail screen.
- **Meetups tab** replaces Classes. A student posts "pickup basketball at 7, need 4." Others join with one tap.
- **Groups.** Student-made crews (dorms, clubs, teams, majors) with a group chat.
- **Profile.** Streaks, weekly summary, personal records, and a school badge (text only, never a school logo).
- **Opt-in competition.** Challenges and leaderboards exist only for students who join them. Belonging comes first.
- **Real backend (Supabase).** Real accounts, data shared between phones, and privacy rules enforced on the server. We develop against a local copy running in Docker, then move to hosted Supabase when real users arrive.
- **Health sync.** Apple Health and Google Health Connect import workouts from Apple Watch, Garmin, Whoop, Oura and similar. This needs our own test build of the app, so it can't run inside Expo Go.
- **Safety basics.** Report and block, private-by-default options, and a way to delete your account and data.

## Not in scope

- Direct messages between two students. Group and meetup chats only until moderation is proven.
- Any school logo, official color, photo, schedule, occupancy data or partnership claim.
- Strava import. Their API rules forbid showing a user's data to friends.
- Direct Garmin or Whoop partnerships. Pursue these after forming an LLC; health sync covers most of the need meanwhile.
- Payments, premium plans, AI coaching, web app.
- Tapping the phone as a student ID at the gym. Campus card readers only accept credentials the school's card vendor issues and signs with secret keys (Apple Wallet student IDs run on that same school deal). We can't issue one without a partnership, and copying one would be cloning a security credential.
- Launching beyond the pilot campus.

## Milestones

1. **Pitch build (by Monday, Oct 12).** Runs in Expo Go with demo data. Includes:
   - the rebrand to Valence and removal of all UConn material
   - school search, a simulated .edu code step, and the waitlist
   - the feed with kudos and comments
   - the Meetups tab, the generic activity list, and the new five-tab layout (Feed, Record, Meetups, Groups, Profile)
2. **Real backend.** Local Supabase in Docker. Real sign-up with .edu email codes. The feed, groups, meetups and group chat all sync across two phones. Workout photos (stored in Supabase Storage) and shared workouts with tagged friends. Privacy rules live on the server.
3. **Recording and stats.** Polished lifting logger, GPS runs and rides with maps, sports and class logging. Streaks, weekly summary, personal records, and opt-in challenges and leaderboards.
4. **Ready to ship.** Report, block and account deletion. Our own test build (via Expo's build service, EAS) with Apple Health and Health Connect sync. Hosted Supabase. TestFlight once Apple approves the developer account.

## Later ideas

- QR check-in at meetups, so the host can see who showed up.
- A "you're at the gym, start a lift?" prompt when your phone arrives at a saved gym.

## Acceptance criteria

- Max can open the app on his phone and find no mention of UConn Rec, Husky colors, or the Rec photo.
- Max can search "UConn" during sign-up and get in. If he searches another school, he sees its waitlist screen.
- Max can log a lifting session, then see it at the top of his feed and give kudos or a comment on a friend's workout.
- Max can post a meetup and see a second account join it (milestone 2: on a second phone, in real time).
- Max can sign up on two phones with two .edu emails, follow each other, and see each other's workouts (milestone 2).
- Max can tag a friend on a lift, the friend accepts on their phone, and both add a photo that shows on the shared post (milestone 2).
- Max can record a walk outdoors and see the route on a map with distance and pace (milestone 3).
- Max can join a challenge and see a leaderboard, and a friend who hasn't joined never sees a ranking (milestone 3).
- Max can install the test build, connect Apple Health, and see an Apple Watch workout appear in the app (milestone 4).

## Open questions

- **Name check.** Plain "Valence" is taken in the App Store (a small emotions app), so the store name needs a second part, such as "Valence: Campus Fitness". valence.fit and trainvalence.com looked unregistered on Oct 10; most other Valence domains are taken. A trademark lawyer should confirm before the test build ships.
- **Pilot unlock number.** How many students unlock a campus (50 is a placeholder)?
- **Default visibility.** Does a new workout default to friends-only or the whole campus?
- **Moderation.** Who reviews reports during the pilot?
- **Brand identity.** Palette, logo and voice. To decide in the milestone 1 design pass.
- **Company.** When to form an LLC (needed for Garmin and Whoop programs, and for investment).
