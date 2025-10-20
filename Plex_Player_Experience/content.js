(function () {
  const cssVar = (name, fallback) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };

  let GOLD = cssVar("--plex-gold", "#ffd95a");
  let BG   = cssVar("--plex-bg",   "#252425");

  const LOG_PREFIX = "[Plex Player Experience]";

  const state = {
    settings: null,
    sleepTimerId: null,
    sleepDeadlineAt: null,
    upNextClickTimeout: null,
    videoEl: null,
    observers: []
  };

  const DEFAULTS = {
    nextDelay: 10,
    sleepEnabled: false,
    sleepMinutes: 0,
    autoSkipIntro: false,
    autoSkipCredits: false,
	volumeBoost: 120,
	enabled: true,
	isLiveTV: false,
  };

  // Up Next overlay and play control
  const OVERLAY_SEL =
    "[data-testid*='up-next'], [class*='UpNext'], .UpNextContainer, .player-next";
  const PLAYBTN_SEL = [
    "svg.AudioVideoUpNext-playCircle-MX3Ftl",
    ".AudioVideoUpNext-playCircle-MX3Ftl",
    ".PlayButton-playCircle-fK1f_v",
    "[data-testid*='up-next'] button",
    "button[aria-label*='Play Next' i]",
    "button[aria-label*='Next Episode' i]"
  ].join(", ");

function isEnabled() {
  return state?.settings?.enabled !== false;  
}

function isLiveTV() {
  try {
    const href = String(location?.href || "").toLowerCase();

    // router paths and hash routes
    if (href.includes("/live-tv") || href.includes("#!/live-tv")) return true;

    // legacy paths that still show up in HLS and API calls
    if (href.includes("/livetv/")) return true;

    // video or <source> srcs often include live endpoints
    const v = document.querySelector("video");
    if (v?.src && /\/live-?tv\//i.test(v.src)) return true;
    const s = v?.querySelector?.("source[src]");
    if (s?.src && /\/live-?tv\//i.test(s.src)) return true;

    // some builds expose a live.m3u8 manifest string
    if ([...document.scripts].some(sc => /live\.m3u8/i.test(sc.textContent || ""))) return true;
  } catch (e) {
    console.warn("[Plex Player Experience] liveTV check error", e);
  }
  return false;
}


function log() {
    try { console.log(LOG_PREFIX, ...arguments); } catch {}
  }

function getVideo() {
    return document.querySelector("video");
  }

function loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "getSettings" }, (res) => {
        state.settings = { ...DEFAULTS, ...(res && res.settings ? res.settings : {}) };
        log("settings", state.settings);
        resolve(state.settings);
      });
    });
  }

  // super simple intro and credits skipper, no invalid selectors
 function setupSkipObserver() {
  const root = document.body;
  const seen = new WeakSet();

  const looksLike = (el, phrase) => {
    const t = (el.textContent || "").toLowerCase();
    const a = (el.getAttribute("aria-label") || "").toLowerCase();
    return t.includes(phrase) || a.includes(phrase);
  };

  const clickIf = (phrase) => {
    const btns = root.querySelectorAll("button, [role='button']");
    for (const b of btns) {
      if (seen.has(b)) continue;
      if (looksLike(b, phrase)) {
        try { b.click(); } catch {}
        seen.add(b);
        log("auto skipped", phrase);
      }
    }
  };

  const obs = new MutationObserver(() => {
    if (!state.settings || !isEnabled()) return;
    if (isLiveTV()) return;                                   // gate here
    if (state.settings.autoSkipIntro)   clickIf("skip intro");
    if (state.settings.autoSkipCredits) clickIf("skip credits");
  });

  obs.observe(root, { childList: true, subtree: true });
  state.observers.push(obs);
}
  
function tap(el) {
  const tgt = el.closest("button, [role='button'], [class*='PlayButton']") || el;
  const r = tgt.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;

  // minimal event sequence, no extras
  ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach(type => {
    tgt.dispatchEvent(new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      buttons: 1
    }));
  });
}

function setupUpNextControl() {
  const root = document.body;
  let armed = false;
  let overlayRef = null;

  const arm = async (container) => {
    if (!isEnabled()) { log("disabled, skipping up-next auto click"); return; }
    if (isLiveTV())   { log("live tv, skipping up-next auto click"); return; }
    if (armed) return;

    armed = true;
    overlayRef = container;

    try {
      const fresh = await new Promise(r =>
        chrome.storage.sync.get(DEFAULTS, v => r({ ...DEFAULTS, ...v }))
      );
      state.settings = fresh;
    } catch {}

    const delay = Number(state.settings?.nextDelay ?? 10);
    const ms = delay === 0 ? 50 : delay * 1000;

    clearTimeout(state.upNextClickTimeout);
    state.upNextClickTimeout = setTimeout(() => {
      if (!overlayRef || !document.body.contains(overlayRef)) {
        armed = false; overlayRef = null; return;
      }
      if (isLiveTV() || !isEnabled()) {            // recheck at fire time
        armed = false; overlayRef = null; return;
      }

      const el = overlayRef.querySelector(PLAYBTN_SEL) || document.querySelector(PLAYBTN_SEL);
      if (el) { tap(el); log(`Next episode clicked after ${delay}s`); }
      else { log("Up Next found, play control not found"); }

      armed = false; overlayRef = null;
    }, ms);

    log("armed up-next timer", { delay, ms });
  };

  const disarm = () => {
    if (!armed) return;
    clearTimeout(state.upNextClickTimeout);
    state.upNextClickTimeout = null;
    armed = false;
    overlayRef = null;
    log("disarmed up-next timer");
  };

  const obs = new MutationObserver(() => {
    // only arm when not live
    if (isLiveTV() || !isEnabled()) { disarm(); return; }
    const container = root.querySelector(OVERLAY_SEL);
    if (container) arm(container);
    else disarm();
  });
  obs.observe(root, { childList: true, subtree: true });
  state.observers.push(obs);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    // if enabled flips while overlay is up, re-evaluate
    if ("enabled" in changes || "nextDelay" in changes) {
      if (armed) { disarm(); }
      const container = root.querySelector(OVERLAY_SEL);
      if (container) arm(container);
    }
  });
}

