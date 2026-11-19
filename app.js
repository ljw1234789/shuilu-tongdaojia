"use strict";

const film = window.FILM;
const main = document.querySelector("#main");
const controls = document.querySelector("#controls");
const workTab = document.querySelector("#storyTab");
const sourcesTab = document.querySelector("#sourcesTab");
const fullscreen = document.querySelector("#fullscreen");
const licenseLabels = {
  buy: "可购授权",
  ask: "联系权利方",
  ref: "仅作参考",
  shoot: "需补拍",
  post: "后期制作"
};
const filters = [
  ["all", "全部"],
  ["buy", "可购授权"],
  ["ask", "联系权利方"],
  ["shoot", "需补拍"],
  ["post", "后期制作"]
];

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function clock(seconds) {
  return [Math.floor(seconds / 60), seconds % 60].map(x => String(x).padStart(2, "0")).join(":");
}
function timeRange(scene) {
  return `${clock(scene.start)}–${clock(scene.end)}`;
}
function sceneHash(scene) {
  return "#" + clock(scene.start).replace(":", "-");
}
function badge(kind) {
  return `<span class="badge ${kind}">${licenseLabels[kind]}</span>`;
}
function sceneKinds(scene) {
  const result = new Set(scene.refs.map(ref => film.sources[ref.key].kind));
  if (!["沿用上一段", "档案有来源", "大致可替"].includes(scene.match)) result.add("shoot");
  if (scene.match === "沿用上一段") result.add("post");
  return [...result];
}

function link(href, label, classes = "") {
  return `<a class="${classes}" href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer">${escapeHTML(label)}</a>`;
}
function refUrl(ref) {
  const source = film.sources[ref.key];
  if (source.kind !== "buy" && source.media && Number.isFinite(ref.from)) return `${source.media}#t=${ref.from},${ref.to}`;
  return ref.fragment ? `${source.url}#${ref.fragment}` : source.url;
}

function drawPlayer(scene, panel, referenceIndex) {
  const oldVideo = panel.querySelector("video");
  if (oldVideo) oldVideo.pause();
  if (oldVideo && oldVideo === manuallyPlaying) focusPlayer(null);
  const ref = scene.refs[referenceIndex];
  if (!ref) {
    panel.innerHTML = `<div class="player-empty"><h3>这一镜需要现场拍</h3><p>与前段同人、同一尾鱼。具体机位见授权与补拍。</p></div>`;
    return;
  }

  const source = film.sources[ref.key];
  if (source.kind !== "buy" && source.media && Number.isFinite(ref.from)) {
    panel.innerHTML = `<div class="player-box"><button type="button" class="action player-button">在页内播放 · ${clock(ref.from)} 起</button></div>`;
    panel.querySelector(".player-button").addEventListener("click", event => {
      const button = event.currentTarget;
      const video = document.createElement("video");
      video.controls = true;
      video.playsInline = true;
      video.src = refUrl(ref);
      video.title = source.label;
      video.addEventListener("error", () => {
        if (manuallyPlaying === video) focusPlayer(null);
        video.replaceWith(Object.assign(document.createElement("p"), {textContent:"页内视频暂不可播，请用下方的原发布页预览。"}));
      });
      video.addEventListener("timeupdate", () => {
        if (video.currentTime >= ref.to + .05) video.pause();
      });
      button.replaceWith(video);
      video.play().catch(() => {});
    });
    return;
  }

  const note = ref.key === "letter" ? "档案原件图与释文在馆方页面" :
               source.kind === "buy" ? "打开原站播放器，按下方源片秒点查看" : "在来源页查看原始内容";
  const previewTitle = ref.key === "letter" && scene.start === 68 ? "洋银弍大元，以为母亲买肉之赀" : source.label;
  panel.innerHTML = `<div class="player-empty ${ref.key === "letter" ? "archive" : ""}">
    <h3>${escapeHTML(previewTitle)}</h3><p>${link(refUrl(ref), note)}</p></div>`;
}

