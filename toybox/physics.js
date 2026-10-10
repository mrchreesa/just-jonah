/* Just Jonah, concept B: The toybox
   A small 2D rigid-body engine (boxes + circles) and the hero that uses it.
   Bodies are DOM elements so they stay crisp and can be real links. */
(function () {
  "use strict";

  var GRAVITY = 2600;      // px/s²
  var SUBSTEPS = 4;
  var ITERATIONS = 8;
  var SLOP = .5;           // px of overlap we tolerate before correcting
  var BAUMGARTE = .45;     // share of overlap corrected per substep
  var MAX_V = 3400;        // px/s
  var STIFF = 22;          // how hard a grabbed toy follows the pointer

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* ---------------- Bodies ---------------- */
  function Body(o) {
    this.shape = o.shape;                    // "box" | "circle"
    this.w = o.w || 0; this.h = o.h || 0; this.r = o.r || 0;
    this.x = o.x || 0; this.y = o.y || 0; this.a = o.a || 0;
    this.vx = 0; this.vy = 0; this.va = 0;
    this.e = o.restitution == null ? .28 : o.restitution;
    this.f = o.friction == null ? .6 : o.friction;
    var area = this.shape === "box" ? this.w * this.h : Math.PI * this.r * this.r;
    var m = o.isStatic ? 0 : area * (o.density || 1) / 1000;
    var I = this.shape === "box" ? m * (this.w * this.w + this.h * this.h) / 12 : m * this.r * this.r / 2;
    this.invM = m ? 1 / m : 0;
    this.invI = I ? 1 / I : 0;
    this.bound = this.shape === "box" ? Math.hypot(this.w, this.h) / 2 : this.r;
    this.el = o.el || null;
  }

  function corners(b) {
    var c = Math.cos(b.a), s = Math.sin(b.a), hw = b.w / 2, hh = b.h / 2;
    return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(function (p) {
      return [b.x + p[0] * c - p[1] * s, b.y + p[0] * s + p[1] * c];
    });
  }

  // if (px, py) is inside box b: depth and b's outward normal of the nearest face
  function pointInBox(b, px, py) {
    var c = Math.cos(b.a), s = Math.sin(b.a), dx = px - b.x, dy = py - b.y;
    var lx = dx * c + dy * s, ly = -dx * s + dy * c, hw = b.w / 2, hh = b.h / 2;
    if (lx <= -hw || lx >= hw || ly <= -hh || ly >= hh) return null;
    var dR = hw - lx, dL = lx + hw, dD = hh - ly, dU = ly + hh;
    var m = Math.min(dR, dL, dD, dU), nlx = 0, nly = 0;
    if (m === dR) nlx = 1; else if (m === dL) nlx = -1; else if (m === dD) nly = 1; else nly = -1;
    return { pen: m, nx: nlx * c - nly * s, ny: nlx * s + nly * c };
  }

  /* ---------------- Collision (normals point from a to b) ---------------- */
  function contact(a, b, nx, ny, px, py, pen) { return { a: a, b: b, nx: nx, ny: ny, px: px, py: py, pen: pen }; }

  function boxBox(A, B, out) {
    var va = corners(A), vb = corners(B), h, i;
    for (i = 0; i < 4; i++) {
      h = pointInBox(B, va[i][0], va[i][1]);
      if (h) out.push(contact(A, B, -h.nx, -h.ny, va[i][0], va[i][1], h.pen));
    }
    for (i = 0; i < 4; i++) {
      h = pointInBox(A, vb[i][0], vb[i][1]);
      if (h) out.push(contact(A, B, h.nx, h.ny, vb[i][0], vb[i][1], h.pen));
    }
  }

  function circleCircle(A, B, out) {
    var dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy), R = A.r + B.r;
    if (d >= R) return;
    var nx = d ? dx / d : 0, ny = d ? dy / d : 1;
    out.push(contact(A, B, nx, ny, A.x + nx * A.r, A.y + ny * A.r, R - d));
  }

  // normal points from the box towards the circle
  function circleVsBox(C, B) {
    var c = Math.cos(B.a), s = Math.sin(B.a), dx = C.x - B.x, dy = C.y - B.y;
    var lx = dx * c + dy * s, ly = -dx * s + dy * c, hw = B.w / 2, hh = B.h / 2;
    var qx = clamp(lx, -hw, hw), qy = clamp(ly, -hh, hh), nlx, nly, pen;
    if (qx !== lx || qy !== ly) {
      var ex = lx - qx, ey = ly - qy, d = Math.hypot(ex, ey);
      if (d >= C.r) return null;
      nlx = ex / d; nly = ey / d; pen = C.r - d;
    } else {
      var dR = hw - lx, dL = lx + hw, dD = hh - ly, dU = ly + hh, m = Math.min(dR, dL, dD, dU);
      nlx = m === dR ? 1 : m === dL ? -1 : 0;
      nly = nlx ? 0 : (m === dD ? 1 : -1);
      pen = C.r + m;
    }
    return { nx: nlx * c - nly * s, ny: nlx * s + nly * c, px: B.x + qx * c - qy * s, py: B.y + qx * s + qy * c, pen: pen };
  }

  function collide(A, B, out) {
    if (A.shape === "box" && B.shape === "box") return boxBox(A, B, out);
    if (A.shape === "circle" && B.shape === "circle") return circleCircle(A, B, out);
    var h;
    if (A.shape === "circle") {
      h = circleVsBox(A, B);
      if (h) out.push(contact(A, B, -h.nx, -h.ny, h.px, h.py, h.pen));
    } else {
      h = circleVsBox(B, A);
      if (h) out.push(contact(A, B, h.nx, h.ny, h.px, h.py, h.pen));
    }
  }

  /* ---------------- Solver ---------------- */
  function impulse(A, B, jx, jy, rax, ray, rbx, rby) {
    A.vx -= jx * A.invM; A.vy -= jy * A.invM; A.va -= (rax * jy - ray * jx) * A.invI;
    B.vx += jx * B.invM; B.vy += jy * B.invM; B.va += (rbx * jy - rby * jx) * B.invI;
  }

  function solveVelocity(c, first) {
    var A = c.a, B = c.b;
    var rax = c.px - A.x, ray = c.py - A.y, rbx = c.px - B.x, rby = c.py - B.y;
    var rvx = (B.vx - B.va * rby) - (A.vx - A.va * ray);
    var rvy = (B.vy + B.va * rbx) - (A.vy + A.va * rax);
    var vn = rvx * c.nx + rvy * c.ny;
    if (vn > 0) return;
    var raN = rax * c.ny - ray * c.nx, rbN = rbx * c.ny - rby * c.nx;
    var kn = A.invM + B.invM + raN * raN * A.invI + rbN * rbN * B.invI;
    if (kn <= 0) return;
    var e = first && vn < -140 ? Math.min(A.e, B.e) : 0;
    var j = -(1 + e) * vn / kn;
    impulse(A, B, c.nx * j, c.ny * j, rax, ray, rbx, rby);

    rvx = (B.vx - B.va * rby) - (A.vx - A.va * ray);
    rvy = (B.vy + B.va * rbx) - (A.vy + A.va * rax);
    var vn2 = rvx * c.nx + rvy * c.ny;
    var tx = rvx - vn2 * c.nx, ty = rvy - vn2 * c.ny, tl = Math.hypot(tx, ty);
    if (tl < 1e-6) return;
    tx /= tl; ty /= tl;
    var raT = rax * ty - ray * tx, rbT = rbx * ty - rby * tx;
    var kt = A.invM + B.invM + raT * raT * A.invI + rbT * rbT * B.invI;
    var mu = Math.sqrt(A.f * B.f);
    var jt = clamp(-(rvx * tx + rvy * ty) / kt, -j * mu, j * mu);
    impulse(A, B, tx * jt, ty * jt, rax, ray, rbx, rby);
  }

  function correctPosition(c) {
    var A = c.a, B = c.b, k = A.invM + B.invM;
    if (!k) return;
    var m = Math.max(c.pen - SLOP, 0) / k * BAUMGARTE;
    A.x -= c.nx * m * A.invM; A.y -= c.ny * m * A.invM;
    B.x += c.nx * m * B.invM; B.y += c.ny * m * B.invM;
  }

  /* ---------------- World ---------------- */
  function World() {
    this.bodies = [];
    this.statics = [];
    this.solids = [];
    this.grab = null;
    this.W = 0; this.H = 0;
  }

  World.prototype.setBounds = function (W, H) {
    this.W = W; this.H = H;
    var T = 2000;
    this.statics = [
      new Body({ shape: "box", isStatic: true, x: W / 2, y: H + T / 2, w: W + T * 2, h: T, friction: .8 }),
      new Body({ shape: "box", isStatic: true, x: -T / 2, y: H / 2 - H, w: T, h: H * 4 + T }),
      new Body({ shape: "box", isStatic: true, x: W + T / 2, y: H / 2 - H, w: T, h: H * 4 + T })
    ];
  };

  World.prototype.setSolids = function (rects) {
    this.solids = rects.map(function (r) {
      return new Body({ shape: "box", isStatic: true, x: r.x + r.w / 2, y: r.y + r.h / 2, w: r.w, h: r.h, friction: .7 });
    });
  };

  World.prototype.step = function (dt) {
    var h = dt / SUBSTEPS, bodies = this.bodies, fixed = this.statics.concat(this.solids);
    for (var s = 0; s < SUBSTEPS; s++) {
      var i, j, b;
      for (i = 0; i < bodies.length; i++) {
        b = bodies[i];
        b.vy += GRAVITY * h;
        if (this.grab && this.grab.body === b) this.pull(b);
        var sp = Math.hypot(b.vx, b.vy);
        if (sp > MAX_V) { b.vx *= MAX_V / sp; b.vy *= MAX_V / sp; }
        b.va = clamp(b.va, -40, 40);
      }

      var contacts = [];
      for (i = 0; i < bodies.length; i++) {
        var A = bodies[i];
        for (j = i + 1; j < bodies.length; j++) {
          var B = bodies[j], dx = B.x - A.x, dy = B.y - A.y, rr = A.bound + B.bound;
          if (dx * dx + dy * dy < rr * rr) collide(A, B, contacts);
        }
        for (j = 0; j < fixed.length; j++) collide(A, fixed[j], contacts);
      }

      for (var it = 0; it < ITERATIONS; it++) {
        for (i = 0; i < contacts.length; i++) solveVelocity(contacts[i], it === 0);
      }

      for (i = 0; i < bodies.length; i++) {
        b = bodies[i];
        b.x += b.vx * h; b.y += b.vy * h; b.a += b.va * h;
        b.va *= .9992;
      }
      for (i = 0; i < contacts.length; i++) correctPosition(contacts[i]);
    }

    // anything that escaped (or went NaN) drops back in from the top
    for (var k = 0; k < bodies.length; k++) {
      var q = bodies[k];
      if (!isFinite(q.x) || !isFinite(q.y) || q.y > this.H + 600 || q.y < -this.H * 3) {
        q.x = this.W * (.3 + Math.random() * .6); q.y = -q.bound * 2; q.vx = q.vy = q.va = 0;
      }
    }
  };

  // soft spring from the grabbed point on the toy to the pointer
  World.prototype.pull = function (b) {
    var g = this.grab, c = Math.cos(b.a), s = Math.sin(b.a);
    var rx = g.lx * c - g.ly * s, ry = g.lx * s + g.ly * c;
    var px = b.x + rx, py = b.y + ry;
    var vpx = b.vx - b.va * ry, vpy = b.vy + b.va * rx;
    var dvx = (g.tx - px) * STIFF - vpx, dvy = (g.ty - py) * STIFF - vpy;
    var k = b.invM + (rx * rx + ry * ry) * b.invI;
    var jx = dvx / k * .3, jy = dvy / k * .3;
    b.vx += jx * b.invM; b.vy += jy * b.invM; b.va += (rx * jy - ry * jx) * b.invI;
    b.va *= .985;
  };

  World.prototype.render = function () {
    for (var i = 0; i < this.bodies.length; i++) {
      var b = this.bodies[i], hw = b.shape === "box" ? b.w / 2 : b.r, hh = b.shape === "box" ? b.h / 2 : b.r;
      b.el.style.transform = "translate3d(" + (b.x - hw).toFixed(2) + "px," + (b.y - hh).toFixed(2) + "px,0) rotate(" + b.a.toFixed(4) + "rad)";
    }
  };

  /* =========================================================
     THE TOYBOX HERO
     ========================================================= */
  var hero = document.querySelector("[data-hero]");
  var playground = document.querySelector("[data-playground]");
  if (!hero || !playground) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var world = new World();
  var IMG = "../assets/products/";
  var FLOOR_INSET = 22; // the scalloped edge of the next section overlaps the floor

  var DUCK = '<svg viewBox="0 0 100 100"><ellipse cx="46" cy="68" rx="40" ry="26" fill="#FFC933" stroke="#1F1A3D" stroke-width="5"/><path d="M24 64q16-12 32 0q-16 12-32 0Z" fill="#F2A91E" stroke="#1F1A3D" stroke-width="4" stroke-linejoin="round"/><circle cx="64" cy="36" r="21" fill="#FFC933" stroke="#1F1A3D" stroke-width="5"/><path d="M82 36q14 0 15 7q-8 6-17 1Z" fill="#F2542D" stroke="#1F1A3D" stroke-width="4" stroke-linejoin="round"/><circle cx="69" cy="31" r="4" fill="#1F1A3D"/></svg>';
  var STAR = '<svg viewBox="0 0 100 100"><path d="M50 4 62.9 34.2 95.7 37.2 70.9 58.8 78.2 90.8 50 74 21.8 90.8 29.1 58.8 4.3 37.2 37.1 34.2Z" fill="#FFC933" stroke="#1F1A3D" stroke-width="5" stroke-linejoin="round"/><circle cx="41" cy="50" r="3.5" fill="#1F1A3D"/><circle cx="59" cy="50" r="3.5" fill="#1F1A3D"/><path d="M43 60q7 6 14 0" fill="none" stroke="#1F1A3D" stroke-width="3.5" stroke-linecap="round"/></svg>';

  var BLOCKS = [
    ["J", "#F2542D", "#fff"], ["U", "#FFC933", "#1F1A3D"], ["S", "#22B07D", "#fff"], ["T", "#FF8EBD", "#1F1A3D"],
    ["J", "#FFFFFF", "#2B4BDB"], ["O", "#F2542D", "#fff"], ["N", "#FFC933", "#1F1A3D"], ["A", "#22B07D", "#fff"], ["H", "#FF8EBD", "#1F1A3D"]
  ];

  function makeEl(tag, cls) {
    var el = document.createElement(tag);
    el.className = "toy " + cls;
    el.setAttribute("aria-hidden", "true");
    el.tabIndex = -1;
    return el;
  }

  function build() {
    var W = playground.clientWidth;
    var small = W < 700;
    var U = small ? clamp(W * .13, 42, 66) : clamp(W * .072, 58, 116);
    var specs = [];

    BLOCKS.forEach(function (b) {
      var el = makeEl("div", "toy--block");
      el.innerHTML = "<span>" + b[0] + "</span>";
      el.style.setProperty("--c", b[1]);
      el.style.setProperty("--t", b[2]);
      specs.push({ el: el, shape: "box", w: U, h: U, density: 1.2 });
    });
    specs.push({ el: makeEl("div", "toy--beach"), shape: "circle", r: U * .62, restitution: .55, density: .5 });
    specs.push({ el: makeEl("div", "toy--bouncy"), shape: "circle", r: U * .34, restitution: .82, density: .9 });
    specs.push({ el: makeEl("div", "toy--ring"), shape: "circle", r: U * .5 });
    specs.push({ el: makeEl("div", "toy--die"), shape: "box", w: U * .78, h: U * .78, density: 1.4 });
    var duck = makeEl("div", "toy--duck"); duck.innerHTML = DUCK;
    specs.push({ el: duck, shape: "circle", r: U * .56, density: .7 });
    var star = makeEl("div", "toy--star"); star.innerHTML = STAR;
    specs.push({ el: star, shape: "circle", r: U * .55, density: .8 });
    [["pl-penguin.jpg", "https://www.just-jonah.co.uk/product/fahlo-passage-plush-track-a-penguin/7964"],
     ["tile-tonies.jpg", "https://www.just-jonah.co.uk/shop/tonies/254"]].forEach(function (p) {
      var a = makeEl("a", "toy--product");
      a.href = p[1];
      a.draggable = false;
      a.innerHTML = '<img src="' + IMG + p[0] + '" alt="" draggable="false">';
      specs.push({ el: a, shape: "box", w: U * 1.35, h: U * 1.35, density: .8 });
    });

    playground.innerHTML = "";
    world.bodies = specs.map(function (sp) {
      var b = new Body(sp);
      var size = sp.shape === "box" ? [sp.w, sp.h] : [sp.r * 2, sp.r * 2];
      sp.el.style.width = size[0] + "px";
      sp.el.style.height = size[1] + "px";
      sp.el.style.setProperty("--s", size[0] + "px");
      playground.appendChild(sp.el);
      bindDrag(b);
      return b;
    });
  }

  // drop everything in from above, letters first so they land underneath
  var chestBox = null;
  function tipOut() {
    var W = world.W, small = W < 700;
    var x0 = chestBox ? chestBox.x + 50 : W * .5, x1 = chestBox ? chestBox.x + chestBox.w - 50 : W * .95;
    world.bodies.forEach(function (b, i) {
      b.x = x0 + Math.random() * Math.max(0, x1 - x0);
      b.y = -b.bound * 2 - i * (small ? 46 : 70);
      b.a = (Math.random() - .5) * 1.2;
      b.vx = (Math.random() - .5) * 200; b.vy = 0; b.va = (Math.random() - .5) * 6;
      b.el.classList.add("is-live");
    });
  }

  function measure() {
    var pr = playground.getBoundingClientRect();
    world.setBounds(pr.width, pr.height - FLOOR_INSET);
    var rects = [];
    hero.querySelectorAll("[data-solid]").forEach(function (el) {
      var r = el.getBoundingClientRect(), pad = 6;
      var x = r.left - pr.left - pad, y = r.top - pr.top - pad, w = r.width + pad * 2, h = r.height + pad * 2;
      // the copy becomes a full-height wall so toys can't settle on top of it and cover the nav
      // (wide layouts only: on phones the copy sits above the play area instead)
      if (pr.width >= 700 && x + w > 0 && x < pr.width && y + h > 0 && y < pr.height) rects.push({ x: x, y: -3000, w: w, h: pr.height + 3000 });
    });
    // the chest's side walls (thick enough that a hard throw can't tunnel through)
    var chest = hero.querySelector("[data-chest]");
    chestBox = null;
    if (chest) {
      var c = chest.getBoundingClientRect(), T = 34;
      chestBox = { x: c.left - pr.left, y: c.top - pr.top, w: c.width, h: c.height };
      var wallH = world.H - chestBox.y;
      rects.push({ x: chestBox.x, y: chestBox.y, w: T, h: wallH });
      rects.push({ x: chestBox.x + chestBox.w - T, y: chestBox.y, w: T, h: wallH });
    }
    world.setSolids(rects);
  }

  /* ---------- drag and throw ---------- */
  var hint = document.querySelector("[data-hint]");
  function bindDrag(b) {
    var el = b.el, moved = false, sx = 0, sy = 0;
    el.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      var pr = playground.getBoundingClientRect();
      var px = e.clientX - pr.left, py = e.clientY - pr.top;
      var dx = px - b.x, dy = py - b.y, c = Math.cos(b.a), s = Math.sin(b.a);
      world.grab = { body: b, lx: dx * c + dy * s, ly: -dx * s + dy * c, tx: px, ty: py, id: e.pointerId };
      moved = false; sx = e.clientX; sy = e.clientY;
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* already released */ }
      el.classList.add("is-grabbed");
      wake();
    });
    el.addEventListener("pointermove", function (e) {
      var g = world.grab;
      if (!g || g.body !== b || g.id !== e.pointerId) return;
      var pr = playground.getBoundingClientRect();
      g.tx = e.clientX - pr.left; g.ty = e.clientY - pr.top;
      if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) > 6) {
        moved = true;
        if (hint) hint.classList.add("is-gone");
      }
    });
    function release(e) {
      var g = world.grab;
      if (!g || g.body !== b || g.id !== e.pointerId) return;
      world.grab = null;
      el.classList.remove("is-grabbed");
    }
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    // product boxes are links: a drag is not a click
    el.addEventListener("click", function (e) { if (moved) e.preventDefault(); });
  }

  /* ---------- loop ---------- */
  var running = false, visible = true, lastT = 0, acc = 0, idleSince = 0;
  var STEP = 1 / 60;

  function tick(t) {
    if (!running) return;
    var dt = Math.min(.05, (t - lastT) / 1000 || STEP);
    lastT = t; acc += dt;
    var n = 0;
    while (acc >= STEP && n < 3) { world.step(STEP); acc -= STEP; n++; }
    if (n === 3) acc = 0;
    world.render();

    // rest when everything has settled and nobody is holding a toy
    var moving = world.grab || world.bodies.some(function (b) { return Math.abs(b.vx) + Math.abs(b.vy) > 6 || Math.abs(b.va) > .08; });
    if (moving) idleSince = t;
    if (!visible || t - idleSince > 1500) { running = false; return; }
    requestAnimationFrame(tick);
  }

  function wake() {
    if (running || !visible) return;
    running = true; lastT = performance.now(); idleSince = lastT;
    requestAnimationFrame(tick);
  }

  function settleNow() {
    for (var i = 0; i < 720; i++) world.step(STEP);
    world.render();
  }

  function start() {
    build();
    measure();
    tipOut();
    if (reduced) settleNow(); else world.render();
    wake();
  }

  var tipBtn = document.querySelector("[data-tip]");
  if (tipBtn) tipBtn.addEventListener("click", function () {
    tipOut();
    if (reduced) settleNow();
    wake();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) wake();
    }).observe(hero);
  }

  var resizeTimer = null, lastW = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var w = playground.clientWidth;
      if (Math.abs(w - lastW) > 80) { lastW = w; start(); return; } // big change: new sizes, new drop
      measure(); wake();
    }, 150);
  });

  function boot() { lastW = playground.clientWidth; start(); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot); else boot();
})();
