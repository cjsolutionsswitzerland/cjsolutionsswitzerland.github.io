/* ============================================================
   CJ Solutions V3 — shared behaviour
   Language toggle, scroll pop-in, mobile nav, melody engine.
   ============================================================ */

/* ---------------------------- Language ---------------------------- */
(function(){
  var STORAGE_KEY = "cj-lang-v3";
  var saved = localStorage.getItem(STORAGE_KEY) || "de";
  applyLang(saved);

  function applyLang(lang){
    document.documentElement.setAttribute("lang", lang);
    document.querySelectorAll(".langswitch button").forEach(function(btn){
      btn.classList.toggle("active", btn.dataset.lang === lang);
    });
    localStorage.setItem(STORAGE_KEY, lang);
  }

  document.addEventListener("click", function(e){
    var btn = e.target.closest(".langswitch button");
    if(!btn) return;
    applyLang(btn.dataset.lang);
  });
})();

/* ---------------------------- Mobile nav ---------------------------- */
(function(){
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if(!toggle || !links) return;
  toggle.addEventListener("click", function(){
    links.classList.toggle("open");
  });
  links.addEventListener("click", function(e){
    if(e.target.closest("a")) links.classList.remove("open");
  });
})();

/* ---------------------------- Scroll pop-in ---------------------------- */
(function(){
  var els = document.querySelectorAll(".pop");
  if(!("IntersectionObserver" in window)){
    els.forEach(function(el){ el.classList.add("is-in"); });
    return;
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold:.15 });
  els.forEach(function(el){ io.observe(el); });
})();

/* ---------------------------- Melody engine (Web Audio) ----------------------------
   Frequencies match the exact note tables used in badewanne_monitor.ino
   so the melodies on the site are the real tones the buzzer plays.       */
var CJ_NOTE = {
  C4:262, D4:294, E4:330, F4:349, G4:392, A4:440, AS4:466, B4:494,
  C5:523, D5:587, E5:659, F5:698, G5:784, A5:880, P:0
};

var CJ_MELODIES = {
  cucaracha: {
    name: "La Cucaracha",
    notes: [
      "G4","G4","G4","C5","C5","C5","G4","E5","E5","D5","D5","B4","G4",
      "C5","C5","C5","G4","G4","G4","E5","D5","C5","P",
      "G4","G4","G4","C5","C5","C5","G4","E5","E5","D5","D5","B4","G4",
      "C5","C5","C5","G4","G4","G4","E5","D5","C5"
    ],
    durations: [
      200,200,200,400,400,200,200,400,400,200,200,200,400,
      200,200,200,400,200,200,200,200,600,300,
      200,200,200,400,400,200,200,400,400,200,200,200,400,
      200,200,200,400,200,200,200,200,600
    ]
  },
  mario: {
    name: "Super Mario",
    notes: [
      "E5","E5","P","E5","P","C5","E5","P","G5","P","P","P","G4","P","P","P",
      "C5","P","P","G4","P","P","E4","P","P","A4","P","B4","P","AS4","A4","P",
      "G4","E5","P","G5","A5","P","F5","G5","P","E5","P","C5","D5","B4"
    ],
    durations: [
      150,150,150,150,150,150,150,150,300,150,150,150,300,150,150,150,
      300,150,150,300,150,150,300,150,150,300,150,300,150,200,300,150,
      200,200,150,200,300,150,200,300,150,300,150,150,200,300
    ]
  },
  birthday: {
    name: "Happy Birthday",
    notes: ["G4","G4","A4","G4","C5","B4","P","G4","G4","A4","G4","D5","C5"],
    durations: [200,200,400,400,400,800,300,200,200,400,400,400,800]
  }
};

var cjAudioCtx = null;
var cjActiveTimeouts = [];

function cjStopMelody(){
  cjActiveTimeouts.forEach(clearTimeout);
  cjActiveTimeouts = [];
  document.querySelectorAll(".melody-btn.playing").forEach(function(b){ b.classList.remove("playing"); });
}

function cjPlayMelody(key, btn){
  var m = CJ_MELODIES[key];
  if(!m) return;
  if(!cjAudioCtx) cjAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if(cjAudioCtx.state === "suspended") cjAudioCtx.resume();

  cjStopMelody();
  if(btn) btn.classList.add("playing");

  var t = cjAudioCtx.currentTime;
  m.notes.forEach(function(noteName, i){
    var dur = m.durations[i] / 1000;
    var freq = CJ_NOTE[noteName];
    if(freq){
      var osc = cjAudioCtx.createOscillator();
      var gain = cjAudioCtx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.92);
      osc.connect(gain).connect(cjAudioCtx.destination);
      osc.start(t);
      osc.stop(t + dur);
    }
    t += dur;
  });

  var totalMs = m.durations.reduce(function(a,b){ return a+b; }, 0);
  var endTimeout = setTimeout(function(){
    if(btn) btn.classList.remove("playing");
  }, totalMs + 50);
  cjActiveTimeouts.push(endTimeout);
}

document.addEventListener("click", function(e){
  var btn = e.target.closest("[data-melody]");
  if(!btn) return;
  cjPlayMelody(btn.dataset.melody, btn);
});

/* short alarm beep, reused by the shower demo */
function cjBeep(freq, dur, delay){
  setTimeout(function(){
    if(!cjAudioCtx) cjAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if(cjAudioCtx.state === "suspended") cjAudioCtx.resume();
    var t = cjAudioCtx.currentTime;
    var osc = cjAudioCtx.createOscillator();
    var gain = cjAudioCtx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur/1000);
    osc.connect(gain).connect(cjAudioCtx.destination);
    osc.start(t);
    osc.stop(t + dur/1000);
  }, delay || 0);
}