function drawReferences(scene, section, referenceIndex = 0) {
  const list = section.querySelector(".asset-list");
  drawPlayer(scene, section.querySelector(".preview"), referenceIndex);
  list.innerHTML = scene.refs.map((ref, i) => {
    const source = film.sources[ref.key];
    const active = referenceIndex === i;
    const direct = source.kind !== "buy" && source.media && Number.isFinite(ref.from);
    return `<div class="asset ${active ? "selected" : ""}">
      <button class="source-select" type="button" data-ref="${i}" aria-pressed="${active}">${escapeHTML(source.label)}</button>
      ${badge(source.kind)}
      <p><span class="mono">${escapeHTML(ref.where)}</span> · ${escapeHTML(ref.fit)}</p>
      <div class="asset-direct">
        ${direct ? link(refUrl(ref), "直接播放片段") : ""}
        ${ref.fragment ? link(refUrl(ref), "定位馆藏释文") : ""}
        ${link(source.url, source.kind === "buy" ? "预览与授权页" : "原发布页")}
      </div>
      ${active ? `<p class="source-notice">${escapeHTML(source.owner)} · ${escapeHTML(source.details)}</p>` : ""}
    </div>`;
  }).join("");
  for (const control of list.querySelectorAll("[data-ref]")) {
    control.addEventListener("click", () => {
      const selected = Number(control.dataset.ref);
      drawReferences(scene, section, selected);
      list.querySelector(`[data-ref="${selected}"]`).focus({preventScroll:true});
    });
  }
}

function sceneMarkup(scene, index) {
  const kinds = sceneKinds(scene);
  const id = sceneHash(scene).slice(1);
  return `
    <section class="beat" id="${id}" aria-labelledby="heading-${id}" tabindex="-1">
      <article class="sheet">
      <header class="scene-head">
        <div><p class="eyebrow mono">${timeRange(scene)} · 分镜 ${String(index + 1).padStart(2, "0")}</p>
        <h2 class="heading" id="heading-${id}">${escapeHTML(scene.title)}</h2>
        <p class="muted">${escapeHTML(scene.location)}</p></div>
        <span class="badge ${kinds.includes("shoot") ? "shoot" : ""}">${escapeHTML(scene.match)}</span>
      </header>
      <div class="scene-grid">
        <div>
          <section class="script" aria-label="精修版分镜">
            ${scene.voice ? `<div class="voice"><h3 class="eyebrow">旁白</h3><p>${escapeHTML(scene.voice)}</p></div>` : ""}
            <dl>
              <dt>画面</dt><dd>${escapeHTML(scene.picture)}</dd>
              ${scene.onscreen ? `<dt>屏显</dt><dd>${escapeHTML(scene.onscreen)}</dd>` : ""}
              <dt>声音</dt><dd>${escapeHTML(scene.sound)}</dd>
            </dl>
          </section>
          <section class="production"><h3>授权与补拍</h3><p>${escapeHTML(scene.gap)}</p></section>
        </div>
        <div class="scene-media media-side">
          <div class="media-bar"><h3>素材预览</h3>${kinds.includes("post") ? badge("post") : ""}</div>
          <div class="preview"></div>
          <div class="asset-list"></div>
        </div>
      </div>
      </article>
    </section>`;
}

