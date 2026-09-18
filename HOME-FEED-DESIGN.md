# Home: a campus activity feed

Keep the existing UConn navy (#000E2F), blue (#013ECD), pale blue and warm, supportive language. Keep onboarding untouched. Use the existing system typography: compact bold names and titles, large tabular workout metrics, quiet metadata. The layout is a small Rec wordmark with notifications/messages, three equally sized action tiles, Friends/Campus filters, then a chronological feed. Home sits at the center of Activity, Classes, Home, Community, Profile and remains the initial route.

Borrow interaction patterns from Strava, not its orange branding or competitive emphasis: author/activity/stat hierarchy, reactions and comments directly beneath a workout, and an inbox reachable from Home. Each card has one clear summary, three metrics at most, and labeled actions. Original Rec emblems give the action tiles and workout categories a shared campus identity. Move the illustrated Rec explorer to Profile to keep the feed close to the top.

Public workouts only. Friends filters by actual local connections; Campus exposes clearly labeled sample community workouts and a Connect action. With no connections, Campus is the initial discovery view. Logging stays private; sharing to the feed is an explicit choice with a separate public caption. Private notes are never copied. A shared workout can be returned to private. Likes, comments, shares, notification read state, and conversations persist on this device. No remote service, Strava integration, fake replies, or live university data is implied.

References reviewed September 17, 2026:
- https://www.strava.com/features — Train / Explore / Compete sections, bold visual hierarchy, modular feature explanations, and large activity imagery. The page's main content rendered in the browser after the text scraper initially exposed only navigation/footer.
- https://support.strava.com/en-us/articles/15402008-how-do-i-give-and-receive-comments-on-strava — activity-level comments, counts, and deletion of one's own comment.
- https://support.strava.com/en-us/articles/15401651-messaging-on-strava — Home inbox and activity-related conversations subject to connection/privacy controls.
- https://support.strava.com/en-us/articles/15401987-how-do-my-activity-privacy-controls-work-on-strava — explicit activity visibility and private activities excluded from public feeds.

Review targets: a workout should appear in the first viewport; no hero or marketing headline above the feed. Check 390px and 320px layouts, keyboard/modal behavior, labeled touch targets, persistent reactions/comments, connected-only messaging, private-note exclusion, unsharing, and the exact navigation order. Use FlatList for feed growth. Avoid an ornamental animation that slows reading or turns encouragement into competition.

## Reference extraction and adaptation

The rendered Strava features page uses an introductory hero, a three-anchor navigation strip, alternating image sections and three-column explanations, a free/subscription comparison, and a closing subscription invitation. Its training section covers finish-time predictions, performance comparisons, and AI analysis; exploration covers personalized routes, map layers, and route stops; competition covers segment rankings, friend challenges, and repeated-route achievements. The comparison also includes recording, community, goals, training history, and progress tracking.

For this requested pass, recording maps to the existing Activity logger; community becomes public workout cards, likes, comments, and connected conversations. Clear statistics and direct actions transfer to the app's small screen. Route exploration suggests a future Rec-space explorer, for which the original architectural illustration remains available in Profile. Predictions, leaderboards, subscriptions, AI coaching, and challenges are outside this change. The app continues to emphasize showing up and encouraging friends.

## Visual review

Desktop and 390×844: the header and three action tiles lead directly into the first complete workout card, including its actions. The central Rec emblem makes Home recognizable; other labels remain legible. At 320×568, the feed scrolls below a stable header and navigation bar; no horizontal overflow. Dialogs scroll independently and retain their message/comment controls. The dark metric strip provides hierarchy without adding another hero image above the feed.
