const DEFAULTS = {
  nextDelay: 10,
  sleepEnabled: false,
  sleepMinutes: 0,
  autoSkipIntro: true,
  autoSkipCredits: true,
  sites: []
};

function $(id) { return document.getElementById(id); }

function parseSites(str) {
  return (str || "")
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);
}

function validPattern(p) {
  return /^(https?:\/\/).+\/\*$/.test(p);
}

function loadOptions() {
  chrome.runtime.sendMessage({ type: "getSettings" }, (res) => {
    const s = { ...DEFAULTS, ...(res && res.settings ? res.settings : {}) };
    $("nextDelay").value = String(s.nextDelay);
    $("autoSkipIntro").checked = !!s.autoSkipIntro;
    $("autoSkipCredits").checked = !!s.autoSkipCredits;
    $("sleepEnabled").checked = !!s.sleepEnabled;
    $("sleepMinutes").value = Number(s.sleepMinutes || 0);
    $("sites").value = (s.sites || []).join("\n");
  });
}

async function requestPerms() {
  const raw = $("sites").value;
  const patterns = parseSites(raw).filter(validPattern);
  if (patterns.length === 0) {
    $("permStatus").textContent = "Add at least one valid pattern first";
    return;
  }
  try {
    const granted = await chrome.permissions.request({ origins: patterns });
    $("permStatus").textContent = granted ? "Access granted" : "Permission was not granted";
  } catch (e) {
    $("permStatus").textContent = "Permission error";
  }
}

function saveOptions() {
  const settings = {
    nextDelay: Number($("nextDelay").value),
    autoSkipIntro: $("autoSkipIntro").checked,
    autoSkipCredits: $("autoSkipCredits").checked,
    sleepEnabled: $("sleepEnabled").checked,
    sleepMinutes: Number($("sleepMinutes").value),
    sites: parseSites($("sites").value).filter(validPattern)
  };
  chrome.runtime.sendMessage({ type: "saveSettings", settings }, () => {
    chrome.runtime.sendMessage({ type: "refreshDynamicScripts" });
    const btn = $("saveBtn");
    btn.textContent = "Saved";
    setTimeout(() => (btn.textContent = "Save"), 1200);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadOptions();
  $("saveBtn").addEventListener("click", saveOptions);
  $("startNowBtn").addEventListener("click", () => {
    const minutes = Number($("sleepMinutes").value || 0);
    chrome.runtime.sendMessage({ type: "startSleepTimer", minutes });
  });
  $("requestPermsBtn").addEventListener("click", requestPerms);
  
  
      const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
  
  const verEl = document.getElementById("extVer");
	if (verEl && chrome?.runtime?.getManifest) {
  verEl.textContent = chrome.runtime.getManifest().version;
	}
  
});

