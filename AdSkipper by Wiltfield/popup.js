const root = document.documentElement;
const countEl = document.getElementById("count");

function setSwitch(id, on) {
  document.getElementById(id).setAttribute("aria-checked", String(on));
}

function setTheme(theme) {
  root.setAttribute("data-theme", theme);
}

chrome.storage.sync.get({ mute: true, skip: true, theme: "dark" }, (s) => {
  setSwitch("mute", s.mute);
  setSwitch("skip", s.skip);
  setTheme(s.theme);
});

chrome.storage.local.get({ skipped: 0 }, (s) => {
  countEl.textContent = "Skipped: " + s.skipped;
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.skipped) {
    countEl.textContent = "Skipped: " + changes.skipped.newValue;
  }
});

["mute", "skip"].forEach((key) => {
  const btn = document.getElementById(key);
  btn.addEventListener("click", () => {
    const next = btn.getAttribute("aria-checked") !== "true";
    setSwitch(key, next);
    chrome.storage.sync.set({ [key]: next });
  });
});

document.getElementById("theme").addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  setTheme(next);
  chrome.storage.sync.set({ theme: next });
});
