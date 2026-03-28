import { useState, useEffect, useCallback, useRef } from "react";
import { RAW } from "./data/sites";


const REGION_NORM = {
  "Latin America and the Caribbean": "Latin America",
  "Europe and North America": "Europe & N. America",
  "Asia and the Pacific": "Asia & Pacific",
};
const SITE_MAP = new Map();
for (const r of RAW) {
  const key = r[0]+"|"+r[1];
  if (!SITE_MAP.has(key)) SITE_MAP.set(key, { id:r[0], name:r[1], country:r[2], region:REGION_NORM[r[3]]||r[3], category:r[4], year:r[5], lat:r[6], lon:r[7], description:r[8] });
}
const ALL_SITES = [...SITE_MAP.values()];

const REGIONS = [...new Set(ALL_SITES.map(s => s.region))].sort();
const CAT_COLORS = { Cultural:"#c9a96e", Natural:"#5aaa7a", Mixed:"#c27a4a" };
const CAT_BG = { Cultural:"rgba(201,169,110,0.08)", Natural:"rgba(90,170,122,0.08)", Mixed:"rgba(194,122,74,0.08)" };

// Original 1978 UNESCO site IDs present in our dataset
const CLASS_OF_78_IDS = [1, 2, 3, 4, 9, 24]; // Galápagos, Quito, Aachen, L'Anse aux Meadows, Simien, Nahanni

const BADGES = [
  // Milestones
  {id:"m1",cat:"Milestone",name:"Departure",desc:"Visit your first site",stamp:"circle",micro:"BOARDING",check:v=>v.length>=1},
  {id:"m2",cat:"Milestone",name:"Wayfarer",desc:"Visit 5 sites",stamp:"rect",micro:"HERITAGE TRANSIT AUTHORITY",check:v=>v.length>=5},
  {id:"m3",cat:"Milestone",name:"Rover",desc:"Visit 15 sites",stamp:"diamond",micro:"CERTIFIED",check:v=>v.length>=15},
  {id:"m4",cat:"Milestone",name:"Globetrotter",desc:"Visit 50 sites",stamp:"circle",micro:"INTERNATIONAL",check:v=>v.length>=50},
  {id:"m5",cat:"Milestone",name:"Luminary",desc:"Visit 100 sites",stamp:"circle",micro:"",check:v=>v.length>=100},
  // Regions
  {id:"r1",cat:"Region",name:"Via Afrika",desc:"Visit 1 site in Africa",stamp:"circle",micro:"VIA",main:"Afrika",sub:"CLEARED FOR ENTRY",check:(v,s)=>s.some(x=>x.region==="Africa"&&v.includes(x.id))},
  {id:"r2",cat:"Region",name:"Silk Road",desc:"Visit 1 in Asia & Pacific",stamp:"rect",micro:"PASSAGE ALONG THE",main:"Silk Road",sub:"ASIA & PACIFIC",check:(v,s)=>s.some(x=>x.region==="Asia & Pacific"&&v.includes(x.id))},
  {id:"r3",cat:"Region",name:"Grand tour",desc:"Visit 1 in Europe",stamp:"oval",micro:"THE",main:"Grand Tour",sub:"EUROPE & N. AMERICA",check:(v,s)=>s.some(x=>x.region==="Europe & N. America"&&v.includes(x.id))},
  {id:"r4",cat:"Region",name:"Las Am\u00e9ricas",desc:"Visit 1 in Latin America",stamp:"circle-dash",micro:"RUTA POR",main:"Las Am\u00e9ricas",sub:"LATIN AMERICA",check:(v,s)=>s.some(x=>x.region==="Latin America"&&v.includes(x.id))},
  {id:"r5",cat:"Region",name:"The sands",desc:"Visit 1 in Arab States",stamp:"diamond",micro:"PASSAGE THROUGH",main:"The Sands",sub:"ARAB STATES",check:(v,s)=>s.some(x=>x.region==="Arab States"&&v.includes(x.id))},
  // Category
  {id:"c1",cat:"Category",name:"Aesthete",desc:"5 Cultural sites",stamp:"rect",micro:"MINISTRY OF CULTURE",check:(v,s)=>s.filter(x=>x.category==="Cultural"&&v.includes(x.id)).length>=5},
  {id:"c2",cat:"Category",name:"Naturalist",desc:"5 Natural sites",stamp:"circle",micro:"NATURAL HISTORY SOCIETY",check:(v,s)=>s.filter(x=>x.category==="Natural"&&v.includes(x.id)).length>=5},
  {id:"c3",cat:"Category",name:"Crossroads",desc:"3 Mixed sites",stamp:"circle",micro:"WHERE WORLDS MEET",check:(v,s)=>s.filter(x=>x.category==="Mixed"&&v.includes(x.id)).length>=3},
  // Country
  {id:"n1",cat:"Collector",name:"Ten nations",desc:"Sites in 10 countries",stamp:"rect",micro:"INTERNATIONAL PASSPORT",check:(v,s)=>new Set(s.filter(x=>v.includes(x.id)).map(x=>x.country)).size>=10},
  {id:"n2",cat:"Collector",name:"Citizen of the world",desc:"Sites in 25 countries",stamp:"circle",micro:"CITIZEN OF",check:(v,s)=>new Set(s.filter(x=>v.includes(x.id)).map(x=>x.country)).size>=25},
  // Challenge
  {id:"x1",cat:"Challenge",name:"Class of \u201978",desc:"3 of the original 12 sites",stamp:"rect-dash",micro:"INAUGURAL CLASS",check:(v)=>CLASS_OF_78_IDS.filter(id=>v.includes(id)).length>=3},
  {id:"x2",cat:"Challenge",name:"Antipodean",desc:"Sites in both hemispheres",stamp:"circle",micro:"NORTHERN & SOUTHERN",check:(v,s)=>{const lats=s.filter(x=>v.includes(x.id)).map(x=>x.lat);return lats.some(l=>l>0)&&lats.some(l=>l<0);}},
  {id:"x3",cat:"Challenge",name:"Omnivoyager",desc:"Sites in all 5 regions",stamp:"circle",micro:"ALL FIVE REGIONS",check:(v,s)=>new Set(s.filter(x=>v.includes(x.id)).map(x=>x.region)).size>=5},
  {id:"x4",cat:"Challenge",name:"Correspondent",desc:"Write 5 journal entries",stamp:"rect",micro:"FIELD NOTES",check:(v,s,w,j)=>Object.keys(j||{}).length>=5},
  {id:"x5",cat:"Challenge",name:"Daydreamer",desc:"Wishlist 10 sites",stamp:"star",micro:"FUTURE TRAVELS",check:(v,s,w)=>(w||[]).length>=10},
];

