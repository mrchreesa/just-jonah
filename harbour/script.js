/* Just Jonah, concept A: The shop on Fore Street */
(function () {
  "use strict";

  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b === undefined ? 1 : b, Math.max(a || 0, v)); };
  var easeInOut = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Live open / closed (shop time is UK time) ---------- */
  var OPEN_AT = 10 * 60, CLOSE_AT = 17 * 60 + 30;
  var DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  function ukNow() {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London", weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date());
    var get = function (t) { var p = parts.find(function (x) { return x.type === t; }); return p ? p.value : ""; };
    return { day: get("weekday"), mins: parseInt(get("hour"), 10) * 60 + parseInt(get("minute"), 10) };
  }

  function renderOpenState() {
    var now = ukNow();
    var open = now.mins >= OPEN_AT && now.mins < CLOSE_AT;
    var pill, detail;
    if (open) {
      pill = "Open now until 5:30pm";
      detail = "Open now. We close at 5:30pm today.";
    } else if (now.mins < OPEN_AT) {
      pill = "Closed now, opens at 10am";
      detail = "Closed right now. We open at 10am today.";
    } else {
      pill = "Closed now, opens 10am tomorrow";
      detail = "Closed for the evening. We open at 10am tomorrow.";
    }
    $$("[data-open-pill], [data-open-sign]").forEach(function (el) { el.classList.toggle("is-closed", !open); });
    $$("[data-open-text]").forEach(function (el) { el.textContent = pill; });
    $$("[data-sign-text]").forEach(function (el) { el.textContent = open ? "Open" : "Closed"; });
    var d = $("[data-open-detail]"); if (d) d.textContent = detail;

    var tbody = $("[data-hours]");
    if (tbody) {
      tbody.innerHTML = DAYS.map(function (day) {
        var today = day === now.day;
        return '<tr' + (today ? ' class="is-today"' : '') + '><td>' + day + (today ? " (today)" : "") +
          '</td><td>10am &ndash; 5:30pm</td></tr>';
      }).join("");
    }
  }
  renderOpenState();
  setInterval(renderOpenState, 60 * 1000);

  /* ---------- Bunting ---------- */
  (function bunting() {
    var g = $("[data-bunting]");
    if (!g) return;
    var NS = "http://www.w3.org/2000/svg";
    var colours = ["#D93A2B", "#F2C94C", "#FFF8EC", "#12505A", "#F4C3B8"];
    var p0 = [90, 486], p1 = [500, 556], p2 = [910, 486];
    var n = 17;
    for (var i = 0; i < n; i++) {
      var t = (i + .5) / n, u = 1 - t;
      var x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0];
      var y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
      var flag = document.createElementNS(NS, "path");
      flag.setAttribute("d", "M" + (x - 15) + " " + y + " L" + (x + 15) + " " + y + " L" + x + " " + (y + 32) + "Z");
      flag.setAttribute("fill", colours[i % colours.length]);
      flag.setAttribute("class", "flag");
      flag.style.setProperty("--d", (-(i * 0.37) % 3.2).toFixed(2) + "s");
      g.appendChild(flag);
    }
  })();

  /* ---------- Header + mobile menu ---------- */
  var header = $(".site-header");
  var menuBtn = $("[data-menu]");
  var nav = $("#nav");
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

  /* ---------- Hero: scroll pushes the camera through the shop door ---------- */
  var hero = $("[data-hero]");
  var world = $("[data-world]");
  var stage = $("[data-stage]");
  var door = $("[data-door]");
  var light = $("[data-door-light]");
  var glow = $("[data-glow]");
  var copy = $("[data-hero-copy]");
  var hill = $("[data-hill]");
  var cue = $("[data-scroll-cue]");
  var geo = null;

  function measure() {
    world.style.transform = "none";
    var wr = world.getBoundingClientRect();
    var sr = stage.getBoundingClientRect();
    var doorX = sr.left - wr.left + sr.width * .5;
    var doorY = sr.top - wr.top + sr.height * .861;
    var doorH = sr.height * .278;
    var vw = wr.width, vh = wr.height;
    geo = {
      dx: vw / 2 - doorX,
      dy: vh * .5 - doorY,
      S: Math.max(5, (vh * 2.2) / doorH)
    };
    world.style.transformOrigin = doorX + "px " + doorY + "px";
  }

  function heroFrame() {
    var rect = hero.getBoundingClientRect();
    var total = hero.offsetHeight - window.innerHeight;
    var p = clamp(-rect.top / total);

    header.classList.toggle("is-solid", window.scrollY > 24);
    if (reduced || !geo) return;

    var tCopy = clamp(p / .16);
    copy.style.opacity = String(1 - tCopy);
    copy.style.transform = "translate(" + (-tCopy * 60) + "px," + (-tCopy * 24) + "px)";
    copy.style.visibility = tCopy >= 1 ? "hidden" : "visible";
    cue.style.opacity = String(1 - clamp(p / .05));

    // pan sideways first so the shop is centred, then lift and push in together
    var pan = easeInOut(clamp((p - .02) / .34));
    var zoom = easeInOut(clamp((p - .08) / .72));
    var s = Math.pow(geo.S, zoom);
    world.style.transform = "translate(" + (geo.dx * pan).toFixed(2) + "px," + (geo.dy * zoom).toFixed(2) + "px) scale(" + s.toFixed(4) + ")";

    var d = easeOut(clamp((p - .2) / .36));
    door.style.transform = "rotateY(" + (-84 * d).toFixed(2) + "deg)";
    light.style.opacity = String(clamp((p - .2) / .3) * .95);

    hill.style.transform = "translateY(" + (zoom * 6) + "vh) scale(" + (1 + zoom * .35) + ")";
    hill.style.opacity = String(1 - zoom * .5);

    glow.style.opacity = String(clamp((p - .74) / .2));
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; heroFrame(); });
  }

  function setupHero() {
    if (!reduced) measure();
    heroFrame();
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () { setupHero(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setupHero);
  setupHero();

  /* ---------- Fahlo rail ---------- */
  var rail = $("[data-rail]");
  var range = "bracelet";

  function cardHTML(a) {
    var isPlush = range === "plush";
    var img = "../assets/products/" + (isPlush ? a.plush : a.bracelet);
    var model = a.model + (isPlush ? " plush" : " bracelet");
    var action = isPlush
      ? '<a class="add add--soft" href="' + a.plushUrl + '">View plush</a>'
      : '<button class="add" type="button" data-add="' + a.track + '">Add to basket</button>';
    return '<article class="card">' +
      '<img class="card__img" src="' + img + '" alt="Fahlo ' + model + ', ' + a.track.toLowerCase() + '" loading="lazy" draggable="false">' +
      '<div class="card__body">' +
        '<h3 class="card__name">' + a.track + '</h3>' +
        '<p class="card__model">' + model + '</p>' +
        '<div class="card__row">' +
          (isPlush ? '<span class="card__model">In the shop</span>' : '<span class="card__price">' + window.FAHLO_PRICE + '</span>') +
          action +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function renderRail() {
    var list = window.FAHLO.filter(function (a) { return range === "bracelet" || a.plush; });
    rail.innerHTML = list.map(cardHTML).join("");
  }
  renderRail();

  $$("[data-range]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (btn.dataset.range === range) return;
      range = btn.dataset.range;
      $$("[data-range]").forEach(function (b) { b.setAttribute("aria-checked", String(b === btn)); });
      $(".toggle").classList.toggle("is-plush", range === "plush");

      if (reduced || !rail.animate) { renderRail(); return; }
      var cards = $$(".card", rail).slice(0, 8);
      Promise.all(cards.map(function (c, i) {
        return c.animate([{ transform: "rotateY(0)" }, { transform: "rotateY(90deg)" }],
          { duration: 180, delay: i * 35, easing: "ease-in", fill: "forwards" }).finished;
      })).then(function () {
        renderRail();
        rail.scrollLeft = 0;
        $$(".card", rail).slice(0, 8).forEach(function (c, i) {
          c.animate([{ transform: "rotateY(-90deg)" }, { transform: "rotateY(0)" }],
            { duration: 320, delay: i * 35, easing: "cubic-bezier(.3,1.4,.5,1)", fill: "backwards" });
        });
      });
    });
  });

  function railStep(dir) {
    var card = $(".card", rail);
    var step = card ? (card.getBoundingClientRect().width + 18) * 2 : 300;
    rail.scrollBy({ left: dir * step, behavior: reduced ? "auto" : "smooth" });
  }
  $("[data-rail-prev]").addEventListener("click", function () { railStep(-1); });
  $("[data-rail-next]").addEventListener("click", function () { railStep(1); });

  // drag to scroll with a mouse (touch already scrolls natively)
  (function dragRail() {
    var down = false, moved = false, startX = 0, startScroll = 0;
    rail.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true; moved = false; startX = e.clientX; startScroll = rail.scrollLeft;
    });
    window.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 5) { moved = true; rail.classList.add("is-dragging"); }
      if (moved) rail.scrollLeft = startScroll - dx;
    });
    window.addEventListener("pointerup", function () {
      if (!down) return;
      down = false;
      rail.classList.remove("is-dragging");
    });
    rail.addEventListener("click", function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
    }, true);
  })();

  /* ---------- Basket ---------- */
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
    basket.classList.remove("is-bumping");
    void basket.offsetWidth;
    basket.classList.add("is-bumping");
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-add]");
    if (!btn) return;
    count++;
    var label = btn.dataset.add;
    var img = btn.closest(".card") && $(".card__img", btn.closest(".card"));
    toast("Added " + label.charAt(0).toLowerCase() + label.slice(1) + " to your basket");

    if (reduced || !img || !img.animate) { bumpBasket(); return; }
    var r = img.getBoundingClientRect(), b = basket.getBoundingClientRect();
    var clone = img.cloneNode();
    clone.className = "fly";
    clone.removeAttribute("loading");
    clone.style.cssText = "left:" + r.left + "px;top:" + r.top + "px;width:" + r.width + "px;height:" + r.height + "px";
    document.body.appendChild(clone);
    var dx = b.left + b.width / 2 - (r.left + r.width / 2);
    var dy = b.top + b.height / 2 - (r.top + r.height / 2);
    clone.animate([
      { transform: "translate(0,0) scale(1) rotate(0)" },
      { transform: "translate(" + dx * .55 + "px," + (dy * .35 - 90) + "px) scale(.55) rotate(-12deg)", offset: .55 },
      { transform: "translate(" + dx + "px," + dy + "px) scale(.08) rotate(-24deg)", opacity: .5 }
    ], { duration: 820, easing: "cubic-bezier(.45,0,.55,1)" }).finished.then(function () {
      clone.remove();
      bumpBasket();
    });
  });

  /* ---------- Newsletter (front end only for now) ---------- */
  var form = $("[data-signup]");
  var msg = $("[data-signup-msg]");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var input = form.elements.email;
    var ok = input.value.trim() !== "" && input.checkValidity();
    msg.classList.toggle("is-error", !ok);
    msg.classList.toggle("is-ok", ok);
    if (!ok) {
      msg.textContent = "Enter an email address like name@example.com.";
      input.focus();
      return;
    }
    msg.textContent = "You're signed up. Look out for our next email.";
    form.reset();
  });
})();
