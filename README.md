# discord-bio-site

A static, single-page personal bio site — dark, cinematic, glitchy — in the
general spirit of guns.lol-style profile pages. No shared code, branding, or
assets; built from scratch with plain HTML, CSS, and vanilla JavaScript.

No frameworks, no build step, no backend.

## Structure

```
discord-bio-site/
├── index.html      structure/markup
├── style.css       all styling
├── script.js       all behavior (background fallback, background music, glitch, connect links, view counter)
├── config.js       ← edit this file to personalize the site
├── README.md
└── assets/         ← put your own media files here
    └── music/      ← the single background track (song1.mp3, or your own filename)
```

## Quick start

Everything you can customize lives in **`config.js`**:

```js
const CONFIG = {
  profileName: "gui",
  phrases: ["building things ", "lost in thought.", "locked in", "in motion."],
  avatarPath: "assets/avatar.jpg",
  backgroundVideoPaths: ["assets/background.mp4"],
  backgroundImagePath: "assets/background.jpg",

  discord: {
    enabled: true,
    userId: "",
  },

  github: {
    enabled: true,
    username: "",
    openInNewTab: true,
  },

  browserTitle: {
    enabled: true,
    text: "gui",
    typingSpeed: 250,
    deletingSpeed: 120,
    pauseAfterTyping: 1800,
    pauseAfterDeleting: 500,
    cursor: "",
  },

  siteMeta: {
    title: "gui",
    description: "building things.",
    image: "assets/avatar.jpg",
    themeColor: "#0a0a0a",
  },

  accentColor: "#7f5af0",
  enableViewCounter: true,
  enableGlitchEffect: true,
  enableTypewriterEffect: true,
  customCursor: { enabled: true, type: "image", imagePath: "assets/cursor.png", size: 40, glow: true },
  music: {
    enabled: true,
    autoplayAfterEnter: true,
    defaultVolume: 0.3,
    path: "assets/music/song1.mp3",
  },
};
```

Nothing else needs to change for basic personalization. The site works even
if none of the asset files exist yet — every media element fails gracefully.

## 1. Where to place your files

Drop these directly inside `assets/` using the exact names below (or edit
the matching path in `config.js` if you'd rather use different filenames):

| File                        | Purpose                              | Required? |
|------------------------------|---------------------------------------|-----------|
| `assets/background.mp4`     | Fullscreen background video (playlist) | No |
| `assets/background.jpg`     | Background image, used if every video fails | No |
| `assets/avatar.jpg`         | Profile picture in the card           | No |
| `assets/music/song1.mp3`     | Looping background track              | No |
| `assets/favicon.png`        | Browser tab icon                      | No |
| `assets/cursor.png`         | Custom cursor image (desktop only)    | No |

**Background video playlist:** `config.js -> backgroundVideoPaths` is a
list, not a single file — drop as many videos in `assets/` as you like and
list them there:
```js
backgroundVideoPaths: [
  "assets/background.mp4",
  "assets/background2.mp4",
],
```
They play in that order; when one ends, the next one starts automatically,
looping back to the first after the last. A single entry just plays that
one video on repeat, same as before. If a video in the list fails to load,
it's skipped in favor of the next one — the image fallback only kicks in
once every listed video has failed.

Fallback chain if a file is missing or fails to load:

1. `backgroundVideoPaths` (video playlist) →
2. `background.jpg` (image) →
3. animated dark CSS gradient (always present, needs no file)

The favicon is referenced via a normal `<link rel="icon">` in `index.html` —
if `assets/favicon.png` doesn't exist, browsers just show a default icon,
nothing breaks. Add your own `.png` or `.ico` there and update the `href`
in `index.html` if you use a different filename/extension.

## 2. How to get your Discord User ID

1. Open Discord → **Settings → Advanced** → enable **Developer Mode**.
2. Right-click your own username/avatar anywhere in Discord.
3. Click **Copy User ID**.
4. Paste it into `config.js` as `discord.userId`.

## 3. Connect links (Discord + GitHub icons)

Two small round icon buttons — Discord and GitHub — sit side by side below
the phrase. There's no info card, no live presence data, no API calls at
all — each icon is just a plain link built from `config.js`:

- **Discord icon** → `https://discord.com/users/{discord.userId}` (uses the
  `userId` from section 2 above).
- **GitHub icon** → `https://github.com/{github.username}`:
  ```js
  github: {
    enabled: true,
    username: "your-github-username",
    openInNewTab: true,
  }
  ```

Either icon disappears entirely (not just hidden — removed from layout) if
its underlying value is missing: leave `github.username: ""` to hide the
GitHub icon, or `discord.enabled: false` / empty `discord.userId` to hide
the Discord icon. Both open in a new tab by default; set
`github.openInNewTab: false` to open GitHub in the same tab instead.

Each icon also carries the same two ambient "frequency" effects as the name
(`gui`) — a slow breathing opacity/blur pulse, plus a bright band that
sweeps through the logo every few seconds (see `iconSlowFrequency` /
`iconFreqSlice` in `style.css` if you want to retune the timing).

## 4. Browser tab title animation

The browser tab title types itself out, pauses, deletes back down to a
single leftover character (never further), pauses, and repeats — controlled
entirely by `config.js -> browserTitle`. For the default `text: "gui"` that
looks like: `g` → `gu` → `gui` → *pause* → `gu` → `g` → *pause* → repeat.
It's deliberately floored at one character instead of fully erasing to `""`
— an empty `document.title` makes some browsers (Chrome included) show the
tab's URL instead, which would flash on every cycle.

```js
browserTitle: {
  enabled: true,
  text: "gui",         // the string that gets typed/deleted
  typingSpeed: 250,     // ms per character while typing
  deletingSpeed: 120,   // ms per character while deleting
  pauseAfterTyping: 1800,   // ms to hold once fully typed
  pauseAfterDeleting: 500,  // ms to hold once fully deleted
  cursor: "",           // optional string appended while typing, e.g. "_"
}
```

Set `enabled: false` to use a plain static tab title instead (falls back to
`siteMeta.title`, then `profileName`). This runs independently of the
click-to-enter gate — there's no autoplay restriction on the tab title, so
it starts animating as soon as the page loads.

## 5. SEO / social preview metadata

`config.js -> siteMeta` feeds the page's `<meta name="description">`,
`<meta name="theme-color">`, Open Graph (`og:title`, `og:description`,
`og:image`) and Twitter Card tags — the preview shown when the link is
pasted into Discord, Twitter/X, iMessage, etc.:

```js
siteMeta: {
  title: "gui",
  description: "building things.",
  image: "assets/avatar.jpg",
  themeColor: "#0a0a0a",
}
```

`index.html` ships with sane static defaults for all of these tags already
(so the preview looks right even with JavaScript disabled); `script.js`
overwrites their `content` attribute from `siteMeta` on load so `config.js`
stays the single source of truth.

## 6. Other config options

- **`accentColor`** — hex color used for the avatar ring, volume slider, and
  frequency bars under the name.
- **`enableViewCounter`** — a `localStorage`-based counter, local to each
  visitor's browser (not a real shared analytics counter — there's no
  backend). Set to `false` to hide it.
