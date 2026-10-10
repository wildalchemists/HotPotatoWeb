# Copy pass (Prompt 6) — 2026-10-10

Scope: `content/site.json` only, no layout changes. Voice: a small team describing what happens on screen; no hype, no tricolons, no "whether you're X, Y or Z", no rhetorical headlines, no em dashes left on the page (the roadmap's `Feb–Mar` is an en dash). Spanish is castellano de España in `tú`, written rather than translated; sector terms stay in English (party brawler, gameplay, beta, press kit); store actions use Steam's own wording ("Añadir a tu lista de deseados").

## Changes

| Key | Old EN | New EN | New ES | Why |
| --- | --- | --- | --- | --- |
| `meta.title` | Hot Potato — a party brawler by Wild Alchemists | Hot Potato: the party brawler where you don't want to be it | Hot Potato: el party brawler donde no quieres ser la patata | The old title repeated the genre and used an em dash; this one says what the game is about. |
| `meta.description` | Hot Potato is a multiplayer party brawler by Wild Alchemists. Get tagged and you're the potato: pass it on before the clock hits zero. Wishlist on Steam. | Hot Potato is a party brawler by Wild Alchemists. Get tagged and you turn into the potato; pass it on before the clock hits zero. Early access on Steam in 2027. | Hot Potato es un party brawler de Wild Alchemists. Si te pillan, te conviertes en la patata; pásala antes de que el reloj llegue a cero. Acceso anticipado en Steam en 2027. | Adds the one fact a search result needs: when. Drops the second CTA sentence. |
| `trailer.title` | Hot Potato — trailer | Trailer | Tráiler | "Hot Potato — trailer" repeated the name and spent an em dash. |
| `howItPlays.intro` | One potato, one arena, one clock. Nobody wants to be holding it when it runs out. | There is one potato and one clock. Nobody wants to be holding it when the clock runs out. | Hay una patata y un reloj. Nadie quiere tenerla cuando el reloj llegue a cero. | "One potato, one arena, one clock" was a tricolon. |
| `howItPlays.beats[0].body` | Whoever is the potato runs at you. One touch and now it's you. | Whoever is the potato runs at you. One touch and now it's you. | Quien lleva la patata va a por ti. Un toque y ya eres tú. | EN kept; ES "ya eres tú" is how you'd say it out loud. |
| `howItPlays.beats[2].body` | Chase, jump, corner someone, tag them. Their problem now. | Chase someone up the containers and tag them. Their problem now. | Persigue a alguien por los contenedores y tócale. Ahora es su problema. | Four stacked verbs became one thing you see on screen. |
| `modes.items[0].rules` | Classic rules: one potato, everybody runs, whoever holds it at zero is out. | One potato for everyone. Whoever is holding it at zero is out. | Una patata para todos. Quien la tenga a cero queda fuera. | "Classic rules: one potato, everybody runs, whoever…" was a tricolon with a label in front. |
| `characters.items[0].line` | Catch another player to pass the potato on. | Catch anyone and the potato is theirs. | Pilla a cualquiera y la patata es suya. | Shorter, and says the consequence instead of the instruction. |
| `characters.items[1].line` | Keep moving, keep your distance, don't get tagged. | Stay out of reach. If the potato touches you, you are the potato. | No te dejes alcanzar. Si la patata te toca, la patata eres tú. | "Keep moving, keep your distance, don't get tagged" was a tricolon. |
| `team.blurb[1]` | Hot Potato is our first game on Steam. It is built in Unreal Engine 5 and shaped with the people who play it: the beta happens on our Discord first. | Hot Potato is our first game on Steam, built in Unreal Engine 5. The people who play it shape it: the beta runs on our Discord first. | Hot Potato es nuestro primer juego en Steam, hecho en Unreal Engine 5. Lo moldea la gente que lo juega: la beta pasa primero por nuestro Discord. | Two facts per sentence, the community line made active. |
| `socials.intro` | The beta runs on Discord, the clips land on Instagram, the wishlist lives on Steam. | The beta runs on Discord and the clips land on Instagram. The wishlist is on Steam. | La beta va por Discord y los clips por Instagram. La lista de deseados está en Steam. | Was a tricolon; now two sentences, same three places. |
| `contact.body` | Press, publishers, events, or you want into the beta: write to us or come to the Discord. | Press and business go to the email. Beta access goes through the Discord. | Prensa y negocio, al correo. Para entrar en la beta, al Discord. | "Press, publishers, events, or you want into the beta" was the "whether you're X, Y or Z" pattern. Now it routes people. |
| `contact.form.success` | Sent. We read everything, we answer most of it. | Sent. We read everything and answer most of it. | Enviado. Lo leemos todo y contestamos casi todo. | Comma splice fixed; cheek kept. |

Everything not listed was already in voice and stayed as it was (hero pitch, beat titles, roles, awards, press kit, UI strings, alt texts).

## Alternatives to choose from

**Hero pitch** (current: *Get tagged and you're the potato. Pass it on before the clock hits zero.* / *Si te pillan, eres la patata. Pásala antes de que el reloj llegue a cero.*)

1. EN *One of you is the potato. Tag someone and it's their problem. Whoever holds it at zero loses the round.* · ES *Uno de vosotros es la patata. Pilla a alguien y ya es su problema. Quien la tenga a cero pierde la ronda.*
2. EN *Hide in a container if you must. Whoever holds the potato at zero loses the round.* · ES *Escóndete en un contenedor si quieres. Quien tenga la patata a cero pierde la ronda.*

**Primary CTA** (current: *Wishlist on Steam* / *Añadir a tu lista de deseados*)

1. EN *Add it to your Steam wishlist* · ES *Añadir a tu lista de deseados de Steam*
2. EN *Wishlist it on Steam* · ES *A tu lista de deseados* (the short form Steam itself uses on buttons)

The Spanish CTA alternatives keep Steam's wording on purpose; the rule is Steam's own store vocabulary for store actions.

## Length check (ES within ±20 % of EN)

Outside the band:

| Key | EN chars | ES chars | ES/EN |
| --- | --- | --- | --- |
| `meta.releaseStatus` | 55 | 70 | 1.27 |
| `meta.roadmap[1].what` | 21 | 26 | 1.24 |
| `howItPlays.beats[0].image.alt` | 54 | 65 | 1.20 |
| `howItPlays.beats[3].image.alt` | 84 | 107 | 1.27 |
| `modes.items[0].image.alt` | 51 | 71 | 1.39 |
| `characters.items[1].role` | 23 | 29 | 1.26 |
| `gallery.items[3].image.alt` | 40 | 58 | 1.45 |
| `footer.copyright` | 44 | 54 | 1.23 |

Accepted as they are: the alt texts (not layout copy; Spanish needs the articles), `footer.copyright` (legal formula), `meta.releaseStatus` (not rendered; the roadmap stickers are) and the two fixed terms `Acceso anticipado en Steam` and `No te conviertas en la patata`, which have no shorter natural form. `contact.form.error` was lengthened to 0.98. Short strings (under 20 characters: nav labels, UI words) are exempt; a four-letter English label cannot stay within 20 % of its Spanish translation and the layout has room for them.

## Not written, because it would mean inventing a fact

- The Modes intro and the rules of **Infected** and **Team deathmatch** (`OPEN_QUESTIONS.md` #10, #10b).
- A player-count line in the hero kicker (#4).
- Anything about what the three game modes do differently from one another (#9).

## Machine-tell sweep

- Tricolons removed: 5 (`howItPlays.intro`, `modes.items[0].rules`, `characters.items[1].line`, `socials.intro`, the verb pile in `howItPlays.beats[2].body`).
- "Whether you're X, Y or Z" pattern removed: 1 (`contact.body`).
- Em dashes on the page: 0 (were 2, in `trailer.title` and `meta.title`).
- Words from the ban list (`unleash`, `epic`, `ultimate`, `chaos`, `experience the`, `get ready to`): 0 before, 0 after.
- Headings that are the section name plus an adjective: 0.
