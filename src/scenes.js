// Scene manager, pigeon actor, tile movement, title (M0). Rooms live in world.js.
const W = 320, H = 180, TILE = 16;
const COL = {
  pink: '#FB128E', yellow: '#FDE003', lilac: '#CEBEF5', black: '#000000', navy: '#0b0f2a', navyGray: '#3a3f5c',
  orange: '#FF8A1F', hot: '#FF4FB0', wall: '#2e3356', wallDark: '#22264a', floorA: '#3b3460', floorB: '#352f58',
  wood: '#8a5a3c', woodDark: '#5e3b27', white: '#f4f1ff', gray: '#9a9cb8', screen: '#7fe0ff',
};
const rect = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
// Visible window into the 320x180 world. Desktop: whole world. Portrait phones in rooms: a square
// window that follows the pigeon at 2x (main.js layout()).
const View = { x: 0, y: 0, w: W, h: H, scale: 1 };
// Console prompts: the A button pulses when something can be opened, the joystick wiggles when it is time to walk.
const Hint = { a: false, stick: false };

const Scenes = (() => {
  let current = null, next = null, nextArg, wipe = 0;
  const WIPE_SPEED = 3;
  function go(scene, arg) { if (!next) { next = scene; nextArg = arg; wipe = 0.0001; Audio8.sfx('door'); } }
  function start(scene, arg) { current = scene; scene.enter?.(arg); }
  function update(dt) {
    if (wipe > 0) {
      wipe += dt * WIPE_SPEED;
      if (wipe >= 1 && next) { UI.close(true); UI.hush(); UI.setLabel(''); Hint.a = Hint.stick = false; current.leave?.(); current = next; next = null; current.enter?.(nextArg); }
      if (wipe >= 2) wipe = 0;
    } else if (UI.viewer) UI.updateViewer();
    else if (UI.modal) UI.updateModal();
    else current.update(dt);
    Input.endFrame();
  }
  function draw(ctx, scale) {
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0); rect(ctx, COL.navy, 0, 0, cw, ch);
    ctx.translate(-View.x, -View.y);
    current.draw(ctx, scale);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (wipe > 0) {
      const p = wipe < 1 ? wipe : 2 - wipe;
      ctx.fillStyle = COL.black;
      for (let x = 0; x < cw; x += 8) {
        const h = Math.ceil(Math.min(1, Math.max(0, p * 1.6 - (x / cw) * 0.6)) * ch / 8) * 8;
        ctx.fillRect(x, 0, 8, h);
      }
    }
  }
  return { go, start, update, draw, get current() { return current; } };
})();

// ---- Pigeon ----
const Pigeon = {
  img: null,
  ROW: { right: 0, left: 0, down: 1, up: 2 },
  make(tx, ty, face = 'down') { return { tx, ty, x: tx * TILE, y: ty * TILE, face, moving: false, t: 0, path: [], goal: null }; },
  draw(ctx, p) {
    const frame = p.moving ? Math.floor(p.t * (p.fly ? 11.2 : 8)) % 4 : 0; // flying: a bit faster flaps (0.7x of the first version)
    const row = this.ROW[p.face], dx = Math.round(p.x) - 8, lift = p.fly ? 6 : 0, dy = Math.round(p.y) - 16 - lift;
    rect(ctx, 'rgba(0,0,0,0.25)', dx + 10, dy + 30 + lift, 12, 2);
    if (!this.img) { rect(ctx, COL.lilac, dx + 8, dy + 16, 16, 16); return; }
    ctx.save();
    if (p.face === 'left') { ctx.translate(dx + 32, dy); ctx.scale(-1, 1); ctx.drawImage(this.img, frame * 32, row * 32, 32, 32, 0, 0, 32, 32); }
    else ctx.drawImage(this.img, frame * 32, row * 32, 32, 32, dx, dy, 32, 32);
    ctx.restore();
  },
};

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
// Turn toward the mouse pointer, only when the pointer has moved since last time (keys/stick win otherwise).
let lastHoverKey = '';
function faceMouse(actor, cx, cy, mode) {
  const h = Input.hover; if (!h) return;
  const k = h.x + ',' + h.y; if (k === lastHoverKey) return; lastHoverKey = k;
  const dx = h.x - cx, dy = h.y - cy;
  if (mode === 'corridor') actor.face = h.x < 110 ? 'left' : h.x > 210 ? 'right' : 'up';
  else if (mode === 'lobby') actor.face = h.y < 130 ? 'up' : dx < 0 ? 'left' : 'right';
  else if (Math.abs(dx) > 6 || Math.abs(dy) > 6) actor.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
}

