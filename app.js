"use strict";

const film = window.FILM;
const main = document.querySelector("#main");
const controls = document.querySelector("#controls");
const proposalTab = document.querySelector("#proposalTab");
const workTab = document.querySelector("#storyTab");
const productionTab = document.querySelector("#productionTab");
const sourcesTab = document.querySelector("#sourcesTab");
const fullscreen = document.querySelector("#fullscreen");
const mapTab = document.querySelector("#mapTab");
const detail = document.querySelector("#detail");
const detailContent = detail.querySelector(".detail-content");
const selectedReferences = new Map();
const chapters = {
  salt: ["珠三角 · 佛山南海", "盐步", "每到端午，老龙从泥里出水。"],
  pan: ["珠三角 · 广州荔湾", "泮塘", "顺着河涌，划去见一位老亲戚。"],
  north: ["粤北 · 清远", "北江", "一条江穿过飞来峡，接上珠三角。"],
  letter: ["粤东 · 汕头", "侨批", "人在海那头，信还得往家寄。"],
  jiang: ["粤西 · 湛江遂溪", "江洪", "天还没亮，买鱼的人已经到了。"]
};
const licenseLabels = {
  buy: "可购授权",
  ask: "联系权利方",
  ref: "仅作参考",
  shoot: "需补拍",
  post: "后期制作",
  must: "必须实拍",
  event: "仪式场次",
  flex: "实拍或授权",
  archive: "馆藏档案",
  reuse: "沿用素材"
};
const filters = [
  ["all", "全部"],
  ["buy", "可购授权"],
  ["ask", "联系权利方"],
  ["must", "必须实拍"],
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
  result.add(scene.production);
  if (["must", "event", "flex"].includes(scene.production)) result.add("shoot");
  if (scene.production === "reuse") result.add("post");
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
      selectedReferences.set(scene.start, selected);
      drawReferences(scene, section, selected);
      list.querySelector(`[data-ref="${selected}"]`).focus({preventScroll:true});
    });
  }
}

function detailMarkup(scene) {
  const kinds = sceneKinds(scene);
  return `
      <article>
      <header class="scene-head">
        <div><p class="eyebrow mono">${timeRange(scene)}</p>
        <h2 class="heading" id="detail-title">${escapeHTML(scene.title)}</h2>
        <p class="muted">${escapeHTML(scene.location)}</p></div>
        ${badge(scene.production)}
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
      </article>`;
}

function placeMarkup(region, scene) {
  const [district, name, description] = chapters[region];
  return `<section id="place-${region}" class="beat place" data-mode="focus" data-place="${region}"
      aria-labelledby="title-${region}" tabindex="-1">
    <article class="paper place-card">
      <p class="eyebrow">${escapeHTML(district)}</p>
      <h2 id="title-${region}" class="place-name">${escapeHTML(name)}</h2>
      <p class="place-line">${escapeHTML(description)}</p>
      <a class="paper-link" href="${sceneHash(scene)}">看分镜 <span aria-hidden="true">↓</span></a>
    </article>
  </section>`;
}

function sceneMarkup(scene, index) {
  const id = sceneHash(scene).slice(1);
  const last = index === film.scenes.length - 1;
  const paragraph = index === 0 ? "刷过湿泥，木纹露出来。一双手扶住船身，水面轻轻晃了一下。" : scene.voice || scene.picture;
  const card = last
    ? `<p class="eyebrow">阅山河 · 广东</p>
       <h2 class="closing-name" id="heading-${id}">${escapeHTML(film.title)}</h2>
       <p class="story-line">${escapeHTML(film.tagline)}</p>`
    : `<p class="eyebrow">${timeRange(scene)} <span aria-hidden="true">·</span> ${escapeHTML(chapters[scene.region][1])}</p>
       <h2 class="story-title" id="heading-${id}">${escapeHTML(scene.title)}</h2>
       <p class="story-line">${escapeHTML(paragraph)}</p>`;
  return `<section class="beat story${last ? " closing" : ""}" id="${id}" data-mode="${last ? "end" : "route"}"
      data-scene="${index}" aria-labelledby="heading-${id}" tabindex="-1">
    <article class="paper story-card">
      ${card}
      <button class="paper-link details-button" type="button" data-details="${index}">分镜与素材 <span aria-hidden="true">↗</span></button>
    </article>
  </section>`;
}

