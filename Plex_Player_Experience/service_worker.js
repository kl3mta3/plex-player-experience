const DEFAULTS = {
  nextDelay: 10,
  sleepEnabled: false,
  sleepMinutes: 0,
  autoSkipIntro: true,
  autoSkipCredits: true,
   volumeBoost: 120,  
   enabled: true,
   isLiveTV: false,
  sites: [] // user added origins like "https://plex.mydomain.com/*" or "http://76.12.34.56/*"
};

async function getSettings() {
  const s = await chrome.storage.sync.get(DEFAULTS);
  return { ...DEFAULTS, ...s };
}

async function setSettings(settings) {
  await chrome.storage.sync.set(settings);
}

// --- helper: send to a tab but ignore "no receiver" noise
function safeSendMessage(tabId, payload) {
  try {
    chrome.tabs.sendMessage(tabId, payload, () => {
      // Swallow: no receiver / tab closed / not injected yet
      void chrome.runtime.lastError;
    });
  } catch (_) {
    // tab may no longer exist; ignore
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(DEFAULTS);
  await chrome.storage.sync.set({ ...DEFAULTS, ...current });
  await refreshDynamicScripts();
});

chrome.runtime.onStartup.addListener(async () => {
  await refreshDynamicScripts();
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "getSettings") {
    getSettings().then((settings) => sendResponse({ settings }));
    return true;
  }

  if (msg.type === "saveSettings") {
    (async () => {
      const before = await getSettings();           // to see if sites changed
      await setSettings(msg.settings);

      // Only re-register scripts if sites changed
      const a = JSON.stringify(before.sites || []);
      const b = JSON.stringify(msg.settings.sites || []);
      if (a !== b) await refreshDynamicScripts();

      sendResponse({ ok: true });
    })();
    return true;
  }

  if (msg.type === "startSleepTimer") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const id = tabs?.[0]?.id;
      if (id) safeSendMessage(id, msg);
    });
    sendResponse({ ok: true });
    return true;
  }

if (msg.type === "setVolumeBoost") {
  const p = Math.max(120, Math.min(1000, Number(msg.percent) || 120));
  if (sender.tab?.id) {
    safeSendMessage(sender.tab.id, { type: "setVolumeBoost", percent: p });
  } else {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const id = tabs?.[0]?.id;
      if (id) safeSendMessage(id, { type: "setVolumeBoost", percent: p });
    });
  }
  sendResponse();
  return true;
}

  if (msg.type === "refreshDynamicScripts") {
    refreshDynamicScripts().then(() => sendResponse({ ok: true }));
    return true;
  }
});

// --- dynamic content-script registration for custom sites
async function refreshDynamicScripts() {
  const { sites } = await getSettings();

  try {
    await chrome.scripting.unregisterContentScripts({ ids: ["pb-dynamic"] });
  } catch (e) {
    // ignore if not registered yet
  }

  const cleaned = (sites || [])
    .map(s => String(s).trim())
    .filter(s => s && /^(https?:\/\/).+\/\*$/.test(s));

  if (cleaned.length === 0) return;

  // Only register for origins we already have permission for
  const granted = [];
  for (const origin of cleaned) {
    const ok = await chrome.permissions.contains({ origins: [origin] }).catch(() => false);
    if (ok) granted.push(origin);
  }
  if (granted.length === 0) return;

  await chrome.scripting.registerContentScripts([{
    id: "pb-dynamic",
    matches: granted,
    js: ["content.js"],
    css: ["styles.css"],
    runAt: "document_idle",
    persistAcrossSessions: true
  }]);
}