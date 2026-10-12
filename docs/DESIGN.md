# Valence - design system

Tokens live in `src/theme.ts`; primitives in `src/ui/`. Screens use these and never inline hex values or one-off sizes.

## Who and what it should feel like
College students logging lifts, runs, pickup games and classes, and checking what their friends did. It should feel like a scoreboard at a packed rec center: loud numbers, quick reads, your crew's names on the board. It should not look like a wellness app or like any one school.

## Brief
- **Mood:** varsity, kinetic, unpretentious.
- **Type:** Barlow Condensed 800 in uppercase for titles (jersey lettering), Barlow Condensed 700 for numbers, Barlow 400/500/700 for reading. Display 48 / title 32 / h2 22 against body 15: big jumps on purpose.
- **Color:** court gray ground `#F2F3F5`, white cards, ink `#14161B` text and scoreboard panels, **neon pink `#FF4FB8`** (with ink on top, never white) for the single primary action, kudos and live states. Turf green `#1E7A4E` only means "verified / joined / success". Nothing navy, nothing school-colored.
- **Layout:** left-aligned, 20pt gutters, cards with a tight 8pt radius. Only chips are fully round. Five tabs with Record as a raised neon-pink square in the center.
- **Signature moment:** the **Scoreboard** (`src/ui/Scoreboard.tsx`): an ink panel with condensed numerals for the stats that matter (workout time and distance, weekly totals, streak). It's the thing people screenshot.
- **Risk we're taking:** all-caps condensed headlines everywhere a title appears. It's loud, and it's the brand.

## What we killed (AI defaults)
- Track orange (`#FF5A1F`): it read as Strava's color.
- The navy and white "athletic blue" from the old concept: it read as one specific school.
- Purple-to-blue gradients and glassy cards: generic fitness-app look.
- Uniform big rounded corners: chips are round, cards are 8pt, and the Record button is a rounded square.
- System or Inter type: Barlow gives the athletic voice.

## Rules for screens
- Text always goes through `<Text variant=…>`, and color through palette keys (`color="muted"`).
- Spacing comes only from `space.*`, and radius from `radius.*`.
- Eyebrows must say something true (school name, activity type, member count) - never decoration.
- Pink text and icons on light surfaces use `accentText` (`#A3105F`); the neon itself is only a fill, or text on ink panels.
- Neon pink means "the main thing to do here". Use it once per screen.
- Every list designs its empty state with `EmptyState`, and says what to do next.
- Gold (`gold` on `goldSoft`) is for awards only, such as the Founder crown. Nothing else is gold.
- Badges come in two kinds. **Identity badges** (major, Greek life, clubs, teams) are quiet gray chips on the profile. **Awards** are admin-given; the top one (lowest rank) sits as a small icon right after the student's name everywhere the name appears (`NameMark`), and all of them show as tiles on the profile.
- Schools appear as text (`SchoolBadge`) only. Never a logo, mascot or school color.
- Dark mode: `palettes.dark` exists but M1 ships light. Don't hard-code light-only assumptions such as white text on `bg`.
- Motion: one orchestrated entrance per screen at most. No sprinkled micro-animations.
