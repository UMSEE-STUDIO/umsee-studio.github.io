// Data loading: dialogue script, UI strings, career, art manifest. Safe local storage.
const LANGS = ['ko', 'en', 'ja', 'zh', 'tw', 'fr', 'es']; // zh = Simplified, tw = Traditional (Taiwan)

const Save = {
  get(k, d) { try { const v = localStorage.getItem('umw.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('umw.' + k, JSON.stringify(v)); } catch { /* storage may be blocked; keep working */ } },
};

const Data = {
  lang: 'en', strings: {}, dialogue: {}, career: null, art: [], about: null,

  async load() {
    const get = (u, type) => fetch(`${u}?v=${window.ASSET_V || Date.now()}`).then(r => { if (!r.ok) throw new Error(u + ' ' + r.status); return r[type](); });
    const [dlg, career, art, about, ...strs] = await Promise.all([
      get('data/dialogue.txt', 'text'), get('data/career.json', 'json'), get('art/manifest.json', 'json'), get('data/about.json', 'json'),
      ...LANGS.map(l => get(`i18n/${l}.json`, 'json')),
    ]);
    this.dialogue = parseDialogue(dlg);
    this.career = career; this.art = art; this.about = about;
    const count = {}; art.forEach(a => { a.no = (count[a.folder] = (count[a.folder] || 0) + 1); }); // stable number per series
    LANGS.forEach((l, i) => { this.strings[l] = strs[i]; });
    const picked = Save.get('langPick', null); // only an explicit choice (flag / title arrows) is remembered
    this.setLang(LANGS.includes(picked) ? picked : detectLang());
  },

  setLang(l, pick) { this.lang = l; if (pick) Save.set('langPick', l); document.documentElement.lang = l === 'tw' ? 'zh-Hant-TW' : l === 'zh' ? 'zh-Hans' : l; this.onLang?.(l); },
  t(key) { return this.strings[this.lang]?.[key] ?? this.strings.en?.[key] ?? key; },

  // Lines for a dialogue ID in the current language (one random group).
  say(id) {
    const groups = this.dialogue[id]; if (!groups?.length) return [];
    const g = groups[Math.floor(Math.random() * groups.length)];
    return g[this.lang] || g.en || g.ko || [];
  },
};

// Default language from the visitor's country, guessed locally (no external service):
// time zone first (country of access), then the browser language, then English.
function detectLang() {
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { /* old browsers */ }
  const TZ = [
    [/^Asia\/Seoul$/, 'ko'], [/^Asia\/Tokyo$/, 'ja'],
    [/^Asia\/(Taipei|Hong_Kong|Macau)$/, 'tw'],
    [/^Asia\/(Shanghai|Chongqing|Harbin|Urumqi)$/, 'zh'],
    [/^(Europe\/(Paris|Monaco)|Indian\/Reunion|America\/(Martinique|Guadeloupe|Cayenne)|Pacific\/(Tahiti|Noumea))$/, 'fr'],
    [/^(Europe\/Madrid|Atlantic\/Canary|Africa\/Ceuta|America\/(Mexico_City|Cancun|Monterrey|Merida|Chihuahua|Tijuana|Bogota|Lima|Santiago|Caracas|Montevideo|Asuncion|La_Paz|Guayaquil|Guatemala|El_Salvador|Tegucigalpa|Managua|Costa_Rica|Panama|Havana|Santo_Domingo|Puerto_Rico|Argentina\/.+))$/, 'es'],
  ];
  for (const [re, l] of TZ) if (re.test(tz)) return l;
  for (const n of navigator.languages || [navigator.language || '']) {
    const s = String(n).toLowerCase();
    if (/^zh-(tw|hk|mo|hant)/.test(s)) return 'tw';
    const l = s.slice(0, 2); if (LANGS.includes(l)) return l;
  }
  return 'en';
}

// Format: "@ID", "[상황] ..." (ignored), "<lang>: text", "---" group separator, "#" comment.
function parseDialogue(text) {
  const out = {}; let id = null, group = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('[')) continue;
    if (line.startsWith('@')) { id = line.slice(1).trim(); group = {}; out[id] = [group]; continue; }
    if (!id) continue;
    if (line === '---') { group = {}; out[id].push(group); continue; }
    const m = line.match(/^([a-z]{2}):\s*(.*?)\s*\|?$/);
    if (m) (group[m[1]] ||= []).push(m[2]);
  }
  return out;
}

// Lazy image cache: images are fetched only when first drawn.
const Images = {
  cache: new Map(),
  get(src) {
    let e = this.cache.get(src);
    if (!e) { e = new Image(); e.src = src; this.cache.set(src, e); }
    return e.complete && e.naturalWidth ? e : null;
  },
};
