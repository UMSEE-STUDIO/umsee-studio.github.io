// M2 gallery: pseudo-3D corridor drawn on the canvas; artworks are square thumbnail <img>s placed
// over the canvas so they stay sharp at any browser size. ▲▼ walk, ◀▶ / click / A open the artwork.
// Wheel hint: mouse users only. Shown ~1 s after entering the lobby or a corridor (after any other
// bubble), every entry, until the wheel has actually been used in this visit.
const wheelHint = { used: {}, wait: 0, done: false }; // used per hint (lobby / corridor)
function resetWheelHint() { wheelHint.wait = 1; wheelHint.done = false; }
function tickWheelHint(dt, id, anchor) {
  if (wheelHint.done || wheelHint.used[id] || matchMedia('(pointer: coarse)').matches) return;
  if (UI.bubbleOn()) return;
  if ((wheelHint.wait -= dt) > 0) return;
  wheelHint.done = true; UI.say(Data.say(id), anchor);
}

const GalleryScene = (() => {
  const ROOMS = ['acrylic', 'acrylic-mini', 'drawings'];
  const VP = { x: 160, y: 74 };
  let room = 0, pos = 0, target = 0, arts = [], layer = null, imgs = new Map();
  const walker = { x: 152, y: 146, face: 'up', moving: false, t: 0 }; // the pigeon, seen from behind
  let holdT = 0; // hold ▲/▼ (stick, keys) to keep walking: first repeat after 0.35 s, then every 0.22 s

  function slots() { return Math.ceil(arts.length / 2); }
  function setRoom(i) {
    room = (i + ROOMS.length) % ROOMS.length; pos = target = 0;
    arts = Data.art.filter(a => a.folder === ROOMS[room]).sort(() => Math.random() - 0.5); // random play each visit
    clearLayer(); label();
  }
  function label() { UI.setLabel(`${Data.t(ROOMS[room])}  ${Math.min(target + 1, slots())}/${slots()}`); }

  // Screen box (internal px) of slot k on side s (-1 left, 1 right): a square frame on the wall.
  function box(k, s) {
    const z = k - pos + 1.1;
    if (z < 0.55 || z > 9) return null;
    const size = Math.min(84, 50 / z), wallX = 150 / z;
    const x = s < 0 ? VP.x - wallX + 6 / z : VP.x + wallX - size - 6 / z;
    return { x, y: VP.y - size * 0.62, w: size, h: size, z };
  }

  function ensureLayer() {
    if (layer) return layer;
    layer = document.createElement('div'); layer.className = 'gal';
    const ui = document.getElementById('ui'); ui.insertBefore(layer, ui.firstChild);
    return layer;
  }
  function clearLayer() { imgs.forEach(el => el.remove()); imgs.clear(); }
  function open(i) { if (arts[i]) Panels.artwork(arts[i], i, arts); }

  function placeImages(scale) {
    ensureLayer();
    const seen = new Set();
    for (let k = 0; k < slots(); k++) for (const s of [-1, 1]) {
      const i = k * 2 + (s < 0 ? 0 : 1), a = arts[i], b = a && box(k, s);
      if (!b) continue;
      seen.add(i);
      let el = imgs.get(i);
      if (!el) {
        el = document.createElement('img'); el.src = a.thumb; el.alt = `${Data.t('untitled')} #${i + 1}`; el.draggable = false;
        el.addEventListener('click', () => { Audio8.unlock(); walker.face = i % 2 ? 'right' : 'left'; open(i); });
        layer.appendChild(el); imgs.set(i, el);
      }
      el.style.left = (b.x - View.x) * scale + 'px'; el.style.top = (b.y - View.y) * scale + 'px';
      el.style.width = el.style.height = b.w * scale + 'px';
      el.style.zIndex = String(100 - Math.round(b.z * 10));
      el.alt = `${Data.t('untitled')} #${a.no}`;
      el.style.borderWidth = Math.max(1, Math.round(3 * scale / b.z)) + 'px';
      el.style.filter = `brightness(${Math.max(0.45, 1.08 - b.z * 0.07)})`;
    }
    imgs.forEach((el, i) => { if (!seen.has(i)) { el.remove(); imgs.delete(i); } });
  }

  return {
    camera: true, camTarget: () => ({ x: W / 2, y: H / 2 }), // phone: fixed square, no panning
    enter(r) {
      setRoom(r || 0); Audio8.setTrack('main'); resetWheelHint(); walker.face = 'up';
      if (!Save.get('enter.gallery', false)) { Save.set('enter.gallery', true); setTimeout(() => UI.say(Data.say('ENTER_GALLERY'), { x: 160, y: 130 }), 600); }
    },
    leave() { clearLayer(); },
    update(dt) {
      tickWheelHint(dt, 'HINT_WHEEL', () => ({ x: walker.x + 8, y: walker.y - 14 }));
      Hint.a = false; Hint.stick = target === 0;
      if (!Input.dir()) faceMouse(walker, walker.x + 8, walker.y);
      pos += Math.sign(target - pos) * Math.min(Math.abs(target - pos), dt * 4);
      // auto-repeat while ▲/▼ is held (joystick on phones): one step per tick, never left/right
      const held = Input.dir();
      if (held === 'up' || held === 'down') {
        if (Input.consume('dir:' + held)) { holdT = -0.35; Input.repeat('dir:' + held); } // fresh press: step now, then wait
        else if ((holdT += dt) >= 0) { holdT = -0.22; Input.repeat('dir:' + held); }
      } else holdT = 0;
      const tap = Input.takeTap();
      if (tap) { // images catch their own clicks; canvas taps: edges = artwork, centre = walk
        if (tap.x < 80) { walker.face = 'left'; open(target * 2); } else if (tap.x > 240) { walker.face = 'right'; open(target * 2 + 1); }
        else if (tap.y > 135) { walker.face = 'down'; if (target > 0) target--; } else { walker.face = 'up'; if (target < slots() - 1) target++; }
        label(); return;
      }
      if (Input.consume('wheel:up') && (wheelHint.used.HINT_WHEEL = true) || Input.consume('dir:up')) { walker.face = 'up'; if (target < slots() - 1) target++; else { Scenes.go(LobbyScene, room); return; } }
      else if (Input.consume('wheel:down') && (wheelHint.used.HINT_WHEEL = true) || Input.consume('dir:down')) { walker.face = 'down'; if (target > 0) target--; else { Scenes.go(LobbyScene, room); return; } }
      else if (Input.consume('dir:left')) { walker.face = 'left'; open(target * 2); }
      else if (Input.consume('dir:right')) { walker.face = 'right'; open(arts[target * 2 + 1] ? target * 2 + 1 : target * 2); }
      else if (Input.consume('a')) open(target * 2);
      else if (Input.consume('b')) { Scenes.go(LobbyScene, room); return; }
      else return;
      UI.hush(); label();
    },
    draw(ctx, scale) {
      rect(ctx, '#1d1a3a', 0, 0, W, H);
      const far = 9, fw = 150 / far, ftop = 70 / far, fbot = 90 / far;
      ctx.fillStyle = '#2b2550'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(VP.x - fw, VP.y - ftop); ctx.lineTo(VP.x - fw, VP.y + fbot); ctx.lineTo(0, H); ctx.fill();
      ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(VP.x + fw, VP.y - ftop); ctx.lineTo(VP.x + fw, VP.y + fbot); ctx.lineTo(W, H); ctx.fill();
      ctx.fillStyle = '#3b3460'; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(VP.x - fw, VP.y + fbot); ctx.lineTo(VP.x + fw, VP.y + fbot); ctx.lineTo(W, H); ctx.fill();
      for (let k = Math.floor(pos); k < pos + 9; k++) {
        const z = k - pos + 1.1; if (z < 0.4) continue;
        rect(ctx, k % 2 ? '#443b69' : '#352f58', 0, Math.round(VP.y + 90 / z), W, 1);
      }
      rect(ctx, '#151230', VP.x - fw, VP.y - ftop, fw * 2, ftop + fbot);
      const endZ = slots() - pos + 1.1;
      if (endZ < 9) { const s = 1 / endZ; rect(ctx, COL.wood, VP.x - 14 * s, VP.y + 50 * s, 28 * s, 40 * s); rect(ctx, COL.yellow, VP.x + 8 * s, VP.y + 70 * s, 3 * s, 3 * s); }
      for (let k = Math.ceil(pos); k < pos + 8; k++) { const z = k - pos + 1.1; rect(ctx, COL.yellow, VP.x - 10 / z, VP.y - 70 / z, 20 / z, 2); }
      for (const s of [-1, 1]) { const b = box(target, s); if (b) rect(ctx, 'rgba(253,224,3,0.06)', b.x - 4, b.y + b.h, b.w + 8, 30 / b.z); }
      walker.moving = Math.abs(target - pos) > 0.01; if (walker.moving) walker.t += 1 / 60;
      Pigeon.draw(ctx, walker);
      placeImages(scale);
    },
  };
})();

