// ============================================================
// script.js — site logic. Personalization lives in config.js.
// ============================================================

const DEFAULT_VOLUME = 0.3;
const BACKGROUND_VIDEO_PLAYBACK_RATE = 0.8; // slow motion

// Background music state (see initMusicPlayer() and friends near the bottom).
let mpAudio = null;
let mpEnabled = false;

// Sound wave visualizer state (see setupAudioVisualizer() near the bottom).
let vizAnalyser = null;
let vizDataArray = null;
let vizSetupDone = false;

// Background video playlist state (see setupBackgroundVideoPlaylist()).
let bgVideoPaths = [];
let bgVideoIndex = 0;
let bgVideoFailCount = 0;

document.addEventListener('DOMContentLoaded', () => {
  applyConfig();
  startBrowserTitleAnimation();
  setupBackgroundFallback();
  setupEnterGate();
  initMusicPlayer();
  setupViewCounter();
  setupConnectLinks();
  setupCustomCursor();
});

// ---------- Apply config.js values to the DOM ----------
function applyConfig() {
  document.documentElement.style.setProperty('--accent', CONFIG.accentColor);
  applySiteMeta();

  const nameEl = document.getElementById('profile-name');
  nameEl.setAttribute('data-text', CONFIG.profileName);
  document.getElementById('profile-name-text').textContent = CONFIG.profileName;
  document.getElementById('profile-name-slice').textContent = CONFIG.profileName;

  // The visible text is (re)typed character-by-character by
  // startTypewriterEffect() — this only sets the accessible label so
  // screen readers get a full phrase at a time instead of every keystroke.
  const phraseEl = document.getElementById('phrase');
  const firstPhrase = (CONFIG.phrases && CONFIG.phrases[0]) || '';
  phraseEl.setAttribute('aria-label', firstPhrase);
  if (!CONFIG.enableTypewriterEffect) {
    document.getElementById('phrase-text').textContent = firstPhrase;
  }

  document.getElementById('avatar').src = CONFIG.avatarPath;

  document.getElementById('bg-image').src = CONFIG.backgroundImagePath;
  setupBackgroundVideoPlaylist();

  if (!CONFIG.enableViewCounter) {
    document.getElementById('view-counter').style.display = 'none';
  }
}

// ---------- SEO / social preview metadata (config.js -> siteMeta) ----------
function applySiteMeta() {
  const meta = CONFIG.siteMeta;
  if (!meta) return;

  const setMeta = (selector, value) => {
    const el = document.querySelector(selector);
    if (el && value) el.setAttribute('content', value);
  };

  setMeta('meta[name="description"]', meta.description);
  setMeta('meta[name="theme-color"]', meta.themeColor);
  setMeta('meta[property="og:title"]', meta.title);
  setMeta('meta[property="og:description"]', meta.description);
  setMeta('meta[property="og:image"]', meta.image);
  setMeta('meta[name="twitter:title"]', meta.title);
  setMeta('meta[name="twitter:description"]', meta.description);
  setMeta('meta[name="twitter:image"]', meta.image);
}

