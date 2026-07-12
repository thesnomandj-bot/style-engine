#!/usr/bin/env python3
"""
build_dashboard.py — assemble dashboard/index.html as a TRUE single, offline file.

Inlines ALL Style Engine module files (hand-drawn, glitch, text-motion,
media-decay, macro) plus vendored libraries (rough.js, rough-notation) into a
unified dashboard shell. Every slider calls the REAL StyleEngine APIs.

Run:  python scripts/build_dashboard.py
Out:  dashboard/index.html
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MOD = ROOT / "modules"
VENDOR = ROOT / "demo" / "vendor"
DASH = ROOT / "dashboard"
OUT = DASH / "index.html"


def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")


# ---- Read ALL module files ----
hd_css = read(MOD / "hand-drawn.css")
hd_svg = read(MOD / "hand-drawn.svg.html")
hd_js = read(MOD / "hand-drawn.js")

gl_css = read(MOD / "glitch.css")
gl_svg = read(MOD / "glitch.svg.html")
gl_js = read(MOD / "glitch.js")

tm_css = read(MOD / "text-motion.css")
tm_js = read(MOD / "text-motion.js")

md_css = read(MOD / "media-decay.css")
md_svg = read(MOD / "media-decay.svg.html")
md_js = read(MOD / "media-decay.js")

macro_js = read(MOD / "macro.js")

# ---- Read vendor libraries ----
rough_js = read(VENDOR / "rough.min.js")
roughnote_js = read(VENDOR / "rough-notation.iife.js")

# ---- Read vendored font files and base64-encode for inline @font-face ---- #
import base64

FONTS = VENDOR / "fonts"

def font_b64(name: str) -> str:
    return base64.b64encode((FONTS / name).read_bytes()).decode("ascii")

caveat_latin_b64 = font_b64("caveat-latin.woff2")
caveat_latin_ext_b64 = font_b64("caveat-latin-ext.woff2")
inter_latin_b64 = font_b64("inter-latin.woff2")
inter_latin_ext_b64 = font_b64("inter-latin-ext.woff2")
shantell_latin_b64 = font_b64("shantell-sans-latin.woff2")
shantell_latin_ext_b64 = font_b64("shantell-sans-latin-ext.woff2")

FONT_FACE_CSS = f"""
@font-face {{
  font-family: 'Caveat';
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url(data:font/woff2;base64,{caveat_latin_ext_b64}) format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}}
@font-face {{
  font-family: 'Caveat';
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url(data:font/woff2;base64,{caveat_latin_b64}) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}}
@font-face {{
  font-family: 'Inter';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url(data:font/woff2;base64,{inter_latin_ext_b64}) format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}}
@font-face {{
  font-family: 'Inter';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url(data:font/woff2;base64,{inter_latin_b64}) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}}
@font-face {{
  font-family: 'Shantell Sans';
  font-style: normal;
  font-weight: 300 800;
  font-display: swap;
  src: url(data:font/woff2;base64,{shantell_latin_ext_b64}) format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}}
@font-face {{
  font-family: 'Shantell Sans';
  font-style: normal;
  font-weight: 300 800;
  font-display: swap;
  src: url(data:font/woff2;base64,{shantell_latin_b64}) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}}
