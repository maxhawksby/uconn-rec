# Student identity: prototype and university integration

## Implemented September 17, 2026

First-run animated welcome, five questions, @uconn.edu syntax validation, locked sample first/last name, optional preferred first name, year, ten multi-select interests, persistence, profile editing, personalized initials/greeting, and class category suggestions. Completed users bypass onboarding on later launches. Existing workout/feed data is preserved.

The local demo identity is Alex Morgan. It is an explicit fixture, not data extracted from the entered email. The email is not verified or transmitted. No university database is queried and no administrator can access the local prototype. There is no student authentication or access control yet. Names accept Unicode letters, marks, spaces, apostrophes, and hyphens; this checks format, not whether a name is authentic or appropriate.

## Production integration path

UConn recommends Entra for new SSO integrations, with requests made through the Technology Support Center. Request a university application registration, approved mobile redirect URIs, and the minimum permitted identity/affiliation claims. The authoritative source and availability of first name, surname, current-student affiliation, and class year must be confirmed with ITS. SSO access does not itself grant access to student databases.

Use university-hosted sign-in; do not collect NetID passwords in this app. A backend should validate tokens, issuer, audience, expiry, and current-student eligibility. Store an immutable university identifier and authoritative first/last name independently from preferred first name. Do not trust client-side fields as proof of identity. Use approved name policies, server-side validation, and review/reporting for inappropriate names rather than treating a regex as name moderation.

The planned notice about administrator visibility is shown conditionally as a planned policy, not as a claim that this independent prototype already has university affiliation. Before rollout, confirm this notice with the university and implement authorized roles and audited access. Scope retention and access to actual app needs; do not copy an entire student record.

The stored prototype profile is ordinary local AsyncStorage data. It is not secure storage for tokens or private university records. No auth tokens or student database credentials belong in client source, Expo public variables, or this local profile object.

## Why email parsing is insufficient

New UConn email addresses use NetID@uconn.edu. Older first.last aliases also exist. Therefore neither a name nor current-student status can be reliably inferred from the email text. Keep name retrieval behind an approved identity service.

## Interests

Strength training, running, walking, cycling, swimming, yoga, Pilates, HIIT/circuits, basketball, and dance fitness. This is a shared, unranked set informed by campus recreation offerings. It is not a measured top-ten popularity ranking for men or women. No gender collection is needed. Suggestions currently map interests to broad class categories; they do not invent classes absent from the sample schedule.

## Official references

- https://iam.uconn.edu/uconn-single-sign-on-integration/
- https://dailydigest.uconn.edu/publicEmailSingleStoryView.php?cid=24&id=253061&iid=7179
- https://recreation.uconn.edu/fitness-classes/
- https://recreation.uconn.edu/src/

## Visual direction

Use the user's supplied Rec Center photograph, dimmed at render time over charcoal #101419. Slate surfaces #252D35, muted text #B6C0C9, and soft white #E1E8EE. The browser welcome canvas uses a 9:16 ratio; native layouts fill the actual device and respect safe areas and keyboard space. The welcome pulse is finite, can be skipped, and is suppressed when Reduce Motion is enabled. Subsequent steps use a brief fade/translation. No artificial database lookup or verification animation.