function drawAudit(activeFilter = "all") {
  const audit = document.querySelector("#sources");
  const chosen = film.scenes.filter(scene => activeFilter === "all" || sceneKinds(scene).includes(activeFilter));
  audit.innerHTML = `
    <div class="sheet audit">
      <p class="eyebrow">精修版 · 03:00</p>
      <h2 class="heading" id="audit-title">素材总表</h2>
      <p class="table-note">左侧是成片时码，素材卡内是源片秒点。光厂素材在原站播放器查看，可选授权档位。新闻实录与馆藏图需向原方申请。当前素材尚未取得成片使用权。</p>
      <div class="filters" aria-label="筛选素材状态">
        ${filters.map(([code, label]) => `<button class="filter" type="button" data-filter="${code}" aria-pressed="${code === activeFilter}">${label}</button>`).join("")}
      </div>
      <div class="audit-list">
        <div class="audit-row header" aria-hidden="true"><span>成片时码</span><span>预览与来源</span><span>授权与补拍</span></div>
        ${chosen.map(scene => {
          const kinds = sceneKinds(scene);
          return `<article class="audit-row">
            <div><span class="slot-time mono">${timeRange(scene)}</span><a href="${sceneHash(scene)}" class="slot-title">${escapeHTML(scene.title)}</a><p class="muted">${escapeHTML(scene.location)}</p></div>
            <div class="asset-links">
              ${scene.refs.length ? scene.refs.map(ref => `<div>${badge(film.sources[ref.key].kind)}${link(refUrl(ref), film.sources[ref.key].label)}<p class="muted">${escapeHTML(ref.where)}</p></div>`).join("") : "<p class='muted'>需拍摄同一人物的连续动作</p>"}
            </div>
            <div><p class="slot-status">${kinds.filter(k => k === "shoot" || k === "post").map(badge).join("")}</p><p class="audit-gap">${escapeHTML(scene.gap)}</p></div>
          </article>`;
        }).join("")}
      </div>
    </div>`;
  for (const button of audit.querySelectorAll("[data-filter]")) {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      drawAudit(activeFilter);
      audit.querySelector(`[data-filter="${activeFilter}"]`).focus({preventScroll:true});
    });
  }
}

function coverMarkup() {
  return `<section id="cover" class="cover" aria-labelledby="cover-title" tabindex="-1">
    <figure class="map-sheet" aria-label="广东取景点">
      <div class="map-board"><canvas aria-hidden="true"></canvas><div class="map-labels"></div></div>
    </figure>
    <div class="cover-text">
      <p class="eyebrow">阅山河 · 广东</p>
      <h1 id="cover-title">${escapeHTML(film.title)}</h1>
      <p class="tagline">${escapeHTML(film.tagline)}</p>
      <a class="down-link" href="#00-00">向下看分镜 <span aria-hidden="true">↓</span></a>
    </div>
  </section>`;
}

function controlsMarkup() {
  controls.innerHTML = `
    <div class="ctrl-buttons">
      <button id="previous" type="button" aria-label="上一段" title="上一段">←</button>
      <button id="next" type="button" aria-label="下一段" title="下一段">→</button>
    </div>
    <div class="timeline" aria-label="按成片时码跳转">
      ${film.scenes.map((scene, i) => `<a data-seek="${i}" href="${sceneHash(scene)}" style="flex-grow:${scene.end - scene.start}" aria-label="${timeRange(scene)} ${escapeHTML(scene.title)}" title="${timeRange(scene)} ${escapeHTML(scene.title)}"></a>`).join("")}
    </div>
    <span class="counter mono"></span>
    <button id="clean" type="button" aria-pressed="false" title="H 键切换">隐藏正文</button>
    <button id="notes-toggle" type="button" aria-controls="scene-note" aria-expanded="false" title="N 键切换">说明</button>
    <button id="motion-toggle" type="button" aria-pressed="true" title="暂停或继续背景实景">动景</button>`;
}

function currentTarget() {
  const readingLine = Math.max(100, Math.min(window.innerHeight * .44, 300));
  let index = 0;
  for (let i = 1; i < pages.length; i++) {
    if (pages[i].getBoundingClientRect().top > readingLine) break;
    index = i;
  }
  return index;
}

