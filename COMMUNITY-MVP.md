# Community MVP — September 17, 2026

## Experience
A charcoal photographic welcome leads through student status, email, sample student name + preferred first name, year, searchable Rec interests, optional friend discovery, and optional group joining. Home reflects joined groups and connections. Community has Feed, Friends, and Chats. Students can join/leave groups, connect/remove demo friends, send local group messages, and explicitly share a saved workout summary without its private notes.

Design: charcoal #101419 and slate #27323C during onboarding; navy #13233A, blue actions, and white surfaces in the app. System type keeps native readability. Large left-aligned questions, fixed next/back navigation, expandable activity families. The supplied Rec photo anchors the welcome in campus. Reduced-motion settings suppress the intro animation.

## Catalog provenance
Reviewed public UConn Recreation pages on September 17, 2026; normalized and deduplicated activity names rather than copying descriptions or collecting student/contact records:
- https://recreation.uconn.edu/fitness-classes/
- https://recreation.uconn.edu/src/
- https://recreation.uconn.edu/club-sports/teams/
- https://recreation.uconn.edu/intramural-sports/
- https://recreation.uconn.edu/adventure-center/trips-clinics/
- https://recreation.uconn.edu/climbing-center/

Six browsable sections. Group classes includes named formats plus broader yoga/Pilates/dance/HIIT/cycling interests. Repeated sports share one selection across sections. Seasonal/historical offerings are interests, not claims about today's availability. Source links are available in each section. The Classes schedule remains explicitly sample data, with no real registrations. This is a curated snapshot of published offerings, not an exhaustive live university API.

## Matching
Deterministic MVP: 3 points per shared selected interest, 2 for the same class year, 4 for a sample contact when contact preview is enabled. Require a shared interest or an explicitly enabled sample contact match. Reasons appear on each card. No gender or location inference. First-year students get a New students group per selected activity; everyone gets the all-years crew. Connections are instantaneous demo actions, not simulated consent from real students. All people are fictional fixtures; no real directory identities imported.

## Integration boundary
Local AsyncStorage only. No UConn identity verification, contact permission prompt, address-book access, invitations, server, real users, or message delivery. Email cannot supply a verified name. Production needs an approved UConn sign-in integration and authorized identity claims. Contact discovery needs an explicit opt-in, revocation/deletion path, limited identifiers, server-side matching, and no unsolicited invites. Production friendships require mutual acceptance; groups need membership authorization, reporting/blocking, moderation, and discoverability/privacy controls before real students join. University affiliation and administrator access remain planned policy, not implemented access.

## Verification
TypeScript and web production bundle pass. Onboarding validation tests and matching/catalog tests pass. Browser exercise on an isolated origin covered group joining, sending a message, saving a workout, confirming a workout share, and retaining group membership after reload. The shared summary excluded private notes. Existing profile remains compatible with expanded interest IDs. Native phone appearance and keyboard behavior require an on-device review.

## Review build 04
Named fitness classes now map to broader activity families for recommendations; selecting Yoga plus Flow Yoga does not inflate matching scores or duplicate suggested yoga groups. Connected demo friends have direct chats. Group details support leaving a group, and friend conversation details support removing a demo connection. History stays local and becomes available again after rejoining/reconnecting.

Workout history retains individual sets for newly saved workouts; older records preserve their existing totals. Activity and chat both support choosing a workout and explicitly confirming the target conversation. A fixed composer and keyboard-aware modal support native phone review. Local storage validates restored shapes and only writes after an explicit edit; writes are serialized and errors are visible.

Review build checks, known limits, and Expo walkthrough are recorded in VALIDATION.md and README.md. The implementation remains an interactive local MVP with fictional people and no backend services.