const BADGE_CATS = ["Milestone","Region","Category","Collector","Challenge"];
const BADGE_CAT_LABELS = {Milestone:"The journey begins",Region:"Regional dispatches",Category:"Classification",Collector:"The collector",Challenge:"Special dispatches"};

// Passport stamp SVG component
const StampSVG = ({badge, earned}) => {
  const gold = earned ? "#854F0B" : "#888780";
  const light = earned ? "#BA7517" : "#888780";
  const op = earned ? 1 : 0.5;
  const name = badge.main || badge.name;

  const shapes = {
    "circle": (
      <>
        <circle cx="48" cy="48" r="42" fill="none" stroke={gold} strokeWidth="2" opacity={.55*op}/>
        <circle cx="48" cy="48" r="38" fill="none" stroke={gold} strokeWidth=".6" opacity={.25*op}/>
        <circle cx="48" cy="48" r="34" fill="none" stroke={gold} strokeWidth=".4" strokeDasharray="1.5,2.5" opacity={.2*op}/>
      </>
    ),
    "rect": (
      <>
        <rect x="6" y="10" width="84" height="76" rx="4" fill="none" stroke={gold} strokeWidth="2" opacity={.55*op}/>
        <rect x="10" y="14" width="76" height="68" rx="2" fill="none" stroke={gold} strokeWidth=".5" opacity={.2*op}/>
        <line x1="10" y1="26" x2="86" y2="26" stroke={gold} strokeWidth=".4" opacity={.2*op}/>
        <line x1="10" y1="72" x2="86" y2="72" stroke={gold} strokeWidth=".4" opacity={.15*op}/>
      </>
    ),
    "rect-dash": (
      <>
        <rect x="6" y="8" width="84" height="80" rx="4" fill="none" stroke={gold} strokeWidth="2" strokeDasharray="6,4" opacity={.4*op}/>
        <rect x="12" y="14" width="72" height="68" rx="2" fill="none" stroke={gold} strokeWidth=".4" opacity={.15*op}/>
      </>
    ),
    "diamond": (
      <>
        <polygon points="48,4 92,48 48,92 4,48" fill="none" stroke={gold} strokeWidth="2" opacity={.45*op}/>
        <polygon points="48,14 82,48 48,82 14,48" fill="none" stroke={gold} strokeWidth=".5" opacity={.2*op}/>
      </>
    ),
    "oval": (
      <>
        <ellipse cx="48" cy="48" rx="42" ry="38" fill="none" stroke={gold} strokeWidth="2" opacity={.45*op}/>
        <ellipse cx="48" cy="48" rx="36" ry="32" fill="none" stroke={gold} strokeWidth=".5" opacity={.15*op}/>
      </>
    ),
    "circle-dash": (
      <>
        <circle cx="48" cy="48" r="42" fill="none" stroke={gold} strokeWidth="2" strokeDasharray="5,3" opacity={.45*op}/>
        <circle cx="48" cy="48" r="36" fill="none" stroke={gold} strokeWidth=".5" opacity={.15*op}/>
      </>
    ),
    "star": (
      <polygon points="48,6 57,34 88,34 63,52 72,80 48,62 24,80 33,52 8,34 39,34" fill="none" stroke={gold} strokeWidth="1.5" opacity={.35*op}/>
    ),
  };

  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      {shapes[badge.stamp] || shapes.circle}
      {badge.micro && (
        <text x="48" y={badge.stamp==="rect"?"23":"30"} textAnchor="middle" fontSize="5" fill={gold} fontFamily="sans-serif" letterSpacing=".2em" opacity={.5*op}>
          {badge.micro}
        </text>
      )}
      <text x="48" y={badge.stamp==="rect"?"48":"48"} textAnchor="middle" fontSize={name.length>12?"12":"15"} fontWeight="400" fill={gold} fontFamily="Georgia,serif" fontStyle="italic" opacity={op}>
        {name}
      </text>
      <line x1="24" y1={badge.stamp==="rect"?"54":"54"} x2="72" y2={badge.stamp==="rect"?"54":"54"} stroke={gold} strokeWidth=".3" opacity={.15*op}/>
      <text x="48" y={badge.stamp==="rect"?"65":"66"} textAnchor="middle" fontSize="6.5" fill={light} fontFamily="sans-serif" letterSpacing=".06em" opacity={.45*op}>
        {badge.sub || badge.desc.toUpperCase()}
      </text>
    </svg>
  );
};