"""


# ---- Module data for generating dial panels ----
# Defaults match the :root values in each module's CSS.
MODULES = [
    {
        "id": "hand-drawn",
        "name": "HAND-DRAWN",
        "color": "#b83c28",
        "dials": [
            ("Wobble", "--hd-wobble", 55),
            ("Grain", "--hd-grain", 60),
            ("Rotation", "--hd-rotation", 45),
            ("Boil Speed", "--hd-boil-speed", 50),
            ("Sketchiness", "--hd-sketchiness", 50),
            ("Line Weight", "--hd-line-weight", 50),
            ("Overshoot", "--hd-overshoot", 45),
        ],
    },
    {
        "id": "glitch",
        "name": "GLITCH",
        "color": "#00d4ff",
        "dials": [
            ("RGB Split", "--gl-rgb-split", 0),
            ("Jitter", "--gl-jitter", 0),
            ("Dropout", "--gl-dropout", 0),
            ("Block Shift", "--gl-block-shift", 0),
            ("Scanlines", "--gl-scanlines", 0),
            ("Static", "--gl-static", 0),
            ("Rate", "--gl-rate", 0),
        ],
    },
    {
        "id": "text-motion",
        "name": "TEXT-MOTION",
        "color": "#4ade80",
        "dials": [
            ("Speed", "--tm-speed", 50),
            ("Stagger", "--tm-stagger", 45),
            ("Randomness", "--tm-randomness", 0),
            ("Scramble Pool", "--tm-scramble-pool", 30),
            ("Overshoot", "--tm-overshoot", 40),
        ],
    },
    {
        "id": "media-decay",
        "name": "MEDIA-DECAY",
        "color": "#f59e0b",
        "dials": [
            ("Grain", "--md-grain", 0),
            ("Dust", "--md-dust", 0),
            ("Warble", "--md-warble", 0),
            ("Ghosting", "--md-ghosting", 0),
            ("Tint", "--md-tint", 0),
            ("Vignette", "--md-vignette", 0),
            ("Flutter", "--md-flutter", 0),
        ],
    },
]


def gen_module_panel(mod):
    dials_html = ""
    for label, cssvar, default in mod["dials"]:
        dials_html += (
            f'\n        <div class="mod-dial">'
            f'<label><span class="dial-name">{label}</span>'
            f'<output data-readout="{cssvar}">{default}</output></label>'
            f'<input type="range" min="0" max="100" value="{default}" '
            f'data-dial="{cssvar}" data-module="{mod["id"]}"></div>'
        )
    return (
        f'\n    <div class="mod-panel" data-module="{mod["id"]}" '
        f'style="--mod-color:{mod["color"]}">'
        f'\n      <div class="mod-header">'
        f'<span class="mod-accent"></span>'
        f'<span class="mod-name">{mod["name"]}</span>'
        f'<label class="mod-bypass" title="Bypass: zero all dials">'
        f'<input type="checkbox" data-bypass="{mod["id"]}"> BYP</label>'
        f'</div>'
        f'\n      <div class="mod-dials">{dials_html}'
        f'\n      </div>'
        f'\n    </div>'
    )


def gen_macro_slot(idx):
    return (
        f'\n    <div class="macro-slot" data-slot="{idx}">'
        f'\n      <div class="macro-header">'
        f'<input type="text" class="macro-name" placeholder="Macro {idx + 1}" '
        f'data-macro-name="{idx}">'
        f'<div class="macro-slider-row">'
        f'<input type="range" min="0" max="100" value="0" '
        f'class="macro-value" data-macro-slider="{idx}">'
        f'<output class="macro-readout" data-macro-readout="{idx}">0</output>'
        f'</div>'
        f'<button class="macro-add-btn" data-macro-add="{idx}">+ Map</button>'
        f'</div>'
        f'\n      <div class="macro-mappings" data-macro-mappings="{idx}"></div>'
        f'\n    </div>'
    )


module_panels = "".join(gen_module_panel(m) for m in MODULES)
macro_slots = "".join(gen_macro_slot(i) for i in range(8))


# ---- Dashboard CSS (dark rack aesthetic, system fonts only) ----
DASH_CSS = r"""
/* ===== dashboard chrome — dark hardware rack aesthetic ===== */
*{box-sizing:border-box;margin:0;padding:0}
body{
  background:#1a1a1a;color:#e0e0e0;
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  line-height:1.5;
}

/* ---- Header ---- */
.dash-header{
  background:#111;border-bottom:2px solid #333;
  padding:0.85rem 1.5rem;display:flex;align-items:baseline;gap:1rem;
}
.dash-title{
  font-size:1.35rem;font-weight:800;letter-spacing:0.15em;color:#fff;
}
.dash-subtitle{font-size:0.82rem;opacity:0.45;letter-spacing:0.05em;}