function proposalMarkup() {
  const copy = [
    ["片名", `《${film.title}》`],
    ["宣传语", film.tagline],
    ["开篇文案", film.opening],
    ["结尾落版", film.scenes[film.scenes.length - 1].onscreen]
  ];
  return `<section class="beat catalogue" id="proposal" data-mode="catalogue" aria-labelledby="proposal-title" tabindex="-1">
    <article class="sheet submission">
      <p class="eyebrow">阅山河 · 广东 · 03:00 / 16:9</p>
      <h2 class="heading" id="proposal-title">创意阐述</h2>
      <p class="creative-text">${escapeHTML(film.creative)}</p>
      <h3>核心文案</h3>
      <dl class="copy-list">${copy.map(([label, value]) => `<dt>${label}</dt><dd>${escapeHTML(value)}</dd>`).join("")}</dl>
      <a class="paper-link" href="#script">阅读完整脚本 <span aria-hidden="true">↓</span></a>
    </article>
  </section>`;
}

function scriptMarkup() {
  const columns = ["时码与段落", "景别、运镜与画面", "解说词与屏显", "音乐与音效"];
  const label = index => `<span class="stack-label" aria-hidden="true">${columns[index]}</span>`;
  return `<section class="beat catalogue" id="script" data-mode="catalogue" aria-labelledby="script-title" tabindex="-1">
    <article class="sheet submission">
      <p class="eyebrow">阅山河 · 广东 · 03:00 / 16:9</p>
      <h2 class="heading" id="script-title">宣传片脚本</h2>
      <p class="table-note">点击段落名进入分镜，查看取景与对应素材。</p>
      <table class="script-table" aria-labelledby="script-title">
        <thead><tr>${columns.map(column => `<th scope="col">${column}</th>`).join("")}</tr></thead>
        <tbody>${film.scenes.map(scene => `<tr>
          <th scope="row"><span class="slot-time mono">${timeRange(scene)} · ${scene.end - scene.start}秒</span><a class="slot-title" href="${sceneHash(scene)}">${escapeHTML(scene.title)}</a></th>
          <td>${label(1)}${escapeHTML(scene.picture)}</td>
          <td>${label(2)}<p>${escapeHTML(scene.voice || "无旁白")}</p>${scene.onscreen ? `<p class="script-screen"><strong>屏显</strong> ${escapeHTML(scene.onscreen)}</p>` : ""}</td>
          <td>${label(3)}${escapeHTML(scene.sound)}</td>
        </tr>`).join("")}</tbody>
      </table>
      <a class="paper-link" href="#production">查看拍摄排期与预算 <span aria-hidden="true">↓</span></a>
    </article>
  </section>`;
}

