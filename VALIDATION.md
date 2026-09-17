# Validation — desktop MVP review build

Checked September 17, 2026. This completes the local design/MVP development pass and is ready for a joint Expo walkthrough.

## Automated
- TypeScript: passed.
- Onboarding: 7 check groups passed (email, international preferred names, domain spoofing, malformed profiles, surname preservation, interests).
- Social: 11 check groups passed (catalog integrity, class-family matching, same-year ranking, no duplicate score inflation, optional contacts, cohort groups, conversation membership, blank/overlength messages, immutable updates, corrupt storage, private-note exclusion).
- Web production bundle passed (560 modules).
- iOS/Hermes production bundle passed (874 modules, approximately 2.1 MB).
- Expo SDK 57 development manifest and iOS development bundle return HTTP 200.
- LAN manifest resolves the bundle to 192.168.4.27. Browser and QR pages respond on port 8081.

## Browser acceptance checks
Performed on isolated QA origins, leaving the user's live localhost:8081 data alone:
- First-visit welcome, nonstudent path, rejected external email, valid demo email, preferred first name, year and interests.
- Search for a named class (Flow Yoga), select it, and receive yoga-related friend/group suggestions.
- Skip contact matching and friend connections, join a first-year group, finish onboarding, reload, retain profile and group.
- Edit interests directly from Profile; close editor without changing saved profile.
- Preview/revoke sample contacts; connect with a demo friend.
- Join a group, send a message, share a saved workout, reload, retain messages and membership.
- Direct conversation with a connected demo friend; send and share a workout there.
- Change a workout's reps, save, retain individual set values and expected volume (3,790 lb).
- Share that workout from Activity to the selected group; private notes excluded.
- Leave a group using conversation details; remove its active chat entry while preserving local history for rejoining.
- Reserve a sample class and see it in My classes.
- Write a local feed post and see it in Feed.
- Layout inspection at desktop, 390×844, and 320×568; no document-level horizontal overflow at the small size. Compact welcome spacing keeps its fixed Continue button visible.

## Remaining physical-device review
The native iOS bundle compiles, but these latest changes have not been visually tested on the user's physical iPhone. Review keyboard avoidance, safe areas, native scrolling, VoiceOver, and larger text in Expo Go. A web viewport check is not an iOS simulator test.

## Integration limits
No university account verification, contact permission prompt/address-book access, cross-device synchronization, real message delivery, friend acceptance workflow, moderation service, live schedules, or occupancy API. Contact matching uses explicit sample fixtures. These remain production integration work, not hidden functionality in this build.