const SVG_ICONS = {
  seedling: "M12 22V12m0 0C12 7 7 2 2 2c0 5 5 10 10 10zm0 0c0-5 5-10 10-10 0 5-5 10-10 10z",
  compass: "M12 2a10 10 0 100 20 10 10 0 000-20zm3.5 6.5l-2 5-5 2 2-5z",
  backpack: "M6 20V10a6 6 0 0112 0v10M6 10H4a2 2 0 00-2 2v2a2 2 0 002 2h2m12-6h2a2 2 0 012 2v2a2 2 0 01-2 2h-2M9 6V4a3 3 0 016 0v2",
  globe: "M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z",
  trophy: "M6 9H3V6a1 1 0 011-1h2m12 4h3V6a1 1 0 00-1-1h-2M6 9a6 6 0 0012 0M6 9V5h12v4M12 15v4m-4 0h8M8 5V3h8v2",
  crown: "M2 20h20L19 8l-4 5-3-6-3 6-4-5z",
  leaf: "M17 8C8 10 5.9 16.17 3.82 21.34M17 8A5 5 0 0121 4c-1 4-4 8-13 12",
  columns: "M4 21V5a2 2 0 012-2h2v18H4zm6 0V5h4v16h-4zm6 0V3h2a2 2 0 012 2v16h-4z",
  plane: "M22 2L11 13M22 2l-7 20-4-9-9-4z",
  earth: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 0v20M2 12h20",
  stamp: "M5 21h14M5 17h14M7 17V7a5 5 0 0110 0v10",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14 2 9.27l6.91-1.01z",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  filter: "M22 3H2l8 9.46V19l4 2v-8.54z",
  map: "M1 6v16l7-4 8 4 7-4V2l-7 4-8-4z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  heart: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z",
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18M6 6l12 12",
  chevDown: "M6 9l6 6 6-6",
  bookmark: "M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z",
  externalLink: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6m4-3h6v6m-11 5L21 3",
  award: "M12 15l-3.5 7 1-4.5L6 15h4.5L12 8l1.5 7H18l-3.5 2.5 1 4.5z",
  journal: "M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z",
};

const Icon = ({name, size=16, color="currentColor", strokeWidth=1.8}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={SVG_ICONS[name]||SVG_ICONS.globe}/>
  </svg>
);

/* ─── STORAGE HELPERS ─── */
async function loadStorage(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch { return fallback; }
}
async function saveStorage(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
}