function productionMarkup() {
  const {intro, schedule, decisions, expenses, contingency, scope, rateSource} = film.production;
  const rows = expenses.map(([key, label, units, low, high, note]) => ({
    key, label, formula: units > 1 ? `${units} × ${low.toLocaleString("zh-CN")}–${high.toLocaleString("zh-CN")}` : note,
    low: units * low, high: units * high
  }));
  const sums = entries => ["low", "high"].map(bound => entries.reduce((sum, row) => sum + row[bound], 0));
  const shoot = sums(rows.filter(row => ["crew", "equipment", "travel", "location"].includes(row.key)));
  const total = sums(rows).map(amount => Math.round(amount * (100 + contingency) / 100));
  const range = (low, high) => `${low.toLocaleString("zh-CN")}–${high.toLocaleString("zh-CN")} 元`;
  return `<section class="beat catalogue" id="production" data-mode="catalogue" aria-labelledby="production-title" tabindex="-1">
    <article class="sheet submission production-plan">
      <p class="eyebrow">阅山河 · 广东 · 03:00 / 16:9</p>
      <h2 class="heading" id="production-title">实拍排期与预算</h2>
      <p class="table-note">${escapeHTML(intro)}</p>
      <h3>拍摄排期</h3>
      <ol class="shoot-schedule">${schedule.map(stop => `<li>
        <div><a class="slot-title" href="${sceneHash(stop)}">${escapeHTML(stop.where)}</a><span class="mono">${timeRange(stop)} · ${stop.days} 组日</span></div>
        <div><strong>${escapeHTML(stop.window)}</strong><p>${escapeHTML(stop.work)}</p></div>
      </li>`).join("")}</ol>
      <h3>必拍与替代方案</h3>
      <dl class="copy-list">${decisions.map(([label, value]) => `<dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd>`).join("")}</dl>
      <h3 id="budget-title">费用估算</h3>
      <p class="table-note">${escapeHTML(scope)}</p>
      <table class="budget-table" aria-labelledby="budget-title">
        <thead><tr><th scope="col">费用项</th><th scope="col">测算依据</th><th scope="col">金额区间</th></tr></thead>
        <tbody>${rows.map((row, index) => `<tr><th scope="row">${escapeHTML(row.label)}</th><td>${escapeHTML(row.formula)}</td><td>${range(row.low, row.high)}</td></tr>
          ${index === 3 ? `<tr class="budget-subtotal"><th scope="row" colspan="2">现场拍摄小计</th><td>${range(...shoot)}</td></tr>` : ""}`).join("")}</tbody>
        <tfoot><tr><th scope="row" colspan="2">主片合计（含 ${contingency}% 机动金）</th><td>${range(...total)}</td></tr></tfoot>
      </table>
      <p class="rate-source">${link(rateSource[1], rateSource[0])}</p>
      <a class="paper-link" href="#sources">查看素材与授权状态 <span aria-hidden="true">↓</span></a>
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
      <p class="table-note">左侧是成片时码，素材卡内是源片秒点。「必须实拍」为江洪的接缆与同一采购者跟拍。光厂素材可询购，新闻实录与馆藏图向原方申请，当前素材授权待确认。</p>
      <div class="filters" aria-label="筛选素材状态">
        ${filters.map(([code, label]) => `<button class="filter" type="button" data-filter="${code}" aria-pressed="${code === activeFilter}">${label}</button>`).join("")}
      </div>
      <div class="audit-list">
        <div class="audit-row header" aria-hidden="true"><span>成片时码</span><span>预览与来源</span><span>授权与补拍</span></div>
        ${chosen.map(scene => `<article class="audit-row">
            <div><span class="slot-time mono">${timeRange(scene)}</span><a href="${sceneHash(scene)}" class="slot-title">${escapeHTML(scene.title)}</a><p class="muted">${escapeHTML(scene.location)}</p></div>
            <div class="asset-links">
              ${scene.refs.length ? scene.refs.map(ref => `<div>${badge(film.sources[ref.key].kind)}${link(refUrl(ref), film.sources[ref.key].label)}<p class="muted">${escapeHTML(ref.where)}</p></div>`).join("") : "<p class='muted'>需拍摄同一人物的连续动作</p>"}
            </div>
            <div><p class="slot-status">${badge(scene.production)}</p><p class="audit-gap">${escapeHTML(scene.gap)}</p></div>
          </article>`).join("")}
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
  return `<section id="cover" class="beat cover" data-mode="intro" aria-labelledby="cover-title" tabindex="-1">
    <article class="paper opening-card">
      <p class="eyebrow">阅山河 · 广东</p>
      <p class="opening-question">${escapeHTML(film.opening)}</p>
      <a class="paper-link" href="#map">沿水路往下看 <span aria-hidden="true">↓</span></a>
    </article>
    <h1 id="cover-title">${escapeHTML(film.title)}</h1>
  </section>
  <section id="map" class="beat atlas" data-mode="atlas" aria-label="广东取景地图" tabindex="-1">
    <p class="atlas-caption">点照片看地点 <a href="#place-salt">顺着水路看 <span aria-hidden="true">↓</span></a></p>
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
  const readingLine = window.innerHeight * .5;
  let index = 0;
  for (let i = 1; i < pages.length; i++) {
    if (pages[i].getBoundingClientRect().top > readingLine) break;
    index = i;
  }
  return index;
}

function sceneFor(page) {
  return film.scenes[Number(page?.dataset.scene ?? -1)];
}

function showProgress() {
  const pageIndex = currentTarget();
  if (cursor === pageIndex) return;
  pages[cursor]?.classList.remove("current");
  cursor = pageIndex;
  const page = pages[cursor];
  page.classList.add("current");
  const sceneIndex = Number(page.dataset.scene ?? -1);
  const scene = sceneFor(page);
  const mode = page.dataset.mode;
  showStage(page, scene);
  updateNote(scene);
  previous.disabled = pageIndex === 0;
  next.disabled = pageIndex === pages.length - 1;
  hideScript.disabled = mode === "atlas" || mode === "catalogue";
  noteToggle.disabled = !scene;
  motionToggle.disabled = !scene || reduceMotion.matches;
  motionToggle.setAttribute("aria-pressed", String(motionEnabled && !reduceMotion.matches));
  counter.textContent = scene
    ? `${String(sceneIndex + 1).padStart(2, "0")} / ${film.scenes.length}`
    : ({ cover: "开场", map: "地图", proposal: "文案", script: "脚本", production: "拍摄", sources: "素材" })[page.id] ?? "站点";
  mapTab.setAttribute("aria-current", mode === "atlas" ? "location" : "false");
  proposalTab.setAttribute("aria-current", page.id === "proposal" ? "location" : "false");
  workTab.setAttribute("aria-current", scene || page.id === "script" ? "location" : "false");
  productionTab.setAttribute("aria-current", page.id === "production" ? "location" : "false");
  sourcesTab.setAttribute("aria-current", page.id === "sources" ? "location" : "false");
  for (const marker of markers) {
    if (Number(marker.dataset.seek) === sceneIndex) marker.setAttribute("aria-current", "step");
    else marker.removeAttribute("aria-current");
  }
}

