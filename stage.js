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

function mapMode(mode, region) {
  stage.dataset.mode = mode;
  stageCredit.hidden = mode === "cover";
  if (region) {
    const [x, y] = photoPins[region].position;
    camera.style.setProperty("--pin-x", `${x / MAP_WIDTH * 100}%`);
    camera.style.setProperty("--pin-y", `${y / MAP_HEIGHT * 100}%`);
  }
  for (const pin of camera.querySelectorAll(".stage-pin")) {
    pin.toggleAttribute("data-active", pin.dataset.place === region);
  }
  if (mode !== "cover") {
    const pin = photoPins[region];
    if (pin) setStageCredit(pin.source, `取景照片 · ${pin.credit}`);
    else setStageCredit("https://datav.aliyun.com/portal/school/atlas/area_selector", "取景地图 · DataV 区划数据");
  }
}

function carryCoverMap(board) {
  const { left, top, width, height } = board.getBoundingClientRect();
  camera.style.setProperty("--cover-x", `${left + width / 2}px`);
  camera.style.setProperty("--cover-y", `${top + height / 2}px`);
  camera.style.setProperty("--cover-width", `${width}px`);
  camera.classList.add("carry-cover");
  camera.getBoundingClientRect();
  camera.classList.remove("carry-cover");
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
    stage.dataset.mode = archive ? "archive" : "view";
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
    if (foreground !== layer || !motionEnabled || reduceMotion.matches || manuallyPlaying) return;
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
  if (!manuallyPlaying) video.play().catch(() => {});
}

function showStage(scene, focus = false) {
  window.clearTimeout(mediaTimer);
  retireMedia();
  if (!scene) {
    mapMode("cover");
    return;
  }
  const last = scene.end === film.scenes[film.scenes.length - 1].end;
  const zoom = focus && !last;
  mapMode(last ? "end" : zoom ? "focus" : "route", zoom ? scene.region : "");
  if (!scene.refs.length || last) return;
  mediaTimer = window.setTimeout(() => sceneMedia(scene), zoom && !reduceMotion.matches ? 1120 : 280);
}

function stopScenery(scene) {
  motionEnabled = !motionEnabled;
  stage.classList.toggle("stilling", !motionEnabled);
  const video = foreground?.querySelector("video");
  if (!video) {
    if (motionEnabled && foreground && scene && stage.dataset.mode !== "archive") sceneMedia(scene);
    return;
  }
  if (motionEnabled && !manuallyPlaying) video.play().catch(() => {});
  else video.pause();
}
