/* Just Jonah, concept B: Track the wild */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var easeInOut = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ANIMALS = window.FAHLO;
  var PRICE = window.FAHLO_PRICE;
  var IMG = "../assets/products/";
  var FOWEY = { lon: -4.637, lat: 50.334 };

  var HABITATS = {
    ocean: { label: "Ocean", long: "Lives in the open ocean", colour: "var(--ocean)" },
    ice: { label: "Ice", long: "Lives on icy coasts", colour: "var(--ice)" },
    grassland: { label: "Grassland", long: "Lives on grassland and savanna", colour: "var(--grassland)" },
    forest: { label: "Forest", long: "Lives in forests", colour: "var(--forest)" },
    mountain: { label: "Mountains", long: "Lives in the mountains", colour: "var(--mountain)" }
  };

  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  $$("[data-animal-count]").forEach(function (el) { el.textContent = ANIMALS.length; });
  $$(".hero__title .w").forEach(function (w, i) { w.style.setProperty("--i", i); });

  /* ---------- Header + menu ---------- */
  var header = $(".site-header");
  var menuBtn = $("[data-menu]");
  var nav = $("#nav");
  function onScrollHeader() { header.classList.toggle("is-solid", window.scrollY > 40); }
  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();
  menuBtn.addEventListener("click", function () {
    var open = menuBtn.getAttribute("aria-expanded") !== "true";
    menuBtn.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
    header.classList.toggle("menu-open", open);
  });
  $$("a", nav).forEach(function (a) {
    a.addEventListener("click", function () {
      menuBtn.setAttribute("aria-expanded", "false");
      nav.classList.remove("is-open");
      header.classList.remove("menu-open");
    });
  });

  /* ---------- Live open / closed (UK time) ---------- */
  var OPEN_AT = 600, CLOSE_AT = 1050;
  function renderOpenState() {
    var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
    var h = 0, m = 0;
    parts.forEach(function (p) { if (p.type === "hour") h = +p.value; if (p.type === "minute") m = +p.value; });
    var mins = h * 60 + m;
    var open = mins >= OPEN_AT && mins < CLOSE_AT;
    var text = open ? "Open now until 5:30pm" : mins < OPEN_AT ? "Closed now, opens at 10am" : "Closed now, opens 10am tomorrow";
    $$("[data-open-pill]").forEach(function (el) { el.classList.toggle("is-closed", !open); });
    $$("[data-open-text]").forEach(function (el) { el.textContent = text; });
  }
  renderOpenState();
  setInterval(renderOpenState, 60000);

  /* =========================================================
     GLOBE
     ========================================================= */
  var globeEl = $("[data-globe]");
  var canvas = $("[data-globe-canvas]");
  var ctx = canvas.getContext("2d");
  var pinsEl = $("[data-pins]");
  var hint = $("[data-globe-hint]");
  var DEG = Math.PI / 180;
  var W = 0, H = 0, R = 0, cx = 0, cy = 0;
  var view = { lon: -150, lat: 22 };
  var vel = 0;
  var tween = null;
  var dragging = false, dragMoved = false;
  var active = null;
  var started = performance.now();

  function resize() {
    // layout size, not getBoundingClientRect: the intro scales the globe with a transform
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    W = globeEl.offsetWidth; H = globeEl.offsetHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(W, H) / 2 * .9;
    cx = W / 2; cy = H / 2;
  }

  // orthographic projection; returns [x, y, z] where z < 0 is the far side
  function project(lon, lat) {
    var l = (lon - view.lon) * DEG, p = lat * DEG, p0 = view.lat * DEG;
    var cp = Math.cos(p), sp = Math.sin(p), cl = Math.cos(l);
    var x = cp * Math.sin(l);
    var y = Math.cos(p0) * sp - Math.sin(p0) * cp * cl;
    var z = Math.sin(p0) * sp + Math.cos(p0) * cp * cl;
    return [x, y, z];
  }

  // seeded wander loop for each animal (illustrative, not real tracking data)
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function catmull(p0, p1, p2, p3, t) {
    var t2 = t * t, t3 = t2 * t;
    return .5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  }
  ANIMALS.forEach(function (a, i) {
    var rand = rng(i * 7919 + 13);
    var spread = a.habitat === "ocean" ? 9 : a.habitat === "ice" ? 6 : 4;
    var ctrl = [];
    for (var k = 0; k < 6; k++) {
      var ang = k / 6 * Math.PI * 2 + rand() * .6;
      var r = spread * (.45 + rand() * .7);
      ctrl.push([a.lon + Math.cos(ang) * r, a.lat + Math.sin(ang) * r * .7]);
    }
    var pts = [];
    for (var s = 0; s < 6; s++) {
      var P0 = ctrl[(s + 5) % 6], P1 = ctrl[s], P2 = ctrl[(s + 1) % 6], P3 = ctrl[(s + 2) % 6];
      for (var j = 0; j < 12; j++) {
        var t = j / 12;
        pts.push([catmull(P0[0], P1[0], P2[0], P3[0], t), catmull(P0[1], P1[1], P2[1], P3[1], t)]);
      }
    }
    a.trail = pts;
    a.phase = rand();
    a.speed = 1 / (38000 + rand() * 24000);
  });

  // pins (HTML so they stay crisp and clickable)
  var houseIcon = '<svg viewBox="0 0 24 24"><path d="M12 3 2 11h3v9h5v-6h4v6h5v-9h3z"/></svg>';
  var basePin = document.createElement("button");
  basePin.className = "pin pin--base";
  basePin.type = "button";
  basePin.tabIndex = -1;
  basePin.innerHTML = houseIcon + '<span class="pin__name">Just Jonah, Fowey</span>';
  basePin.addEventListener("click", function () {
    var v = $("#visit"); if (v) v.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  });
  pinsEl.appendChild(basePin);

  ANIMALS.forEach(function (a, i) {
    var b = document.createElement("button");
    b.className = "pin";
    b.type = "button";
    b.tabIndex = -1;
    b.dataset.hab = a.habitat;
    b.style.backgroundImage = "url(" + IMG + a.bracelet + ")";
    b.style.setProperty("--d", (i * .37 % 2.8).toFixed(2) + "s");
    b.style.transitionDelay = (1.2 + i * .045).toFixed(2) + "s";
    var name = document.createElement("span");
    name.className = "pin__name";
    name.textContent = a.name;
    b.appendChild(name);
    b.addEventListener("click", function () { if (!dragMoved) selectAnimal(a); });
    a.pin = b;
    pinsEl.appendChild(b);
  });

  function placePin(el, x, y, z) {
    var vis = clamp((z - .04) / .22, 0, 1);
    var s = .72 + .28 * z;
    el.style.transform = "translate3d(" + (cx + R * x).toFixed(1) + "px," + (cy - R * y).toFixed(1) + "px,0) scale(" + s.toFixed(3) + ")";
    el.style.opacity = vis.toFixed(3);
    el.style.pointerEvents = vis > .5 ? "auto" : "none";
    el.style.zIndex = String(Math.round(z * 100));
  }

  function animalPos(a, now) {
    var n = a.trail.length;
    var f = ((a.phase + (reduced ? 0 : (now - started) * a.speed)) % 1) * n;
    var i0 = Math.floor(f), t = f - i0;
    var p = a.trail[i0 % n], q = a.trail[(i0 + 1) % n];
    return { lon: p[0] + (q[0] - p[0]) * t, lat: p[1] + (q[1] - p[1]) * t, idx: i0 };
  }

  function strokeLine(points, close) {
    // draws only the near-side runs of a lon/lat polyline
    var pen = false;
    ctx.beginPath();
    for (var i = 0; i < points.length + (close ? 1 : 0); i++) {
      var pt = points[i % points.length];
      var p = project(pt[0], pt[1]);
      if (p[2] > 0) {
        var X = cx + R * p[0], Y = cy - R * p[1];
        if (pen) ctx.lineTo(X, Y); else { ctx.moveTo(X, Y); pen = true; }
      } else pen = false;
    }
    ctx.stroke();
  }

  var graticule = [];
  (function () {
    var lon, lat, line;
    for (lat = -60; lat <= 60; lat += 30) { line = []; for (lon = -180; lon <= 180; lon += 4) line.push([lon, lat]); graticule.push(line); }
    for (lon = -180; lon < 180; lon += 30) { line = []; for (lat = -84; lat <= 84; lat += 4) line.push([lon, lat]); graticule.push(line); }
  })();

  function draw(now) {
    ctx.clearRect(0, 0, W, H);

    // atmosphere
    var atm = ctx.createRadialGradient(cx, cy, R * .9, cx, cy, R * 1.14);
    atm.addColorStop(0, "rgba(255, 201, 60, .16)");
    atm.addColorStop(1, "rgba(255, 201, 60, 0)");
    ctx.fillStyle = atm;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.14, 0, Math.PI * 2); ctx.fill();

    // ocean
    var sea = ctx.createRadialGradient(cx - R * .35, cy - R * .4, R * .1, cx, cy, R);
    sea.addColorStop(0, "#2A7F9A");
    sea.addColorStop(1, "#103F56");
    ctx.fillStyle = sea;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    // graticule
    ctx.strokeStyle = "rgba(255, 255, 255, .07)";
    ctx.lineWidth = 1;
    graticule.forEach(function (l) { strokeLine(l, false); });

    // land: far-side points are pulled onto the horizon so shapes close cleanly
    ctx.fillStyle = "#7DBB8E";
    ctx.strokeStyle = "#A6D6B1";
    ctx.lineWidth = .8;
    var land = window.LAND || [];
    for (var r = 0; r < land.length; r++) {
      var ring = land[r], any = false;
      ctx.beginPath();
      for (var i = 0; i < ring.length; i++) {
        var p = project(ring[i][0], ring[i][1]);
        var X, Y;
        if (p[2] >= 0) { any = true; X = cx + R * p[0]; Y = cy - R * p[1]; }
        else { var len = Math.hypot(p[0], p[1]) || 1; X = cx + R * p[0] / len; Y = cy - R * p[1] / len; }
        if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
      }
      if (!any) continue;
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // shading for depth
    var shade = ctx.createRadialGradient(cx - R * .4, cy - R * .45, R * .2, cx, cy, R * 1.02);
    shade.addColorStop(0, "rgba(255, 255, 255, .10)");
    shade.addColorStop(.6, "rgba(0, 0, 0, 0)");
    shade.addColorStop(1, "rgba(4, 24, 18, .45)");
    ctx.fillStyle = shade;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    // trails + pins
    ctx.lineCap = "round";
    ANIMALS.forEach(function (a) {
      var pos = animalPos(a, now);
      var isActive = a === active;
      ctx.setLineDash([1, 6]);
      ctx.lineWidth = isActive ? 2.6 : 1.8;
      ctx.strokeStyle = isActive ? "rgba(255, 201, 60, .95)" : "rgba(255, 201, 60, .5)";
      strokeLine(a.trail, true);
      ctx.setLineDash([]);
      var pp = project(pos.lon, pos.lat);
      placePin(a.pin, pp[0], pp[1], pp[2]);
    });
    var fp = project(FOWEY.lon, FOWEY.lat);
    placePin(basePin, fp[0], fp[1], fp[2]);
  }

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(64, now - last); last = now;
    if (tween) {
      var t = clamp((now - tween.t0) / tween.dur, 0, 1);
      var e = tween.ease(t);
      view.lon = tween.from.lon + (tween.to.lon - tween.from.lon) * e;
      view.lat = tween.from.lat + (tween.to.lat - tween.from.lat) * e;
      if (t >= 1) { var done = tween.done; tween = null; if (done) done(); }
    } else if (!dragging) {
      if (Math.abs(vel) > .01) { view.lon += vel; vel *= .94; }
      else if (!active && !reduced) view.lon += .012 * dt;
    }
    draw(now);
    requestAnimationFrame(frame);
  }

  function flyTo(lon, lat, dur, done) {
    var dLon = ((lon - view.lon + 540) % 360) - 180;
    tween = {
      from: { lon: view.lon, lat: view.lat },
      to: { lon: view.lon + dLon, lat: clamp(lat, -50, 55) },
      t0: performance.now(), dur: reduced ? 1 : dur, ease: easeInOut, done: done
    };
    vel = 0;
  }

  // drag to spin
  (function () {
    var lastX = 0, lastY = 0, startX = 0, startY = 0, pid = null;
    globeEl.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      dragging = true; dragMoved = false; tween = null; vel = 0;
      pid = e.pointerId; startX = lastX = e.clientX; startY = lastY = e.clientY;
    });
    window.addEventListener("pointermove", function (e) {
      if (!dragging || e.pointerId !== pid) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      if (!dragMoved && Math.hypot(e.clientX - startX, e.clientY - startY) > 4) {
        dragMoved = true;
        globeEl.classList.add("is-dragging");
        try { globeEl.setPointerCapture(pid); } catch (err) { /* pointer already released */ }
        hint.classList.add("is-gone");
      }
      if (!dragMoved) return;
      var k = 57.3 / R * .9;
      view.lon -= dx * k;
      if (e.pointerType === "mouse") view.lat = clamp(view.lat + dy * k, -60, 70);
      vel = -dx * k * .6;
      lastX = e.clientX; lastY = e.clientY;
    });
    function end(e) {
      if (!dragging || (e && e.pointerId !== pid)) return;
      dragging = false;
      globeEl.classList.remove("is-dragging");
      setTimeout(function () { dragMoved = false; }, 0);
    }
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  })();

  /* ---------- Field card ---------- */
  var card = $("[data-field-card]");
  var fc = {
    img: $("[data-fc-img]"), hab: $("[data-fc-habitat]"), name: $("[data-fc-name]"),
    model: $("[data-fc-model]"), dist: $("[data-fc-distance]"), price: $("[data-fc-price]"),
    add: $("[data-fc-add]"), plush: $("[data-fc-plush]")
  };

  function milesFromFowey(a) {
    var p1 = FOWEY.lat * DEG, p2 = a.lat * DEG, dp = p2 - p1, dl = (a.lon - FOWEY.lon) * DEG;
    var h = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    var miles = 3958.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return Math.round(miles / 100) * 100;
  }

  function selectAnimal(a) {
    if (active && active.pin) active.pin.classList.remove("is-active");
    active = a;
    a.pin.classList.add("is-active");
    hint.classList.add("is-gone");
    var pos = animalPos(a, performance.now());
    flyTo(pos.lon, pos.lat, 1100);

    var hab = HABITATS[a.habitat];
    fc.img.src = IMG + a.bracelet;
    fc.img.alt = "Fahlo " + a.model + " bracelet, " + a.track.toLowerCase();
    fc.hab.textContent = hab.long;
    fc.hab.style.setProperty("--dot", hab.colour);
    fc.name.textContent = a.track;
    fc.model.textContent = "Fahlo " + a.model + " bracelet";
    fc.dist.textContent = "Its home range is about " + milesFromFowey(a).toLocaleString("en-GB") + " miles from our shop in Fowey.";
    fc.price.textContent = PRICE;
    fc.add.dataset.add = a.track;
    if (a.plushUrl) { fc.plush.hidden = false; fc.plush.href = a.plushUrl; }
    else fc.plush.hidden = true;
    card.hidden = false;
    card.style.animation = "none"; void card.offsetWidth; card.style.animation = "";
  }

  $("[data-field-close]").addEventListener("click", function () {
    card.hidden = true;
    if (active) active.pin.classList.remove("is-active");
    active = null;
  });

  /* ---------- Intro: globe spins in, pins pop up ---------- */
  function startGlobe() {
    resize();
    requestAnimationFrame(function (t) { last = t; frame(t); });
    globeEl.classList.add("is-in");
    pinsEl.classList.add("is-in");
    tween = {
      from: { lon: -150, lat: 22 }, to: { lon: 8, lat: 26 },
      t0: performance.now(), dur: reduced ? 1 : 2600, ease: easeOut
    };
  }
  window.addEventListener("resize", resize);
  requestAnimationFrame(startGlobe);

  /* =========================================================
     ANIMAL PICKER
     ========================================================= */
  var grid = $("[data-grid]");
  var chips = $("[data-chips]");

  var counts = { all: ANIMALS.length };
  ANIMALS.forEach(function (a) { counts[a.habitat] = (counts[a.habitat] || 0) + 1; });
  var chipList = [["all", "All animals", "var(--canopy)"]].concat(Object.keys(HABITATS).map(function (k) { return [k, HABITATS[k].label, HABITATS[k].colour]; }));
  chips.innerHTML = chipList.map(function (c, i) {
    return '<button class="chip" type="button" aria-pressed="' + (i === 0) + '" data-filter="' + c[0] + '" style="--dot:' + c[2] + '">' +
      (i ? '<span class="chip__dot" aria-hidden="true"></span>' : '') + c[1] + ' <span class="chip__n">' + counts[c[0]] + '</span></button>';
  }).join("");

  grid.innerHTML = ANIMALS.map(function (a) {
    var hab = HABITATS[a.habitat];
    return '<li class="acard" data-hab="' + a.habitat + '" style="--dot:' + hab.colour + '">' +
      '<img class="acard__img" src="' + IMG + a.bracelet + '" alt="Fahlo ' + a.model + ' bracelet, ' + a.track.toLowerCase() + '" loading="lazy">' +
      '<span class="acard__hab">' + hab.label + '</span>' +
      '<div class="acard__body">' +
        '<h3 class="acard__name">' + a.track + '</h3>' +
        '<p class="acard__model">' + a.model + ' bracelet</p>' +
        '<p class="acard__links"><button type="button" data-find="' + a.id + '">See it on the globe</button>' +
          (a.plushUrl ? '<a href="' + a.plushUrl + '">Plush too</a>' : '') + '</p>' +
        '<div class="acard__row"><span class="acard__price">' + PRICE + '</span>' +
          '<button class="btn btn--tag btn--sm" type="button" data-add="' + a.track + '">Add to basket</button></div>' +
      '</div></li>';
  }).join("");

  chips.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-filter]");
    if (!btn) return;
    $$(".chip", chips).forEach(function (c) { c.setAttribute("aria-pressed", String(c === btn)); });
    filterTo(btn.dataset.filter);
  });

  function filterTo(h) {
    var cards = $$(".acard", grid);
    var first = new Map();
    cards.forEach(function (c) { if (!c.hidden) first.set(c, c.getBoundingClientRect()); });
    cards.forEach(function (c) { c.hidden = !(h === "all" || c.dataset.hab === h); });
    if (reduced || !grid.animate) return;
    cards.forEach(function (c) {
      if (c.hidden) return;
      var lastR = c.getBoundingClientRect(), f = first.get(c);
      if (f) {
        var dx = f.left - lastR.left, dy = f.top - lastR.top;
        if (dx || dy) c.animate([{ transform: "translate(" + dx + "px," + dy + "px)" }, { transform: "none" }], { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" });
      } else {
        c.animate([{ opacity: 0, transform: "scale(.86)" }, { opacity: 1, transform: "none" }], { duration: 420, easing: "cubic-bezier(.3,1.4,.5,1)" });
      }
    });
  }

  grid.addEventListener("click", function (e) {
    var find = e.target.closest("[data-find]");
    if (!find) return;
    var a = ANIMALS.find(function (x) { return x.id === find.dataset.find; });
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    setTimeout(function () { selectAnimal(a); }, reduced ? 0 : 500);
  });

  /* ---------- How it works: trail draws itself in ---------- */
  var mask = $("[data-trail-mask]");
  if (mask) {
    var L = mask.getTotalLength();
    mask.style.strokeDasharray = L;
    mask.style.strokeDashoffset = reduced ? 0 : L;
    if (!reduced && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        mask.style.transition = "stroke-dashoffset 2.2s cubic-bezier(.4,0,.2,1)";
        mask.style.strokeDashoffset = 0;
        io.disconnect();
      }, { threshold: .4 });
      io.observe($(".how"));
    } else mask.style.strokeDashoffset = 0;
  }

  /* ---------- Brand marquee: duplicate for a seamless loop ---------- */
  var track = $(".marquee__track");
  if (track && !reduced) {
    $$("li", track).forEach(function (li) {
      var c = li.cloneNode(true); c.setAttribute("aria-hidden", "true"); track.appendChild(c);
    });
  }

  /* ---------- Contour map of Fowey ---------- */
  (function contours() {
    var g = $("[data-contours]");
    if (!g) return;
    var NS = "http://www.w3.org/2000/svg";
    var hills = [
      { x: 150, y: 300, n: 11, step: 30, seed: 1 },
      { x: 610, y: 300, n: 6, step: 22, seed: 2.4 },
      { x: 40, y: 560, n: 6, step: 30, seed: 4.1 }
    ];
    hills.forEach(function (h) {
      for (var k = 0; k < h.n; k++) {
        var base = 26 + k * h.step, d = "";
        for (var s = 0; s <= 72; s++) {
          var t = s / 72 * Math.PI * 2;
          var r = base * (1 + .13 * Math.sin(3 * t + h.seed + k * .35) + .07 * Math.sin(5 * t + h.seed * 2 + k * .2));
          d += (s ? "L" : "M") + (h.x + Math.cos(t) * r * 1.15).toFixed(1) + " " + (h.y + Math.sin(t) * r * .9).toFixed(1);
        }
        var path = document.createElementNS(NS, "path");
        path.setAttribute("d", d + "Z");
        if (k % 4 === 3) path.setAttribute("stroke-width", "2.2");
        g.appendChild(path);
      }
    });
  })();

  /* =========================================================
     BASKET + TOAST + SIGN-UP
     ========================================================= */
  var basket = $("[data-basket]");
  var countEl = $("[data-basket-count]");
  var toastEl = $("[data-toast]");
  var count = 0, toastTimer = null;

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-on"); }, 2600);
  }
  function bumpBasket() {
    countEl.textContent = String(count);
    basket.setAttribute("aria-label", "Basket, " + count + (count === 1 ? " item" : " items"));
    basket.classList.remove("is-bumping"); void basket.offsetWidth; basket.classList.add("is-bumping");
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-add]");
    if (!btn) return;
    count++;
    var label = btn.dataset.add;
    toast("Added " + label.charAt(0).toLowerCase() + label.slice(1) + " to your basket");
    var holder = btn.closest(".acard, .field-card");
    var img = holder && $(".acard__img, .field-card__img", holder);
    if (reduced || !img || !img.animate) { bumpBasket(); return; }
    var r = img.getBoundingClientRect(), b = basket.getBoundingClientRect();
    var size = Math.min(r.width, r.height, 140);
    var sx = r.left + r.width / 2 - size / 2, sy = r.top + r.height / 2 - size / 2;
    var clone = img.cloneNode();
    clone.className = "fly";
    clone.removeAttribute("loading");
    clone.style.cssText = "left:" + sx + "px;top:" + sy + "px;width:" + size + "px;height:" + size + "px";
    document.body.appendChild(clone);
    var dx = b.left + b.width / 2 - (sx + size / 2), dy = b.top + b.height / 2 - (sy + size / 2);
    clone.animate([
      { transform: "translate(0,0) scale(1)" },
      { transform: "translate(" + dx * .5 + "px," + (dy * .3 - 80) + "px) scale(.6)", offset: .55 },
      { transform: "translate(" + dx + "px," + dy + "px) scale(.1)", opacity: .5 }
    ], { duration: 800, easing: "cubic-bezier(.45,0,.55,1)" }).finished.then(function () {
      clone.remove(); bumpBasket();
    });
  });

  var form = $("[data-signup]");
  var msg = $("[data-signup-msg]");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var input = form.elements.email;
    var ok = input.value.trim() !== "" && input.checkValidity();
    msg.classList.toggle("is-error", !ok);
    msg.classList.toggle("is-ok", ok);
    if (!ok) { msg.textContent = "Enter an email address like name@example.com."; input.focus(); return; }
    msg.textContent = "You're signed up. Look out for our next field notes.";
    form.reset();
  });
})();