const audio = { ctx: null, source: null, gain: null, el: null };

function teardownAudio(){
  try { audio.source && audio.source.disconnect(); } catch {}
  try { audio.gain && audio.gain.disconnect(); } catch {}
  try { audio.ctx && audio.ctx.close(); } catch {}
  audio.ctx = audio.source = audio.gain = audio.el = null;
}

function ensureAudio(){
	 if (!isEnabled()) return false;
  const v = getVideo();
  if (!v) return false;
  if (audio.el === v && audio.ctx) return true;

  teardownAudio();
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaElementSource(v);
    const gain = ctx.createGain();
    v.muted = false;
    v.volume = 1.0;

    const initial = Math.max(100, Number(state.settings?.volumeBoost || 100));
    gain.gain.value = initial / 100;

    src.connect(gain);
    gain.connect(ctx.destination);

    audio.ctx = ctx; audio.source = src; audio.gain = gain; audio.el = v;

    const resume = () => ctx.resume?.();
    v.addEventListener("play", resume, { once: true });
    return true;
  } catch (e) {
    log("audio pipeline error", e);
    toast("Volume boost not available on this stream");
    return false;
  }
}

function setVolumeBoost(percent){
  const p = Math.max(120, Math.min(1000, Number(percent) || 120)); // never below 120
  state.settings.volumeBoost = p;
  if (!ensureAudio()) return;
  audio.gain.gain.value = p / 120;
  log("volume boost", p + "%");
}


  function startSleepTimer(minutes) {
    clearSleepTimer();
	if (!isEnabled()) return;
    if (!minutes || minutes <= 0) return;

    state.videoEl = getVideo();
    if (!state.videoEl) return;

    const ms = minutes * 60 * 1000;
    state.sleepDeadlineAt = Date.now() + ms;

    state.sleepTimerId = setTimeout(() => {
      const v = getVideo();
      if (v && !v.paused) {
        v.pause();
        toast("Sleep timer hit, paused");
        log("sleep timer paused video");
      }
    }, ms);

    toast(`Sleep timer set for ${minutes} minutes`);
    log("sleep timer armed", { minutes });
  }

  function clearSleepTimer() {
    if (state.sleepTimerId) {
      clearTimeout(state.sleepTimerId);
      state.sleepTimerId = null;
      state.sleepDeadlineAt = null;
      log("sleep timer cleared");
    }
  }

  function toast(msg) {
    const gold = cssVar("--plex-gold", GOLD);
    const bg   = cssVar("--plex-bg", BG);

    const el = document.createElement("div");
    el.textContent = msg;
    el.style.position = "fixed";
    el.style.bottom = "24px";
    el.style.right  = "24px";
    el.style.background = bg;
    el.style.border = `1px solid ${gold}`;
    el.style.color = gold;
    el.style.padding = "10px 14px";
    el.style.borderRadius = "10px";
    el.style.fontFamily = "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
    el.style.fontSize = "14px";
    el.style.zIndex = 999999;
    el.style.boxShadow = "0 6px 20px rgba(0,0,0,0.35)";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "startSleepTimer") {
      startSleepTimer(msg.minutes);
    }
	if (msg.type === "setVolumeBoost") {
    setVolumeBoost(msg.percent);
  }
  });

async function init() {
  await loadSettings();

  setupSkipObserver();
  setupUpNextControl();


  ensureAudio();
  setVolumeBoost(state.settings.volumeBoost || 100);


  const videoObs = new MutationObserver(() => {
    const v = getVideo();
    if (v && v !== audio.el) {
      ensureAudio();
      setVolumeBoost(state.settings.volumeBoost || 100);
    }
  });
  videoObs.observe(document.body, { childList: true, subtree: true });
  state.observers.push(videoObs);

  if (state.settings.sleepEnabled && state.settings.sleepMinutes > 0) {
    setTimeout(() => startSleepTimer(state.settings.sleepMinutes), 3000);
  }
}
  
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync" || !state.settings) return;
  let touched = false;
  for (const k of ["nextDelay","sleepEnabled","sleepMinutes","autoSkipIntro","autoSkipCredits","enabled"]) {  // added enabled
    if (k in changes) {
      state.settings[k] = changes[k].newValue;
      touched = true;
    }
  }
  if (touched) log("settings updated", state.settings);
});

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();