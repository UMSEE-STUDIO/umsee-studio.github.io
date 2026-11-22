// Boot: load data, integer scaling, fixed-step loop, console extras (help, BGM, volume).
(async () => {
  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d');
  const ui = document.getElementById('ui');
  const pad = document.getElementById('console'), ctlEl = document.getElementById('controls');
  let scale = 1;

  // Layout. Desktop/landscape: whole 320x180 world at an integer scale.
  // Portrait phone: rooms use a square window following the pigeon at 2x; fixed screens
  // (title, gallery, career) fill the width (fractional scale, only on phones).
  let portrait = false;
  function resize() {
    portrait = innerWidth < 700 && innerHeight > innerWidth;
    document.body.classList.toggle('portrait', portrait);
    layout(true);
  }
  function layout(force) {
    const cam = portrait && !!Scenes.current?.camera;
    const availH = innerHeight - pad.offsetHeight - ctlEl.offsetHeight - document.getElementById('langs').offsetHeight - (portrait ? 40 : 78);
    const availW = innerWidth - (portrait ? 24 : 48); // device body + bezel
    let w = W, h = H;
    if (cam) { const side = Math.min(200, Math.floor(availW / 2)); w = h = side; scale = 2; }
    else if (portrait) scale = Math.min(availW / W, availH / H);
    else scale = Math.max(1, Math.floor(Math.min(availW / W, availH / H)));
    if (force || canvas.width !== w || canvas.height !== h || View.scale !== scale) {
      canvas.width = w; canvas.height = h; ctx.imageSmoothingEnabled = false;
      canvas.style.width = w * scale + 'px'; canvas.style.height = h * scale + 'px';
      ui.style.setProperty('--s', scale);
    }
    View.w = w; View.h = h; View.scale = scale;
    const p = cam && Scenes.current.p;
    if (p) {
      View.x = Math.round(Math.max(0, Math.min(W - w, p.x + 8 - w / 2)));
      View.y = h >= H ? -Math.floor((h - H) / 2) : Math.round(Math.max(0, Math.min(H - h, p.y - h / 2)));
    } else { View.x = 0; View.y = 0; }
  }
  addEventListener('resize', resize);
  resize();

  Input.attach(canvas, (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    return { x: Math.floor((cx - r.left) / scale) + View.x, y: Math.floor((cy - r.top) / scale) + View.y };
  });
  Input.onAny(() => Audio8.unlock());
  Input.wheelWhen(() => !UI.modal && !UI.viewer && (Scenes.current === GalleryScene || Scenes.current === LobbyScene));

  const bgm = document.getElementById('bgm'), vol = document.getElementById('vol');
  const syncBgm = () => document.querySelectorAll('#bgm, .fb.blue').forEach(b => b.classList.toggle('off', !Audio8.on));
  syncBgm(); vol.value = Math.round(Audio8.vol * 100);
  bgm.addEventListener('click', () => { Audio8.unlock(); Audio8.setOn(!Audio8.on); syncBgm(); });
  // M key = mute toggle (same as the ♪ button)
  addEventListener('keydown', e => { if (e.code === 'KeyM' && !e.repeat) { e.preventDefault(); bgm.click(); } });
  vol.addEventListener('input', () => { Audio8.unlock(); Audio8.setVol(vol.value / 100); });
  document.getElementById('help').addEventListener('click', () => {
    const s = Scenes.current;
    if (s?.p) UI.say([Data.t('help')], () => ({ x: s.p.x + 8, y: s.p.y - 14 }));
    else UI.say([Data.t('help')], { x: 160, y: 120 });
  });

  // Language flags (inline SVG: Windows does not draw flag emoji).
  const FLAGS = {
    en: '<rect width="30" height="20" fill="#012169"/><path d="M0 0L30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0L30 20M30 0L0 20" stroke="#C8102E" stroke-width="1.6"/><path d="M15 0V20M0 10H30" stroke="#fff" stroke-width="6"/><path d="M15 0V20M0 10H30" stroke="#C8102E" stroke-width="3.4"/>',
    ko: '<rect width="30" height="20" fill="#fff"/><path d="M11 10a4 4 0 0 1 8 0z" fill="#CD2E3A"/><path d="M11 10a4 4 0 0 0 8 0z" fill="#0047A0"/><g fill="#000"><rect x="3" y="3" width="5" height="1.2" transform="rotate(34 5.5 3.6)"/><rect x="22" y="3" width="5" height="1.2" transform="rotate(-34 24.5 3.6)"/><rect x="3" y="15.8" width="5" height="1.2" transform="rotate(-34 5.5 16.4)"/><rect x="22" y="15.8" width="5" height="1.2" transform="rotate(34 24.5 16.4)"/></g>',
    ja: '<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#BC002D"/>',
    // Chinese: neutral language badge, not a national flag (readers in Taiwan, Hong Kong, Singapore...)
    zh: '<rect width="30" height="20" rx="2" fill="#C8102E"/><text x="15" y="15" text-anchor="middle" font-size="13" font-family="sans-serif" fill="#FFDE00">中</text>',
    tw: '<rect width="30" height="20" fill="#FE0000"/><rect width="15" height="10" fill="#000095"/><circle cx="7.5" cy="5" r="2.6" fill="#fff"/><circle cx="7.5" cy="5" r="1.9" fill="#000095"/><circle cx="7.5" cy="5" r="1.6" fill="#fff"/><g stroke="#fff" stroke-width="1"><path d="M7.5 0.8V2M7.5 8V9.2M3.3 5H4.5M10.5 5H11.7M4.5 2L5.3 2.8M9.7 7.2L10.5 8M10.5 2L9.7 2.8M5.3 7.2L4.5 8"/></g>',
    fr: '<rect width="10" height="20" fill="#0055A4"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#EF4135"/>',
    es: '<rect width="30" height="20" fill="#AA151B"/><rect y="5" width="30" height="10" fill="#F1BF00"/>',
  };
  const langs = document.getElementById('langs');
  langs.innerHTML = LANGS.map(l => `<button data-lang="${l}" title="${l}" aria-label="${l}"><svg viewBox="0 0 30 20" width="30" height="20">${FLAGS[l]}</svg></button>`).join('');
  langs.addEventListener('click', e => {
    const b = e.target.closest('[data-lang]'); if (!b) return;
    Audio8.unlock(); Audio8.sfx('click'); Data.setLang(b.dataset.lang, true);
  });
  Data.onLang = l => {
    langs.querySelectorAll('[data-lang]').forEach(b => b.classList.toggle('on', b.dataset.lang === l));
    if (Scenes.current === TitleScene) TitleScene.refresh();
  };

  const img = new Image();
  img.onload = () => { Pigeon.img = img; };
  img.src = 'assets/pigeon_sheet.png';

  try { await Data.load(); }
  catch (err) { ctx.fillStyle = '#fff'; ctx.font = '8px monospace'; ctx.fillText('Load failed: ' + err.message, 8, 90); throw err; }

  Data.onLang(Data.lang);
  Scenes.start(TitleScene);
  const STEP = 1 / 60;
  let last = performance.now(), acc = 0;
  function frame(now) {
    const dt = Math.min(0.25, (now - last) / 1000); last = now; acc += dt;
    while (acc >= STEP) { Scenes.update(STEP); acc -= STEP; }
    layout();
    ctx.imageSmoothingEnabled = false;
    Scenes.draw(ctx, scale);
    UI.update(dt, scale);
    const c = Scenes.current, key = UI.viewer ? 'ctlViewer' : UI.modal ? (UI.modal.classList.contains('art') ? 'ctlArt' : UI.modal.classList.contains('crt') ? 'ctlCareer' : UI.modal.classList.contains('tv') ? 'ctlTv' : 'ctlPanel')
      : c === TitleScene ? 'ctlTitle' : c === LobbyScene ? 'ctlLobby' : c === GalleryScene ? 'ctlGallery' : c === CareerScene ? 'ctlCareer' : 'ctlRoom';
    if (ctlEl.dataset.k !== key + Data.lang) { ctlEl.dataset.k = key + Data.lang; ctlEl.textContent = Data.t(key); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
