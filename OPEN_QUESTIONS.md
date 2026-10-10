# Open questions

Facts the site needs that neither the old page nor the repo can answer. Each one has a visible `TODO` in `content/site.json`; nothing here has been invented. Blank answers in the New Info template landed here.

| # | Question | Where it shows | site.json key |
| --- | --- | --- | --- |
| 1 | ~~Official name~~ Set to **Hot Potato: Tag Out** on 2026-10-10 from the Steam URL the team sent. The page shows "Hot Potato" (`meta.shortName`); the full name goes to JSON-LD. Shout if the subtitle should appear on the page | JSON-LD | `meta.officialName` |
| 2 | ~~Release status~~ Answered 2026-10-09: closed beta on Discord first, early access Feb–Mar 2027, full release Q3 2027. Open: the beta's date or window | Hero roadmap | `meta.roadmap` |
| 3 | Platforms as listed on Steam (Windows only? Deck verified?) | Hero kicker, JSON-LD | `meta.platforms` |
| 4 | Player count: local and/or online, minimum and maximum | Hero kicker, "How it plays" | `meta.players` |
| 5 | Genre tags as on the Steam page | JSON-LD, meta keywords | `meta.genreTags` |
| 6 | PEGI / age rating, if any | Footer | `meta.ageRating` |
| 7 | Price: team says "around 4,99, premium". Stored but **not rendered** until it is public and final (`meta.price.public`) | Hero (optional) | `meta.price` |
| 8 | ~~Logo~~ Received 2026-10-10 as a transparent PNG (881 px): `assets/img/logo-1200.webp` / `-600.webp`. Used in the hero, the event screen and the links/QR pages. An SVG would still help for print | Hero, screen, links, QR | `hero.logo` |
| 9 | The 3–4 concrete mechanics that make it different (not adjectives). The section is hidden (`features.visible = false`) until this is answered | "What makes it different" | `features.items[]` |
| 10 | ~~Rules for Infected and Team deathmatch~~ Answered 2026-10-10: Infected starts with one potato that infects whoever it tags; Team deathmatch is tag in teams. Confirm the one-line wordings on the page | Modes | `modes.items[].rules` |
| 10b | ~~Modes~~ Answered 2026-10-10: **Infected** (beta), **Tag, you're it** (beta, everyone against everyone) and **Team deathmatch** (in development, the team mode). Rules of Team deathmatch to come when it exists | Modes | `modes.items[]` |
| 11 | ~~"Tag, you're it"~~ Folded into 10b | Modes | |
| 12 | Are Potato and Runner the only roles, or are there selectable characters/skins? The old page listed them as "Characters" but the screenshots show them as the two states of one round, so they are modelled as **roles** | Roles section | `characters` |
| 13 | Maps / arenas: is the container yard the only arena? Name and one-liner for each | Gallery captions, Modes | not modelled until known |
| 14 | Press kit: the team is making it (2026-10-10). Until `pressKit.available` is true the page says so and points press to the email; then set `pressKit.cta.href` | Press kit block | `pressKit.available`, `pressKit.cta.href` |
| 15 | ~~Discord invite~~ Replaced on 2026-10-10 with `discord.gg/gQEActAFX`; CI checks it against Discord's API for an expiry | Socials | `socials.items[discord].href` |
| 16 | ~~Email~~ Answered 2026-10-10: `wildalchemists@gmail.com` takes everything (replaces the old page's `hello@wildalchemists.com`) | Contact | `contact.email` |
| 17 | Press or creator quotes with a source link. None existed; the block is hidden (`press.visible = false`) | Awards & press | `press.items[]` |
| 18 | Awards since 2025 (FreakCon Málaga 2026 or others?) and laurel artwork per event, if the events provide it | Awards | `awards.items[]` |
| 19 | ~~Team size~~ Answered 2026-10-09: 8 people (2 programmers, 3 artists, 2 designers, 1 producer) | Studio stats | `team.stats` |
| 20 | Team credits to show (name · role), if wanted | Studio | `team.members[]`, `team.showMembers` |
| 21 | Newsletter sign-up wanted? The beta sign-up is the Discord, so a form may be unnecessary. Otherwise: If yes, it needs Firestore (free tier is enough; App Check needs reCAPTCHA Enterprise). Otherwise the contact block stays a mailto link | Contact | `meta.firebase`, `contact.form.enabled` |
| 22 | Other social handles. Community-first suggestion: TikTok and YouTube Shorts for clips (the game reads in 3 seconds of video), a Steam **Playtest** or the Steam community hub for the beta waitlist, Bluesky only if someone will post there. Instagram, Discord and Steam are the three big CTAs | Socials | `socials.items[]`, `socials.primary` |
| 23 | Gameplay clips (mp4/webm) for a muted loop, and any additional screenshots at native resolution (the seven recovered ones are the only assets) | Trailer, Gallery | `trailer.loop`, `gallery.items[]` |
| 24 | Events the game will be shown at (dates), if an "Events" line is wanted | Studio / news | not modelled until known |
| 25 | Final domain: stays on `wildalchemists.github.io/HotPotatoWeb/` or moves to a custom domain? Affects canonical URLs, hreflang and the OG image path | `<head>` | `meta.siteUrl` |
| 26 | Portfolio repo URL (the editor in Prompt 4 should match it) | Editor | n/a |

## Decisions taken without asking (reversible)

- **Contact email** was `hello@wildalchemists.com` (decoded from the old page); the team replaced it with `wildalchemists@gmail.com` on 2026-10-10.
- **Steam CTA** points to `https://store.steampowered.com/app/3650190/` (the old hero linked to the Steam homepage).
- **Awards** appear once in data; the hero only references them (`hero.showAwards`).
- **"Maps & Modes"** held modes, so they are `modes`; there is no `maps` key until question 13 is answered.
- **Copyright year** set to 2026 (old page said 2025).
- The old **LinkedIn** link carried `?viewAsMember=true`; stripped.
- **Nav "Characters"** became **"Roles"** (question 12); rename back is a one-line change.