// ---------- Browser tab title animation (config.js -> browserTitle) ----------
// Types `text` out character by character, pauses, deletes it all the way
// down to nothing, pauses, and repeats forever — independent of the
// click-to-enter gate, since there's no autoplay restriction on
// document.title.
//
// document.title must never literally become "": Chrome (and others) fall
// back to showing the tab's URL in place of a truly blank title, which
// would flash distractingly every deleting cycle. To still get the visual
// effect of the tab going empty, the "0 characters" frame is rendered as a
// zero-width space (an invisible character) instead of "" — non-empty as
// far as the browser is concerned, so the URL fallback never kicks in, but
// nothing visible is left in the tab either.
const TITLE_BLANK = '​'; // zero-width space
function startBrowserTitleAnimation() {
  const cfg = CONFIG.browserTitle;
  const fallbackTitle = (CONFIG.siteMeta && CONFIG.siteMeta.title) || CONFIG.profileName || 'gui';

  if (!cfg || !cfg.enabled || !cfg.text) {
    document.title = fallbackTitle;
    return;
  }

  const text = cfg.text;
  const cursor = cfg.cursor || '';
  const MIN_CHARS = 0;
  let charIndex = MIN_CHARS;
  let deleting = false;

  function setTitle(index) {
    const shown = text.slice(0, index);
    document.title = shown ? shown + cursor : TITLE_BLANK;
  }

  function tick() {
    charIndex += deleting ? -1 : 1;
    setTitle(charIndex);

    if (!deleting && charIndex >= text.length) {
      deleting = true;
      setTimeout(tick, cfg.pauseAfterTyping ?? 1800);
    } else if (deleting && charIndex <= MIN_CHARS) {
      deleting = false;
      setTimeout(tick, cfg.pauseAfterDeleting ?? 500);
    } else {
      setTimeout(tick, deleting ? (cfg.deletingSpeed ?? 120) : (cfg.typingSpeed ?? 250));
    }
  }

  setTitle(charIndex); // show the floor character immediately, before the first tick fires

  setTimeout(tick, cfg.typingSpeed ?? 250);
}

// ---------- Background video playlist (config.js -> backgroundVideoPaths) ----------
// Plays each video in order; when one ends, the next one starts, wrapping
// back to the first after the last — a single-entry list just plays that
// one video on repeat, same as the old single-path behavior.
function setupBackgroundVideoPlaylist() {
  const video = document.getElementById('bg-video');
  bgVideoPaths = (CONFIG.backgroundVideoPaths || []).filter((p) => !!p);
  bgVideoIndex = 0;
  bgVideoFailCount = 0;

  if (bgVideoPaths.length === 0) {
    video.classList.add('media-error'); // nothing configured — fall straight to the image
    return;
  }

  video.addEventListener('loadedmetadata', () => {
    video.playbackRate = BACKGROUND_VIDEO_PLAYBACK_RATE;
  });
  video.addEventListener('ended', () => {
    bgVideoIndex = (bgVideoIndex + 1) % bgVideoPaths.length;
    playBackgroundVideo(bgVideoIndex);
  });

  playBackgroundVideo(bgVideoIndex);
}

function playBackgroundVideo(index) {
  const video = document.getElementById('bg-video');
  video.classList.remove('media-error');
  document.getElementById('bg-video-source').src = bgVideoPaths[index];
  video.load();
  video.playbackRate = BACKGROUND_VIDEO_PLAYBACK_RATE;
  video.play().catch(() => {}); // autoplay is safe here (video is muted), but ignore rare rejections
}

// A single video failing to load shouldn't kill the whole background — skip
// to the next one in the playlist. Only fall through to the image once
// every configured video has failed.
function handleBackgroundVideoFailure() {
  const video = document.getElementById('bg-video');
  bgVideoFailCount += 1;
  if (bgVideoFailCount >= bgVideoPaths.length) {
    video.classList.add('media-error');
    return;
  }
  bgVideoIndex = (bgVideoIndex + 1) % bgVideoPaths.length;
  playBackgroundVideo(bgVideoIndex);
}

// ---------- Background fallback chain: video -> image -> CSS gradient ----------
function setupBackgroundFallback() {
  const video = document.getElementById('bg-video');
  const image = document.getElementById('bg-image');

  image.addEventListener('error', () => image.classList.add('media-error'));
  video.addEventListener('error', handleBackgroundVideoFailure);

  // Some browsers don't fire 'error' on the <video> for a missing source
  // until playback is attempted; catch that path too.
  video.addEventListener('stalled', () => {
    if (video.readyState === 0) handleBackgroundVideoFailure();
  });
}

