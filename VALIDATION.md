# Validation — desktop MVP review build

## Home workout feed pass — September 17, 2026

- TypeScript passes; 29 check groups pass (7 onboarding and 22 social/feed/Rec-space checks).
- Web production and native iOS/Hermes exports pass. Native export is not a physical iPhone test.
- Confirmed Activity, Classes, Home, Community, Profile order, Home selected after reload, and visible labels at 390×844 and 320×568.
- Browser-tested like toggle, comment creation, connected workout message draft, deliberate local Send, and inbox preview. A reload preserved the liked state, comment count, and notification read state.
- Marked notifications read. Notifications only use public workouts from current connections, with sample updates labeled.
- Saved a test Bench press privately, selected Public workout feed, entered a separate caption, and verified the resulting card's summary/metrics. Private notes are excluded by explicit projection, also covered by automated tests. Unshare removed the card from Friends and Campus.
- Tested the Campus-to-message connection gate and Connect & write action. A draft opened for the correct person without sending it automatically.
- Reviewed Home, comments, connect dialog, and conversation at mobile widths. At 320px, document width equals viewport width; conversation controls remain reachable while content scrolls.
- Fresh browser reload reported no console errors. All five onboarding source files retained their pre-change SHA-256 hashes.
- Prototype actions and fixture data are local only. No real student received a message or comment. Browser checks added a private test workout and local sample social interactions.

The earlier validation records below describe previous development passes.

## Visual onboarding pass — September 17, 2026

Validated the local `codex/rec-onboarding-visuals` implementation on localhost:8082:

- TypeScript passes; 20 model check groups pass, including the new Rec-space mapping and off-site-interest exclusions.
- Web production export and iOS/Hermes export pass with `react-native-svg` installed through Expo's SDK 57 dependency resolver.
- Replayed every onboarding question through the new summary and saved back into Home.
- Selected Running, went back to year, returned to interests, and verified the choice persisted; restored the original interests before saving.
- Checked browser `aria-checked` state and progress values; fixed the React Native Web state-prop compatibility gap.
- Checked layouts at desktop, 390×844, and 320×568. The narrow document has no horizontal overflow; the fixed primary action stays visible.
- Selected Aquatics and Studios on Home; the illustration and description changed, and the Studios action opened Classes.
- Corrected bottom-tab label clipping and SVG DOM-prop warnings. A fresh reload reports no browser console errors.
- Reduced-motion code paths use immediate updates; OS-level reduced motion and VoiceOver still need physical-device review. Native compilation is not a physical iPhone test.
- The Higgsfield image in `design/rec-maquette-concept.png` is a future-model reference only. No mesh, surveyed layout, or live wayfinding is claimed.

The earlier acceptance record below describes the original MVP, not additional tests repeated in this visual pass.

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