function showProgress(forceFocus = false) {
  const pageIndex = currentTarget();
  if (cursor === pageIndex && !forceFocus) return;
  const lastScene = film.scenes[cursor - 1];
  pages[cursor]?.querySelectorAll("video").forEach(video => video.pause());
  cursor = pageIndex;
  const sceneIndex = pageIndex - 1;
  const inScene = sceneIndex >= 0 && sceneIndex < film.scenes.length;
  controls.hidden = pageIndex === 0;
  const scene = film.scenes[sceneIndex];
  if (manuallyPlaying?.paused) focusPlayer(null);
  showStage(scene, Boolean(scene && (forceFocus || scene.region !== lastScene?.region)));
  updateNote(scene);
  previous.disabled = pageIndex === 0;
  next.disabled = pageIndex === pages.length - 1;
  hideScript.disabled = !inScene;
  noteToggle.disabled = !inScene;
  motionToggle.disabled = !inScene || reduceMotion.matches;
  motionToggle.setAttribute("aria-pressed", String(motionEnabled && !reduceMotion.matches));
  counter.textContent = inScene ? `${String(sceneIndex + 1).padStart(2, "0")} / ${film.scenes.length}` : "素材";
  workTab.setAttribute("aria-current", inScene ? "location" : "false");
  sourcesTab.setAttribute("aria-current", pageIndex === pages.length - 1 ? "location" : "false");
  for (const marker of markers) {
    const selected = Number(marker.dataset.seek) === sceneIndex;
    marker.toggleAttribute("aria-current", selected);
    if (selected) marker.setAttribute("aria-current", "step");
  }
}

function goTo(target, forceFocus = false) {
  if (forceFocus && cursor === 0 && !reduceMotion.matches) {
    carryCoverMap(main.querySelector(".map-board"));
  }
  if (location.hash !== `#${target.id}`) history.pushState(null, "", `#${target.id}`);
  target.scrollIntoView({ behavior: "instant" });
  target.focus({ preventScroll: true });
  showProgress(forceFocus);
}

function move(step) {
  const index = Math.max(0, Math.min(pages.length - 1, currentTarget() + step));
  goTo(pages[index]);
}

function toggleClean() {
  if (hideScript.disabled) return;
  const hidden = document.body.classList.toggle("clean");
  hideScript.setAttribute("aria-pressed", String(hidden));
  hideScript.textContent = hidden ? "显示正文" : "隐藏正文";
}

function updateNote(scene) {
  note.hidden = !notesOpen || !scene;
  noteToggle.setAttribute("aria-expanded", String(!note.hidden));
  if (note.hidden) return;
  note.innerHTML = `<header><span class="mono">${timeRange(scene)}</span>
    <h2>${escapeHTML(scene.title)}</h2></header>
    <p>${escapeHTML(scene.voice || scene.picture)}</p>
    <p>${escapeHTML(scene.gap)}</p>`;
}

function toggleNotes() {
  if (noteToggle.disabled) return;
  notesOpen = !notesOpen;
  updateNote(film.scenes[cursor - 1]);
}

function focusPlayer(video) {
  manuallyPlaying = video;
  stage.classList.toggle("manual-preview", Boolean(video));
  const background = foreground?.querySelector("video");
  if (!background) return;
  if (video || !motionEnabled || reduceMotion.matches) background.pause();
  else background.play().catch(() => {});
}

function setFullLabel() {
  fullscreen.textContent = document.fullscreenElement
    ? "退出全屏"
    : document.body.classList.contains("immersive") ? "退出沉浸" : "全屏";
}

async function toggleFull() {
  if (document.fullscreenElement) {
    await document.exitFullscreen().catch(() => {});
    return;
  }
  if (document.body.classList.contains("immersive")) {
    document.body.classList.remove("immersive");
    setFullLabel();
    return;
  }
  if (document.fullscreenEnabled && document.documentElement.requestFullscreen) {
    await document.documentElement.requestFullscreen().catch(() => {});
    if (document.fullscreenElement) return;
  }
  document.body.classList.add("immersive");
  setFullLabel();
}