// M2 lobby: three doors (acrylic, acrylic mini, drawings), each with a random representative artwork.
const LobbyScene = (() => {
  const ROOMS = ['acrylic', 'acrylic-mini', 'drawings'];
  const DOORS = [{ x: 30, w: 76 }, { x: 122, w: 76 }, { x: 214, w: 76 }]; // internal px
  let sel = 1, reps = [], layer = null, lastHv = '', pg = null;

  function label() { UI.setLabel(Data.t(ROOMS[sel])); } // room name only (no count)
  function enter(i) { Audio8.sfx('door'); Scenes.go(GalleryScene, i); }
  function doorAt(x, y) { return DOORS.findIndex(d => x >= d.x && x < d.x + d.w && y > 20 && y < 160); }
  function clear() { layer?.remove(); layer = null; }

  return {
    camera: true, camTarget: () => ({ x: pg ? pg.x + 8 : W / 2, y: H / 2 }),
    enter(from) {
      sel = Number.isInteger(from) ? from : 1; Audio8.setTrack('main');
      reps = ROOMS.map(s => { const l = Data.art.filter(a => a.folder === s); return l[Math.floor(Math.random() * l.length)]; });
      clear(); label(); resetWheelHint();
      pg = Pigeon.make(0, 0, 'up'); pg.x = DOORS[sel].x + DOORS[sel].w / 2 - 8; pg.y = 150;
      if (!Save.get('enter.gallery', false)) { Save.set('enter.gallery', true); setTimeout(() => UI.say(Data.say('ENTER_GALLERY'), () => ({ x: pg.x + 8, y: pg.y - 14 })), 600); }
    },
    leave() { clear(); },
    update(dt) {
      const gx = DOORS[sel].x + DOORS[sel].w / 2 - 8, dx = gx - pg.x;
      pg.moving = Math.abs(dx) > 0.5; if (pg.moving) { pg.face = dx > 0 ? 'right' : 'left'; pg.x += Math.sign(dx) * Math.min(Math.abs(dx), dt * 110); pg.t += dt; if (Math.abs(gx - pg.x) <= 0.5) pg.face = 'up'; }
      tickWheelHint(dt, 'HINT_WHEEL_LOBBY', () => ({ x: pg.x + 8, y: pg.y - 14 }));
      Hint.a = true; Hint.stick = false;
      if (!pg.moving) faceMouse(pg, pg.x + 8, pg.y);
      const tap = Input.takeTap(), hv = Input.hover;
      const h = hv ? doorAt(hv.x, hv.y) : -1;
      document.getElementById('screen').style.cursor = h >= 0 ? 'pointer' : '';
      const hk = hv ? hv.x + ',' + hv.y : '';
      if (hk !== lastHv) { lastHv = hk; if (h >= 0 && h !== sel) { sel = h; label(); } } // only when the mouse moves
      if (tap) { const d = doorAt(tap.x, tap.y); if (d >= 0) { enter(d); return; } }
      // independent checks: a move and a confirm in the same frame must both count
      if (Input.consume('wheel:up') && (wheelHint.used.HINT_WHEEL_LOBBY = true) || Input.consume('dir:left')) { sel = (sel + 2) % 3; label(); Audio8.sfx('click'); }
      if (Input.consume('wheel:down') && (wheelHint.used.HINT_WHEEL_LOBBY = true) || Input.consume('dir:right')) { sel = (sel + 1) % 3; label(); Audio8.sfx('click'); }
      // enter with A / Enter / click only: a slight upward stick push must not open a door
      if (Input.consume('a')) enter(sel);
      else if (Input.consume('b')) Scenes.go(HubScene, 'gallery'); // B / Esc only (no stick-down exit)
    },
    draw(ctx, scale) {
      // hall: back wall, floor, three doors with a framed artwork above each
      rect(ctx, '#2b2550', 0, 0, W, 132); for (let x = 0; x < W; x += 8) rect(ctx, (x / 8) % 2 ? '#2b2550' : '#312a5a', x, 0, 8, 132);
      rect(ctx, COL.pink, 0, 0, W, 2); rect(ctx, '#1a1636', 0, 128, W, 4);
      for (let y = 132; y < H; y += 6) rect(ctx, (y / 6) % 2 ? '#3b3460' : '#352f58', 0, y, W, 6);
      ctx.fillStyle = 'rgba(253,224,3,0.06)';
      DOORS.forEach((d, i) => {
        const on = i === sel, dx = d.x + 14, dw = d.w - 28, dy = 84, dh = 46;
        if (on) { ctx.beginPath(); ctx.moveTo(d.x + 10, 132); ctx.lineTo(d.x + d.w - 10, 132); ctx.lineTo(d.x + d.w + 6, H); ctx.lineTo(d.x - 6, H); ctx.fill(); }
        rect(ctx, '#1a1636', dx - 3, dy - 3, dw + 6, dh + 3); rect(ctx, COL.woodDark, dx - 2, dy - 2, dw + 4, dh + 2);
        rect(ctx, on ? '#7b5fb4' : '#5a4688', dx, dy, dw, dh); rect(ctx, '#0002', dx + 4, dy + 4, dw / 2 - 6, 16); rect(ctx, '#0002', dx + dw / 2 + 2, dy + 4, dw / 2 - 6, 16);
        rect(ctx, COL.yellow, dx + dw - 8, dy + 24, 3, 3);
        // spotlight
        rect(ctx, on ? 'rgba(253,224,3,0.18)' : 'rgba(253,224,3,0.06)', d.x + 4, 4, d.w - 8, 2);
      });
      Pigeon.draw(ctx, pg);
      // representative artworks as sharp thumbnails
      if (!layer) {
        layer = document.createElement('div'); layer.className = 'gal';
        const ui = document.getElementById('ui'); ui.insertBefore(layer, ui.firstChild);
        reps.forEach((a, i) => {
          if (!a) return;
          const img = document.createElement('img'); img.src = a.thumb; img.alt = Data.t(ROOMS[i]); img.draggable = false;
          img.addEventListener('click', () => { Audio8.unlock(); enter(i); });
          layer.appendChild(img);
        });
        // door name plates as HTML text so they stay sharp at any scale
        ROOMS.forEach((s, i) => {
          const t = document.createElement('div'); t.className = 'plate';
          t.addEventListener('click', () => { Audio8.unlock(); enter(i); });
          layer.appendChild(t);
        });
      }
      layer.querySelectorAll('.plate').forEach((t, i) => {
        const d = DOORS[i];
        if (t.textContent !== Data.t(ROOMS[i])) t.textContent = Data.t(ROOMS[i]);
        t.classList.toggle('on', i === sel);
        Object.assign(t.style, { left: (d.x + d.w / 2 - View.x) * scale + 'px', top: (75 - View.y) * scale + 'px' }); // centre; size and font as the speech bubble
      });
      [...layer.querySelectorAll('img')].forEach((img, i) => {
        const d = DOORS[i], s = 48;
        Object.assign(img.style, { left: (d.x + (d.w - s) / 2 - View.x) * scale + 'px', top: (19 - View.y) * scale + 'px', width: s * scale + 'px', height: s * scale + 'px',
          borderWidth: Math.max(2, scale * 2) + 'px', borderColor: i === sel ? '#FB128E' : '#FDE003', filter: i === sel ? 'none' : 'brightness(.75)' });
      });
    },
  };
})();
