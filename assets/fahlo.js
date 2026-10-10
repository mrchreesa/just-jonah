/* Fahlo range stocked by Just Jonah, taken from just-jonah.co.uk.
   lon/lat are rough habitat locations for the illustrative globe (concept B), not real tracking data.
   habitat drives the filter chips in concept B. */
(function () {
  var SHOP = "https://www.just-jonah.co.uk/product/";
  var A = [
    ["whale",        "Whale",         "Wayfare",    "ocean",    -28, 38,  "fahlo-wayfare-bracelet-track-a-whale/8273", "fahlo-wayfare-plush-track-a-whale/EZNRLNCJIYB5CV5MAEYBH2HO"],
    ["koala",        "Koala",         "Lounge",     "forest",   152, -28, "fahlo-lounge-bracelet-track-a-koala/8434", "fahlo-lounge-plush-track-a-koala-bear/WBBYWSNDCKUYEA2OK5E3HHBM"],
    ["golden-monkey","Golden monkey", "Swing",      "forest",   26.5, 2.5, "fahlo-the-swing-bracelet-track-a-golden-monkey/RFQTIM2MC3NHKUQRPI7WBNN2", null],
    ["bison",        "Bison",         "Roam",       "grassland",-104, 45, "fahlo-the-roam-bracelet-track-a-bison/PDMJIX7U4KM4ONIDXF2XFGTX", null],
    ["tiger",        "Tiger",         "Prowl",      "forest",   80, 22,   "fahlo-the-prowl-bracelet-track-a-tiger/ADNPA7OWN6HXXKMOTTYSXSQP", null],
    ["rhino",        "Rhino",         "Charge",     "grassland",31.5, -24.5, "fahlo-the-charge-bracelet-track-a-rhino/5VMPH7LW6CJBLNS56QDUBGCP", null],
    ["red-panda",    "Red panda",     "Dash",       "mountain", 90, 27.5, "fahlo-the-dash-bracelet-track-a-red-panda/G32ZLZ7KUY73DXIVT3BZKJU2", null],
    ["cheetah",      "Cheetah",       "Sprint",     "grassland",17, -21,  "fahlo-the-sprint-bracelet-track-a-cheetah/FB3Q3HJZEOZKN3JQ5OV24I4A", null],
    ["lion",         "Lion",          "Excursion",  "grassland",35, -2.5, "lion-excursion-bracelet/6083", "fahlo-excursion-plush-track-a-lion/7957"],
    ["snow-leopard", "Snow leopard",  "Ascent",     "mountain", 74, 38,   "fahlo-ascent-bracelet-track-a-snow-leopard/8123", "fahlo-ascent-plush-track-a-snow-leopard/8198"],
    ["wolf",         "Wolf",          "Scout",      "forest",   -116, 53, "fahlo-scout-bracelet-track-a-wolf/7827", "fahlo-scout-plush-track-a-wolf/8199"],
    ["whale-shark",  "Whale shark",   "Quest",      "ocean",    62, -8,   "fahlo-quest-bracelet/7619", "fahlo-quest-plush-track-a-whale-shark/8435"],
    ["manatee",      "Manatee",       "Drift",      "ocean",    -81.5, 26.5, "fahlo-drift-bracelet-track-a-manatee/7420", "fahlo-drift-plush-track-a-manatee/8102"],
    ["seal",         "Seal",          "Glide",      "ice",      -150, 58, "fahlo-glide-bracelet-track-a-seal/7414", "fahlo-glide-plush-track-a-seal/8103"],
    ["sloth",        "Sloth",         "Wander",     "forest",   -84, 9.5, "wander-bracelets/6925", "fahlo-wander-plush-track-a-sloth/7959"],
    ["sea-turtle",   "Sea turtle",    "Journey",    "ocean",    -48, 16,  "turtle-journey-bracelet/6087", "fahlo-journey-plush-track-a-sea-turtle/7955"],
    ["gorilla",      "Gorilla",       "Traverse",   "forest",   29.5, -1.5, "traverse-gorilla-bracelet/6766", "fahlo-traverse-plush-track-a-gorilla/7958"],
    ["giraffe",      "Giraffe",       "Trek",       "grassland",38, 4,    "giraffe-trek-bracelet/6086", "fahlo-trek-plush-track-a-giraffe/7960"],
    ["elephant",     "Elephant",      "Expedition", "grassland",24, -18,  "elephant-expedition-bracelet/6088", "fahlo-expedition-plush-track-an-elephant/7956"],
    ["dolphin",      "Dolphin",       "Odyssey",    "ocean",    -70, 34,  "dolphin-odyssey-bracelet/6357", "fahlo-odyssey-plush-track-a-dolphin/7962"],
    ["penguin",      "Penguin",       "Passage",    "ice",      -64, -44, "penguin-passage-bracelet/6085", "fahlo-passage-plush-track-a-penguin/7964"],
    ["shark",        "Shark",         "Voyage",     "ocean",    -126, 31, "shark-voyage-bracelet/6084", "fahlo-voyage-plush-track-a-shark/7963"],
    ["polar-bear",   "Polar bear",    "Venture",    "ice",      -92, 63,  "polar-bear-venture-bracelet/6089", "fahlo-venture-plush-track-a-polar-bear/7961"]
  ];

  window.FAHLO_PRICE = "£13.95";
  window.FAHLO = A.map(function (r) {
    var article = /^[aeiou]/i.test(r[1]) ? "an" : "a";
    return {
      id: r[0],
      name: r[1],
      track: "Track " + article + " " + r[1].toLowerCase(),
      model: r[2],
      habitat: r[3],
      lon: r[4],
      lat: r[5],
      braceletUrl: SHOP + r[6],
      plushUrl: r[7] ? SHOP + r[7] : null,
      bracelet: "br-" + r[0] + ".jpg",
      plush: r[7] ? "pl-" + r[0] + ".jpg" : null
    };
  });
})();