function findPath(grid, sx, sy, goals) {
  const w = grid[0].length, h = grid.length, isGoal = new Set(goals.map(([x, y]) => y * w + x));
  const prev = new Map([[sy * w + sx, null]]), q = [[sx, sy]];
  let end = null;
  while (q.length) {
    const [x, y] = q.shift();
    if (isGoal.has(y * w + x)) { end = y * w + x; break; }
    for (const [d, [ox, oy]] of Object.entries(DIRS)) {
      const nx = x + ox, ny = y + oy, k = ny * w + nx;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || grid[ny][nx] || prev.has(k)) continue;
      prev.set(k, [x, y, d]); q.push([nx, ny]);
    }
  }
  if (end === null) return null;
  const out = []; let k = end;
  while (prev.get(k)) { const [px, py, d] = prev.get(k); out.unshift(d); k = py * w + px; }
  return out;
}

// One tile step at a time; keyboard/pad and click paths share this movement.
function stepActor(p, grid, dt, wantDir, fgrid) {
  const SPEED = p.fly ? 123 : 64; // flying (door click, hops over furniture) is ~1.9x faster (0.7x of the first version)
  if (!p.moving) {
    const d = wantDir || p.path.shift();
    if (!d) return false;
    if (wantDir) { p.path = []; p.goal = null; }
    p.face = d;
    const [ox, oy] = DIRS[d], nx = p.tx + ox, ny = p.ty + oy;
    if ((p.air && fgrid ? fgrid : grid)[ny]?.[nx] !== 0) { p.path = []; p.air = false; return false; }
    p.tx = nx; p.ty = ny; p.moving = true;
  }
  p.t += dt;
  const gx = p.tx * TILE, gy = p.ty * TILE, s = SPEED * dt;
  p.x += Math.sign(gx - p.x) * Math.min(s, Math.abs(gx - p.x));
  p.y += Math.sign(gy - p.y) * Math.min(s, Math.abs(gy - p.y));
  if (p.x === gx && p.y === gy) { p.moving = false; if (!wantDir && !p.path.length) p.t = 0; return true; }
  return false;
}

// ---- M0 title ----
const TitleScene = {
  t: 0,
  camera: true, camTarget: () => ({ x: W / 2, y: H / 2 }), // phone: the square shows the centre
  enter() {
    this.t = 0; this.p = Pigeon.make(5, 7, 'right'); this.p.moving = true; this.refresh(); // visible at once (phone view starts ~x68)
    // logo as HTML text (web font) so it stays sharp at any scale, like the speech bubbles
    this.logo = document.createElement('div'); this.logo.className = 'logo';
    this.logo.innerHTML = '<div class="l1">UMMM... SEE?</div><div class="l2">PIXEL ARCADE</div>';
    document.getElementById('ui').appendChild(this.logo);
  },
  leave() { this.logo?.remove(); this.logo = null; },
  refresh() { UI.setLabel(`${Data.t('press')}\n${Data.t('langHint')}: ${Data.t('langName')}`, true); },
  update(dt) {
    this.t += dt; this.p.t += dt; this.p.x += dt * 28; if (this.p.x > W + 16) this.p.x = -32;
    const dl = Input.consume('dir:left') ? -1 : Input.consume('dir:right') ? 1 : 0;
    if (dl) { Data.setLang(LANGS[(LANGS.indexOf(Data.lang) + dl + LANGS.length) % LANGS.length], true); this.refresh(); Audio8.sfx('click'); }
    const tap = Input.takeTap();
    
    Hint.a = true;
    if (Input.consume('a') || tap) Scenes.go(HubScene);
  },
  draw(ctx) {
    rect(ctx, COL.navy, 0, 0, W, H);
    for (let i = 0; i < 40; i++) rect(ctx, i % 3 ? COL.lilac : COL.yellow, (i * 73 + Math.floor(this.t * 4) * (i % 2)) % W, (i * 37) % 100, 1, 1);
    rect(ctx, COL.pink, 70, 30, 180, 2); // the logo text itself is HTML (enter())
    rect(ctx, COL.navyGray, 0, 128, W, 2);
    Pigeon.draw(ctx, this.p);
  },
};