// ---------- Click-to-enter overlay: unlocks audio + starts effects ----------
function setupEnterGate() {
  const gate = document.getElementById('enter-screen');

  gate.addEventListener('click', enter, { once: true });

  function enter() {
    gate.classList.add('hidden');
    // Reveal the avatar/name/phrase/discord card in a staggered sequence —
    // they stay hidden until this point (see .card.entered rules in style.css).
    document.getElementById('card').classList.add('entered');

    // Browsers block autoplay before a user gesture — this click is what
    // unlocks it, so the background music only ever starts from here.
    const musicCfg = CONFIG.music;
    if (mpEnabled && musicCfg && musicCfg.autoplayAfterEnter) {
      console.log('[music] enter click received, attempting playback.');
      setupAudioVisualizer();
      playMusic();
    }

    // Wait for the staggered reveal to finish before starting the name
    // glitch, so it doesn't fire while the text is still fading in.
    setTimeout(startVisualEffects, 2300);
    registerView();
  }
}

// ---------- Phrase typewriter effect ----------
const TYPEWRITER_TYPE_SPEED = 70; // ms per character while typing
const TYPEWRITER_DELETE_SPEED = 40; // ms per character while deleting
const TYPEWRITER_HOLD_TIME = 2200; // ms to pause once fully typed, before erasing
const TYPEWRITER_RESTART_DELAY = 900; // ms to pause once fully erased, before retyping

function startTypewriterEffect() {
  const textEl = document.getElementById('phrase-text');
  const phraseEl = document.getElementById('phrase');
  if (!CONFIG.enableTypewriterEffect || !textEl) return;

  const phrases = (CONFIG.phrases || []).filter((p) => !!p);
  if (phrases.length === 0) return;

  let phraseIndex = 0;
  let charIndex = 0;
  let deleting = false;

  function tick() {
    const full = phrases[phraseIndex];
    charIndex += deleting ? -1 : 1;
    textEl.textContent = full.slice(0, charIndex);

    if (!deleting && charIndex >= full.length) {
      deleting = true;
      setTimeout(tick, TYPEWRITER_HOLD_TIME);
    } else if (deleting && charIndex <= 0) {
      deleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      if (phraseEl) phraseEl.setAttribute('aria-label', phrases[phraseIndex]);
      setTimeout(tick, TYPEWRITER_RESTART_DELAY);
    } else {
      setTimeout(tick, deleting ? TYPEWRITER_DELETE_SPEED : TYPEWRITER_TYPE_SPEED);
    }
  }

  setTimeout(tick, TYPEWRITER_TYPE_SPEED);
}

// ---------- Background music ----------
// A single looping track (CONFIG.music.path) played through the
// <audio id="bg-music"> element. There's no play/pause/skip UI — the only
// control is the volume box (#volume-control, top-left); playback itself
// only ever starts from the click-to-enter gate (see setupEnterGate),
// since browsers block audio autoplay without a user gesture.
function initMusicPlayer() {
  const cfg = CONFIG.music;
  const controlEl = document.getElementById('volume-control');

  if (!cfg || !cfg.enabled || !cfg.path) {
    console.log('[music] background music disabled or no path configured in config.js -> music.');
    if (controlEl) controlEl.style.display = 'none';
    return;
  }

  mpAudio = document.getElementById('bg-music');
  mpAudio.src = cfg.path;
  mpAudio.loop = true;
  mpEnabled = true;

  // Volume: restored from localStorage if the visitor changed it before,
  // otherwise falls back to the configured default. No other data is
  // stored or collected.
  const savedVolume = parseFloat(localStorage.getItem('musicVolume'));
  const initialVolume = Number.isFinite(savedVolume) ? savedVolume : (cfg.defaultVolume || DEFAULT_VOLUME);
  const slider = document.getElementById('volume-slider');
  slider.value = String(Math.round(initialVolume * 100));
  mpAudio.volume = initialVolume;
  updateMuteIcon(initialVolume, mpAudio.muted);

  slider.addEventListener('input', () => {
    const v = Number(slider.value) / 100;
    mpAudio.volume = v;
    mpAudio.muted = false;
    localStorage.setItem('musicVolume', String(v));
    updateMuteIcon(v, false);
  });

  document.getElementById('mute-btn').addEventListener('click', () => {
    mpAudio.muted = !mpAudio.muted;
    updateMuteIcon(mpAudio.volume, mpAudio.muted);
    console.log(mpAudio.muted ? '[music] muted' : '[music] unmuted');
  });

  mpAudio.addEventListener('error', () => {
    console.warn(`[music] could not load "${cfg.path}" — add the file to assets/music/ (see config.js -> music.path).`);
  });
}