main.innerHTML = coverMarkup() + film.scenes.map(sceneMarkup).join("") + `
  <section class="beat" id="sources" aria-labelledby="audit-title" tabindex="-1"></section>
  <footer class="credits">
    <h2>地图照片来源</h2>
    <p>照片用于取景预览。成片使用需依各来源的授权条件。</p>
    <div>${photoCredits()}</div>
    <p>取景点示意 · ${link("https://datav.aliyun.com/portal/school/atlas/area_selector", "DataV 区划数据")}</p>
  </footer>`;
const pages = [...main.querySelectorAll(".cover, .beat")];
drawMap(main.querySelector(".map-board canvas"), main.querySelector(".map-labels"));
drawMap(camera.querySelector("canvas"), camera.querySelector(".map-labels"), false);
film.scenes.forEach((scene, index) => drawReferences(scene, pages[index + 1]));
drawAudit();
controlsMarkup();

const previous = controls.querySelector("#previous");
const next = controls.querySelector("#next");
const hideScript = controls.querySelector("#clean");
const counter = controls.querySelector(".counter");
const noteToggle = controls.querySelector("#notes-toggle");
const motionToggle = controls.querySelector("#motion-toggle");
const note = document.querySelector("#scene-note");
let notesOpen = false;
let manuallyPlaying = null;
const markers = controls.querySelectorAll("[data-seek]");
let cursor = -1;
let pendingFrame = 0;
function trackScroll() {
  if (pendingFrame) return;
  pendingFrame = requestAnimationFrame(() => {
    pendingFrame = 0;
    showProgress();
  });
}

previous.addEventListener("click", () => move(-1));
next.addEventListener("click", () => move(1));
hideScript.addEventListener("click", toggleClean);
noteToggle.addEventListener("click", toggleNotes);
motionToggle.addEventListener("click", () => {
  const scene = film.scenes[cursor - 1];
  stopScenery(scene);
  motionToggle.setAttribute("aria-pressed", String(motionEnabled));
  motionToggle.title = motionEnabled ? "暂停背景实景" : "继续背景实景";
});
main.addEventListener("play", event => {
  if (event.target instanceof HTMLVideoElement) focusPlayer(event.target);
}, true);
main.addEventListener("pause", event => {
  if (event.target === manuallyPlaying) focusPlayer(null);
}, true);
reduceMotion.addEventListener("change", () => {
  motionToggle.disabled = !film.scenes[cursor - 1] || reduceMotion.matches;
  motionToggle.setAttribute("aria-pressed", String(motionEnabled && !reduceMotion.matches));
  focusPlayer(manuallyPlaying);
});

document.addEventListener("click", event => {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = event.target.closest?.('a[href^="#"]');
  const target = anchor && document.getElementById(anchor.hash.slice(1));
  if (!target || !pages.includes(target)) return;
  event.preventDefault();
  goTo(target, anchor.classList.contains("map-pin"));
});
const reveal = new IntersectionObserver(entries => {
  for (const { target, isIntersecting } of entries) {
    if (!isIntersecting) continue;
    target.classList.add("entered");
    reveal.unobserve(target);
  }
}, { rootMargin: "0px 0px -8% 0px" });
main.querySelectorAll(".sheet").forEach(sheet => reveal.observe(sheet));
window.addEventListener("scroll", trackScroll, { passive: true });
window.addEventListener("resize", trackScroll);
fullscreen.addEventListener("click", toggleFull);
document.addEventListener("fullscreenchange", setFullLabel);
window.addEventListener("keydown", event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.defaultPrevented) return;
  if (event.target.closest?.("input, textarea, select, video")) return;
  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
    event.preventDefault();
    move(event.key === "ArrowRight" ? 1 : -1);
  }
  if (event.key.toLowerCase() === "h") toggleClean();
  if (event.key.toLowerCase() === "f") toggleFull();
  if (event.key.toLowerCase() === "n") toggleNotes();
  if (event.key === "Escape" && document.body.classList.contains("immersive")) toggleFull();
});

requestAnimationFrame(() => {
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  showProgress();
});