function goTo(target) {
  if (location.hash !== `#${target.id}`) history.pushState(null, "", `#${target.id}`);
  target.scrollIntoView({ behavior: "instant" });
  target.focus({ preventScroll: true });
  showProgress();
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
  updateNote(sceneFor(pages[cursor]));
}

function focusPlayer(video) {
  manuallyPlaying = video;
  stage.classList.toggle("manual-preview", Boolean(video));
  const background = foreground?.querySelector("video");
  if (!background) return;
  if (video || detail.open || !motionEnabled || reduceMotion.matches) background.pause();
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

function openDetail(scene) {
  detailContent.innerHTML = detailMarkup(scene);
  drawReferences(scene, detailContent, selectedReferences.get(scene.start) ?? 0);
  detail.showModal();
  detail.scrollTop = 0;
  focusPlayer(null);
}

main.innerHTML = coverMarkup() + film.scenes.map((scene, index) => {
  const entersPlace = index === 0 || film.scenes[index - 1].region !== scene.region;
  return (entersPlace ? placeMarkup(scene.region, scene) : "") + sceneMarkup(scene, index);
}).join("") + proposalMarkup() + scriptMarkup() + productionMarkup() + `
  <section class="beat catalogue" id="sources" data-mode="catalogue" aria-labelledby="audit-title" tabindex="-1"></section>
  <footer class="credits">
    <h2>地图照片来源</h2>
    <p>照片用于取景预览。成片使用需依各来源的授权条件。</p>
    <div>${photoCredits()}</div>
    <p>取景点示意 · ${link("https://datav.aliyun.com/portal/school/atlas/area_selector", "DataV 区划数据")}</p>
  </footer>`;
const pages = [...main.querySelectorAll(".beat")];
drawMap(camera.querySelector("canvas"), camera.querySelector(".map-labels"));
drawAudit();
controlsMarkup();
controls.hidden = false;

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
  const scene = sceneFor(pages[cursor]);
  stopScenery(scene);
  motionToggle.setAttribute("aria-pressed", String(motionEnabled));
  motionToggle.title = motionEnabled ? "暂停背景实景" : "继续背景实景";
});
detail.addEventListener("play", event => {
  if (event.target instanceof HTMLVideoElement) focusPlayer(event.target);
}, true);
detail.addEventListener("pause", event => {
  if (event.target === manuallyPlaying) focusPlayer(null);
}, true);
detail.addEventListener("close", () => {
  detail.querySelectorAll("video").forEach(video => video.pause());
  detailContent.replaceChildren();
  focusPlayer(null);
});
reduceMotion.addEventListener("change", () => {
  motionToggle.disabled = !sceneFor(pages[cursor]) || reduceMotion.matches;
  motionToggle.setAttribute("aria-pressed", String(motionEnabled && !reduceMotion.matches));
  focusPlayer(manuallyPlaying);
});

document.addEventListener("click", event => {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const detailButton = event.target.closest?.("[data-details]");
  if (detailButton) {
    openDetail(film.scenes[Number(detailButton.dataset.details)]);
    return;
  }
  const anchor = event.target.closest?.('a[href^="#"]');
  const target = anchor && document.getElementById(anchor.hash.slice(1));
  if (!target || !pages.includes(target)) return;
  event.preventDefault();
  goTo(target);
});
window.addEventListener("scroll", trackScroll, { passive: true });
window.addEventListener("resize", trackScroll);
fullscreen.addEventListener("click", toggleFull);
document.addEventListener("fullscreenchange", setFullLabel);
window.addEventListener("keydown", event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.defaultPrevented) return;
  if (detail.open || event.target.closest?.("input, textarea, select, video")) return;
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
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({behavior: "instant"});
  showProgress();
});