function playMusic() {
  if (!mpEnabled) return;
  mpAudio.play()
    .then(() => console.log('[music] now playing.'))
    .catch((err) => {
      // Autoplay blocked, or the file is missing (handled separately by
      // the 'error' listener) — the visitor can still use the volume
      // control, they just won't hear anything.
      console.warn('[music] playback failed or was blocked by the browser:', err);
    });
}

function updateMuteIcon(volume, muted) {
  const icon = document.getElementById('volume-icon');
  if (muted || volume === 0) {
    icon.textContent = '🔇';
  } else if (volume < 0.5) {
    icon.textContent = '🔉';
  } else {
    icon.textContent = '🔊';
  }
}

// ---------- Sound wave visualizer (bottom of screen) ----------
// A soft, glowing waveform — loosely in the spirit of Siri's reactive orb,
// though it doesn't try to copy it exactly — drawn on a <canvas> below the
// connect icons. Reacts to the real track's frequency data via the Web
// Audio API. Runs entirely client-side, no extra assets. Only ever set up
// once, from the click-to-enter gesture that also starts playback
// (browsers require a user gesture to create/resume an AudioContext, same
// restriction as audio autoplay) — and only if music is actually
// enabled/configured.
//
// IMPORTANT: audioCtx.createMediaElementSource(mpAudio) permanently reroutes
// the element's audio output through the Web Audio graph — from that point
// on, sound only reaches the speakers if *something* in the graph reaches
// audioCtx.destination. If the analyser step below fails for any reason
// AFTER that call, we reconnect the raw source straight to destination as a
// fallback, so a visualizer bug can never make the music go silent.
const VIZ_BAND_COUNT = 27; // odd, so the shape has one true center band
const VIZ_HALF = Math.ceil(VIZ_BAND_COUNT / 2);
const VIZ_IDLE_LEVEL = 0.05;
let vizCanvas = null;
let vizCtx = null;
let vizLevels = new Array(VIZ_HALF).fill(VIZ_IDLE_LEVEL);