/* ─── MAIN APP ─── */
export default function App() {
  const [visitStatus, setVisitStatus] = useState({});
  const [wishlist, setWishlist] = useState([]);
  const [journal, setJournal] = useState({});
  const [loaded, setLoaded] = useState(false);

  const [view, setView] = useState("grid"); // grid | map | badges
  const [search, setSearch] = useState("");
  const [filterRegion, setFilterRegion] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [selected, setSelected] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [notif, setNotif] = useState(null);
  const [newBadge, setNewBadge] = useState(null);

  const prevVisitedRef = useRef([]);

  // Load from persistent storage
  useEffect(() => {
    (async () => {
      const vs = await loadStorage("heritage-visit-status", {});
      const wl = await loadStorage("heritage-wishlist", []);
      const jn = await loadStorage("heritage-journal", {});
      setVisitStatus(vs);
      setWishlist(wl);
      setJournal(jn);
      prevVisitedRef.current = Object.keys(vs).filter(id => vs[id] === "visited").map(Number);
      setLoaded(true);
    })();
  }, []);

  // Save on change
  useEffect(() => { if (loaded) saveStorage("heritage-visit-status", visitStatus); }, [visitStatus, loaded]);
  useEffect(() => { if (loaded) saveStorage("heritage-wishlist", wishlist); }, [wishlist, loaded]);
  useEffect(() => { if (loaded) saveStorage("heritage-journal", journal); }, [journal, loaded]);

  // Badge detection
  useEffect(() => {
    if (!loaded) return;
    const visited = Object.keys(visitStatus).filter(id => visitStatus[id] === "visited").map(Number);
    const prev = prevVisitedRef.current;
    const earned = BADGES.filter(b => b.check(visited, ALL_SITES, wishlist, journal) && !b.check(prev, ALL_SITES, wishlist, journal));
    if (earned.length) { setNewBadge(earned[0]); setTimeout(() => setNewBadge(null), 4000); }
    prevVisitedRef.current = visited;
  }, [visitStatus, loaded]);

  const showNotif = (msg) => { setNotif(msg); setTimeout(() => setNotif(null), 2200); };

  const visited = Object.keys(visitStatus).filter(id => visitStatus[id] === "visited").map(Number);
  const partial = Object.keys(visitStatus).filter(id => visitStatus[id] === "partial").map(Number);
  const anyVisit = [...visited, ...partial];

  const cycleVisit = useCallback((id, e) => {
    if (e) e.stopPropagation();
    setVisitStatus(p => {
      const cur = p[id];
      if (!cur) { showNotif("Partially visited"); return {...p, [id]: "partial"}; }
      if (cur === "partial") { showNotif("Fully visited"); return {...p, [id]: "visited"}; }
      const next = {...p}; delete next[id]; showNotif("Unmarked"); return next;
    });
  }, []);

  const toggleWish = useCallback((id, e) => {
    if (e) e.stopPropagation();
    setWishlist(p => {
      const has = p.includes(id);
      showNotif(has ? "Removed from wishlist" : "Wishlisted");
      return has ? p.filter(x => x !== id) : [...p, id];
    });
  }, []);

  const saveJournalEntry = (siteId, data) => {
    setJournal(p => ({...p, [siteId]: {...(p[siteId]||{}), ...data}}));
    showNotif("Journal saved");
  };

  // Filtering
  const filtered = ALL_SITES.filter(s => {
    if (filterRegion !== "All" && s.region !== filterRegion) return false;
    if (filterType !== "All" && s.category !== filterType) return false;
    if (filterStatus === "Visited" && visitStatus[s.id] !== "visited") return false;
    if (filterStatus === "Partial" && visitStatus[s.id] !== "partial") return false;
    if (filterStatus === "Not visited" && visitStatus[s.id]) return false;
    if (filterStatus === "Wishlist" && !wishlist.includes(s.id)) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.country.toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === "year_new") return (b.year||0) - (a.year||0);
    if (sortBy === "year_old") return (a.year||9999) - (b.year||9999);
    if (sortBy === "country") return a.country.localeCompare(b.country);
    return a.name.localeCompare(b.name);
  });

  const earnedBadges = BADGES.filter(b => b.check(visited, ALL_SITES, wishlist, journal));
  const vCountries = new Set(ALL_SITES.filter(s => anyVisit.includes(s.id)).map(s => s.country)).size;
  const vRegions = new Set(ALL_SITES.filter(s => anyVisit.includes(s.id)).map(s => s.region)).size;
  const pctFull = ALL_SITES.length ? Math.round((visited.length / ALL_SITES.length) * 100) : 0;

  // Region stats for map
  const regionStats = REGIONS.map(r => {
    const total = ALL_SITES.filter(s => s.region === r).length;
    const vis = ALL_SITES.filter(s => s.region === r && visited.includes(s.id)).length;
    const par = ALL_SITES.filter(s => s.region === r && partial.includes(s.id)).length;
    return { region: r, total, visited: vis, partial: par };
  });

  const activeFilters = [filterRegion, filterType, filterStatus].filter(f => f !== "All").length;

  return (
    <div style={{fontFamily:"'Newsreader',Georgia,serif",minHeight:"100vh",background:"#0d0c09",color:"#ddd5c4",position:"relative"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Outfit:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#2a2620;border-radius:2px}
        .site-row{transition:background .15s;cursor:pointer;border-bottom:1px solid #181610}
        .site-row:hover{background:rgba(201,169,110,.04)}
        .pill{font-family:'Outfit',sans-serif;font-size:11px;font-weight:400;padding:5px 14px;border-radius:100px;border:1px solid #1e1c16;background:transparent;color:#5a5448;cursor:pointer;transition:all .18s;white-space:nowrap}
        .pill:hover{border-color:#3a3428;color:#9a8a70}
        .pill.on{background:#c9a96e;border-color:#c9a96e;color:#0d0c09;font-weight:500}
        .pill.on-green{background:#2a3a2e;border-color:#3a5a3e;color:#7aba8a}
        .pill.on-amber{background:#2a2618;border-color:#4a3a1e;color:#d0a050}
        .view-btn{font-family:'Outfit',sans-serif;font-size:11px;padding:6px 12px;border-radius:6px;border:1px solid #1e1c16;background:transparent;color:#5a5448;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:5px}
        .view-btn:hover{border-color:#3a3428}.view-btn.on{background:#1a1814;border-color:#2a2620;color:#c9a96e}
        .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(8px);animation:fadeIn .15s}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .modal{background:#141210;border:1px solid #201e18;border-radius:16px;max-width:600px;width:100%;max-height:88vh;overflow-y:auto;animation:slideUp .2s ease}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .notif{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:200;animation:notifIn .25s ease;pointer-events:none}
        @keyframes notifIn{from{transform:translate(-50%,8px);opacity:0}to{transform:translate(-50%,0);opacity:1}}
        .badge-popup{position:fixed;top:20px;right:20px;z-index:200;animation:badgeIn .4s ease}
        @keyframes badgeIn{from{opacity:0;transform:scale(.8) translateX(40px)}to{opacity:1;transform:scale(1) translateX(0)}}
        .dot-pulse{width:6px;height:6px;border-radius:50%;background:#c9a96e;animation:pulse 1.5s ease infinite}
        @keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}
        input,select,textarea{background:#0d0c09;border:1px solid #1e1c16;color:#ddd5c4;font-family:'Outfit',sans-serif;font-size:13px;padding:9px 14px;border-radius:8px;outline:none;transition:border-color .15s;width:100%}
        input:focus,textarea:focus{border-color:#c9a96e44}
        input::placeholder,textarea::placeholder{color:#2a2620}
        select{cursor:pointer}
        textarea{resize:vertical;min-height:88px;line-height:1.6;font-family:'Newsreader',serif;font-size:15px}
        .star-btn{cursor:pointer;transition:transform .12s;display:inline-flex}.star-btn:hover{transform:scale(1.15)}
        .map-dot{transition:all .2s;cursor:pointer}
        .map-dot:hover{r:6;opacity:1 !important}
        @media(max-width:600px){.stats-grid{grid-template-columns:repeat(2,1fr)!important}.site-meta-row{flex-direction:column;gap:2px!important}}
      `}</style>

      {/* ── HEADER ── */}
      <header style={{padding:"24px 20px 16px",borderBottom:"1px solid #161410",maxWidth:1100,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:16}}>
          <div>
            <h1 style={{fontSize:"clamp(1.5rem,3.5vw,2.2rem)",fontWeight:300,color:"#ddd5c4",lineHeight:1.1,letterSpacing:"-0.02em"}}>
              Heritage <em style={{fontStyle:"italic",color:"#c9a96e"}}>Atlas</em>
            </h1>
            <p style={{fontFamily:"'Outfit',sans-serif",fontSize:11,color:"#3a3428",letterSpacing:".08em",textTransform:"uppercase",marginTop:4}}>
              {ALL_SITES.length} UNESCO world heritage sites
            </p>
          </div>
          <div style={{display:"flex",gap:20,alignItems:"baseline"}}>
            {[
              [visited.length, "visited", "#c9a96e"],
              [partial.length, "partial", "#d0a050"],
              [wishlist.length, "wishlist", "#7a6a5a"],
              [vCountries, "countries", "#7a6a5a"],
            ].map(([n, l, c]) => (
              <div key={l} style={{textAlign:"center"}}>
                <div style={{fontFamily:"'Newsreader',serif",fontSize:"1.5rem",fontWeight:300,color:c,lineHeight:1}}>{n}</div>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:9,color:"#2a2620",letterSpacing:".1em",textTransform:"uppercase",marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress */}
        <div style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontFamily:"'Outfit',sans-serif",fontSize:10,color:"#2a2620"}}>{vRegions}/5 regions explored</span>
            <span style={{fontFamily:"'Outfit',sans-serif",fontSize:10,color:"#5a5448"}}>{pctFull}%</span>
          </div>
          <div style={{height:3,background:"#161410",borderRadius:2,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,height:"100%",width:`${ALL_SITES.length?Math.round((anyVisit.length/ALL_SITES.length)*100):0}%`,background:"#3a3018",borderRadius:2,transition:"width .6s ease"}}/>
            <div style={{position:"absolute",top:0,left:0,height:"100%",width:`${pctFull}%`,background:"linear-gradient(90deg,#c9a96e,#dab97e)",borderRadius:2,transition:"width .6s ease"}}/>
          </div>
        </div>

        {/* View toggles + search */}
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{display:"flex",gap:4}}>
            {[["grid","List"],["map","Map"],["badges","Badges"]].map(([v,label]) => (
              <button key={v} className={`view-btn ${view===v?"on":""}`} onClick={() => setView(v)}>
                <Icon name={v==="grid"?"list":v==="map"?"map":"award"} size={13} color={view===v?"#c9a96e":"#5a5448"}/>
                {label}
              </button>
            ))}
          </div>
          <div style={{flex:1}}/>
          {view === "grid" && (
            <>
              <div style={{position:"relative",minWidth:200,flex:"0 1 280px"}}>
                <Icon name="search" size={14} color="#3a3428" />
                <input
                  type="text"
                  placeholder="Search sites, countries…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{paddingLeft:12,fontSize:12}}
                />
              </div>
              <button className={`view-btn ${showFilters?"on":""}`} onClick={() => setShowFilters(!showFilters)} style={{position:"relative"}}>
                <Icon name="filter" size={13} color={showFilters?"#c9a96e":"#5a5448"}/>
                Filters
                {activeFilters > 0 && <span style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:"#c9a96e",color:"#0d0c09",fontSize:9,fontFamily:"'Outfit',sans-serif",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center"}}>{activeFilters}</span>}
              </button>
            </>
          )}
        </div>

        {/* Collapsible filters */}
        {showFilters && view === "grid" && (
          <div style={{marginTop:12,padding:"14px 0",borderTop:"1px solid #161410",display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontFamily:"'Outfit',sans-serif",fontSize:10,color:"#3a3428",textTransform:"uppercase",letterSpacing:".1em",width:55}}>Type</span>
              {["All","Cultural","Natural","Mixed"].map(t => (
                <button key={t} className={`pill ${filterType===t?(t==="All"?"on":t==="Natural"?"on-green":"on"):""}`}
                  style={filterType===t&&t==="Mixed"?{background:"#2a2018",borderColor:"#4a3428",color:"#c27a4a"}:{}}
                  onClick={() => setFilterType(t)}>{t}</button>
              ))}
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontFamily:"'Outfit',sans-serif",fontSize:10,color:"#3a3428",textTransform:"uppercase",letterSpacing:".1em",width:55}}>Region</span>
              <button className={`pill ${filterRegion==="All"?"on":""}`} onClick={() => setFilterRegion("All")}>All</button>
              {REGIONS.map(r => (
                <button key={r} className={`pill ${filterRegion===r?"on":""}`} onClick={() => setFilterRegion(r)}>{r}</button>
              ))}
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontFamily:"'Outfit',sans-serif",fontSize:10,color:"#3a3428",textTransform:"uppercase",letterSpacing:".1em",width:55}}>Status</span>
              {["All","Visited","Partial","Not visited","Wishlist"].map(s => (
                <button key={s} className={`pill ${filterStatus===s?"on":""}`} onClick={() => setFilterStatus(s)}>{s}</button>
              ))}
              <div style={{flex:1}}/>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{width:"auto",padding:"5px 10px",fontSize:11}}>
                <option value="name">A–Z</option>
                <option value="country">Country</option>
                <option value="year_new">Newest</option>
                <option value="year_old">Oldest</option>
              </select>
            </div>
          </div>
        )}
      </header>

      {/* ── MAIN CONTENT ── */}
      <main style={{maxWidth:1100,margin:"0 auto",padding:"0 20px 40px"}}>

        {/* ═══ GRID VIEW ═══ */}
        {view === "grid" && (
          <div style={{paddingTop:8}}>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:11,color:"#2a2620",padding:"8px 0 12px"}}>
              {filtered.length} site{filtered.length !== 1 ? "s" : ""}
              {activeFilters > 0 && <button onClick={() => {setFilterRegion("All");setFilterType("All");setFilterStatus("All");setSearch("");}} style={{background:"none",border:"none",color:"#c9a96e",cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontSize:11,marginLeft:8}}>Clear filters</button>}
            </div>
            {filtered.length === 0 ? (
              <div style={{textAlign:"center",padding:"60px 20px",color:"#2a2620"}}>
                <p style={{fontSize:"1.1rem",fontStyle:"italic"}}>No sites match your filters</p>
              </div>
            ) : (
              <div>
                {filtered.map(site => {
                  const status = visitStatus[site.id];
                  const isWished = wishlist.includes(site.id);
                  const hasJournal = !!journal[site.id];
                  return (
                    <div key={site.id+site.name} className="site-row" onClick={() => setSelected(site)}
                      style={{display:"flex",alignItems:"center",gap:12,padding:"12px 8px"}}>
                      {/* Type indicator */}
                      <div style={{width:3,height:32,borderRadius:2,background:CAT_COLORS[site.category],opacity:0.6,flexShrink:0}}/>
                      {/* Info */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:15,fontWeight:400,color:"#ddd5c4",lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {site.name}
                        </div>
                        <div className="site-meta-row" style={{fontFamily:"'Outfit',sans-serif",fontSize:11,color:"#3a3428",display:"flex",gap:12,marginTop:2}}>
                          <span>{site.country}</span>
                          <span>{site.year}</span>
                          <span style={{color:CAT_COLORS[site.category],opacity:0.7}}>{site.category}</span>
                          {hasJournal && <span style={{color:"#7a6a9a"}}>journaled</span>}
                        </div>
                      </div>
                      {/* Status badges */}
                      <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                        {isWished && <span style={{color:"#c9a96e",fontSize:14}}>
                          <Icon name="bookmark" size={14} color="#c9a96e"/>
                        </span>}
                        <button onClick={e => cycleVisit(site.id, e)} style={{
                          fontFamily:"'Outfit',sans-serif",fontSize:10,fontWeight:500,
                          padding:"4px 12px",borderRadius:100,border:"1px solid",cursor:"pointer",
                          transition:"all .15s",
                          ...(status === "visited" ? {background:"rgba(201,169,110,.12)",borderColor:"#c9a96e44",color:"#c9a96e"} :
                             status === "partial" ? {background:"rgba(208,160,80,.08)",borderColor:"#d0a05044",color:"#d0a050"} :
                             {background:"transparent",borderColor:"#1e1c16",color:"#3a3428"})
                        }}>
                          {status === "visited" ? "visited" : status === "partial" ? "partial" : "mark"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ MAP VIEW ═══ */}
        {view === "map" && (
          <div style={{paddingTop:16}}>
            <div style={{display:"flex",gap:16,marginBottom:20,flexWrap:"wrap"}}>
              {regionStats.map(rs => (
                <div key={rs.region} style={{fontFamily:"'Outfit',sans-serif",fontSize:11,color:"#3a3428"}}>
                  <span style={{color:"#7a6a5a"}}>{rs.region}</span>
                  {" "}<span style={{color:"#c9a96e"}}>{rs.visited}</span>
                  {rs.partial > 0 && <span style={{color:"#d0a050"}}>+{rs.partial}</span>}
                  <span style={{color:"#2a2620"}}>/{rs.total}</span>
                </div>
              ))}
            </div>
            <div style={{background:"#111008",border:"1px solid #1a1814",borderRadius:12,padding:20,overflow:"hidden"}}>
              <svg viewBox="-180 -90 360 180" style={{width:"100%",height:"auto",maxHeight:420}}>
                {/* Simple world outline approximation */}
                <rect x="-180" y="-90" width="360" height="180" fill="#0d0c09"/>
                {/* Grid lines */}
                {[-60,-30,0,30,60].map(lat => <line key={`lat${lat}`} x1="-180" y1={-lat} x2="180" y2={-lat} stroke="#161410" strokeWidth=".3"/>)}
                {[-120,-60,0,60,120].map(lon => <line key={`lon${lon}`} x1={lon} y1="-90" x2={lon} y2="90" stroke="#161410" strokeWidth=".3"/>)}
                {/* Equator */}
                <line x1="-180" y1="0" x2="180" y2="0" stroke="#1e1c16" strokeWidth=".4" strokeDasharray="2,2"/>
                {/* Sites as dots */}
                {ALL_SITES.map(site => {
                  const status = visitStatus[site.id];
                  const isWished = wishlist.includes(site.id);
                  const color = status === "visited" ? "#c9a96e" : status === "partial" ? "#d0a050" : isWished ? "#5a5a7a" : "#2a2820";
                  const r = status ? 3.5 : 2;
                  return (
                    <circle key={site.id+site.name} className="map-dot"
                      cx={site.lon} cy={-site.lat} r={r}
                      fill={color} opacity={status ? 0.9 : 0.35}
                      onClick={() => setSelected(site)}>
                      <title>{site.name} — {site.country}</title>
                    </circle>
                  );
                })}
              </svg>
              <div style={{display:"flex",gap:16,marginTop:12,fontFamily:"'Outfit',sans-serif",fontSize:10,color:"#3a3428",justifyContent:"center"}}>
                <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:"50%",background:"#c9a96e",display:"inline-block"}}/>Visited</span>
                <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:"50%",background:"#d0a050",display:"inline-block"}}/>Partial</span>
                <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:"50%",background:"#5a5a7a",display:"inline-block"}}/>Wishlist</span>
                <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:"50%",background:"#2a2820",display:"inline-block"}}/>Unvisited</span>
              </div>
            </div>
          </div>
        )}

        {/* ═══ BADGES VIEW ═══ */}
        {view === "badges" && (
          <div style={{paddingTop:16}}>
            <div style={{marginBottom:20}}>
              <h2 style={{fontSize:"1.4rem",fontWeight:300,marginBottom:2}}>Passport stamps</h2>
              <p style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:"#3a3428"}}>{earnedBadges.length} of {BADGES.length} earned</p>
            </div>
            {BADGE_CATS.map(cat => {
              const catBadges = BADGES.filter(b => b.cat === cat);
              return (
                <div key={cat} style={{marginBottom:28}}>
                  <div style={{fontFamily:"'Outfit',sans-serif",fontSize:11,color:"#3a3428",marginBottom:10,paddingBottom:6,borderBottom:"1px solid #161410",letterSpacing:".03em"}}>
                    {BADGE_CAT_LABELS[cat]}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:12}}>
                    {catBadges.map(b => {
                      const earned = b.check(visited, ALL_SITES, wishlist, journal);
                      return (
                        <div key={b.id} style={{
                          textAlign:"center",padding:"16px 8px 12px",
                          background: earned ? "#161410" : "#0f0e0b",
                          border: `1px solid ${earned ? "#2a2620" : "#141210"}`,
                          borderRadius:10,
                          transition:"all .2s",
                          opacity: earned ? 1 : 0.3
                        }}>
                          <div style={{display:"flex",justifyContent:"center",marginBottom:6}}>
                            <StampSVG badge={b} earned={earned}/>
                          </div>
                          <div style={{fontFamily:"'Newsreader',serif",fontSize:14,fontWeight:400,color:earned?"#ddd5c4":"#2a2620",marginBottom:2}}>{b.name}</div>
                          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:10,color:earned?"#5a5448":"#1a1814",lineHeight:1.4}}>{b.desc}</div>
                          {earned && <div style={{fontFamily:"'Outfit',sans-serif",fontSize:9,color:"#c9a96e",letterSpacing:".12em",textTransform:"uppercase",marginTop:6}}>earned</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {/* Export button */}
            <div style={{borderTop:"1px solid #161410",paddingTop:16,marginTop:8}}>
              <button onClick={() => {
                const el = document.createElement('canvas');
                el.width = 1200; el.height = 630;
                const ctx = el.getContext('2d');
                ctx.fillStyle = '#0d0c09'; ctx.fillRect(0,0,1200,630);
                ctx.strokeStyle = '#c9a96e44'; ctx.lineWidth = 2;
                ctx.strokeRect(20,20,1160,590);
                ctx.fillStyle = '#c9a96e'; ctx.font = 'italic 42px Georgia,serif';
                ctx.textAlign = 'center';
                ctx.fillText('Heritage Atlas', 600, 80);
                ctx.fillStyle = '#5a5448'; ctx.font = '14px sans-serif';
                ctx.letterSpacing = '3px';
                ctx.fillText(`${visited.length} SITES VISITED  ·  ${earnedBadges.length} STAMPS EARNED  ·  ${new Set(ALL_SITES.filter(s=>visited.includes(s.id)).map(s=>s.country)).size} COUNTRIES`, 600, 110);
                ctx.strokeStyle = '#c9a96e22'; ctx.lineWidth = 0.5;
                ctx.beginPath(); ctx.moveTo(100,130); ctx.lineTo(1100,130); ctx.stroke();
                const earned = BADGES.filter(b => b.check(visited, ALL_SITES, wishlist, journal));
                const cols = Math.min(earned.length, 5);
                const spacing = 180;
                const startX = 600 - ((cols-1) * spacing) / 2;
                earned.slice(0,10).forEach((b, i) => {
                  const col = i % 5;
                  const row = Math.floor(i / 5);
                  const x = startX + col * spacing;
                  const y = 240 + row * 220;
                  ctx.strokeStyle = '#854F0B';
                  ctx.lineWidth = 2;
                  ctx.globalAlpha = 0.6;
                  ctx.beginPath(); ctx.arc(x, y, 60, 0, Math.PI*2); ctx.stroke();
                  ctx.globalAlpha = 0.3;
                  ctx.beginPath(); ctx.arc(x, y, 52, 0, Math.PI*2); ctx.stroke();
                  ctx.globalAlpha = 1;
                  ctx.fillStyle = '#854F0B'; ctx.font = 'italic 18px Georgia,serif';
                  ctx.fillText(b.main || b.name, x, y+6);
                  ctx.fillStyle = '#BA7517'; ctx.font = '9px sans-serif';
                  ctx.fillText(b.desc.toUpperCase(), x, y+26);
                });
                if (earned.length === 0) {
                  ctx.fillStyle = '#2a2620'; ctx.font = 'italic 18px Georgia,serif';
                  ctx.fillText('Your journey awaits...', 600, 350);
                }
                ctx.fillStyle = '#2a2620'; ctx.font = '11px sans-serif';
                ctx.fillText('heritage-atlas.vercel.app', 600, 600);
                const link = document.createElement('a');
                link.download = 'heritage-atlas-stamps.png';
                link.href = el.toDataURL('image/png');
                link.click();
                showNotif("Stamps exported as image");
              }} style={{
                fontFamily:"'Outfit',sans-serif",fontSize:11,fontWeight:400,
                padding:"10px 20px",borderRadius:8,border:"1px solid #2a2620",
                background:"#161410",color:"#c9a96e",cursor:"pointer",
                transition:"all .15s",display:"flex",alignItems:"center",gap:8
              }}>
                <Icon name="externalLink" size={14} color="#c9a96e"/>
                Export stamps as shareable image
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ═══ SITE DETAIL MODAL ═══ */}
      {selected && (
        <div className="modal-bg" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{padding:"20px 24px",borderBottom:"1px solid #1e1c16"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Outfit',sans-serif",fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:CAT_COLORS[selected.category],marginBottom:6}}>
                    {selected.category} · {selected.year} · {selected.region}
                  </div>
                  <h2 style={{fontSize:"1.5rem",fontWeight:300,color:"#ddd5c4",lineHeight:1.15,marginBottom:4}}>{selected.name}</h2>
                  <p style={{fontFamily:"'Outfit',sans-serif",fontSize:13,color:"#3a3428"}}>{selected.country}</p>
                  {selected.description && (
                    <p style={{fontFamily:"'Newsreader',serif",fontSize:14,color:"#7a6a5a",lineHeight:1.65,marginTop:10,fontStyle:"italic"}}>{selected.description}</p>
                  )}
                </div>
                <button onClick={() => setSelected(null)} style={{background:"none",border:"none",color:"#3a3428",cursor:"pointer",padding:4,marginLeft:12}}>
                  <Icon name="x" size={18} color="#3a3428"/>
                </button>
              </div>
            </div>
            <div style={{padding:"20px 24px"}}>
              {/* Actions row */}
              <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
                {/* Visit status */}
                {[
                  {state:null, label:"Not visited", icon:"x"},
                  {state:"partial", label:"Partial", icon:"check"},
                  {state:"visited", label:"Visited", icon:"check"},
                ].map(({state, label}) => {
                  const current = visitStatus[selected.id] || null;
                  const isActive = current === state;
                  return (
                    <button key={String(state)} className="pill" onClick={() => {
                      setVisitStatus(p => {
                        if (state === null) { const n = {...p}; delete n[selected.id]; return n; }
                        return {...p, [selected.id]: state};
                      });
                      showNotif(state ? `Marked as ${label.toLowerCase()}` : "Unmarked");
                    }} style={{
                      ...(isActive && state === "visited" ? {background:"rgba(201,169,110,.15)",borderColor:"#c9a96e55",color:"#c9a96e"} :
                         isActive && state === "partial" ? {background:"rgba(208,160,80,.1)",borderColor:"#d0a05055",color:"#d0a050"} :
                         isActive ? {background:"#1a1814",borderColor:"#2a2620",color:"#7a6a5a"} : {})
                    }}>{label}</button>
                  );
                })}
                <div style={{flex:1}}/>
                <button className="pill" onClick={e => toggleWish(selected.id, e)} style={wishlist.includes(selected.id)?{background:"rgba(201,169,110,.08)",borderColor:"#c9a96e33",color:"#c9a96e"}:{}}>
                  <span style={{display:"inline-flex",alignItems:"center",gap:4}}>
                    <Icon name="bookmark" size={12} color={wishlist.includes(selected.id)?"#c9a96e":"currentColor"}/>
                    {wishlist.includes(selected.id) ? "Wishlisted" : "Wishlist"}
                  </span>
                </button>
              </div>

              {/* External links */}
              <div style={{display:"flex",gap:14,marginBottom:20}}>
                {selected.lat && (
                  <a href={`https://maps.google.com?q=${selected.lat},${selected.lon}`} target="_blank" rel="noreferrer"
                    style={{fontFamily:"'Outfit',sans-serif",fontSize:11,color:"#5a5448",textDecoration:"none",display:"flex",alignItems:"center",gap:4}}>
                    <Icon name="map" size={12} color="#5a5448"/>View on map
                  </a>
                )}
                <a href={`https://whc.unesco.org/en/list/${selected.id}`} target="_blank" rel="noreferrer"
                  style={{fontFamily:"'Outfit',sans-serif",fontSize:11,color:"#5a5448",textDecoration:"none",display:"flex",alignItems:"center",gap:4}}>
                  <Icon name="externalLink" size={12} color="#5a5448"/>UNESCO page
                </a>
              </div>

              {/* Journal */}
              {visitStatus[selected.id] && (
                <div style={{borderTop:"1px solid #1a1814",paddingTop:18}}>
                  <div style={{fontFamily:"'Outfit',sans-serif",fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"#3a3428",marginBottom:14,display:"flex",alignItems:"center",gap:6}}>
                    <Icon name="journal" size={13} color="#3a3428"/>
                    Journal entry
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                    <div>
                      <label style={{fontFamily:"'Outfit',sans-serif",fontSize:10,color:"#2a2620",display:"block",marginBottom:4}}>Date</label>
                      <input type="date" defaultValue={journal[selected.id]?.date || ""} onChange={e => saveJournalEntry(selected.id, {date: e.target.value})} style={{fontSize:12}}/>
                    </div>
                    <div>
                      <label style={{fontFamily:"'Outfit',sans-serif",fontSize:10,color:"#2a2620",display:"block",marginBottom:4}}>Rating</label>
                      <div style={{display:"flex",gap:2,paddingTop:8}}>
                        {[1,2,3,4,5].map(n => (
                          <span key={n} className="star-btn" onClick={() => saveJournalEntry(selected.id, {rating: n})}
                            style={{color:(journal[selected.id]?.rating||0) >= n ? "#c9a96e" : "#1e1c16",fontSize:18}}>★</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label style={{fontFamily:"'Outfit',sans-serif",fontSize:10,color:"#2a2620",display:"block",marginBottom:4}}>Notes</label>
                    <textarea
                      placeholder={visitStatus[selected.id] === "partial" ? "What did you see? What's left to explore?" : "Your memories, tips, highlights…"}
                      defaultValue={journal[selected.id]?.notes || ""}
                      onChange={e => saveJournalEntry(selected.id, {notes: e.target.value})}
                    />
                  </div>
                </div>
              )}
              {!visitStatus[selected.id] && (
                <div style={{borderTop:"1px solid #1a1814",paddingTop:14}}>
                  <p style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:"#2a2620",fontStyle:"italic"}}>Mark as visited to unlock the journal.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── BADGE POPUP ── */}
      {newBadge && (
        <div className="badge-popup">
          <div style={{background:"#1a1814",border:"1px solid #2a2620",borderRadius:10,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 12px 40px rgba(0,0,0,.6)"}}>
            <div style={{width:56,height:56,flexShrink:0}}>
              <StampSVG badge={newBadge} earned={true}/>
            </div>
            <div>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:9,letterSpacing:".15em",textTransform:"uppercase",color:"#c9a96e",marginBottom:1}}>Stamp earned</div>
              <div style={{fontSize:15,color:"#ddd5c4",fontStyle:"italic"}}>{newBadge.name}</div>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:10,color:"#3a3428",marginTop:1}}>{newBadge.desc}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── NOTIFICATION ── */}
      {notif && (
        <div className="notif">
          <div style={{background:"#1a1814",border:"1px solid #1e1c16",borderRadius:8,padding:"7px 16px",fontFamily:"'Outfit',sans-serif",fontSize:11,color:"#c9a96e"}}>
            {notif}
          </div>
        </div>
      )}
    </div>
  );
}
