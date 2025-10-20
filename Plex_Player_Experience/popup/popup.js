const DEFAULTS = {
  nextDelay: 10,
  sleepEnabled: false,
  sleepMinutes: 0,
  autoSkipIntro: true,
  autoSkipCredits: true,
  volumeBoost: 120, 
   enabled: true,
   isLiveTV: false,
};

const $ = id => document.getElementById(id);
const clampBoost = v => Math.max(120, Math.min(1000, Number(v) || 120));

function readSettingsFromUI() {
  return {
    nextDelay: Number($("nextDelay")?.value ?? DEFAULTS.nextDelay),
    autoSkipIntro: !!$("autoSkipIntro")?.checked,
    autoSkipCredits: !!$("autoSkipCredits")?.checked,
    sleepMinutes: Number($("sleepMinutes")?.value || 0),
	volumeBoost: clampBoost($("boost")?.value || DEFAULTS.volumeBoost),
	enabled: !!$("masterEnable")?.checked 
  };
}

function showSaved() {
  const s = $("saveStatus");
  if (!s) return;
  s.textContent = "Saved";
  s.classList.add("show");
  setTimeout(() => s.classList.remove("show"), 900);
}

let saveTimer = null;
function queueSave() {
  if (saveTimer) clearTimeout(saveTimer);
  // debounce so we save once after interaction ends
  saveTimer = setTimeout(() => {
    const settings = readSettingsFromUI();
    chrome.runtime.sendMessage({ type: "saveSettings", settings }, () => {
      const s = $("saveStatus");
      if (s) { s.textContent = "Saved"; s.classList.add("show"); setTimeout(() => s.classList.remove("show"), 900); }
    });
  }, 600); 
}

function load() {
  chrome.runtime.sendMessage({ type: "getSettings" }, (res) => {
    const s = { ...DEFAULTS, ...(res && res.settings ? res.settings : {}) };
    $("nextDelay") && ( $("nextDelay").value = String(s.nextDelay) );
    $("autoSkipIntro") && ( $("autoSkipIntro").checked = !!s.autoSkipIntro );
    $("autoSkipCredits") && ( $("autoSkipCredits").checked = !!s.autoSkipCredits );
    $("sleepMinutes") && ( $("sleepMinutes").value = Number(s.sleepMinutes || 0) );
	$("masterEnable") && ( $("masterEnable").checked = s.enabled !== false );

    const r = $("boost"), label = $("boostLabel");
    if (r && label) {
      const val = clampBoost(s.volumeBoost);
      r.value = val;
      label.textContent = `${val} %`;
    }
  });
}

function startNow() {
  const minutes = Number($("sleepMinutes")?.value || 0);
  chrome.runtime.sendMessage({ type: "startSleepTimer", minutes });
}

function sendBoost(percent){
  chrome.runtime.sendMessage({ type: "setVolumeBoost", percent: clampBoost(percent) });
}

document.addEventListener("DOMContentLoaded", () => {
  load();

  // autosave wiring
  $("nextDelay")?.addEventListener("change", queueSave);
  $("autoSkipIntro")?.addEventListener("change", queueSave);
  $("autoSkipCredits")?.addEventListener("change", queueSave);
  $("masterEnable")?.addEventListener("change", queueSave); 
 
  const sm = $("sleepMinutes");
  if (sm) {
    sm.addEventListener("input", queueSave);
    sm.addEventListener("change", queueSave);
    sm.addEventListener("blur", queueSave);
  }

 // volume booster
  const r = $("boost"), label = $("boostLabel");
  if (r && label) {
    r.addEventListener("input", () => {
      const val = clampBoost(r.value);
      r.value = val;
      label.textContent = `${val} %`;
      sendBoost(val);
    });
    const persist = () => queueSave();
    r.addEventListener("change", persist);
    r.addEventListener("pointerup", persist);
    r.addEventListener("keyup", e => { if (e.key === "Enter") persist(); });
  }


  // actions
  $("startNowBtn")?.addEventListener("click", startNow);
  $("openOptions")?.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  // footer bits
  const y = $("year");
  if (y) y.textContent = new Date().getFullYear();
  const verEl = $("extVer");
  const manifest = chrome?.runtime?.getManifest?.();
  if (verEl && manifest?.version) verEl.textContent = manifest.version;
});

// Remember collapsed/expanded state without touching sync storage
const panelIds = ["panel-experience", "panel-boost", "panel-sleep"];
panelIds.forEach(id => {
  const d = document.getElementById(id);
  if (!d) return;
  const saved = localStorage.getItem("ppx:" + id);
  if (saved != null) d.open = saved === "1";
  d.addEventListener("toggle", () =>
    localStorage.setItem("ppx:" + id, d.open ? "1" : "0")
  );
});