function setupAudioVisualizer() {
  if (vizSetupDone || !mpEnabled || !mpAudio) return;
  vizSetupDone = true;

  const waveEl = document.getElementById('sound-wave');
  vizCanvas = document.getElementById('sound-wave-canvas');
  if (!waveEl || !vizCanvas) return;
  vizCtx = vizCanvas.getContext('2d');

  // Browsers silence (not error — literally zero out) any audio routed
  // through the Web Audio API from a source they consider cross-origin, and
  // a page opened directly as a local file (file://, i.e. double-clicked
  // instead of served) counts as cross-origin from its own audio files for
  // this purpose. Routing the track through an AnalyserNode in that case
  // would make the *entire track* silent, not just the visualizer — so
  // skip the Web Audio graph entirely here and leave the <audio> element
  // playing normally through its own default output. The wave still shows
  // a gentle idle animation (see drawVisualizer()) so it doesn't look
  // broken, it just isn't driven by real audio data until the site is
  // served over http(s) — see README.md for how.
  if (location.protocol === 'file:') {
    console.warn('[visualizer] page opened via file:// — browsers silence Web Audio analysis of local files, so the sound wave stays in its idle animation here (music itself is unaffected). Serve the site over http(s) for the reactive wave — see README.md.');
    resizeVizCanvas();
    window.addEventListener('resize', resizeVizCanvas);
    requestAnimationFrame(drawVisualizer);
    return;
  }

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Web Audio API not supported');

    const audioCtx = new AudioContextClass();
    const source = audioCtx.createMediaElementSource(mpAudio);

    try {
      vizAnalyser = audioCtx.createAnalyser();
      vizAnalyser.fftSize = 128;
      vizAnalyser.smoothingTimeConstant = 0.75;
      vizDataArray = new Uint8Array(vizAnalyser.frequencyBinCount);
      source.connect(vizAnalyser);
      vizAnalyser.connect(audioCtx.destination);
    } catch (analyserErr) {
      console.warn('[visualizer] analyser setup failed, bypassing it so music still plays:', analyserErr);
      source.connect(audioCtx.destination);
      vizAnalyser = null;
      waveEl.style.display = 'none';
    }

    // Autoplay policies can leave a freshly-created AudioContext suspended
    // even inside a user-gesture handler on some browsers — keep nudging it
    // on the next few interactions as a safety net, since a suspended
    // context blocks all sound in this graph, not just the visualizer.
    const resume = () => { if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {}); };
    resume();
    ['click', 'touchend', 'keydown'].forEach((evt) => document.addEventListener(evt, resume, { passive: true }));

    if (vizAnalyser) {
      console.log('[visualizer] sound wave connected to the track.');
      resizeVizCanvas();
      window.addEventListener('resize', resizeVizCanvas);
      requestAnimationFrame(drawVisualizer);
    }
  } catch (err) {
    // createMediaElementSource itself failed (unsupported / already
    // attached elsewhere / cross-origin source) — that call never captured
    // the element's output in this branch, so normal playback is untouched.
    console.warn('[visualizer] could not set up the sound wave, hiding it:', err);
    waveEl.style.display = 'none';
  }
}

