/* Just Jonah, concept B: The toybox (page behaviour; the hero physics lives in physics.js) */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var ANIMALS = window.FAHLO;
  var PRICE = window.FAHLO_PRICE;
  var IMG = "../assets/products/";
  var COLOURS = ["#F2542D", "#FFC933", "#22B07D", "#FF8EBD", "#2B4BDB"];

  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Headline letters (pop in, hop on hover) ---------- */
  (function () {
    var h1 = $("[data-bounce]");
    if (!h1) return;
    var text = h1.textContent, i = 0;
    h1.setAttribute("aria-label", text);
    h1.innerHTML = text.split(" ").map(function (word) {
      return '<span aria-hidden="true" style="display:inline-block;white-space:nowrap">' +
        word.split("").map(function (ch) { return '<span class="ch" style="--i:' + (i++) + '">' + ch + "</span>"; }).join("") +
        "</span>";
    }).join(" ");
  })();

  /* ---------- Header + menu ---------- */
  var header = $(".site-header");
  var menuBtn = $("[data-menu]");
  var nav = $("#nav");
  function onScroll() { header.classList.toggle("is-solid", window.scrollY > 40); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
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
  var DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  function ukNow() {
    var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    return { day: o.weekday, mins: (+o.hour) * 60 + (+o.minute) };
  }
  function renderOpenState() {
    var now = ukNow();
    var open = now.mins >= OPEN_AT && now.mins < CLOSE_AT;
    var text = open ? "Open now until 5:30pm" : now.mins < OPEN_AT ? "Closed now, opens at 10am" : "Closed now, opens 10am tomorrow";
    $$("[data-open-pill]").forEach(function (el) { el.classList.toggle("is-closed", !open); });
    $$("[data-open-text]").forEach(function (el) { el.textContent = text; });
  }
  renderOpenState();
  setInterval(renderOpenState, 60000);

  /* =========================================================
     FAHLO CAPSULE MACHINE
     ========================================================= */
  var machine = $(".machine");
  var machineWrap = $(".machine-wrap");
  var handle = $("[data-handle]");
  var capsule = $("[data-capsule]");
  var reveal = $("[data-reveal]");
  var turnBtn = $("[data-turn]");
  var r = {
    img: $("[data-r-img]"), name: $("[data-r-name]"), model: $("[data-r-model]"),
    price: $("[data-r-price]"), add: $("[data-r-add]"), plush: $("[data-r-plush]")
  };

  // capsules inside the dome
  (function () {
    var g = $("[data-capsules]");
    var NS = "http://www.w3.org/2000/svg";
    var rows = [[272, 92, 46, 5], [236, 70, 44, 6], [198, 86, 48, 5], [160, 110, 46, 4]];
    var n = 0;
    rows.forEach(function (row) {
      for (var k = 0; k < row[3]; k++) {
        var x = row[1] + k * row[2] + (n % 2 ? 4 : -4), y = row[0] + (k % 2 ? -5 : 4);
        var cap = document.createElementNS(NS, "g");
        cap.setAttribute("transform", "translate(" + x + " " + y + ") rotate(" + ((n * 47) % 360) + ")");
        cap.innerHTML =
          '<path d="M-20 0A20 20 0 0 1 20 0Z" fill="' + COLOURS[n % COLOURS.length] + '" stroke="#1F1A3D" stroke-width="4"/>' +
          '<path d="M-20 0A20 20 0 0 0 20 0Z" fill="#fff" stroke="#1F1A3D" stroke-width="4"/>';
        // wrap so the CSS jiggle doesn't fight the SVG transform
        var outer = document.createElementNS(NS, "g");
        outer.setAttribute("class", "capsule-ball");
        outer.style.setProperty("--d", (-(n * .07)).toFixed(2) + "s");
        outer.appendChild(cap);
        g.appendChild(outer);
        n++;
      }
    });
  })();

  var lastPick = null;
  function showReveal(a) {
    lastPick = a;
    reveal.classList.remove("is-empty", "is-in");
    r.img.src = IMG + a.bracelet;
    r.img.alt = "Fahlo " + a.model + " bracelet, " + a.track.toLowerCase();
    r.name.textContent = a.track;
    r.model.textContent = "Fahlo " + a.model + " bracelet";
    r.price.textContent = PRICE;
    r.add.dataset.add = a.track;
    if (a.plushUrl) { r.plush.hidden = false; r.plush.href = a.plushUrl; } else r.plush.hidden = true;
    void reveal.offsetWidth;
    if (!reduced) reveal.classList.add("is-in");
    $$(".pick__btn").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.pick === a.id)); });
  }

  var busy = false;
  turnBtn.addEventListener("click", function () {
    if (busy) return;
    busy = true;
    turnBtn.disabled = true;
    var pool = ANIMALS.filter(function (a) { return a !== lastPick; });
    var a = pool[Math.floor(Math.random() * pool.length)];
    var colour = COLOURS[Math.floor(Math.random() * COLOURS.length)];

    if (reduced || !capsule.animate) {
      showReveal(a);
      done();
      return;
    }

    machine.classList.add("is-shaking");
    handle.animate([{ transform: "rotate(0)" }, { transform: "rotate(360deg)" }], { duration: 900, easing: "cubic-bezier(.5,0,.3,1)" }).finished
      .then(function () {
        machine.classList.remove("is-shaking");
        var wrap = machineWrap.getBoundingClientRect();
        var m = machine.getBoundingClientRect();
        var rv = reveal.getBoundingClientRect();
        var sx = m.left - wrap.left + m.width * (266 / 360);
        var sy = m.top - wrap.top + m.height * (464 / 540);
        var ex = rv.left - wrap.left + rv.width / 2;
        var ey = rv.top - wrap.top + Math.min(rv.height / 2, 140);
        capsule.style.left = sx + "px";
        capsule.style.top = sy + "px";
        capsule.style.setProperty("--cap", colour);
        $$("span", capsule).forEach(function (s) { s.getAnimations().forEach(function (an) { an.cancel(); }); });
        return capsule.animate([
          { opacity: 1, transform: "translate(0,0) scale(.4) rotate(0)" },
          { opacity: 1, transform: "translate(0,34px) scale(1) rotate(90deg)", offset: .25 },
          { opacity: 1, transform: "translate(" + (ex - sx) * .55 + "px," + ((ey - sy) * .5 - 90) + "px) scale(1.15) rotate(280deg)", offset: .62 },
          { opacity: 1, transform: "translate(" + (ex - sx) + "px," + (ey - sy) + "px) scale(1.4) rotate(360deg)" }
        ], { duration: 1050, easing: "cubic-bezier(.45,0,.35,1)", fill: "forwards" }).finished;
      })
      .then(function () {
        var top = $(".capsule__top", capsule), bottom = $(".capsule__bottom", capsule);
        top.animate([{ transform: "none", opacity: 1 }, { transform: "translate(-34px,-70px) rotate(-60deg)", opacity: 0 }], { duration: 480, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" });
        bottom.animate([{ transform: "none", opacity: 1 }, { transform: "translate(30px,56px) rotate(45deg)", opacity: 0 }], { duration: 480, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" });
        showReveal(a);
        return wait(500);
      })
      .then(function () {
        capsule.getAnimations().forEach(function (an) { an.cancel(); });
        done();
      });

    function done() {
      turnBtn.textContent = "Turn it again";
      turnBtn.disabled = false;
      busy = false;
    }
  });

  // pick one yourself
  var pick = $("[data-pick]");
  pick.innerHTML = ANIMALS.map(function (a) {
    return '<li><button class="pick__btn" type="button" aria-pressed="false" data-pick="' + a.id + '">' +
      '<img src="' + IMG + a.bracelet + '" alt="" loading="lazy">' + a.name + "</button></li>";
  }).join("");
  pick.addEventListener("click", function (e) {
    var b = e.target.closest("[data-pick]");
    if (!b) return;
    var a = ANIMALS.find(function (x) { return x.id === b.dataset.pick; });
    showReveal(a);
    var rv = reveal.getBoundingClientRect();
    if (rv.top < 70 || rv.bottom > window.innerHeight) reveal.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  });

  /* =========================================================
     VISIT: the pawn hops to today
     ========================================================= */
  var board = $("[data-board]");
  var pawn = $("[data-pawn]");
  var squares = $$(".sq", board);
  var todayIdx = Math.max(0, DAYS.indexOf(ukNow().day));
  squares[todayIdx].classList.add("is-today");
  squares[todayIdx].setAttribute("aria-current", "date");

  function pawnAt(i) {
    var sq = squares[i];
    var pw = pawn.getBoundingClientRect().width || 52;
    return { x: sq.offsetLeft + sq.offsetWidth / 2 - pw / 2, y: sq.offsetTop - pw * 1.05 };
  }
  function placePawn(i) {
    var p = pawnAt(i);
    pawn.style.transform = "translate(" + p.x + "px," + p.y + "px)";
  }
  placePawn(reduced ? todayIdx : 0);

  var hopped = false;
  function hopToToday() {
    if (hopped) return;
    hopped = true;
    if (reduced || !pawn.animate) { placePawn(todayIdx); return; }
    var chain = Promise.resolve();
    for (var i = 1; i <= todayIdx; i++) {
      (function (from, to) {
        chain = chain.then(function () {
          var a = pawnAt(from), b = pawnAt(to);
          var anim = pawn.animate([
            { transform: "translate(" + a.x + "px," + a.y + "px)" },
            { transform: "translate(" + (a.x + b.x) / 2 + "px," + (Math.min(a.y, b.y) - 56) + "px) rotate(-8deg)", offset: .5 },
            { transform: "translate(" + b.x + "px," + b.y + "px)" }
          ], { duration: 340, easing: "ease-in-out" });
          return anim.finished.then(function () { placePawn(to); });
        });
      })(i - 1, i);
    }
    chain.then(function () {
      pawn.animate([{ transform: pawn.style.transform + " scale(1,1)" }, { transform: pawn.style.transform + " scale(1.15,.85)" }, { transform: pawn.style.transform + " scale(1,1)" }], { duration: 260 });
    });
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { setTimeout(hopToToday, 250); io.disconnect(); }
    }, { threshold: .6 });
    io.observe(board);
  } else hopToToday();
  window.addEventListener("resize", function () { placePawn(hopped || reduced ? todayIdx : 0); });

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
    if (!btn || !btn.dataset.add) return;
    count++;
    var label = btn.dataset.add;
    toast("Added " + label.charAt(0).toLowerCase() + label.slice(1) + " to your basket");
    var img = r.img;
    if (reduced || !img.animate) { bumpBasket(); return; }
    var ir = img.getBoundingClientRect(), b = basket.getBoundingClientRect();
    var size = Math.min(ir.width, 150);
    var sx = ir.left + ir.width / 2 - size / 2, sy = ir.top + ir.height / 2 - size / 2;
    var clone = img.cloneNode();
    clone.className = "fly";
    clone.style.cssText = "left:" + sx + "px;top:" + sy + "px;width:" + size + "px;height:" + size + "px";
    document.body.appendChild(clone);
    var dx = b.left + b.width / 2 - (sx + size / 2), dy = b.top + b.height / 2 - (sy + size / 2);
    clone.animate([
      { transform: "translate(0,0) scale(1) rotate(0)" },
      { transform: "translate(" + dx * .5 + "px," + (dy * .3 - 90) + "px) scale(.6) rotate(-20deg)", offset: .55 },
      { transform: "translate(" + dx + "px," + dy + "px) scale(.1) rotate(-40deg)", opacity: .5 }
    ], { duration: 820, easing: "cubic-bezier(.45,0,.55,1)" }).finished.then(function () {
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
    msg.textContent = "You're signed up. Look out for our next email.";
    form.reset();
  });
})();
