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

let view = "cover";
let current = 0;
let referenceIndex = 0;
let activeFilter = "all";
let clean = false;

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

function mapPoint(lng, lat) {
  return [(lng - 109.1) * 66 + 44, (25.7 - lat) * 69 + 24];
}

function drawMap() {
  const canvas = main.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const W = 640;
  const H = 490;
  const scale = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = W * scale;
  canvas.height = H * scale;
  ctx.scale(scale, scale);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    ctx.ellipse(502, 390, 105 + 15 * i, 29 + 8.2 * i, -.39, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(65,97,93,.075)";
    ctx.stroke();
  }
  const fill = ctx.createLinearGradient(110, 31, 555, 412);
  fill.addColorStop(0, "#8b9a76");
  fill.addColorStop(.53, "#abb193");
  fill.addColorStop(1, "#909e82");
  for (const polygon of film.shape) {
    ctx.beginPath();
    polygon.forEach(([lng, lat], index) => {
      const [x, y] = mapPoint(lng, lat);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = "#73836e";
    ctx.lineWidth = .7;
    ctx.stroke();
  }

  const markers = film.locations.map(([, , lng, lat]) => mapPoint(lng, lat));
  const connection = [0, 1, 2, 3, 4];
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = "rgba(69,75,59,.65)";
  ctx.setLineDash([5, 6]);
  ctx.beginPath();
  connection.forEach((node, i) => {
    const [x, y] = markers[node];
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  const nudges = [[22, -25], [-143, 22], [24, 31], [-31, 39], [17, 16]];
  const labelLayer = main.querySelector(".map-labels");
  film.locations.forEach(([, label, , , sceneIndex], i) => {
    const [x, y] = markers[i];
    const [dx, dy] = nudges[i];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (dx < -90 ? -10 : 10), y + dy / 2);
    ctx.lineTo(x + (dx < -90 ? -18 : Math.min(dx, 18)), y + dy);
    ctx.strokeStyle = "#5d634f";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 5.4, 0, 2 * Math.PI);
    ctx.fillStyle = "#8a3e2c";
    ctx.fill();
    ctx.strokeStyle = "#f7ecd4";
    ctx.lineWidth = 2;
    ctx.stroke();

    const item = document.createElement("a");
    item.className = "map-label";
    item.href = sceneHash(film.scenes[sceneIndex]);
    item.textContent = label;
    item.style.left = `${(x + dx) / W * 100}%`;
    item.style.top = `${(y + dy) / H * 100}%`;
    labelLayer.append(item);
  });
}

function drawCover() {
  main.innerHTML = `
    <article class="cover" aria-labelledby="cover-title">
      <div class="cover-text">
        <p class="eyebrow">广东文旅宣传片 · 精修版</p>
        <h1 id="cover-title"><span>水路</span><span>通到家</span></h1>
        <p class="tagline">${escapeHTML(film.tagline)}</p>
        <p class="cover-intro">一条老龙，一封家书，一尾从江洪鱼市带回家的鱼。</p>
        <div class="cover-actions">
          <a href="#00-00" class="action">开始看分镜</a>
          <a href="#sources" class="action quiet">查看素材总表</a>
        </div>
      </div>
      <figure class="map-sheet" aria-label="广东取景点">
        <div class="map-board"><canvas aria-hidden="true"></canvas><div class="map-labels"></div></div>
        <figcaption>取景点示意 · ${link("https://datav.aliyun.com/portal/school/atlas/area_selector", "DataV 省界数据")}</figcaption>
      </figure>
    </article>
    <div class="map-caption"><span>03:00 · 15 段分镜</span><span>点击地图上的地名进入对应分镜</span></div>`;
  drawMap();
}

function drawPlayer(scene) {
  const panel = main.querySelector("#preview");
  const ref = scene.refs[referenceIndex];
  if (!ref) {
    panel.innerHTML = `<div class="player-empty"><h3>这一镜需要现场拍</h3><p>与前段同人、同一尾鱼。具体机位见下方补拍安排。</p></div>`;
    return;
  }

  const source = film.sources[ref.key];
  if (source.kind !== "buy" && source.media && Number.isFinite(ref.from)) {
    panel.innerHTML = `<div class="player-box"><button type="button" class="action player-button" id="play">在页内播放 · ${clock(ref.from)} 起</button></div>`;
    panel.querySelector("#play").addEventListener("click", event => {
      const button = event.currentTarget;
      const video = document.createElement("video");
      video.controls = true;
      video.playsInline = true;
      video.src = refUrl(ref);
      video.title = source.label;
      video.addEventListener("error", () => {
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

function drawReferences(scene) {
  const list = main.querySelector("#assetList");
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
      referenceIndex = Number(control.dataset.ref);
      drawPlayer(scene);
      drawReferences(scene);
      list.querySelector(`[data-ref="${referenceIndex}"]`).focus({preventScroll:true});
    });
  }
}

function drawScene() {
  const scene = film.scenes[current];
  const kinds = sceneKinds(scene);
  main.innerHTML = `
    <div class="jump-location" aria-label="按地点跳转">
      ${film.locations.map(([id, label, , , sid]) => `<a class="pill ${id === scene.region ? "current" : ""}" href="${sceneHash(film.scenes[sid])}">${escapeHTML(label)}</a>`).join("")}
    </div>
    <article aria-labelledby="scene-title">
      <header class="scene-head">
        <div><p class="eyebrow mono">${timeRange(scene)} · ${scene.end - scene.start} 秒</p>
        <h1 class="heading" id="scene-title">${escapeHTML(scene.title)}</h1>
        <p class="muted">${escapeHTML(scene.location)}</p></div>
        <span class="badge ${kinds.includes("shoot") ? "shoot" : ""}">${escapeHTML(scene.match)}</span>
      </header>
      <div class="scene-grid">
        <div>
          <section class="script" aria-label="精修版分镜">
            ${scene.voice ? `<div class="voice"><h2 class="eyebrow">旁白</h2><p>${escapeHTML(scene.voice)}</p></div>` : ""}
            <dl>
              <dt>画面</dt><dd>${escapeHTML(scene.picture)}</dd>
              ${scene.onscreen ? `<dt>屏显</dt><dd>${escapeHTML(scene.onscreen)}</dd>` : ""}
              <dt>声音</dt><dd>${escapeHTML(scene.sound)}</dd>
            </dl>
          </section>
          <section class="production"><h2>授权与补拍</h2><p>${escapeHTML(scene.gap)}</p></section>
        </div>
        <div class="scene-media media-side">
          <div class="media-bar"><h2>素材预览</h2>${kinds.includes("post") ? badge("post") : ""}</div>
          <div id="preview"></div>
          <div id="assetList" class="asset-list"></div>
        </div>
      </div>
    </article>`;
  drawPlayer(scene);
  drawReferences(scene);
}

function drawAudit() {
  const chosen = film.scenes.filter(scene => activeFilter === "all" || sceneKinds(scene).includes(activeFilter));
  main.innerHTML = `
    <section aria-labelledby="audit-title">
      <p class="eyebrow">精修版 · 03:00</p>
      <h1 class="table-title" id="audit-title">素材总表</h1>
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
    </section>`;
  for (const button of main.querySelectorAll("[data-filter]")) {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      drawAudit();
      main.querySelector(`[data-filter="${activeFilter}"]`).focus({preventScroll:true});
    });
  }
}

function move(step) {
  if (view === "cover" && step > 0) {
    location.hash = sceneHash(film.scenes[0]);
  } else if (view === "scene") {
    const next = current + step;
    if (next < 0) location.hash = "cover";
    else if (next < film.scenes.length) location.hash = sceneHash(film.scenes[next]);
  }
}

function controlsMarkup() {
  controls.hidden = view !== "scene";
  if (controls.hidden) return;
  controls.innerHTML = `
    <div class="ctrl-buttons">
      <button id="previous" type="button">上一段</button>
      <button id="next" type="button" ${current >= film.scenes.length - 1 ? "disabled" : ""}>下一段</button>
      <button id="clean" type="button" aria-pressed="${clean}" title="H 键切换">${clean ? "显示脚本" : "隐藏脚本"}</button>
    </div>
    <div class="timeline" aria-label="按成片时码跳转">
      ${film.scenes.map((scene, i) => `<button type="button" data-seek="${i}" class="${i === current ? "current" : ""}" style="flex-grow:${scene.end - scene.start}" aria-label="${timeRange(scene)} ${escapeHTML(scene.title)}" title="${timeRange(scene)} ${escapeHTML(scene.title)}" ${i === current ? 'aria-current="step"' : ""}></button>`).join("")}
    </div>
    <span class="counter mono" aria-live="polite">${current + 1} / ${film.scenes.length}</span>`;
  controls.querySelector("#previous").addEventListener("click", () => move(-1));
  controls.querySelector("#next").addEventListener("click", () => move(1));
  controls.querySelector("#clean").addEventListener("click", toggleClean);
  for (const button of controls.querySelectorAll("[data-seek]")) {
    button.addEventListener("click", () => { location.hash = sceneHash(film.scenes[Number(button.dataset.seek)]); });
  }
}

function toggleClean() {
  if (view !== "scene") return;
  clean = !clean;
  document.body.classList.toggle("clean", clean);
  const button = controls.querySelector("#clean");
  button.setAttribute("aria-pressed", String(clean));
  button.textContent = clean ? "显示脚本" : "隐藏脚本";
}
function toggleFull() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen?.().catch(() => {});
}
function render() {
  const index = film.scenes.findIndex(x => sceneHash(x) === location.hash);
  view = location.hash === "#sources" ? "audit" : index >= 0 ? "scene" : "cover";
  if (view === "scene") {
    current = index;
    referenceIndex = 0;
    drawScene();
  } else if (view === "audit") {
    drawAudit();
  } else {
    drawCover();
  }
  document.body.classList.toggle("clean", view === "scene" && clean);
  workTab.setAttribute("aria-current", view === "scene" ? "page" : "false");
  sourcesTab.setAttribute("aria-current", view === "audit" ? "page" : "false");
  controlsMarkup();
  window.scrollTo({top:0, behavior:"instant"});
}

window.addEventListener("hashchange", render);
fullscreen.hidden = !document.fullscreenEnabled;
fullscreen.addEventListener("click", toggleFull);
document.addEventListener("fullscreenchange", () => {
  fullscreen.textContent = document.fullscreenElement ? "退出全屏" : "全屏";
});
window.addEventListener("keydown", event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.defaultPrevented) return;
  if (["INPUT", "TEXTAREA", "SELECT", "VIDEO"].includes(event.target.tagName)) return;
  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
      if (view !== "audit") { event.preventDefault(); move(1); }
      break;
    case "ArrowLeft":
    case "ArrowUp":
      if (view === "scene") { event.preventDefault(); move(-1); }
      break;
    case "h":
    case "H":
      toggleClean();
      break;
    case "f":
    case "F":
      toggleFull();
      break;
  }
});
render();