function resizeVizCanvas() {
  if (!vizCanvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = vizCanvas.getBoundingClientRect();
  vizCanvas.width = Math.max(1, Math.round(rect.width * dpr));
  vizCanvas.height = Math.max(1, Math.round(rect.height * dpr));
}

function drawVisualizer() {
  requestAnimationFrame(drawVisualizer);
  if (!vizCtx || !vizCanvas || !vizCanvas.width) return;

  const w = vizCanvas.width;
  const h = vizCanvas.height;
  vizCtx.clearRect(0, 0, w, h);

  const playing = mpAudio && !mpAudio.paused && !mpAudio.muted;
  if (vizAnalyser) vizAnalyser.getByteFrequencyData(vizDataArray);
  const bufferLength = vizDataArray ? vizDataArray.length : 0;

  for (let i = 0; i < VIZ_HALF; i++) {
    let target = VIZ_IDLE_LEVEL;
    if (playing && bufferLength) {
      // Most musical energy sits in the low end, so splitting bins evenly
      // would leave the outer bands looking dead. Log-scaled bands instead
      // give the center a narrow slice of bass and widen each successive
      // band outward, so the whole wave stays visibly alive.
      const startBin = Math.floor(bufferLength ** (i / VIZ_HALF));
      const endBin = Math.max(startBin + 1, Math.floor(bufferLength ** ((i + 1) / VIZ_HALF)));
      let sum = 0;
      for (let j = startBin; j < endBin; j++) sum += vizDataArray[j];
      target = Math.max(VIZ_IDLE_LEVEL, sum / (endBin - startBin) / 255);
    } else {
      // A slow, gentle breathing shimmer while idle/paused/muted, so the
      // wave never looks simply "dead" — a small nod to Siri's resting orb.
      const t = performance.now() / 1000;
      target = VIZ_IDLE_LEVEL + Math.sin(t * 1.1 + i * 0.5) * 0.012;
    }
    // Smooth toward the target so the wave feels fluid rather than jumpy.
    vizLevels[i] += (target - vizLevels[i]) * 0.3;
  }

  const barGap = w / VIZ_BAND_COUNT;
  const barWidth = Math.max(1, barGap * 0.5);
  const accent = (getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#8f8f8f').trim();

  vizCtx.lineCap = 'round';
  vizCtx.strokeStyle = accent;
  vizCtx.lineWidth = barWidth;
  vizCtx.shadowColor = accent;
  vizCtx.shadowBlur = 9 * (window.devicePixelRatio || 1);

  for (let k = 0; k < VIZ_BAND_COUNT; k++) {
    // Mirror around the center band, so the shape reads as one continuous,
    // symmetric wave rather than a row of independent ticks. Bass (the
    // strongest, most consistently active band) sits at the center and
    // tapers outward toward the quieter high end, so the wave pulses
    // outward from the middle rather than from the edges.
    const distanceFromEdge = Math.min(k, VIZ_BAND_COUNT - 1 - k);
    const i = VIZ_HALF - 1 - distanceFromEdge;
    const level = vizLevels[i];
    const barHeight = Math.max(barWidth, level * h * 0.85);
    const x = barGap * k + barGap / 2;

    vizCtx.globalAlpha = 0.5 + level * 0.5;
    vizCtx.beginPath();
    vizCtx.moveTo(x, h / 2 - barHeight / 2);
    vizCtx.lineTo(x, h / 2 + barHeight / 2);
    vizCtx.stroke();
  }
  vizCtx.globalAlpha = 1;
}

// ---------- Local-only view counter ----------
function setupViewCounter() {
  if (!CONFIG.enableViewCounter) return;
  const el = document.getElementById('view-counter');
  const count = Number(localStorage.getItem('viewCount') || '0');
  el.textContent = `${count} view${count === 1 ? '' : 's'}`;
}

function registerView() {
  if (!CONFIG.enableViewCounter) return;
  const count = Number(localStorage.getItem('viewCount') || '0') + 1;
  localStorage.setItem('viewCount', String(count));
  const el = document.getElementById('view-counter');
  el.textContent = `${count} view${count === 1 ? '' : 's'}`;
}

// ---------- Name glitch effect ----------
const NAME_GLITCH_TRIGGER_CHANCE = 0.035; // checked every animation frame (~60fps)
const NAME_GLITCH_COOLDOWN_MIN = 8; // frames before another burst can trigger
const NAME_GLITCH_COOLDOWN_RANGE = 14; // + random(0, this) frames added to the cooldown
const NAME_GLITCH_DURATION = 260; // ms the glitching class stays applied

function startVisualEffects() {
  startTypewriterEffect();

  const nameEl = document.getElementById('profile-name');
  if (!CONFIG.enableGlitchEffect) return;

  let glitchTimer = 0;

  function loop() {
    requestAnimationFrame(loop);
    glitchTimer -= 1;
    if (glitchTimer <= 0 && Math.random() < NAME_GLITCH_TRIGGER_CHANCE) {
      nameEl.classList.add('glitching');
      glitchTimer = NAME_GLITCH_COOLDOWN_MIN + Math.floor(Math.random() * NAME_GLITCH_COOLDOWN_RANGE);
      setTimeout(() => nameEl.classList.remove('glitching'), NAME_GLITCH_DURATION);
    }
  }

  requestAnimationFrame(loop);
}

// ---------- Custom cursor (desktop only) ----------
// Falls back to a small glowing ball (with a fading dot trail) if
// config.js -> customCursor.imagePath fails to load, and is skipped
// entirely on touch devices or when the user has "reduce motion" enabled,
// since the whole point is a smoothly following animated cursor.
const CURSOR_HOVER_SELECTOR = 'a, button, input, [role="button"], .mute-btn, .enter-screen, .volume-slider, .link-btn, .avatar-wrap, .name, .phrase, .connect-link';
const CURSOR_TRAIL_MIN_DISTANCE = 7; // px moved before spawning another trail dot
const CURSOR_TRAIL_MAX_DOTS = 45; // safety cap on concurrent trail dots

function setupCustomCursor() {
  const cfg = CONFIG.customCursor;
  if (!cfg || !cfg.enabled) return;

  const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!hasFinePointer) {
    console.log('[cursor] touch/coarse pointer detected, keeping the native cursor.');
    return;
  }
  if (reducedMotion) {
    console.log('[cursor] prefers-reduced-motion is on, keeping the native cursor.');
    return;
  }

  const root = document.getElementById('cursor-root');
  const imageEl = document.getElementById('cursor-image');
  if (!root || !imageEl) return;

  document.body.classList.add('custom-cursor-active');
  root.style.setProperty('--cursor-size', `${cfg.size || 40}px`);
  if (!cfg.glow) root.classList.add('no-glow');

  if (cfg.type === 'image' && cfg.imagePath) {
    const probe = new Image();
    probe.onload = () => {
      imageEl.src = cfg.imagePath;
      root.classList.add('has-image');
      console.log('[cursor] custom cursor image loaded:', cfg.imagePath);
    };
    probe.onerror = () => {
      console.warn(`[cursor] could not load "${cfg.imagePath}" — falling back to the glowing ball cursor.`);
    };
    probe.src = cfg.imagePath;
  }

  const trailLayer = document.getElementById('cursor-trail-layer');

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let cursorX = mouseX;
  let cursorY = mouseY;
  let lastTrailX = cursorX;
  let lastTrailY = cursorY;
  const smoothing = 0.18;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    root.classList.add('cursor-visible');
  });

  document.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget) root.classList.remove('cursor-visible');
  });

  function spawnTrailDot(x, y) {
    if (!trailLayer) return;
    if (trailLayer.childElementCount >= CURSOR_TRAIL_MAX_DOTS) {
      trailLayer.firstElementChild.remove();
    }
    const dot = document.createElement('div');
    dot.className = 'cursor-trail-dot';
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
    dot.addEventListener('animationend', () => dot.remove());
    trailLayer.appendChild(dot);
  }

  function loop() {
    requestAnimationFrame(loop);
    cursorX += (mouseX - cursorX) * smoothing;
    cursorY += (mouseY - cursorY) * smoothing;
    root.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;

    const dx = cursorX - lastTrailX;
    const dy = cursorY - lastTrailY;
    if (Math.hypot(dx, dy) >= CURSOR_TRAIL_MIN_DISTANCE) {
      spawnTrailDot(cursorX, cursorY);
      lastTrailX = cursorX;
      lastTrailY = cursorY;
    }

    const hovered = document.elementFromPoint(mouseX, mouseY);
    const isInteractive = !!(hovered && hovered.closest(CURSOR_HOVER_SELECTOR));
    root.classList.toggle('cursor-hover', isInteractive);
  }

  requestAnimationFrame(loop);
}

// ---------- Connect links (Discord + GitHub icons) ----------
// Two plain link-out icons (Discord + GitHub) below the phrase — no API
// calls, no live data, just href targets built from config.js. Each icon
// hides itself (display: none) if its underlying config value is missing,
// so an unconfigured platform never shows a dead link.
function setupConnectLinks() {
  const discordLinkEl = document.getElementById('discord-link');
  const githubLinkEl = document.getElementById('github-link');
  const discordCfg = CONFIG.discord;
  const githubCfg = CONFIG.github;

  if (discordLinkEl) {
    if (discordCfg && discordCfg.enabled && discordCfg.userId) {
      discordLinkEl.href = `https://discord.com/users/${discordCfg.userId}`;
      discordLinkEl.style.display = '';
    } else {
      discordLinkEl.style.display = 'none';
    }
  }

  if (githubLinkEl) {
    if (githubCfg && githubCfg.enabled && githubCfg.username) {
      githubLinkEl.href = `https://github.com/${githubCfg.username}`;
      githubLinkEl.target = githubCfg.openInNewTab === false ? '_self' : '_blank';
      githubLinkEl.style.display = '';
    } else {
      githubLinkEl.style.display = 'none';
    }
  }
}
