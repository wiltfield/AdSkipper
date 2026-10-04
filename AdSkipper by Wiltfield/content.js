(() => {
  const SKIP_SELECTORS = [
    ".ytp-skip-ad-button",
    ".ytp-ad-skip-button",
    ".ytp-ad-skip-button-modern",
    ".ytp-ad-skip-button-container button",
    "button.ytp-ad-skip-button-modern"
  ].join(",");

  const settings = { mute: true, skip: true };

  let player = null;
  let video = null;
  let observer = null;
  let adActive = false;
  let wasMuted = false;
  let scheduled = false;

  chrome.storage.sync.get({ mute: true, skip: true }, (s) => {
    settings.mute = s.mute;
    settings.skip = s.skip;
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    if (changes.mute) settings.mute = changes.mute.newValue;
    if (changes.skip) settings.skip = changes.skip.newValue;
    if (changes.mute && !settings.mute && adActive) restoreAudio();
    schedule();
  });

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const cs = getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden";
  }

  function muteForAd() {
    if (!video || !settings.mute) return;
    if (!adActive) {
      wasMuted = video.muted;
      adActive = true;
    }
    video.muted = true;
  }

  function restoreAudio() {
    if (!adActive) return;
    adActive = false;
    if (video) video.muted = wasMuted;
  }

  function countSkip() {
    chrome.storage.local.get({ skipped: 0 }, (s) => {
      chrome.storage.local.set({ skipped: s.skipped + 1 });
    });
  }

  function tick() {
    scheduled = false;
    if (!player || !player.isConnected) {
      attach();
      return;
    }
    const adShowing = player.classList.contains("ad-showing");

    if (adShowing) {
      if (settings.mute) muteForAd();
      if (settings.skip) {
        const btn = [...player.querySelectorAll(SKIP_SELECTORS)].find(isVisible);
        if (btn) {
          btn.click();
          countSkip();
        }
      }
    } else if (adActive) {
      restoreAudio();
    } else if (!adShowing) {
      adActive = false;
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(tick);
  }

  function attach() {
    const p = document.querySelector("#movie_player");
    if (!p) return;
    player = p;
    video = p.querySelector("video.html5-main-video") || p.querySelector("video");
    if (observer) observer.disconnect();
    observer = new MutationObserver(schedule);
    observer.observe(player, {
      attributes: true,
      attributeFilter: ["class", "style"],
      childList: true,
      subtree: true
    });
    schedule();
  }

  // Fallback poll: finds the player after SPA navigation and catches anything the observer misses.
  setInterval(() => {
    if (!player || !player.isConnected) attach();
    else {
      if (!video || !video.isConnected) {
        video = player.querySelector("video.html5-main-video") || player.querySelector("video");
      }
      schedule();
    }
  }, 250);

  attach();
})();
