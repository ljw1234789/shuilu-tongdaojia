"use strict";

const photoPins = {
  north: {
    stamp: "江", position: [277, 108], tilt: -4,
    image: "https://ep.ycwb.com/epaper/ycwb/resfile/2024-04-30/A06/14886197_dzzzz4_1714396152295_b.jpg",
    source: "https://ep.ycwb.com/epaper/ycwb/html/2024-04/30/content_6_643495.htm",
    credit: "羊城晚报 · 清远峡"
  },
  salt: {
    stamp: "龙", position: [220, 220], tilt: -3,
    image: "https://oss.gz-cmc.com/pgcr/root/huacheng/upload/news/image/2026/06/06/f1acdf76460448d7afb82eb1fad970d9.jpg?x-oss-process=style/content",
    source: window.FILM.sources.salt.url,
    credit: "广州日报新花城 · 盐步老龙"
  },
  pan: {
    stamp: "桨", position: [401, 222], tilt: 3,
    image: "https://oss.gz-cmc.com/pgcr/root/huacheng/upload/news/image/2026/06/19/b72b902b10f9454083ce6d7f0f5e15fa.jpg?x-oss-process=style/content",
    source: window.FILM.sources.pan2026.url,
    credit: "广州日报新花城 · 泮塘迎龙"
  },
  letter: {
    stamp: "信", position: [543, 140], tilt: 4,
    image: "https://www.shantou.gov.cn/img/0/604/604845/2477473.jpg",
    source: "https://www.shantou.gov.cn/wgxj/zwgk/gzdt/content/post_2477473.html",
    credit: "汕头市文化广电旅游体育局 · 小公园"
  },
  jiang: {
    stamp: "港", position: [108, 310], tilt: -4,
    image: "https://mmbiz.qpic.cn/sz_mmbiz_jpg/2ib8BIPb0awp3pcX8NDeIR7xTCezez6RRDNYymhrrSgObS6HVib4qKZw6v4OxBgUmTw6HusauLj8ltm4yjVJkzrQ/640?wx_fmt=jpeg&from=appmsg&wxfrom=5&wx_lazy=1&tp=webp",
    source: "https://www.zhanjiang.gov.cn/zjswj/gkmlpt/content/2/2213/post_2213027.html",
    credit: "湛江市商务局 · 江洪"
  }
};

const MAP_WIDTH = 640;
const MAP_HEIGHT = 385;

function mapPoint(lng, lat) {
  return [(lng - 109.1) * 66 + 44, (25.7 - lat) * 57 + 15];
}

function tracePolygon(ctx, ring) {
  ring.forEach(([lng, lat], index) => {
    const [x, y] = mapPoint(lng, lat);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

function drawMap(canvas, labels, interactive = true) {
  const ctx = canvas.getContext("2d");
  const scale = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = MAP_WIDTH * scale;
  canvas.height = MAP_HEIGHT * scale;
  ctx.scale(scale, scale);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const colors = ["#809464", "#a0a76d", "#b7a067", "#c19a70", "#ad886b"];
  ctx.save();
  ctx.shadowColor = "rgba(116, 93, 43, .17)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 5;
  ctx.beginPath();
  film.shape.forEach(ring => tracePolygon(ctx, ring));
  ctx.fillStyle = "#a2a571";
  ctx.fill();
  ctx.restore();

  for (const [color, rings] of window.GUANGDONG_DISTRICTS) {
    ctx.beginPath();
    rings.forEach(ring => tracePolygon(ctx, ring));
    ctx.fillStyle = colors[color];
    ctx.fill();
    ctx.lineWidth = .85;
    ctx.strokeStyle = "#e6dcc0";
    ctx.stroke();
  }

  const wash = ctx.createLinearGradient(180, 37, 410, 312);
  wash.addColorStop(0, "rgba(54,84,35,.17)");
  wash.addColorStop(.5, "rgba(253,236,167,.11)");
  wash.addColorStop(1, "rgba(169,105,68,.19)");
  ctx.beginPath();
  window.GUANGDONG_DISTRICTS.forEach(([, rings]) => rings.forEach(ring => tracePolygon(ctx, ring)));
  ctx.fillStyle = wash;
  ctx.fill();
  if (!labels) return;

  labels.innerHTML = film.locations.map(([id, label, lng, lat, sceneIndex]) => {
    const pin = photoPins[id];
    const [x, y] = mapPoint(lng, lat);
    const [px, py] = pin.position;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(px, py);
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = "rgba(65,78,67,.65)";
    ctx.setLineDash([2.5, 3.5]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = "#913e29";
    ctx.fill();
    ctx.strokeStyle = "#f7efdb";
    ctx.stroke();

    const tag = interactive ? "a" : "div";
    const href = interactive ? ` href="${sceneHash(film.scenes[sceneIndex])}"` : "";
    return `<${tag} class="${interactive ? "map-pin" : "stage-pin"}" data-place="${id}"${href}
              style="left:${px / MAP_WIDTH * 100}%;top:${py / MAP_HEIGHT * 100}%;--tilt:${pin.tilt}deg">
      <span class="pin-frame"><span class="pin-stamp" aria-hidden="true">${pin.stamp}</span>
        <img alt="" decoding="async" referrerpolicy="no-referrer" src="${escapeHTML(pin.image)}">
      </span><span class="pin-label">${escapeHTML(label)}</span>
    </${tag}>`;
  }).join("");
  for (const image of labels.querySelectorAll("img")) {
    image.addEventListener("error", () => { image.hidden = true; });
  }
}

function photoCredits() {
  return Object.values(photoPins).map(pin => link(pin.source, pin.credit)).join("");
}
