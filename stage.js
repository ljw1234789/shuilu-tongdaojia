"use strict";

const stage = document.querySelector(".stage");
const camera = stage.querySelector(".map-camera");
const stageMedia = stage.querySelector(".stage-media");
const stageCredit = document.querySelector(".scene-credit");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let motionEnabled = true;
let mediaTimer = 0;
let foreground = null;

function setStageCredit(url, label) {
  stageCredit.innerHTML = link(url, label);
}

function setStageMode(mode) {
  stage.dataset.mode = mode;
  document.body.dataset.stage = mode;
  camera.inert = mode !== "atlas";
}

function mapMode(mode, region) {
  setStageMode(mode);
  camera.dataset.framing = mode;
  stageCredit.hidden = mode === "intro" || mode === "catalogue";
  if (region) {
    highlightDistrict(camera.querySelector(".district-highlight"), region);
    camera.dataset.region = region;
    const [x, y] = photoPins[region].position;
    camera.style.setProperty("--pin-x", `${x / MAP_WIDTH * 100}%`);
    camera.style.setProperty("--pin-y", `${y / MAP_HEIGHT * 100}%`);
  }
  for (const pin of camera.querySelectorAll(".map-pin")) {
    pin.toggleAttribute("data-active", pin.dataset.place === region);
  }
  if (!stageCredit.hidden) {
    const pin = photoPins[region];
    if (pin) setStageCredit(pin.source, `取景照片 · ${pin.credit}`);
    else setStageCredit("https://datav.aliyun.com/portal/school/atlas/area_selector", "取景地图 · DataV 区划数据");
  }
}

function retireMedia() {
  if (!foreground) return;
  const retiring = foreground;
  foreground = null;
  retiring.querySelector("video")?.pause();
  retiring.classList.remove("shown");
  window.setTimeout(() => {
    const video = retiring.querySelector("video");
    if (video) {
      video.removeAttribute("src");
      video.load();
    }
    retiring.remove();
  }, 720);
}

function sceneMedia(scene) {
  const pin = photoPins[scene.region];
  const ref = scene.refs.find(item => {
    const source = film.sources[item.key];
    return source.kind !== "buy" && source.media && Number.isFinite(item.from);
  });
  const archive = scene.refs.every(item => item.key === "letter");

  retireMedia();
  const layer = document.createElement("div");
  layer.className = `stage-frame${archive ? " archive-frame" : ""}`;
  foreground = layer;
  if (archive) {
    const lines = document.createElement("p");
    lines.textContent = scene.onscreen;
    layer.append(lines);
    setStageCredit(film.sources.letter.url, `档案释文 · ${film.sources.letter.owner}`);
  } else {
    const still = document.createElement("img");
    still.alt = "";
    still.decoding = "async";
    still.referrerPolicy = "no-referrer";
    still.src = pin.image;
    layer.append(still);
    setStageCredit(pin.source, `取景照片 · ${pin.credit}`);
  }
  stageMedia.append(layer);
  requestAnimationFrame(() => {
    if (foreground !== layer) return;
    setStageMode(archive ? "archive" : "view");
    layer.classList.add("shown");
  });

  if (archive || !ref || !motionEnabled || reduceMotion.matches || navigator.connection?.saveData) return;
  const video = document.createElement("video");
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.src = refUrl(ref);
  const source = film.sources[ref.key];
  const showVideo = () => {
    if (foreground !== layer) return;
    video.classList.add("playing");
    setStageCredit(source.url, `实景预览 · ${source.owner} · ${clock(ref.from)}–${clock(ref.to)}`);
  };
  const restart = () => {
    if (foreground !== layer || !motionEnabled || reduceMotion.matches || manuallyPlaying || detail.open) return;
    video.currentTime = ref.from;
    video.play().catch(() => {});
  };
  video.addEventListener("playing", showVideo);
  video.addEventListener("ended", restart);
  video.addEventListener("pause", () => {
    if (video.currentTime >= ref.to - .16) restart();
  });
  video.addEventListener("timeupdate", () => {
    if (video.currentTime >= ref.to - .08) restart();
  });
  video.addEventListener("error", () => {
    if (foreground !== layer) return;
    video.remove();
    setStageCredit(pin.source, `取景照片 · ${pin.credit}`);
  });
  layer.append(video);
  if (!manuallyPlaying && !detail.open) video.play().catch(() => {});
}

function showStage(page, scene) {
  window.clearTimeout(mediaTimer);
  retireMedia();
  const mode = page.dataset.mode;
  const keepFocus = mode === "route" && camera.dataset.framing === "focus" && camera.dataset.region === scene?.region;
  if (keepFocus) setStageMode(mode);
  else mapMode(mode, page.dataset.place || "");
  if (mode !== "route" || !scene?.refs.length) return;
  mediaTimer = window.setTimeout(() => sceneMedia(scene), 110);
}

function stopScenery(scene) {
  motionEnabled = !motionEnabled;
  stage.classList.toggle("stilling", !motionEnabled);
  const video = foreground?.querySelector("video");
  if (!video) {
    if (motionEnabled && foreground && scene && stage.dataset.mode !== "archive") sceneMedia(scene);
    return;
  }
  if (motionEnabled && !manuallyPlaying && !detail.open) video.play().catch(() => {});
  else video.pause();
}