/* ---- Preview Stage ---- */
.dash-preview{padding:1.5rem 1.5rem 0.5rem;}
.preview-stage{
  max-width:720px;margin:0 auto;
  background:var(--hd-paper,#faf6ef);color:var(--hd-ink,#1a1a17);
  border-radius:8px;padding:2rem;
  border:1px solid #444;
  box-shadow:0 4px 24px rgba(0,0,0,0.4);
}
.preview-stage h1{font-size:clamp(1.6rem,5vw,2.8rem);margin:0 0 0.3em;line-height:1.1;}
.preview-stage p{max-width:56ch;opacity:0.8;margin-bottom:1rem;}
.preview-image{
  position:relative;isolation:isolate;
  margin:1rem 0;border-radius:6px;overflow:hidden;
}
.preview-image svg{display:block;}
.preview-card{margin:1rem 0;}
.preview-btn{
  font:inherit;font-size:0.85rem;
  background:transparent;border:1px solid var(--hd-ink,#1a1a17);
  padding:0.35rem 0.8rem;cursor:pointer;margin-top:0.5rem;
}

/* ---- Sections ---- */
.dash-section{padding:0.75rem 1.5rem 1.25rem;}
.dash-section-title{
  font-size:0.82rem;font-weight:700;letter-spacing:0.12em;
  text-transform:uppercase;color:#777;
  margin-bottom:0.65rem;border-bottom:1px solid #333;padding-bottom:0.35rem;
}

/* ---- Module Chain (horizontal scroll) ---- */
.module-chain{
  display:flex;gap:0.85rem;overflow-x:auto;padding-bottom:0.6rem;
  -webkit-overflow-scrolling:touch;
}
.module-chain::-webkit-scrollbar{height:5px;}
.module-chain::-webkit-scrollbar-track{background:#111;border-radius:3px;}
.module-chain::-webkit-scrollbar-thumb{background:#444;border-radius:3px;}

/* ---- Module Panel (rack unit) ---- */
.mod-panel{
  min-width:215px;max-width:260px;flex-shrink:0;
  background:#222;border:1px solid #3a3a3a;border-radius:6px;
  border-top:3px solid var(--mod-color,#888);
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.06),0 2px 8px rgba(0,0,0,0.3);
}
.mod-header{
  display:flex;align-items:center;gap:0.45rem;
  padding:0.5rem 0.7rem;border-bottom:1px solid #333;
}
.mod-accent{
  width:8px;height:8px;border-radius:50%;
  background:var(--mod-color);box-shadow:0 0 6px var(--mod-color);
}
.mod-name{font-size:0.75rem;font-weight:700;letter-spacing:0.1em;flex:1;}
.mod-bypass{
  font-size:0.65rem;font-weight:600;opacity:0.6;
  cursor:pointer;display:flex;align-items:center;gap:0.25rem;
  user-select:none;
}
.mod-bypass input{cursor:pointer;width:13px;height:13px;}
.mod-dials{padding:0.35rem 0.7rem 0.6rem;}
.mod-dial{margin:0.3rem 0;}
.mod-dial label{
  display:flex;justify-content:space-between;
  font-size:0.72rem;font-weight:600;opacity:0.75;
}
.mod-dial output{
  font-variant-numeric:tabular-nums;color:var(--mod-color);
  min-width:2em;text-align:right;
}
.mod-dial input[type=range]{
  width:100%;margin-top:0.1rem;accent-color:var(--mod-color);
  height:5px;cursor:pointer;
}

/* ---- Macro Rack ---- */
.macro-rack{
  display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));
  gap:0.65rem;
}
.macro-slot{
  background:#222;border:1px solid #3a3a3a;
  border-left:3px solid #a855f7;border-radius:6px;
  padding:0.5rem 0.65rem;
}
.macro-header{display:flex;flex-wrap:wrap;gap:0.35rem;align-items:center;}
.macro-name{
  background:transparent;border:1px solid #555;color:#e0e0e0;
  font-size:0.75rem;padding:0.15rem 0.35rem;border-radius:3px;
  width:90px;font-family:inherit;
}
.macro-name:focus{border-color:#a855f7;outline:none;}
.macro-slider-row{
  display:flex;align-items:center;gap:0.35rem;flex:1;min-width:80px;
}
.macro-value{flex:1;accent-color:#a855f7;height:5px;cursor:pointer;}
.macro-readout{
  font-size:0.75rem;font-variant-numeric:tabular-nums;color:#a855f7;
  min-width:1.8em;text-align:right;
}
.macro-add-btn{
  font:inherit;font-size:0.65rem;
  background:#333;color:#a855f7;border:1px solid #a855f7;
  padding:0.1rem 0.45rem;border-radius:3px;cursor:pointer;
}
.macro-add-btn:hover{background:#a855f7;color:#111;}
.macro-mappings{margin-top:0.3rem;}
.mapping-row{
  display:flex;flex-wrap:wrap;gap:0.25rem;padding:0.25rem 0;
  border-top:1px solid #2a2a2a;align-items:center;font-size:0.68rem;
}
.mapping-row select,
.mapping-row input[type=number]{
  background:#1a1a1a;color:#e0e0e0;border:1px solid #555;
  font-size:0.68rem;padding:0.12rem 0.2rem;border-radius:2px;
  font-family:inherit;
}
.mapping-row select{max-width:105px;}
.mapping-row input[type=number]{width:40px;}
.mapping-row label{display:flex;align-items:center;gap:0.15rem;opacity:0.6;}
.map-remove{
  background:transparent;color:#f55;border:1px solid #f55;
  font-size:0.6rem;padding:0.08rem 0.25rem;cursor:pointer;
  border-radius:2px;margin-left:auto;
}
.map-remove:hover{background:#f55;color:#111;}

/* ---- Preset Panel ---- */
.preset-bar{display:flex;flex-wrap:wrap;gap:0.45rem;margin-bottom:0.65rem;}
.preset-btn{
  font:inherit;font-size:0.8rem;font-weight:700;letter-spacing:0.08em;
  background:#2a2a2a;color:#e0e0e0;border:1px solid #555;
  padding:0.35rem 0.9rem;border-radius:4px;cursor:pointer;
  transition:background 0.12s,border-color 0.12s;
}
.preset-btn:hover{background:#3a3a3a;border-color:#888;}
.preset-btn:active{background:#444;}
.preset-io{display:flex;gap:0.45rem;flex-wrap:wrap;}
.io-btn{
  font:inherit;font-size:0.75rem;
  background:#333;color:#aaa;border:1px solid #555;
  padding:0.3rem 0.65rem;border-radius:4px;cursor:pointer;
}
.io-btn:hover{background:#444;color:#ddd;}
.io-label{display:inline-flex;align-items:center;cursor:pointer;}

/* ---- Export Panel ---- */
.export-panel summary{
  cursor:pointer;list-style:none;
  font-size:0.82rem;font-weight:700;letter-spacing:0.12em;
  text-transform:uppercase;color:#777;
  border-bottom:1px solid #333;padding-bottom:0.35rem;
}
.export-panel summary::-webkit-details-marker{display:none;}
.export-panel summary::marker{content:"";}
.export-panel summary::before{content:"\25B6  ";font-size:0.65em;}
.export-panel[open] summary::before{content:"\25BC  ";}
.export-buttons{display:flex;gap:0.45rem;margin:0.5rem 0;}
.export-output{
  background:#111;color:#4ade80;border:1px solid #333;
  padding:0.65rem;font-size:0.72rem;font-family:ui-monospace,monospace;
  max-height:200px;overflow:auto;border-radius:4px;
  white-space:pre-wrap;word-break:break-all;
  display:none;
}
.export-output.visible{display:block;}

/* ---- Toast ---- */
.dash-toast{
  position:fixed;bottom:1.5rem;right:1.5rem;
  background:#333;color:#4ade80;
  padding:0.5rem 0.9rem;border-radius:6px;font-size:0.82rem;
  z-index:10000;opacity:0;transform:translateY(10px);
  transition:opacity 0.2s,transform 0.2s;pointer-events:none;
  border:1px solid #555;
}
.dash-toast.show{opacity:1;transform:translateY(0);}

/* ---- Responsive ---- */
@media(max-width:640px){
  .dash-header{flex-direction:column;gap:0.2rem;}
  .mod-panel{min-width:190px;}
  .macro-rack{grid-template-columns:1fr;}
  .preview-stage{padding:1.2rem;}
}
"""


# ---- Dashboard JS (uses REAL StyleEngine + StyleEngine.macro APIs) ----
DASH_JS = r"""
(function(){
  'use strict';

  /* ==== Module data (mirrors the Python MODULES) ==== */
  var MODULES=[
    {id:'hand-drawn',name:'HAND-DRAWN',color:'#b83c28',dials:[
      {label:'Wobble',cssVar:'--hd-wobble',def:55},
      {label:'Grain',cssVar:'--hd-grain',def:60},
      {label:'Rotation',cssVar:'--hd-rotation',def:45},
      {label:'Boil Speed',cssVar:'--hd-boil-speed',def:50},
      {label:'Sketchiness',cssVar:'--hd-sketchiness',def:50},
      {label:'Line Weight',cssVar:'--hd-line-weight',def:50},
      {label:'Overshoot',cssVar:'--hd-overshoot',def:45}
    ]},
    {id:'glitch',name:'GLITCH',color:'#00d4ff',dials:[
      {label:'RGB Split',cssVar:'--gl-rgb-split',def:0},
      {label:'Jitter',cssVar:'--gl-jitter',def:0},
      {label:'Dropout',cssVar:'--gl-dropout',def:0},
      {label:'Block Shift',cssVar:'--gl-block-shift',def:0},
      {label:'Scanlines',cssVar:'--gl-scanlines',def:0},
      {label:'Static',cssVar:'--gl-static',def:0},
      {label:'Rate',cssVar:'--gl-rate',def:0}
    ]},
    {id:'text-motion',name:'TEXT-MOTION',color:'#4ade80',dials:[
      {label:'Speed',cssVar:'--tm-speed',def:50},
      {label:'Stagger',cssVar:'--tm-stagger',def:45},
      {label:'Randomness',cssVar:'--tm-randomness',def:0},
      {label:'Scramble Pool',cssVar:'--tm-scramble-pool',def:30},
      {label:'Overshoot',cssVar:'--tm-overshoot',def:40}
    ]},
    {id:'media-decay',name:'MEDIA-DECAY',color:'#f59e0b',dials:[
      {label:'Grain',cssVar:'--md-grain',def:0},
      {label:'Dust',cssVar:'--md-dust',def:0},
      {label:'Warble',cssVar:'--md-warble',def:0},
      {label:'Ghosting',cssVar:'--md-ghosting',def:0},
      {label:'Tint',cssVar:'--md-tint',def:0},
      {label:'Vignette',cssVar:'--md-vignette',def:0},
      {label:'Flutter',cssVar:'--md-flutter',def:0}
    ]}
  ];

  /* ==== Dashboard-enhanced DECAY preset (drives 3+ modules) ====
     The starter DECAY in macro.js drives media-decay + glitch (2 modules).
     This dashboard variant adds hand-drawn mappings so DECAY visibly
     drives sliders in media-decay, glitch, AND hand-drawn (3 modules). */
  var DASHBOARD_PRESETS={
    DECAY:{
      styleEnginePreset:1,name:'DECAY',
      description:'Cross-module decay: media-decay + glitch + hand-drawn from one knob.',
      dials:{},
      macros:[{
        id:'decay-master',name:'DECAY',
        description:'Progressive rot across three modules.',
        value:0,
        mappings:[
          {cssVar:'--md-grain',      min:0,max:85,curve:'ease',  window:[0,40]},
          {cssVar:'--md-tint',       min:0,max:70,curve:'linear',window:[20,60]},
          {cssVar:'--md-warble',     min:0,max:65,curve:'ease',  window:[30,70]},
          {cssVar:'--md-ghosting',   min:0,max:80,curve:'exp',   window:[50,90]},
          {cssVar:'--gl-dropout',    min:0,max:60,curve:'exp',   window:[70,100]},
          {cssVar:'--gl-static',     min:0,max:40,curve:'linear',window:[40,80]},
          {cssVar:'--gl-rate',       min:0,max:50,curve:'linear',window:[30,70]},
          {cssVar:'--hd-grain',      min:0,max:55,curve:'linear',window:[10,60]},
          {cssVar:'--hd-sketchiness',min:0,max:45,curve:'ease',  window:[40,85]}
        ]
      }]
    }
  };

  /* ==== Slider & readout registry ==== */
  var ALL_SLIDERS={};   /* cssVar -> {slider, readout} */
  var BYPASS_STATE={};  /* moduleId -> {bypassed, saved:{cssVar:val}} */

  /* ==== Toast ==== */
  var toastEl;
  function toast(msg){
    if(!toastEl){
      toastEl=document.createElement('div');
      toastEl.className='dash-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent=msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t=setTimeout(function(){toastEl.classList.remove('show');},2200);
  }

  /* ==== Init sliders ==== */
  function initSliders(){
    var sliders=document.querySelectorAll('[data-dial]');
    for(var i=0;i<sliders.length;i++){
      var s=sliders[i];
      var v=s.getAttribute('data-dial');
      var r=document.querySelector('[data-readout="'+v+'"]');
      ALL_SLIDERS[v]={slider:s,readout:r};
      (function(cssVar,sl){
        sl.addEventListener('input',function(){
          StyleEngine.setDial(cssVar,this.value);
          var entry=ALL_SLIDERS[cssVar];
          if(entry&&entry.readout) entry.readout.textContent=Math.round(this.value);
        });
      })(v,s);
    }
  }

  /* ==== Update one slider's position + readout ==== */
  function updateSliderUI(cssVar,value){
    var entry=ALL_SLIDERS[cssVar];
    if(!entry) return;
    var r=Math.round(value);
    entry.slider.value=r;
    if(entry.readout) entry.readout.textContent=r;
  }

  /* ==== Sync ALL sliders to current computed CSS values ==== */
  function syncAllSliders(){
    var cs=getComputedStyle(document.documentElement);
    var keys=Object.keys(ALL_SLIDERS);
    for(var i=0;i<keys.length;i++){
      var v=parseFloat(cs.getPropertyValue(keys[i]));
      if(!isNaN(v)) updateSliderUI(keys[i],v);
    }
  }

  /* ==== Module helpers ==== */
  function getModuleDials(moduleId){
    for(var i=0;i<MODULES.length;i++){
      if(MODULES[i].id===moduleId) return MODULES[i].dials;
    }
    return [];
  }
  function findModuleForVar(cssVar){
    for(var i=0;i<MODULES.length;i++){
      for(var j=0;j<MODULES[i].dials.length;j++){
        if(MODULES[i].dials[j].cssVar===cssVar) return MODULES[i];
      }
    }
    return null;
  }

  /* ==== Bypass ==== */
  function initBypass(){
    var cbs=document.querySelectorAll('[data-bypass]');
    for(var i=0;i<cbs.length;i++){
      (function(cb){
        var modId=cb.getAttribute('data-bypass');
        BYPASS_STATE[modId]={bypassed:false,saved:{}};
        cb.addEventListener('change',function(){
          toggleBypass(modId,this.checked);
        });
      })(cbs[i]);
    }
  }
  function toggleBypass(moduleId,bypassed){
    var state=BYPASS_STATE[moduleId];
    if(!state) return;
    var dials=getModuleDials(moduleId);
    var cs=getComputedStyle(document.documentElement);
    if(bypassed){
      state.saved={};
      for(var i=0;i<dials.length;i++){
        var v=parseFloat(cs.getPropertyValue(dials[i].cssVar));
        state.saved[dials[i].cssVar]=isNaN(v)?dials[i].def:v;
        StyleEngine.setDial(dials[i].cssVar,0);
        updateSliderUI(dials[i].cssVar,0);
      }
      state.bypassed=true;
    }else{
      for(var j=0;j<dials.length;j++){
        var saved=state.saved[dials[j].cssVar];
        if(saved==null) saved=dials[j].def;
        StyleEngine.setDial(dials[j].cssVar,saved);
        updateSliderUI(dials[j].cssVar,saved);
      }
      state.bypassed=false;
    }
  }

  /* ==== Macro helpers ==== */
  function getMacroIdForSlot(idx){return 'dash-macro-'+idx;}

  /* Rebuild a macro from its slot's current UI state */
  function rebuildMacroFromSlot(idx){
    var slotEl=document.querySelector('[data-slot="'+idx+'"]');
    if(!slotEl) return;
    var id=slotEl.getAttribute('data-loaded-macro-id')||getMacroIdForSlot(idx);
    StyleEngine.macro.delete(id);

    var nameInput=slotEl.querySelector('.macro-name');
    var slider=slotEl.querySelector('.macro-value');
    var rows=slotEl.querySelectorAll('.mapping-row');
    if(rows.length===0){slotEl.removeAttribute('data-loaded-macro-id');return;}

    var mappings=[];
    for(var i=0;i<rows.length;i++){
      var row=rows[i];
      var dialSel=row.querySelector('.map-dial');
      if(!dialSel||!dialSel.value) continue;
      mappings.push({
        cssVar:dialSel.value,
        min:parseFloat(row.querySelector('.map-min').value)||0,
        max:parseFloat(row.querySelector('.map-max').value)||100,
        curve:row.querySelector('.map-curve').value||'linear',
        window:[
          parseFloat(row.querySelector('.map-win-start').value)||0,
          parseFloat(row.querySelector('.map-win-end').value)||100
        ]
      });
    }

    StyleEngine.macro.create({
      id:id,
      name:nameInput.value||'Macro '+(idx+1),
      value:parseFloat(slider.value)||0,
      mappings:mappings
    });
    slotEl.setAttribute('data-loaded-macro-id',id);
    StyleEngine.macro.setValue(id,parseFloat(slider.value)||0);
    syncAllSliders();
  }

  /* Drive a macro from its slot slider */
  function setMacroSlider(idx,value){
    var slotEl=document.querySelector('[data-slot="'+idx+'"]');
    if(!slotEl) return;
    var readout=slotEl.querySelector('.macro-readout');
    if(readout) readout.textContent=Math.round(value);

    var id=slotEl.getAttribute('data-loaded-macro-id');
    if(!id) return;
    var mac=StyleEngine.macro.get(id);
    if(mac){
      StyleEngine.macro.setValue(id,value);
      syncAllSliders();
    }
  }

  /* Update dial <select> options when module <select> changes */
  function updateDialOptions(moduleSelect){
    var row=moduleSelect.closest('.mapping-row');
    var dialSelect=row.querySelector('.map-dial');
    var dials=getModuleDials(moduleSelect.value);
    dialSelect.innerHTML='';
    for(var i=0;i<dials.length;i++){
      var opt=document.createElement('option');
      opt.value=dials[i].cssVar;
      opt.textContent=dials[i].label;
      dialSelect.appendChild(opt);
    }
  }

  /* Add a mapping row to a slot */
  function addMappingRow(slotIdx,mapping){
    mapping=mapping||{};
    var container=document.querySelector('[data-macro-mappings="'+slotIdx+'"]');
    if(!container) return;
    var row=document.createElement('div');
    row.className='mapping-row';

    var modOpts='';
    for(var i=0;i<MODULES.length;i++){
      modOpts+='<option value="'+MODULES[i].id+'">'+MODULES[i].name+'</option>';
    }
    var curveOpts='<option value="linear">linear</option><option value="ease">ease</option><option value="exp">exp</option>';

    var winStart=mapping.window?mapping.window[0]:0;
    var winEnd=mapping.window?mapping.window[1]:100;
    row.innerHTML=
      '<select class="map-module">'+modOpts+'</select>'+
      '<select class="map-dial"></select>'+
      '<label>min<input type="number" class="map-min" min="0" max="100" value="'+(mapping.min!=null?mapping.min:0)+'"></label>'+
      '<label>max<input type="number" class="map-max" min="0" max="100" value="'+(mapping.max!=null?mapping.max:100)+'"></label>'+
      '<select class="map-curve">'+curveOpts+'</select>'+
      '<label>w<input type="number" class="map-win-start" min="0" max="100" value="'+winStart+'"></label>'+
      '<label>-<input type="number" class="map-win-end" min="0" max="100" value="'+winEnd+'"></label>'+
      '<button class="map-remove">X</button>';

    container.appendChild(row);

    /* wire up module select */
    var modSelect=row.querySelector('.map-module');
    modSelect.addEventListener('change',function(){
      updateDialOptions(this);
      rebuildMacroFromSlot(slotIdx);
    });

    /* set initial module + dial */
    if(mapping.cssVar){
      var targetMod=findModuleForVar(mapping.cssVar);
      if(targetMod) modSelect.value=targetMod.id;
    }
    updateDialOptions(modSelect);
    if(mapping.cssVar){
      row.querySelector('.map-dial').value=mapping.cssVar;
    }
    if(mapping.curve){
      row.querySelector('.map-curve').value=mapping.curve;
    }

    /* remove button */
    row.querySelector('.map-remove').addEventListener('click',function(){
      row.remove();rebuildMacroFromSlot(slotIdx);
    });

    /* change listeners for rebuild */
    var inputs=row.querySelectorAll('input[type=number],select.map-dial,select.map-curve');
    for(var j=0;j<inputs.length;j++){
      inputs[j].addEventListener('change',function(){rebuildMacroFromSlot(slotIdx);});
    }
  }

  /* Clear a slot UI */
  function clearSlotUI(idx){
    var slotEl=document.querySelector('[data-slot="'+idx+'"]');
    if(!slotEl) return;
    slotEl.querySelector('.macro-name').value='';
    slotEl.querySelector('.macro-value').value=0;
    var rd=slotEl.querySelector('.macro-readout');
    if(rd) rd.textContent='0';
    var mp=slotEl.querySelector('[data-macro-mappings="'+idx+'"]');
    if(mp) mp.innerHTML='';
    slotEl.removeAttribute('data-loaded-macro-id');
  }

  /* Fill a slot from a macro API object */
  function fillSlotUI(idx,mac){
    var slotEl=document.querySelector('[data-slot="'+idx+'"]');
    if(!slotEl||!mac) return;
    slotEl.querySelector('.macro-name').value=mac.name||'';
    slotEl.querySelector('.macro-value').value=mac.value||0;
    var rd=slotEl.querySelector('.macro-readout');
    if(rd) rd.textContent=Math.round(mac.value||0);
    slotEl.setAttribute('data-loaded-macro-id',mac.id);
    var mp=slotEl.querySelector('[data-macro-mappings="'+idx+'"]');
    if(mp) mp.innerHTML='';
    for(var i=0;i<mac.mappings.length;i++){
      addMappingRow(idx,mac.mappings[i]);
    }
  }

  /* Populate all slots from the macro API */
  function populateMacroSlotsFromAPI(){
    var ids=StyleEngine.macro.list();
    for(var i=0;i<8;i++) clearSlotUI(i);
    for(var j=0;j<ids.length&&j<8;j++){
      var mac=StyleEngine.macro.get(ids[j]);
      if(mac) fillSlotUI(j,mac);
    }
  }

  /* ==== Preset functions (global for onclick) ==== */
  window.loadPreset=function(name){
    if(!StyleEngine.macro){toast('Macro engine not loaded');return;}
    var preset;
    if(DASHBOARD_PRESETS[name]){
      preset=DASHBOARD_PRESETS[name];
    }else if(StyleEngine.macro.starterPresets){
      preset=StyleEngine.macro.starterPresets[name];
    }
    if(!preset){toast('Unknown preset: '+name);return;}
    StyleEngine.macro.load(preset);
    populateMacroSlotsFromAPI();
    syncAllSliders();
    toast('Loaded: '+name);
  };

  window.savePreset=function(){
    if(!StyleEngine.macro) return;
    var data=StyleEngine.macro.serialize();
    var name=prompt('Preset name:',data.name||'My Preset');
    if(!name) return;
    data.name=name;
    var json=JSON.stringify(data,null,2);
    var blob=new Blob([json],{type:'application/json'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url;
    a.download=name.replace(/\s+/g,'-').toLowerCase()+'.json';
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Saved: '+name);
  };

  window.loadPresetFile=function(input){
    if(!input.files||!input.files[0]) return;
    var reader=new FileReader();
    reader.onload=function(e){
      try{
        var data=JSON.parse(e.target.result);
        StyleEngine.macro.load(data);
        populateMacroSlotsFromAPI();
        syncAllSliders();
        toast('Loaded preset from file');
      }catch(err){
        toast('Error: '+err.message);
      }
    };
    reader.readAsText(input.files[0]);
    input.value='';
  };

  /* ==== Export functions (global for onclick) ==== */
  function copyAndShow(text){
    var out=document.getElementById('export-output');
    if(out){out.textContent=text;out.classList.add('visible');}
    if(navigator.clipboard){
      navigator.clipboard.writeText(text).catch(function(){});
    }
    var details=document.querySelector('.export-panel');
    if(details) details.open=true;
  }

  window.exportCSS=function(){
    var cs=getComputedStyle(document.documentElement);
    var lines=[':root {'];
    var keys=Object.keys(ALL_SLIDERS);
    for(var i=0;i<keys.length;i++){
      var v=cs.getPropertyValue(keys[i]).trim();
      if(v!=='') lines.push('  '+keys[i]+': '+v+';');
    }
    lines.push('}');
    copyAndShow(lines.join('\n'));
    toast('CSS copied to clipboard');
  };

  window.exportJSON=function(){
    if(!StyleEngine.macro) return;
    var data=StyleEngine.macro.serialize();
    copyAndShow(JSON.stringify(data,null,2));
    toast('JSON copied to clipboard');
  };

  window.exportSnippet=function(){
    var cs=getComputedStyle(document.documentElement);
    var keys=Object.keys(ALL_SLIDERS);
    var cssLines=[];
    for(var i=0;i<keys.length;i++){
      var v=cs.getPropertyValue(keys[i]).trim();
      if(v!==''&&v!=='0') cssLines.push('  '+keys[i]+': '+v+';');
    }
    var snippet=
      '<style>\n:root {\n'+cssLines.join('\n')+'\n}\n<\/style>\n\n'+
      '<!-- Style Engine modules -->\n'+
      '<link rel="stylesheet" href="modules/hand-drawn.css">\n'+
      '<link rel="stylesheet" href="modules/glitch.css">\n'+
      '<link rel="stylesheet" href="modules/text-motion.css">\n'+
      '<link rel="stylesheet" href="modules/media-decay.css">\n'+
      '<script src="modules/hand-drawn.js"><\/script>\n'+
      '<script src="modules/glitch.js"><\/script>\n'+
      '<script src="modules/text-motion.js"><\/script>\n'+
      '<script src="modules/media-decay.js"><\/script>\n'+
      '<script src="modules/macro.js"><\/script>';
    copyAndShow(snippet);
    toast('Snippet copied to clipboard');
  };

  /* Replay text reveal from preview */
  window.replayText=function(){
    var el=document.querySelector('[data-tm]');
    if(el&&StyleEngine.text&&StyleEngine.text.reveal){
      StyleEngine.text.reveal(el);
    }
  };

  /* ==== Init ==== */
  function initMacroSlots(){
    var sliders=document.querySelectorAll('[data-macro-slider]');
    for(var i=0;i<sliders.length;i++){
      (function(sl){
        var idx=parseInt(sl.getAttribute('data-macro-slider'),10);
        sl.addEventListener('input',function(){
          setMacroSlider(idx,parseFloat(this.value));
        });
      })(sliders[i]);
    }
    var addBtns=document.querySelectorAll('[data-macro-add]');
    for(var j=0;j<addBtns.length;j++){
      (function(btn){
        var idx=parseInt(btn.getAttribute('data-macro-add'),10);
        btn.addEventListener('click',function(){
          addMappingRow(idx);
          rebuildMacroFromSlot(idx);
        });
      })(addBtns[j]);
    }
  }

  document.addEventListener('DOMContentLoaded',function(){
    initSliders();
    initBypass();
    initMacroSlots();
  });

})();
"""


# ---- Dashboard body (f-string for Python-generated module panels + macro slots) ----
BODY = f"""
<header class="dash-header">
  <h1 class="dash-title">STYLE ENGINE</h1>
  <span class="dash-subtitle">Dashboard v1.0</span>
</header>

<section class="dash-preview" id="preview">
  <div class="preview-stage">
    <h1 class="hd-hand gl-target md-target" data-tm="scramble">STYLE ENGINE PREVIEW</h1>
    <p class="hd-body">Every visual effect is driven by a 0&ndash;100 dial. Compose your look with the modules below, wire up macros, then export.</p>
    <div class="preview-image md-target">
      <svg viewBox="0 0 400 180" width="100%" height="180" aria-hidden="true">
        <defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#b83c28"/>
          <stop offset="50%" stop-color="#2f5ec8"/>
          <stop offset="100%" stop-color="#e8b23a"/>
        </linearGradient></defs>
        <rect width="400" height="180" fill="url(#pg)" rx="8"/>
      </svg>
    </div>
    <div class="hd-box hd-body md-target preview-card"><strong>Sample Card</strong><br>A wobbly container with analog wear. Turn dials to see effects.</div>
    <button class="preview-btn hd-body" onclick="replayText()">Replay Text Reveal</button>
  </div>
</section>

<section class="dash-section" id="modules">
  <h2 class="dash-section-title">Module Chain</h2>
  <div class="module-chain">{module_panels}
  </div>
</section>

<section class="dash-section" id="macros">
  <h2 class="dash-section-title">Macro Rack</h2>
  <div class="macro-rack">{macro_slots}
  </div>
</section>

<section class="dash-section" id="presets">
  <h2 class="dash-section-title">Presets</h2>
  <div class="preset-bar">
    <button class="preset-btn" onclick="loadPreset('DECAY')">DECAY</button>
    <button class="preset-btn" onclick="loadPreset('VINYL')">VINYL</button>
    <button class="preset-btn" onclick="loadPreset('VHS')">VHS</button>
    <button class="preset-btn" onclick="loadPreset('CASSETTE')">CASSETTE</button>
    <button class="preset-btn" onclick="loadPreset('HAND-MADE')">HAND-MADE</button>
  </div>
  <div class="preset-io">
    <button class="io-btn" onclick="savePreset()">Save Preset</button>
    <label class="io-btn io-label">Load Preset
      <input type="file" accept=".json" onchange="loadPresetFile(this)" hidden>
    </label>
  </div>
</section>

<section class="dash-section" id="export">
  <details class="export-panel">
    <summary>Export</summary>
    <div class="export-buttons">
      <button class="io-btn" onclick="exportCSS()">Copy CSS</button>
      <button class="io-btn" onclick="exportJSON()">Copy JSON</button>
      <button class="io-btn" onclick="exportSnippet()">Copy Snippet</button>
    </div>
    <pre class="export-output" id="export-output"></pre>
  </details>
</section>
"""


# ---- Assemble the single HTML file ----
HTML = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Style Engine Dashboard</title>
<style>
/* ===== VENDORED FONTS (offline, no CDN) ===== */
{FONT_FACE_CSS}
/* ===== MODULE CSS (inlined verbatim) ===== */

/* -- hand-drawn.css -- */
{hd_css}
/* -- glitch.css -- */
{gl_css}
/* -- text-motion.css -- */
{tm_css}
/* -- media-decay.css -- */
{md_css}

/* ===== DASHBOARD CHROME ===== */
{DASH_CSS}
</style>
</head>
<body>

<!-- ===== SVG FILTER DEFS (inlined from modules) ===== -->
{hd_svg}
{gl_svg}
{md_svg}

<!-- full-page grain overlay (hand-drawn module) -->
<svg class="hd-grain-overlay" aria-hidden="true"><rect width="100%" height="100%" filter="url(#hd-grain)"/></svg>

<!-- ===== DASHBOARD UI ===== -->
{BODY}

<!-- ===== VENDOR LIBRARIES (inlined) ===== -->
<script>/* Rough.js v4.6.6 (MIT) */ {rough_js}</script>
<script>/* rough-notation v0.2.1 (MIT) */ {roughnote_js}</script>

<!-- ===== MODULE JS (inlined verbatim, load order matters) ===== -->
<script>/* hand-drawn.js — creates StyleEngine registry */ {hd_js}</script>
<script>/* glitch.js */ {gl_js}</script>
<script>/* text-motion.js */ {tm_js}</script>
<script>/* media-decay.js */ {md_js}</script>
<script>/* macro.js — attaches StyleEngine.macro */ {macro_js}</script>

<!-- ===== DASHBOARD JS ===== -->
<script>{DASH_JS}</script>
</body>
</html>
"""


# ---- Write output ----
DASH.mkdir(parents=True, exist_ok=True)
OUT.write_text(HTML, encoding="utf-8")
print(f"wrote {OUT}  ({len(HTML):,} bytes)")
