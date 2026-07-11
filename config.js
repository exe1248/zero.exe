// ============================================================
// config.js — edit these values to personalize the site.
// No other file needs to change for basic customization.
// ============================================================

const CONFIG = {
  // ---- Identity ----
  profileName: "gui",

  // Phrases the typewriter effect cycles through, one at a time, looping
  // back to the first once the last one finishes (see enableTypewriterEffect
  // below). If that effect is disabled, only phrases[0] is shown, static.
  phrases: ["building things.", "lost in thought.", "locked in.", "in motion."],

  // ---- Asset paths (relative to index.html) ----
  // These files do not need to exist yet — the site falls back
  // gracefully if any of them are missing. Drop your real files
  // in assets/ using these exact names, or edit the paths below.
  avatarPath: "assets/avatar.jpg",
  backgroundVideoPath: "assets/background.mp4",
  backgroundImagePath: "assets/background.jpg",

  // ---- Discord link icon ----
  // userId: your numeric Discord user ID (see README.md). Leave empty ("")
  // to hide the Discord icon entirely — it's a plain link-out to
  // https://discord.com/users/{userId}, no API call and no live data.
  discord: {
    enabled: true,
    userId: "740987192351916133",
  },

  // ---- GitHub link icon ----
  // username: your GitHub handle (see README.md). Leave empty ("") to hide
  // the GitHub icon entirely — it's a plain link-out to your profile, no
  // API call and no live data.
  github: {
    enabled: true,
    username: "gui1248",
    openInNewTab: true,
  },

  // ---- Browser tab title animation ----
  // Types and deletes `text` in the browser tab, looping forever. Set
  // enabled to false to use a plain static tab title instead.
  browserTitle: {
    enabled: true,
    text: "1gui",
    typingSpeed: 250,
    deletingSpeed: 120,
    pauseAfterTyping: 1800,
    pauseAfterDeleting: 500,
    cursor: "",
  },

  // ---- Site metadata (SEO / social link previews) ----
  siteMeta: {
    title: "1gui",
    description: "building things.",
    image: "assets/avatar.jpg",
    themeColor: "#0a0a0a",
  },

  // ---- Look & feel ----
  accentColor: "#8f8f8f",
  enableViewCounter: true,
  enableGlitchEffect: true,
  enableTypewriterEffect: true,

  // ---- Custom cursor (desktop only) ----
  // Falls back to a small glowing ball (with a fading dot trail) if
  // imagePath fails to load, and is disabled entirely on touch devices
  // and when the OS/browser has "reduce motion" turned on.
  customCursor: {
    enabled: true,
    type: "image",
    imagePath: "assets/cursor.png",
    size: 34,
    glow: true,
  },

  // ---- Background music (top-left volume control) ----
  // A single looping background track. Playback starts automatically once
  // the visitor dismisses the click-to-enter overlay (browsers block audio
  // autoplay before a user gesture) — the only on-screen control is the
  // volume box, there's no play/pause/skip UI. A missing/broken file just
  // fails silently, the volume control stays but does nothing audible.
  music: {
    enabled: true,
    autoplayAfterEnter: true,
    defaultVolume: 0.3,
    path: "assets/music/song1.mp3",
  },
};
