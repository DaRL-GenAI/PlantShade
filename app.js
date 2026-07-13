/* ============================================================
   PlantShade project page — interactivity
   ============================================================ */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---- editable external links (placeholders until published) ---- */
  const LINKS = {
    paper: "",   // e.g. "https://arxiv.org/abs/xxxx.xxxxx"
    code:  "",   // e.g. "https://github.com/.../PlantShade"
    hf:    "https://huggingface.co/datasets/xiao0o0o/PlantShade",
    model: "https://huggingface.co/xiao0o0o/PlantShade-ControlNet",
  };
  $$("[data-link]").forEach((a) => {
    const key = a.getAttribute("data-link");
    if (LINKS[key]) { a.href = LINKS[key]; }
    else {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        alert("Link not published yet — set LINKS." + key + " in app.js.");
      });
    }
  });

  /* ---- mobile nav ---- */
  const navToggle = $("#navToggle"), navLinks = $("#navLinks");
  if (navToggle) navToggle.addEventListener("click", () => navLinks.classList.toggle("open"));
  $$("#navLinks a").forEach((a) => a.addEventListener("click", () => navLinks.classList.remove("open")));

  /* ---- scroll-spy nav ---- */
  const sections = $$("section[id], header[id]");
  const spy = () => {
    const y = window.scrollY + 90;
    let cur = "";
    sections.forEach((s) => { if (s.offsetTop <= y) cur = s.id; });
    $$("#navLinks a").forEach((a) =>
      a.classList.toggle("active", a.getAttribute("href") === "#" + cur));
  };
  window.addEventListener("scroll", spy); spy();

  /* ---- hero stat counters ---- */
  const counters = $$(".hero-stats b[data-count]");
  const runCount = (el) => {
    const target = +el.dataset.count, dur = 1200, t0 = performance.now();
    const fmt = (n) => n.toLocaleString("en-US");
    const step = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(target * e));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { runCount(e.target); io.unobserve(e.target); }
  }), { threshold: .5 });
  counters.forEach((c) => io.observe(c));

  /* ---- circular-light demo: 2x2 species grid + layout selector ---- */
  const N = 8;                       // demo frames per combo (of 100 positions)
  const SPECIES = ["tomato", "soybean", "strawberry", "sugarbeet"];
  const slider = $("#lightSlider"), posLabel = $("#posLabel"),
        angleMeta = $("#angleMeta"), playBtn = $("#playBtn");
  const gridImgs = {};
  SPECIES.forEach((sp) => { gridImgs[sp] = $('#demoGrid img[data-sp="' + sp + '"]'); });
  let layout = "1x1";
  const setFrame = (i) => {
    const idx = ((i - 1) % N + N) % N;               // 0-based
    SPECIES.forEach((sp) => {
      const im = gridImgs[sp];
      if (im) im.src = "assets/demo/" + layout + "/" + sp + "_" + String(idx + 1).padStart(2, "0") + ".png";
    });
    const pos = Math.max(1, Math.round(idx * (100 / (N - 1))));
    if (posLabel) posLabel.textContent = pos;
    if (angleMeta) angleMeta.textContent = "azimuth " + Math.round(idx * (360 / N)) + "°";
  };
  $$("#layoutTabs .tab").forEach((t) => t.addEventListener("click", () => {
    $$("#layoutTabs .tab").forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    layout = t.dataset.layout;
    setFrame(+slider.value);
  }));
  if (slider) { slider.addEventListener("input", () => setFrame(+slider.value)); setFrame(1); }
  let playing = false, timer = null;
  if (playBtn) playBtn.addEventListener("click", () => {
    playing = !playing;
    playBtn.textContent = playing ? "⏸ Pause" : "▶ Play";
    if (playing) {
      timer = setInterval(() => { let v = (+slider.value % N) + 1; slider.value = v; setFrame(v); }, 520);
    } else clearInterval(timer);
  });

  /* ---- before/after compare ---- */
  const stage = $("#compareStage"), divider = $("#compareDivider"), clip = $("#compareRight");
  if (stage && divider && clip) {
    const move = (clientX) => {
      const r = stage.getBoundingClientRect();
      let p = (clientX - r.left) / r.width;
      p = Math.max(0.02, Math.min(0.98, p));
      divider.style.left = (p * 100) + "%";
      clip.style.clipPath = "inset(0 0 0 " + (p * 100) + "%)";
    };
    let drag = false;
    const down = () => drag = true, up = () => drag = false;
    divider.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    window.addEventListener("mousemove", (e) => { if (drag) move(e.clientX); });
    stage.addEventListener("click", (e) => move(e.clientX));
    divider.addEventListener("touchstart", down, { passive: true });
    window.addEventListener("touchend", up);
    window.addEventListener("touchmove", (e) => { if (drag) move(e.touches[0].clientX); }, { passive: true });
  }

  /* ---- inference case selector (swaps the compare images) ---- */
  const cLeft = $("#compareLeft"), cRight = $("#compareRight"), cDiv = $("#compareDivider");
  const resetDivider = () => {
    if (cDiv) cDiv.style.left = "50%";
    if (cRight) cRight.style.clipPath = "inset(0 0 0 50%)";
  };
  $$("#predTabs .tab").forEach((t) => t.addEventListener("click", () => {
    $$("#predTabs .tab").forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    const c = t.dataset.case;
    if (cLeft) cLeft.src = "assets/predictions/" + c + "_rgb.jpg";
    if (cRight) cRight.src = "assets/predictions/" + c + "_pred.png";
    resetDivider();
  }));

  /* ---- results table (real numbers, Table II) ---- */
  // metrics: [PlantShade, Diffusion]; arrows in header
  const RESULTS = {
    single: {
      cols: ["Tomato", "Soybean", "Strawberry", "Sugar beet"],
      ood: [false, false, false, true],
      rows: {
        "mIoU ↑":  { ours: [0.2636, 0.4371, 0.3413, 0.0314], base: [0.0080, 0.0098, 0.0033, 0.0089], hi: true },
        "B-IoU ↑": { ours: [0.3808, 0.3921, 0.3911, 0.0451], base: [0.0176, 0.0158, 0.0073, 0.0119], hi: true },
        "LPIPS ↓": { ours: [0.0660, 0.0638, 0.0428, 0.3713], base: [1.0366, 0.9878, 1.0713, 0.9713], hi: false },
        "MSE ↓":   { ours: [72.157, 50.832, 64.363, 74.116], base: [92.067, 96.313, 91.816, 95.463], hi: false },
      },
    },
    l1x3: {
      cols: ["Tomato", "Sugar beet", "Soybean", "Strawberry"],
      ood: [false, false, false, false],
      rows: {
        "mIoU ↑":  { ours: [0.2561, 0.4088, 0.3574, 0.3970], base: [0.0099, 0.0082, 0.0191, 0.0095], hi: true },
        "B-IoU ↑": { ours: [0.3661, 0.3730, 0.3390, 0.3587], base: [0.0235, 0.0143, 0.0309, 0.0162], hi: true },
        "LPIPS ↓": { ours: [0.0925, 0.0671, 0.1251, 0.0848], base: [1.0208, 0.9713, 1.0356, 0.9321], hi: false },
        "MSE ↓":   { ours: [71.710, 51.045, 53.750, 49.873], base: [93.596, 93.891, 95.513, 95.392], hi: false },
      },
    },
    l3x5: {
      cols: ["Tomato", "Sugar beet", "Soybean", "Strawberry"],
      ood: [false, false, true, true],
      rows: {
        "mIoU ↑":  { ours: [0.3283, 0.5530, 0.0863, 0.1094], base: [0.0292, 0.0349, 0.0415, 0.0441], hi: true },
        "B-IoU ↑": { ours: [0.3996, 0.4401, 0.1238, 0.1234], base: [0.0550, 0.0481, 0.0554, 0.0564], hi: true },
        "LPIPS ↓": { ours: [0.2936, 0.2119, 0.6464, 0.6575], base: [0.9177, 0.8123, 0.8300, 0.7895], hi: false },
        "MSE ↓":   { ours: [57.421, 41.876, 61.975, 58.105], base: [94.773, 94.572, 97.970, 97.381], hi: false },
      },
    },
  };
  const table = $("#resultsTable");
  const fmtNum = (v) => v >= 10 ? v.toFixed(3) : v.toFixed(4);
  const renderTable = (key) => {
    const d = RESULTS[key];
    let html = "<thead><tr><th>Metric</th><th>Method</th>";
    d.cols.forEach((c, i) => {
      html += "<th>" + c + (d.ood[i] ? ' <span class="ood-chip">OOD</span>' : "") + "</th>";
    });
    html += "</tr></thead><tbody>";
    Object.keys(d.rows).forEach((m) => {
      const r = d.rows[m];
      // PlantShade row
      html += '<tr><td rowspan="2"><b>' + m + '</b></td><td class="method-ours">PlantShade</td>';
      r.ours.forEach((v, i) => {
        const win = r.hi ? v > r.base[i] : v < r.base[i];
        html += "<td class='" + (win ? "win" : "") + "'>" + fmtNum(v) + "</td>";
      });
      html += "</tr>";
      // Diffusion row
      html += "<tr><td>Stable Diffusion</td>";
      r.base.forEach((v) => { html += "<td>" + fmtNum(v) + "</td>"; });
      html += "</tr>";
    });
    html += "</tbody>";
    table.innerHTML = html;
  };
  $$(".result-tabs .tab").forEach((t) => t.addEventListener("click", () => {
    $$(".result-tabs .tab").forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    renderTable(t.dataset.layout);
  }));
  if (table) renderTable("single");

  /* ---- photosynthesis NRH curve ---- */
  const PLANT = {
    soybean:    { pmax: 32.5, label: "Soybean" },
    sugarbeet:  { pmax: 20.0, label: "Sugar beet" },
    tomato:     { pmax: 17.5, label: "Tomato" },
    strawberry: { pmax: 12.0, label: "Strawberry" },
  };
  const ALPHA = 0.05, THETA = 0.7, I0 = 1000, BETA = 0.3;
  const nrh = (I, pmax) => {
    const a = ALPHA * I + pmax;
    const disc = Math.max(a * a - 4 * THETA * ALPHA * I * pmax, 0);
    return (a - Math.sqrt(disc)) / (2 * THETA);
  };
  const cv = $("#nrhCanvas");
  const css = getComputedStyle(document.documentElement);
  const col = (n) => css.getPropertyValue(n).trim() || "#4ade80";
  const drawNRH = (sp) => {
    if (!cv) return;
    const ctx = cv.getContext("2d"), W = cv.width, H = cv.height;
    const padL = 52, padB = 38, padT = 18, padR = 16;
    const pw = W - padL - padR, ph = H - padT - padB;
    const Imax = 1500, Pmax = 36;
    const X = (I) => padL + (I / Imax) * pw;
    const Y = (P) => padT + ph - (P / Pmax) * ph;
    ctx.clearRect(0, 0, W, H);
    // grid + axes
    ctx.strokeStyle = col("--line"); ctx.fillStyle = col("--muted");
    ctx.lineWidth = 1; ctx.font = "11px system-ui,sans-serif";
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (let p = 0; p <= Pmax; p += 9) {
      ctx.globalAlpha = .5; ctx.beginPath(); ctx.moveTo(padL, Y(p)); ctx.lineTo(W - padR, Y(p)); ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillText(p, padL - 8, Y(p));
    }
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (let I = 0; I <= Imax; I += 500) ctx.fillText(I, X(I), H - padB + 8);
    ctx.save(); ctx.translate(14, padT + ph / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText("P  (µmol CO₂ m⁻² s⁻¹)", 0, 0); ctx.restore();
    ctx.fillText("Incident PAR  I  (µmol photons m⁻² s⁻¹)", padL + pw / 2, H - 14);

    // faded reference: all species
    Object.keys(PLANT).forEach((k) => {
      if (k === sp) return;
      ctx.strokeStyle = col("--line"); ctx.globalAlpha = .8; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let I = 0; I <= Imax; I += 15) { const x = X(I), y = Y(nrh(I, PLANT[k].pmax)); I === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke(); ctx.globalAlpha = 1;
    });
    // active species curve
    const pmax = PLANT[sp].pmax;
    ctx.strokeStyle = col("--accent"); ctx.lineWidth = 3;
    ctx.beginPath();
    for (let I = 0; I <= Imax; I += 8) { const x = X(I), y = Y(nrh(I, pmax)); I === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    // operating points: sunlit (I0) and shaded (β·I0)
    const pts = [[I0, col("--sun"), "sunlit"], [BETA * I0, "#7dd3fc", "shaded"]];
    ctx.font = "600 11px system-ui,sans-serif";
    pts.forEach(([I, c, lab]) => {
      const x = X(I), y = Y(nrh(I, pmax));
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill();
      ctx.strokeStyle = c; ctx.globalAlpha = .35; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(x, Y(0)); ctx.lineTo(x, y); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.fillText(lab, x, y - 14);
    });
  };
  const gainNote = $("#gainNote"), pMaxEl = $("#pMax");
  const NOTES = {
    soybean: "Largest absolute gain — canopy photosynthesis rises from ~14–18 to <b>22–24</b> µmol CO₂ m⁻² s⁻¹ under optimal supplemental light.",
    sugarbeet: "Moderate improvement under optimal light placement across single and multi-plant layouts.",
    tomato: "Moderate improvement; optimal light placement consistently raises canopy assimilation.",
    strawberry: "Smallest absolute gain — lowest P<sub>max</sub> among the four crops limits the ceiling.",
  };
  const selectSp = (sp) => {
    if (pMaxEl) pMaxEl.textContent = PLANT[sp].pmax.toFixed(1);
    if (gainNote) gainNote.innerHTML = NOTES[sp];
    drawNRH(sp);
  };
  $$("#photoSpecies .chip").forEach((c) => c.addEventListener("click", () => {
    $$("#photoSpecies .chip").forEach((x) => x.classList.remove("active"));
    c.classList.add("active");
    selectSp(c.dataset.sp);
  }));
  selectSp("soybean");
  // redraw curve if theme toggles (colors are read from CSS vars)
  const mo = new MutationObserver(() => selectSp($("#photoSpecies .chip.active").dataset.sp));
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
})();