- **`enableGlitchEffect`** — toggles the glitch bursts on the name.
- **`enableTypewriterEffect`** — types each entry in `phrases` out character
  by character, pauses, erases it, then moves to the next phrase — looping
  back to the first once the last one finishes. Set to `false` to just show
  `phrases[0]` as static text instead.
- **`customCursor`** — replaces the mouse pointer with `assets/cursor.png` on
  desktop. `{ enabled, type, imagePath, size, glow }`:
  - `enabled` — set to `false` to always use the native cursor.
  - `type` — currently only `"image"` is supported; any other value skips
    straight to the dot/ring fallback.
  - `imagePath` — your cursor image. If it's missing or fails to load, the
    site falls back to a small dot/ring cursor automatically — nothing
    breaks, and there's no need to add a placeholder file.
  - `size` — width in pixels of the image cursor (height scales
    automatically).
  - `glow` — set to `false` to remove the soft glow behind the cursor.

  The custom cursor is automatically disabled on touch devices and when the
  visitor's OS/browser has "reduce motion" turned on — both fall back to the
  normal browser cursor.

- **`music`** — the single looping background track, controlled from the
  top-left volume box (no play/pause/skip UI — playback is automatic):
  - `enabled` — set to `false` to turn background music off entirely (no UI, no audio).
  - `autoplayAfterEnter` — whether the track starts automatically once
    the visitor clicks past the enter-screen.
  - `defaultVolume` — starting volume (`0`–`1`) the first time a visitor
    opens the site. After that, their last chosen volume is remembered
    (`localStorage`, that browser only — nothing is sent anywhere).
  - `path` — the track file. It loops continuously; if the file is missing
    or fails to load, the volume box stays visible but silent, with a
    console warning.

  A **sound wave** near the bottom of the screen, below the connect icons,
  reacts to the track's real frequency data via the Web Audio API (no
  config needed, no extra assets) — a soft glowing waveform loosely in the
  spirit of Siri's reactive orb rather than plain flat bars: bass sits at
  the center and tapers outward toward the quieter high end, smoothed
  frame-to-frame so it feels fluid instead of jumpy. While paused, muted,
  or before playback starts, it settles into a slow, gentle breathing
  shimmer instead of going flat/dead. It hides itself automatically if the
  browser doesn't support the Web Audio API — nothing else on the page
  depends on it.

  It only activates once, from the same click that unlocks autoplay, since
  creating an `AudioContext` requires a user gesture just like audio
  playback does. That same setup step is written defensively: connecting
  the `<audio>` element into the Web Audio graph is what makes the sound
  wave possible, but it also means that graph — not the element directly —
  is now responsible for reaching the speakers. If anything in the
  analyser/visualizer setup fails partway through, the code reconnects the
  track straight to the speakers as a fallback, so a visualizer bug can
  never end up silencing the music.

  **Important — this needs the site to be served over http(s), not opened
  as a local file.** If you double-click `index.html` and open it directly
  (`file://...` in the address bar), the browser treats your own local
  music file as a security-sensitive "cross-origin" source the moment it's
  routed through the Web Audio API, and **silently zeroes out that audio
  entirely** rather than throwing a visible error (Chrome's own console
  says this outright: *"MediaElementAudioSource outputs zeroes due to CORS
  access restrictions"*) — this is a browser security policy against audio
  fingerprinting, not something a site can opt out of. The code detects
  this (`location.protocol === 'file:'`) and skips the Web Audio graph
  entirely in that case, so **the music still plays normally** — you just
  get the sound wave's gentle idle animation instead of a reactive one. To
  get the real reactive wave, serve the folder locally instead of opening
  the file directly — see **Local preview** at the bottom of this file for
  a one-line command; it takes a few seconds and needs nothing installed
  beyond Python (already on most systems) or Node.

## 7. How it behaves

- A **click-to-enter overlay** covers the page on load. Clicking anywhere
  dismisses it and (if `autoplayAfterEnter` is on) starts the background
  track — browsers block audio autoplay without a user gesture, so this
  click is what unlocks it.
- The **volume control** (top-left, always visible) is just a mute button
  and a volume slider — no title, no play/pause/skip. It stays compact by
  default and expands slightly on hover/focus to reveal the slider.
- The **view counter** (top-right, if enabled) increments once per visit
  after the enter-screen is dismissed, stored in `localStorage` on that
  browser only.
- The **name** has a slow ambient pulse plus an occasional quick glitch
  flicker — both purely decorative CSS/JS animations, unrelated to the
  background music.
- The **Discord/GitHub connect icons** sit below the phrase, each carrying
  the same ambient pulse + sweep effect as the name. Either icon is removed
  from layout entirely (not just hidden) if its config value is missing, so
  nothing crowds the page if you only want one of them.
- The **browser tab title** types and deletes `browserTitle.text` in a
  loop, independent of the click-to-enter gate.

## 8. Deployment / getting a clean public link

This is a fully static site (no build step, no backend) — any static host
works. It's ready to publish as-is; you only need to push it somewhere.

### Option A — GitHub Pages (free)
1. Push this folder to a GitHub repository.
2. Repo → **Settings → Pages** → set source to your branch (e.g. `main`)
   and root folder.
3. Your link depends on the repo name:
   - Repo named anything else → `https://USERNAME.github.io/REPOSITORY-NAME/`
   - Repo named `bio` → the shorter `https://USERNAME.github.io/bio/`
   - Repo named exactly `USERNAME.github.io` (a special GitHub Pages user
     site) → the shortest form, `https://USERNAME.github.io/`

### Option B — Vercel (free for personal projects)
1. Import the GitHub repo at [vercel.com](https://vercel.com), or run
   `npx vercel` from this folder.
2. No build command needed — framework preset "Other" / static.
3. Link: `https://PROJECT-NAME.vercel.app`. Also the natural choice if you
   ever turn this into a Next.js project later.

### Option C — Netlify (free for personal static sites)
1. Drag-and-drop this folder onto Netlify's deploy page, or connect the
   GitHub repo.
2. No build command needed — leave it blank / static.
3. Link: `https://PROJECT-NAME.netlify.app`.

### About getting a link like `guns.lol/gui`
You can't get a path exactly like `https://guns.lol/gui` unless you own or
control the `guns.lol` domain — that's someone else's domain, not something
any host can grant you. To get a similarly short, clean link of your own,
you have two real options:
- Use one of the **free platform subdomains** above (`*.vercel.app`,
  `*.netlify.app`, or `USERNAME.github.io`), or
- Buy a **custom domain** (e.g. `gui.xyz`, `gui.dev`, `gui.bio` — cheap
  TLDs, a few dollars a year) and point it at whichever host you chose
  above (all three support custom domains for free once you own one).

### Local preview
You can just open `index.html` in a browser, but serving it locally instead
avoids autoplay/CORS quirks — most importantly, it's required for the sound
wave visualizer to actually react to the music (see section 6 above for why
opening the file directly silences that, specifically). Pick whichever's
already on your machine:
```bash
python -m http.server 8000
```
or, if you have Node instead:
```bash
npx serve .
```
then open the printed `http://localhost:...` link.
