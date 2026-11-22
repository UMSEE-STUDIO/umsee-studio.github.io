// Rooms: hub M1 (Umsee studio) and M4-M6. Grid 20x11 tiles: rows 0-2 = back wall (48px),
// rows 3-9 = floor, row 10 = front wall. Objects are boxes in tiles; tall things draw upward.
const ROWS = 11, COLS = 20, WALL_H = 48;

// ---------- room shell ----------
const THEMES = {
  studio: { wall: '#3d3570', wall2: '#463d7c', dot: '#5a4f96', floor: '#8a5f45', floor2: '#7a523b', seam: '#5e3b27', trim: '#FB128E' },
  meeting: { wall: '#2f4a6e', wall2: '#355378', dot: '#4a6a94', floor: '#6c6f86', floor2: '#62657c', seam: '#4a4c60', trim: '#FDE003' },
  interview: { wall: '#4a2c5a', wall2: '#553366', dot: '#6e4783', floor: '#5b3b4f', floor2: '#523546', seam: '#3a2533', trim: '#CEBEF5' },
  contact: { wall: '#2f5a5a', wall2: '#356464', dot: '#4f8282', floor: '#9a7350', floor2: '#8c6746', seam: '#664a33', trim: '#FF8A1F' },
};
const shellCache = {};
function drawRoomShell(ctx, theme) {
  if (!shellCache[theme]) {
    const T = THEMES[theme], c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    rect(g, COL.navy, 0, 0, W, H);
    for (let y = WALL_H; y < 160; y += 8) {
      rect(g, (y / 8) % 2 ? T.floor : T.floor2, 16, y, W - 32, 8);
      rect(g, T.seam, 16, y + 7, W - 32, 1);
      for (let x = 16 + ((y / 8) % 4) * 12; x < W - 16; x += 48) rect(g, T.seam, x, y, 1, 7);
      for (let x = 22 + (y * 7) % 37; x < W - 16; x += 61) rect(g, '#ffffff10', x, y + 2, 6, 1);
    }
    for (let x = 16; x < W - 16; x += 8) rect(g, (x / 8) % 2 ? T.wall : T.wall2, x, 0, 8, WALL_H);
    for (let x = 20; x < W - 16; x += 16) for (let y = 8; y < WALL_H - 6; y += 10) rect(g, T.dot, x + ((y / 10) % 2) * 8, y, 1, 1);
    rect(g, T.trim, 16, 0, W - 32, 2); rect(g, '#0003', 16, 2, W - 32, 1);
    rect(g, '#1a1636', 16, WALL_H - 4, W - 32, 4); rect(g, '#ffffff22', 16, WALL_H - 4, W - 32, 1);
    rect(g, '#0004', 16, WALL_H, W - 32, 3);
    for (const [x, d] of [[0, 1], [W - 16, -1]]) { rect(g, '#1e1a3d', x, 0, 16, H); rect(g, '#2a2550', x + (d > 0 ? 12 : 0), 0, 4, 160); }
    rect(g, '#1e1a3d', 0, 160, W, 20); rect(g, '#2a2550', 16, 160, W - 32, 3);
    shellCache[theme] = c;
  }
  ctx.drawImage(shellCache[theme], 0, 0);
}
function windowLight(ctx, x) {
  ctx.fillStyle = 'rgba(255,240,200,0.07)';
  ctx.beginPath(); ctx.moveTo(x + 6, WALL_H); ctx.lineTo(x + 30, WALL_H); ctx.lineTo(x + 70, 140); ctx.lineTo(x + 36, 140); ctx.fill();
  const t = performance.now() / 1000;
  for (let i = 0; i < 6; i++) rect(ctx, 'rgba(255,250,220,0.5)', Math.round(x + 16 + i * 7 + Math.sin(t + i) * 4 + ((t * 3 + i * 13) % 40) * 0.6), Math.round(54 + ((t * 6 + i * 17) % 80)), 1, 1);
}
const shadow = (ctx, x, y, w) => rect(ctx, 'rgba(0,0,0,0.25)', x + 2, y, w - 4, 3);

// Random acrylic artworks on free wall spots (chosen once per visit of the page).
const wallPicks = {}, wallRects = {};
function wallArt(ctx, room, xs) {
  if (!wallPicks[room]) {
    const pool = Data.art.filter(a => a.folder === 'acrylic').sort(() => Math.random() - 0.5);
    wallPicks[room] = xs.map((_, i) => pool[i % pool.length]);
  }
  wallRects[room] = [];
  xs.forEach((x, i) => {
    const a = wallPicks[room][i], s = 22, y = 10 + (i % 2) * 3;
    if (a) wallRects[room].push({ x, y, w: s + 2, h: s + 2, art: a });
    rect(ctx, '#0004', x + 2, y + 2, s + 4, s + 4); rect(ctx, '#1a1636', x - 1, y - 1, s + 4, s + 4); rect(ctx, COL.yellow, x, y, s + 2, s + 2);
    const img = a && Images.get(a.pixel); if (img) ctx.drawImage(img, x + 1, y + 1, s, s); else rect(ctx, COL.hot, x + 1, y + 1, s, s);
    rect(ctx, COL.yellow, x + s / 2, y - 4, 2, 3);
  });
}

// ---------- furniture (X,Y = box top-left px, w,h = box px) ----------
const artPix = i => Data.art[i] && Images.get(Data.art[i].pixel);
const Draw = {
  door(ctx, X, Y, w, c, icon) {
    const y = 6, h = WALL_H - 6;
    rect(ctx, '#1a1636', X + 1, y - 2, w - 2, h + 2); rect(ctx, COL.woodDark, X + 2, y - 1, w - 4, h + 1);
    rect(ctx, c, X + 5, y + 2, w - 10, h - 2); rect(ctx, '#ffffff22', X + 5, y + 2, w - 10, 1); rect(ctx, '#0003', X + w - 7, y + 2, 2, h - 2);
    rect(ctx, '#0002', X + 8, y + 6, w / 2 - 10, 14); rect(ctx, '#0002', X + w / 2 + 2, y + 6, w / 2 - 10, 14);
    rect(ctx, '#0002', X + 8, y + 24, w / 2 - 10, 12); rect(ctx, '#0002', X + w / 2 + 2, y + 24, w / 2 - 10, 12);
    rect(ctx, COL.yellow, X + w - 12, y + 20, 4, 3);
    rect(ctx, '#0004', X + 4, WALL_H, w - 8, 4); // threshold shadow
    if (icon) icon(ctx, X + w / 2, 0);
  },
  icon: {
    frame: (c, cx, y) => { rect(c, '#1a1636', cx - 6, y, 12, 7); rect(c, COL.yellow, cx - 5, y, 10, 6); rect(c, COL.hot, cx - 4, y + 1, 8, 4); },
    bell: (c, cx, y) => { rect(c, COL.yellow, cx - 3, y + 1, 6, 4); rect(c, COL.yellow, cx - 4, y + 4, 8, 1); rect(c, COL.orange, cx - 1, y + 5, 2, 1); },
  },
  window(ctx, X, w) {
    const y = 6, h = 30;
    rect(ctx, '#1a1636', X + 1, y - 1, w - 2, h + 2); rect(ctx, COL.white, X + 2, y, w - 4, h);
    const sky = ctx.createLinearGradient(0, y + 2, 0, y + h - 2); sky.addColorStop(0, '#5ec8ff'); sky.addColorStop(1, '#c9ecff');
    ctx.fillStyle = sky; ctx.fillRect(X + 4, y + 2, w - 8, h - 4);
    rect(ctx, '#fff', X + 8, y + 6, 8, 2); rect(ctx, '#fff', X + 10, y + 5, 4, 1); rect(ctx, '#ffffffaa', X + w - 14, y + 12, 6, 1);
    rect(ctx, '#7fb86a', X + 4, y + h - 7, w - 8, 5); rect(ctx, '#5a9a4c', X + 10, y + h - 9, 6, 3); // far trees
    rect(ctx, COL.white, X + w / 2 - 1, y + 2, 2, h - 4); rect(ctx, COL.white, X + 4, y + h / 2 - 1, w - 8, 2);
    rect(ctx, COL.pink, X - 1, y + h, w + 2, 3); rect(ctx, '#b80d66', X - 1, y + h + 3, w + 2, 1);
    rect(ctx, '#3fbf6a', X + 3, y + h - 5, 4, 5); rect(ctx, COL.orange, X + 3, y + h - 1, 4, 1);
  },
  poster(ctx, X) {
    const y = 8;
    rect(ctx, '#1a1636', X, y - 1, 16, 30); rect(ctx, COL.pink, X + 1, y, 14, 28);
    rect(ctx, COL.lilac, X + 3, y + 3, 10, 12); rect(ctx, '#f4d1c0', X + 5, y + 6, 6, 7); rect(ctx, COL.navy, X + 5, y + 4, 6, 3);
    rect(ctx, COL.navy, X + 6, y + 9, 1, 1); rect(ctx, COL.navy, X + 9, y + 9, 1, 1); rect(ctx, COL.hot, X + 7, y + 11, 2, 1);
    rect(ctx, COL.yellow, X + 3, y + 18, 10, 2); rect(ctx, COL.white, X + 3, y + 22, 7, 1); rect(ctx, COL.white, X + 3, y + 24, 9, 1);
    rect(ctx, COL.yellow, X + 7, y - 2, 2, 2);
  },
  bookshelf(ctx, X, w) {
    const y = 4, h = WALL_H - 2;
    rect(ctx, COL.woodDark, X, y, w, h); rect(ctx, '#b07850', X, y, w, 1);
    const books = [COL.pink, COL.yellow, COL.lilac, COL.orange, '#5ec8ff', COL.hot, '#3fbf6a'];
    for (let r = 0; r < 4; r++) {
      const ry = y + 2 + r * 11;
      rect(ctx, '#3d2518', X + 2, ry, w - 4, 9);
      for (let i = 0, bx = X + 3; bx < X + w - 5; i++) { const bw = 2 + (i * 7 + r) % 3, bh = 6 + (i + r) % 3; rect(ctx, books[(i * 3 + r) % books.length], bx, ry + 9 - bh, bw, bh); bx += bw + 1; }
      if (r === 1) { rect(ctx, COL.white, X + w - 10, ry + 1, 7, 8); rect(ctx, COL.pink, X + w - 9, ry + 2, 5, 6); } // small canvas
      rect(ctx, COL.wood, X, ry + 9, w, 2);
    }
    shadow(ctx, X, WALL_H, w);
  },
  crt(ctx, X, Y, w, h, glow) { // big TV on a low stand; screen fills most of the box
    const t = performance.now(), sy = Y - 18, sh = h + 4;
    shadow(ctx, X, Y + h - 1, w);
    rect(ctx, COL.woodDark, X + 2, Y + h - 10, w - 4, 10); rect(ctx, COL.wood, X + 2, Y + h - 10, w - 4, 2);
    rect(ctx, '#4a4e68', X, sy, w, sh); rect(ctx, '#7c81a3', X + 1, sy, w - 2, sh - 2); rect(ctx, '#9da2c4', X + 1, sy, w - 2, 1);
    const sw = w - 16;
    rect(ctx, '#1b1d33', X + 4, sy + 4, sw, sh - 10);
    rect(ctx, glow ? (Math.floor(t / 400) % 2 ? '#7fe0ff' : '#72d4f4') : '#2e3b58', X + 6, sy + 6, sw - 4, sh - 14);
    if (glow) for (let i = 0; i < 6; i++) rect(ctx, '#0b0f2a88', X + 8, sy + 8 + ((i * 4 + Math.floor(t / 150)) % (sh - 18)), sw - 12 - (i * 5) % 11, 1);
    else rect(ctx, '#ffffff22', X + 8, sy + 8, 6, 2);
    rect(ctx, '#2a2d44', X + w - 9, sy + 5, 6, 6); rect(ctx, COL.pink, X + w - 8, sy + 14, 3, 3); rect(ctx, '#2a2d44', X + w - 9, sy + 20, 6, 2);
    rect(ctx, '#9da2c4', X + w / 2 - 2, sy - 10, 1, 10); rect(ctx, '#9da2c4', X + w / 2 + 5, sy - 8, 1, 8);
  },
  sofa(ctx, X, Y, w) {
    const y = Y - 8; shadow(ctx, X, Y + 15, w);
    rect(ctx, '#7a2f66', X, y, w, 16); rect(ctx, '#a3478a', X + 1, y, w - 2, 2);
    rect(ctx, COL.hot, X + 4, y + 10, w - 8, 10); rect(ctx, '#ff8ac8', X + 4, y + 10, w - 8, 1);
    for (let i = 1; i < w / 16; i++) rect(ctx, '#c93d8e', X + i * 16, y + 10, 1, 10);
    rect(ctx, '#a3478a', X, y + 6, 5, 16); rect(ctx, '#a3478a', X + w - 5, y + 6, 5, 16);
    rect(ctx, '#5a1f4a', X + 2, y + 22, 3, 2); rect(ctx, '#5a1f4a', X + w - 5, y + 22, 3, 2);
    rect(ctx, COL.yellow, X + 9, y + 4, 10, 8); rect(ctx, '#d9be00', X + 9, y + 11, 10, 1);
    rect(ctx, COL.lilac, X + w - 20, y + 5, 9, 7);
  },
  desk(ctx, X, Y, w, h) {
    shadow(ctx, X, Y + h - 1, w);
    rect(ctx, COL.woodDark, X, Y - 2, w, 10); rect(ctx, COL.wood, X, Y - 4, w, 8); rect(ctx, '#b07850', X, Y - 4, w, 1);
    rect(ctx, COL.woodDark, X + 3, Y + 6, 4, h - 7); rect(ctx, COL.woodDark, X + w - 7, Y + 6, 4, h - 7);
    rect(ctx, '#6e4630', X + w - 24, Y + 6, 16, 9); rect(ctx, COL.yellow, X + w - 18, Y + 10, 4, 1);
  },
  mailbox(ctx, x, y) { // y = desk top
    rect(ctx, '#7a0b44', x, y - 15, 17, 14); rect(ctx, COL.pink, x, y - 16, 16, 13); rect(ctx, '#ff6fb5', x, y - 16, 16, 1);
    rect(ctx, '#7a0b44', x + 3, y - 11, 9, 1); rect(ctx, COL.white, x + 4, y - 14, 7, 3);
    rect(ctx, COL.yellow, x + 14, y - 22, 2, 11); rect(ctx, COL.orange, x + 14, y - 22, 5, 4);
  },
  letters(ctx, x, y) {
    rect(ctx, COL.white, x, y - 6, 12, 8); rect(ctx, '#c9ced9', x, y - 6, 12, 1); rect(ctx, COL.pink, x + 4, y - 4, 4, 3);
    rect(ctx, '#f4f1ff', x + 10, y - 8, 11, 7); rect(ctx, COL.navyGray, x + 12, y - 6, 6, 1); rect(ctx, COL.navyGray, x + 12, y - 4, 4, 1);
  },
  pens(ctx, x, y) { // jar of pens and brushes
    rect(ctx, '#9ad0ff', x, y - 7, 7, 8); rect(ctx, '#ffffff55', x + 1, y - 6, 1, 6);
    [[1, COL.pink, 7], [3, COL.yellow, 9], [5, '#3fbf6a', 6]].forEach(([dx, c, h]) => { rect(ctx, c, x + dx, y - 7 - h, 1, h); rect(ctx, '#222', x + dx, y - 8 - h, 1, 1); });
    rect(ctx, COL.wood, x + 2, y - 15, 1, 8); rect(ctx, '#333', x + 2, y - 17, 2, 2);
  },
  palette(ctx, x, y) {
    rect(ctx, '#c79a6a', x, y, 14, 8); rect(ctx, '#c79a6a', x + 2, y - 1, 10, 10); rect(ctx, '#8a5f45', x + 3, y + 5, 3, 2);
    [[2, 1, COL.pink], [6, 0, COL.yellow], [10, 2, '#5ec8ff'], [9, 5, COL.orange], [5, 2, COL.white]].forEach(([dx, dy, c]) => rect(ctx, c, x + dx, y + dy, 2, 2));
  },
  tubes(ctx, x, y) { [[0, COL.pink], [5, COL.yellow], [10, '#5ec8ff'], [3, COL.orange]].forEach(([dx, c], i) => { rect(ctx, '#ddd', x + dx, y + (i > 2 ? 4 : 0), 5, 2); rect(ctx, c, x + dx + 1, y + (i > 2 ? 4 : 0), 3, 2); rect(ctx, '#888', x + dx + 5, y + (i > 2 ? 4 : 0), 1, 2); }); },
  splat(ctx, x, y, c) { rect(ctx, c, x, y, 4, 2); rect(ctx, c, x + 1, y - 1, 2, 4); rect(ctx, c, x + 5, y + 1, 1, 1); rect(ctx, c, x - 2, y + 2, 1, 1); },
  paper(ctx, x, y) { rect(ctx, '#e8e4f4', x, y, 5, 4); rect(ctx, '#c9c4dc', x + 1, y + 1, 2, 1); rect(ctx, '#c9c4dc', x + 3, y + 2, 1, 1); },
  bucket(ctx, x, y, c) { rect(ctx, '#9da2c4', x, y - 8, 9, 9); rect(ctx, c, x, y - 8, 9, 2); rect(ctx, c, x + 2, y - 6, 2, 3); rect(ctx, '#6a6f8c', x + 1, y - 11, 7, 1); },
  easel(ctx, X, Y, w, h) { // unfinished painting: half sketch, half colour
    const bx = X + w / 2;
    shadow(ctx, X + 2, Y + h - 1, w - 4);
    rect(ctx, COL.woodDark, X + 6, Y - 18, 3, h + 18); rect(ctx, COL.woodDark, X + w - 9, Y - 18, 3, h + 18); rect(ctx, COL.woodDark, bx - 1, Y - 24, 3, h + 22);
    const cx = X + 3, cy = Y - 22, cw = w - 6, ch = 30;
    rect(ctx, '#1a1636', cx - 1, cy - 1, cw + 2, ch + 2); rect(ctx, '#f7f3ea', cx, cy, cw, ch);
    const img = artPix(5); if (img) ctx.drawImage(img, 0, 0, 64, 128, cx, cy, Math.floor(cw / 2), ch); // painted half
    ctx.fillStyle = '#9a96b0'; for (let i = 0; i < 9; i++) ctx.fillRect(cx + cw / 2 + 2 + (i * 5) % (cw / 2 - 4), cy + 4 + (i * 7) % (ch - 8), 4 - (i % 3), 1); // pencil sketch
    rect(ctx, '#9a96b0', cx + cw / 2 + 3, cy + 8, cw / 2 - 7, 1); rect(ctx, '#9a96b0', cx + cw / 2 + 6, cy + 8, 1, 14);
    rect(ctx, COL.pink, cx + cw / 2 - 2, cy + 10, 4, 6); // wet brush stroke
    rect(ctx, COL.wood, X + 1, cy + ch + 1, w - 2, 3);
    Draw.palette(ctx, X + w - 14, Y + h - 10);
  },
  workTable(ctx, X, Y, w, h) {
    Draw.desk(ctx, X, Y, w, h);
    Draw.tubes(ctx, X + 4, Y - 7); Draw.pens(ctx, X + w - 14, Y - 3); Draw.palette(ctx, X + 22, Y - 9);
    rect(ctx, COL.white, X + 38, Y - 8, 10, 7); rect(ctx, '#9a96b0', X + 40, Y - 6, 6, 1); rect(ctx, '#9a96b0', X + 40, Y - 4, 4, 1); // sketchbook
    Draw.splat(ctx, X + 10, Y + h + 2, COL.pink);
  },
  canvasStack(ctx, X, Y, w, h) {
    shadow(ctx, X, Y + h - 1, w);
    [[0, COL.white, 26], [6, '#f7f3ea', 30], [12, COL.lilac, 22]].forEach(([dx, c, ch], i) => {
      rect(ctx, '#1a1636', X + dx - 1, Y + h - ch - 1, 16, ch + 1); rect(ctx, c, X + dx, Y + h - ch, 14, ch);
      if (i === 1) { const img = artPix(12); if (img) ctx.drawImage(img, X + dx + 1, Y + h - ch + 2, 12, 12); }
      rect(ctx, COL.wood, X + dx, Y + h - ch, 1, ch);
    });
    Draw.bucket(ctx, X + w - 10, Y + h, COL.yellow);
  },
  plant(ctx, X, Y) {
    const sway = Math.round(Math.sin(performance.now() / 900));
    shadow(ctx, X, Y + 15, 16);
    rect(ctx, '#c4561a', X + 2, Y + 4, 12, 11); rect(ctx, COL.orange, X + 2, Y + 4, 12, 2);
    rect(ctx, '#2a8f4c', X + 7, Y - 8, 2, 12);
    rect(ctx, '#3fbf6a', X - 1 + sway, Y - 10, 8, 8); rect(ctx, '#3fbf6a', X + 9 + sway, Y - 14, 8, 9); rect(ctx, '#5fdc84', X + 3 + sway, Y - 20, 9, 9);
    rect(ctx, '#8ff0a8', X + 5 + sway, Y - 19, 3, 1);
  },
  lamp(ctx, X, Y) {
    shadow(ctx, X + 2, Y + 15, 12); rect(ctx, '#2a2d44', X + 4, Y + 13, 8, 2); rect(ctx, '#9da2c4', X + 7, Y - 12, 2, 25);
    rect(ctx, COL.yellow, X + 1, Y - 22, 14, 11); rect(ctx, '#fff59a', X + 2, Y - 21, 12, 3); rect(ctx, '#d9be00', X + 1, Y - 12, 14, 1);
  },
  remote(ctx, x, y) { rect(ctx, '#111', x, y, 6, 12); rect(ctx, '#333', x, y, 6, 1); rect(ctx, COL.pink, x + 1, y + 2, 2, 2); rect(ctx, '#888', x + 1, y + 6, 4, 1); rect(ctx, '#888', x + 1, y + 8, 4, 1); },
  rug(ctx, x, y, w, h) {
    rect(ctx, '#0003', x + 2, y + 2, w, h); rect(ctx, '#6b3f8f', x, y, w, h); rect(ctx, '#8452ad', x + 2, y + 2, w - 4, h - 4);
    for (let i = 6; i < w - 6; i += 8) { rect(ctx, COL.yellow, x + i, y + 5, 3, 3); rect(ctx, COL.pink, x + i + 2, y + h - 8, 3, 3); }
    for (let i = 0; i < w; i += 4) { rect(ctx, COL.lilac, x + i, y - 2, 1, 2); rect(ctx, COL.lilac, x + i, y + h, 1, 2); }
  },
  table(ctx, X, Y, w, h) {
    shadow(ctx, X, Y + h - 1, w);
    rect(ctx, COL.woodDark, X, Y + 4, w, h - 4); rect(ctx, COL.wood, X, Y, w, h - 8); rect(ctx, '#b07850', X, Y, w, 1);
    rect(ctx, COL.woodDark, X + 4, Y + h - 4, 4, 4); rect(ctx, COL.woodDark, X + w - 8, Y + h - 4, 4, 4);
    const items = [[10, COL.white, 16, 12], [36, COL.lilac, 18, 13], [64, COL.yellow, 14, 16], [90, '#dfe6ff', 8, 9], [110, '#1b1d33', 22, 14]];
    items.forEach(([dx, c, iw, ih]) => { if (dx + iw < w - 4) rect(ctx, c, X + dx, Y + 4, iw, ih); });
    if (w > 136) { rect(ctx, '#7fe0ff', X + 112, Y + 6, 18, 10); rect(ctx, COL.pink, X + 40, Y + 7, 7, 7); rect(ctx, '#7a5236', X + 91, Y + 6, 6, 3); }
  },
  chair(ctx, x, y, back) { rect(ctx, '#0003', x + 1, y + 13, 14, 2); rect(ctx, COL.navyGray, x + 1, y + 4, 14, 9); rect(ctx, '#565c80', x + 1, y + 4, 14, 1); if (back) rect(ctx, COL.navyGray, x + 1, y - 6, 14, 10); rect(ctx, '#22264a', x + 3, y + 13, 2, 3); rect(ctx, '#22264a', x + 11, y + 13, 2, 3); },
  whiteboard(ctx, X, w) {
    const y = 6;
    rect(ctx, '#1a1636', X - 1, y - 1, w + 2, 32); rect(ctx, COL.white, X, y, w, 30);
    rect(ctx, COL.pink, X + 6, y + 5, w * 0.4, 2); rect(ctx, COL.navyGray, X + 6, y + 11, w * 0.6, 2); rect(ctx, COL.navyGray, X + 6, y + 16, w * 0.5, 2);
    rect(ctx, '#5ec8ff', X + w - 22, y + 6, 14, 14); rect(ctx, COL.white, X + w - 18, y + 10, 6, 6);
    rect(ctx, '#9da2c4', X + 4, y + 30, w - 8, 2); rect(ctx, COL.pink, X + 10, y + 28, 6, 2);
  },
  payphone(ctx, X, Y, ringing) {
    const shake = ringing ? Math.round(Math.sin(performance.now() / 25)) : 0, x = X + shake, y = Y - 20;
    shadow(ctx, X, Y + 31, 16);
    rect(ctx, '#8e1225', x, y, 16, 50); rect(ctx, '#e01e37', x + 1, y, 14, 48); rect(ctx, '#ff5466', x + 1, y, 14, 1);
    rect(ctx, COL.white, x + 3, y + 3, 10, 4); rect(ctx, '#e01e37', x + 4, y + 4, 8, 2);
    rect(ctx, '#c9ced9', x + 3, y + 10, 10, 18); rect(ctx, '#222', x + 4, y + 11, 8, 4); rect(ctx, '#7fe0ff', x + 5, y + 12, 5, 1);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) rect(ctx, '#555', x + 5 + c * 2, y + 17 + r * 2, 1, 1);
    rect(ctx, '#111', x + 13, y + 9, 3, 12); rect(ctx, '#333', x + 14, y + 21, 1, 10);
    rect(ctx, COL.yellow, x + 5, y + 31, 6, 1);
    if (ringing) { rect(ctx, COL.yellow, x - 4, y + 6, 2, 1); rect(ctx, COL.yellow, x - 5, y + 9, 3, 1); rect(ctx, COL.yellow, x + 18, y + 6, 2, 1); rect(ctx, COL.yellow, x + 18, y + 9, 3, 1); }
  },
};

// ---------- generic room ----------
const saidThisVisit = new Set(); // discovery lines already spoken since the page was opened
function makeRoom(def) {
  return {
    camera: true, // portrait phones: square window following the pigeon
    def, p: null, grid: null, near: null, idle: 0, hinted: false, exitSaid: false, time: 0, far: 0, lastHes: -9, ringT: 0, ringing: 0,
    enter(arg) {
      this.grid = Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (_, x) => (x === 0 || y <= 2 || x === COLS - 1 || y === ROWS - 1) ? 1 : 0));
      for (const o of def.objects) if (o.solid !== false) for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) this.grid[y][x] = 1;
      const from = def.objects.find(o => o.id === arg);
      const [sx, sy] = from ? this.frontOf(from) : def.start;
      this.p = Pigeon.make(sx, sy, from ? 'down' : 'up');
      this.start = [sx, sy];
      Object.assign(this, { near: null, idle: 0, hinted: false, exitSaid: false, time: 0, far: 0, lastHes: -9, ringT: 18 + Math.random() * 15, ringing: 0 });
      UI.setLabel('');
      Audio8.setTrack('main');
      def.onEnter?.(this);
    },
    frontOf(o) { return this.spots(o).sort((a, b) => b[1] - a[1])[0] || def.start; },
    spots(o) {
      const out = [];
      for (let y = o.y - 1; y <= o.y + o.h; y++) for (let x = o.x - 1; x <= o.x + o.w; x++) {
        const inX = x >= o.x && x < o.x + o.w, inY = y >= o.y && y < o.y + o.h;
        if (inX === inY) continue;
        if (this.grid[y]?.[x] === 0) out.push([x, y]);
      }
      return out;
    },
    adjacent(o) { return this.spots(o).some(([x, y]) => x === this.p.tx && y === this.p.ty); },
    say(id) { UI.say(Data.say(id), () => ({ x: this.p.x + 8, y: this.p.y - 14 })); },
    sayAt(id, o) { UI.say(Data.say(id), { x: (o.x + o.w / 2) * TILE, y: o.y * TILE - 22 }); },
    interact(o) {
      const ox = o.x + o.w / 2 - 0.5, oy = o.y + o.h / 2 - 0.5, dx = ox - this.p.tx, dy = oy - this.p.ty;
      if (!this.p.moving) this.p.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      UI.hush(); o.act?.(this, o);
    },
    // wall artworks: click, or stand right below one facing up
    wallAt(px, py) { return (wallRects[def.wall] || []).find(r => px >= r.x - 2 && px < r.x + r.w + 2 && py >= r.y - 2 && py < r.y + r.h + 2); },
    wallAbove() { const p = this.p; return p.ty === 3 && p.face === 'up' && !p.moving && (wallRects[def.wall] || []).find(r => p.x + 8 >= r.x - 4 && p.x + 8 < r.x + r.w + 4); },
    viewWall(r) { UI.hush(); UI.openViewer(r.art.web, `${Data.t(r.art.folder)} · ${Data.t('untitled')} #${r.art.no}`); },
    objAt(px, py) {
      const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
      return def.objects.find(o => o.act && tx >= o.x && tx < o.x + o.w && ty >= (o.y <= 2 ? 0 : o.y - 1) && ty < o.y + o.h);
    },
    update(dt) {
      const p = this.p, dir = Input.dir(), tap = Input.takeTap();
      this.time += dt;
      if (Input.consume('b')) { def.exit?.(this); return; }
      if (dir || tap) { this.idle = 0; if (dir) p.goal = null; }
      if (tap) { const wr = this.wallAt(tap.x, tap.y); if (wr) { this.viewWall(wr); return; } }
      if (tap) {
        const o = this.objAt(tap.x, tap.y);
        if (o) {
          if (this.adjacent(o)) { this.interact(o); return; }
          const path = findPath(this.grid, p.tx, p.ty, this.spots(o));
          if (path) { p.path = path; p.goal = o; }
        } else { const path = findPath(this.grid, p.tx, p.ty, [[Math.floor(tap.x / TILE), Math.floor(tap.y / TILE)]]); if (path) { p.path = path; p.goal = null; } }
      }
      const faceBefore = p.face;
      const arrived = stepActor(p, this.grid, dt, dir);
      this.far = Math.max(this.far, this.start[1] - p.ty);
      if (def.hesitate && p.face === 'down' && faceBefore !== 'down' && this.far >= 2 && this.time - this.lastHes > 6) { this.lastHes = this.time; this.say(def.hesitate); }
      if (arrived && !p.path.length && p.goal) { const g = p.goal; p.goal = null; if (this.adjacent(g)) { this.interact(g); return; } }
      if (!p.moving) {
        const near = def.objects.find(o => o.act && this.adjacent(o)) || null;
        if (near !== this.near) { this.near = near; if (near) this.onNear(near); }
        if (near && Input.consume('a')) { this.interact(near); return; }
        const wa = !near && this.wallAbove();
        if (wa && Input.consume('a')) { this.viewWall(wa); return; }
      }
      // caption: hovered object description, else the object next to the pigeon
      const hw = Input.hover && this.wallAt(Input.hover.x, Input.hover.y);
      const h = Input.hover && !hw && this.objAt(Input.hover.x, Input.hover.y);
      document.getElementById('screen').style.cursor = hw ? 'zoom-in' : h ? 'pointer' : '';
      const wa = !this.near && !p.moving && this.wallAbove();
      const show = h || this.near;
      UI.setLabel(hw || wa ? `${Data.t((hw || wa).art.folder)} · ${Data.t('viewLarge')}` : show ? (show.desc ? Data.t(show.desc) : show.label?.()) : '');
      Hint.a = !!(this.near || wa); Hint.stick = !this.near && !wa && !p.moving && this.idle > 4;
      // idle hints
      this.idle += dt;
      if (!this.hinted && this.idle > 5) { this.hinted = true; this.say(matchMedia('(pointer: coarse)').matches ? 'HINT_MOVE_TOUCH' : 'HINT_MOVE'); }
      if (this.idle > 20) { this.idle = 5.01; this.say('HINT_IDLE'); }
      // random phone ring (M6)
      if (def.ring) {
        this.ringing = Math.max(0, this.ringing - dt);
        if ((this.ringT -= dt) <= 0) {
          this.ringT = 25 + Math.random() * 20; this.ringing = 1.8; Audio8.sfx('ring');
          this.sayAt('PHONE_RING', def.objects.find(o => o.id === def.ring));
        }
      }
    },
    onNear(o) {
      if (o.disc && !Save.get('found', []).includes(o.id)) {
        const found = Save.get('found', []); found.push(o.id); Save.set('found', found);
        if (o.sfx) Audio8.sfx(o.sfx);
        saidThisVisit.add(o.id);
        this.say(o.disc);
        if (['gallery', 'career', 'meeting', 'interview', 'contact'].every(k => found.includes(k)) && !Save.get('allFound', false)) {
          Save.set('allFound', true); setTimeout(() => this.say('ALL_FOUND'), 3500);
        }
        return;
      }
      // already discovered: repeat the soft line once per visit (page load), so the pigeon keeps talking
      if (o.disc && !saidThisVisit.has(o.id)) { saidThisVisit.add(o.id); this.say(o.disc); return; }
      if (o.near) { this.say(o.near); return; }
      if (o.exit) { if (!this.exitSaid && this.time > 2.5 && !def.hesitate) { this.exitSaid = true; this.say('EXIT_ROOM'); } return; }
      if (!o.disc && !Save.get('hint.' + o.id, false)) { Save.set('hint.' + o.id, true); this.say('HINT_INTERACT'); }
    },
    draw(ctx) {
      def.drawBg(ctx, this);
      const objs = [...def.objects].sort((a, b) => (a.y + a.h) - (b.y + b.h));
      let drawn = false;
      for (const o of objs) {
        if (!drawn && o.y > 2 && o.y + o.h - 1 > this.p.ty) { Pigeon.draw(ctx, this.p); drawn = true; }
        o.draw?.(ctx, o.x * TILE, o.y * TILE, o.w * TILE, o.h * TILE, this);
      }
      if (!drawn) Pigeon.draw(ctx, this.p);
      if (this.near) {
        const o = this.near, cx = (o.x + o.w / 2) * TILE, cy = (o.y <= 2 ? 2 : o.y * TILE - 26) + Math.round(Math.sin(performance.now() / 200));
        rect(ctx, COL.yellow, cx - 2, cy, 5, 3); rect(ctx, COL.yellow, cx - 1, cy + 3, 3, 1); rect(ctx, COL.yellow, cx, cy + 4, 1, 1);
      }
    },
  };
}

const exitDoor = (back, x = 9) => ({
  id: 'exit', x, y: 10, w: 2, h: 1, exit: true, label: () => Data.t('exit'), act: () => Scenes.go(HubScene, back),
  draw: (c, X, Y) => {
    rect(c, '#120f28', X + 2, Y, 28, 16); rect(c, COL.woodDark, X, Y, 2, 16); rect(c, COL.woodDark, X + 30, Y, 2, 16);
    rect(c, '#6b3f8f', X + 4, Y - 6, 24, 5); rect(c, COL.lilac, X + 6, Y - 5, 20, 1);
    rect(c, COL.yellow, X + 14, Y + 4, 4, 6); rect(c, COL.yellow, X + 12, Y + 8, 8, 2); rect(c, COL.yellow, X + 14, Y + 10, 4, 2);
  },
});
function onceEnter(key, id, r) { if (!Save.get('enter.' + key, false)) { Save.set('enter.' + key, true); setTimeout(() => r.say(id), 600); } }
const deco = (id, x, y, w, h, draw) => ({ id, x, y, w, h, draw });
const floorDeco = (id, draw) => ({ id, x: 0, y: 3, w: 0, h: 0, solid: false, draw });

// ---------- M1 hub: Umsee studio ----------
const HubScene = makeRoom({
  start: [10, 7],
  objects: [
    floorDeco('mess', c => { // work traces on the floor, drawn first
      Draw.splat(c, 120, 100, COL.pink); Draw.splat(c, 140, 92, COL.yellow); Draw.splat(c, 196, 140, '#5ec8ff');
      Draw.paper(c, 100, 120); Draw.paper(c, 214, 108); Draw.paper(c, 58, 112);
      Draw.tubes(c, 160, 96); Draw.bucket(c, 116, 96, COL.pink);
    }),
    deco('window', 2, 2, 2, 1, (c, X, Y, w) => Draw.window(c, X, w)),
    { id: 'gallery', x: 5, y: 2, w: 2, h: 1, disc: 'DISC_GALLERY', desc: 'descGallery', act: () => Scenes.go(LobbyScene),
      draw: (c, X, Y, w) => Draw.door(c, X, Y, w, '#6b4fa0', Draw.icon.frame) },
    { id: 'about', x: 8, y: 2, w: 1, h: 1, disc: 'DISC_ABOUT', desc: 'descAbout', act: () => Panels.about(), draw: (c, X) => Draw.poster(c, X) },
    deco('shelf', 9, 2, 2, 1, (c, X, Y, w) => Draw.bookshelf(c, X + 2, w - 2)),
    { id: 'meeting', x: 13, y: 2, w: 2, h: 1, disc: 'DISC_MEETING', sfx: 'bell', desc: 'descMeeting', act: () => Scenes.go(MeetingScene),
      draw: (c, X, Y, w) => Draw.door(c, X, Y, w, COL.wood, Draw.icon.bell) },
    { id: 'career', x: 1, y: 4, w: 3, h: 2, disc: 'DISC_CAREER', desc: 'descCareer', act: () => Scenes.go(CareerScene), draw: (c, X, Y, w, h) => Draw.crt(c, X, Y, w, h, true) },
    { id: 'easel', x: 7, y: 4, w: 2, h: 1, draw: (c, X, Y, w, h) => Draw.easel(c, X - 2, Y, w + 4, h) },
    { id: 'worktable', x: 11, y: 4, w: 3, h: 1, draw: (c, X, Y, w, h) => Draw.workTable(c, X, Y, w, h) },
    { id: 'interview', x: 15, y: 3, w: 3, h: 2, disc: 'DISC_INTERVIEW', desc: 'descInterview', act: () => Scenes.go(InterviewScene),
      draw: (c, X, Y, w, h) => { Draw.crt(c, X, Y, w, h, false); } },
    { id: 'sofa', x: 14, y: 7, w: 4, h: 1, draw: (c, X, Y, w) => { Draw.sofa(c, X, Y, w); Draw.remote(c, X + w - 9, Y - 4); } },
    { id: 'contact', x: 1, y: 8, w: 3, h: 2, disc: 'DISC_CONTACT', desc: 'descContact', act: () => Scenes.go(ContactScene),
      draw: (c, X, Y, w, h) => { Draw.desk(c, X, Y, w, h); Draw.mailbox(c, X + w - 20, Y - 4); Draw.letters(c, X + 6, Y - 4); Draw.pens(c, X + 24, Y - 3); } },
    { id: 'canvases', x: 17, y: 9, w: 2, h: 1, draw: (c, X, Y, w, h) => Draw.canvasStack(c, X, Y - 16, w, h + 16) },
    deco('plant', 18, 3, 1, 1, (c, X, Y) => Draw.plant(c, X, Y)),
    deco('lamp', 18, 6, 1, 1, (c, X, Y) => Draw.lamp(c, X, Y)),
  ],
  wall: 'hub',
  drawBg(ctx) {
    drawRoomShell(ctx, 'studio'); windowLight(ctx, 2 * TILE);
    wallArt(ctx, 'hub', [181, 247, 278]);
    Draw.rug(ctx, 6 * TILE, 6 * TILE, 7 * TILE, 3 * TILE);
  },
  onEnter(r) { if (!Save.get('intro', false)) { Save.set('intro', true); r.say('INTRO_START'); } },
  exit() { Scenes.go(TitleScene); },
});

// ---------- M4 collaboration meeting room ----------
const MeetingScene = makeRoom({
  start: [9, 9],
  objects: [
    deco('window', 2, 2, 3, 1, (c, X, Y, w) => Draw.window(c, X, w)),
    deco('board', 12, 2, 4, 1, (c, X, Y, w) => Draw.whiteboard(c, X, w)),
    { id: 'chairsBack', x: 5, y: 4, w: 10, h: 1, solid: false, draw: (c, X, Y) => { for (let i = 0; i < 4; i++) Draw.chair(c, X + 12 + i * 36, Y, true); } },
    { id: 'table', x: 5, y: 5, w: 10, h: 2, label: () => Data.t('collaboration'), act: () => Panels.collab(), draw: (c, X, Y, w, h) => Draw.table(c, X, Y, w, h) },
    { id: 'chairsFront', x: 5, y: 7, w: 10, h: 1, solid: false, draw: (c, X, Y) => { for (let i = 0; i < 4; i++) Draw.chair(c, X + 12 + i * 36, Y - 2, false); } },
    deco('plant', 18, 3, 1, 1, (c, X, Y) => Draw.plant(c, X, Y)),
    deco('plant2', 1, 3, 1, 1, (c, X, Y) => Draw.plant(c, X, Y)),
    exitDoor('meeting'),
  ],
  wall: 'meeting',
  drawBg(ctx) { drawRoomShell(ctx, 'meeting'); windowLight(ctx, 2 * TILE); wallArt(ctx, 'meeting', [96, 140, 270]); },
  onEnter(r) { onceEnter('meeting', 'ENTER_MEETING', r); },
  exit() { Scenes.go(HubScene, 'meeting'); },
});

// ---------- M5 interview room: big TV + remote ----------
const InterviewScene = makeRoom({
  start: [3, 9],
  channel: 0,
  objects: [
    { id: 'tv', x: 7, y: 3, w: 6, h: 2, label: () => Data.t('interviews'), act: () => Panels.tv(InterviewScene.def.channel),
      draw: (c, X, Y, w, h) => {
        Draw.crt(c, X, Y, w, h, false);
        c.font = '8px Galmuri11, monospace'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = COL.yellow;
        c.fillText(`CH ${InterviewScene.def.channel + 1}`, X + 12, Y - 8);
      } },
    { id: 'remote', x: 9, y: 6, w: 2, h: 1, label: () => Data.t('channel'), act: () => { Audio8.sfx('click'); InterviewScene.say('TV_CHANNEL'); setTimeout(() => Panels.tv(InterviewScene.def.channel), 350); },
      draw: (c, X, Y, w) => { shadow(c, X, Y + 15, w); rect(c, COL.woodDark, X + 2, Y + 2, w - 4, 12); rect(c, COL.wood, X + 2, Y, w - 4, 6); Draw.remote(c, X + 12, Y - 8); } },
    { id: 'sofa', x: 6, y: 8, w: 8, h: 1, draw: (c, X, Y, w) => Draw.sofa(c, X, Y, w) },
    deco('lamp', 15, 3, 1, 1, (c, X, Y) => Draw.lamp(c, X, Y)),
    deco('plant', 3, 3, 1, 1, (c, X, Y) => Draw.plant(c, X, Y)),
    exitDoor('interview', 3),
  ],
  wall: 'interview',
  drawBg(ctx) { drawRoomShell(ctx, 'interview'); wallArt(ctx, 'interview', [24, 64, 236, 276]); Draw.rug(ctx, 5 * TILE, 5 * TILE, 10 * TILE, 3 * TILE); },
  onEnter(r) { onceEnter('interview', 'ENTER_INTERVIEW', r); },
  exit() { Scenes.go(HubScene, 'interview'); },
});

// ---------- M6 contact room ----------
const ContactScene = makeRoom({
  start: [9, 9],
  hesitate: 'EXIT_HESITATE',
  ring: 'phone',
  objects: [
    deco('window', 13, 2, 3, 1, (c, X, Y, w) => Draw.window(c, X, w)),
    { id: 'mail', x: 6, y: 5, w: 6, h: 2, near: 'CONTACT_WONDER', label: () => Data.t('contact'),
      act: (r) => { r.say('MAIL_OPEN'); setTimeout(() => Panels.mail(), 900); },
      draw: (c, X, Y, w, h) => { Draw.desk(c, X, Y, w, h); Draw.mailbox(c, X + w - 26, Y - 4); Draw.letters(c, X + 10, Y - 4); Draw.pens(c, X + 34, Y - 3); rect(c, COL.yellow, X + 50, Y - 7, 6, 4); } },
    { id: 'phone', x: 17, y: 3, w: 1, h: 2, near: 'PHONE_NEAR', label: () => Data.t('contact'),
      act: () => { Audio8.sfx('click'); Panels.instagram(); }, draw: (c, X, Y, w, h, r) => Draw.payphone(c, X, Y, r.ringing > 0) },
    deco('plant', 2, 3, 1, 1, (c, X, Y) => Draw.plant(c, X, Y)),
    { id: 'chair', x: 8, y: 7, w: 1, h: 1, solid: false, draw: (c, X, Y) => Draw.chair(c, X, Y - 2, true) }, // walkable
    exitDoor('contact'),
  ],
  wall: 'contact',
  drawBg(ctx) { drawRoomShell(ctx, 'contact'); windowLight(ctx, 13 * TILE); wallArt(ctx, 'contact', [40, 84, 128, 172]); },
  onEnter(r) { onceEnter('contact', 'ENTER_CONTACT', r); },
  exit() { Scenes.go(HubScene, 'contact'); },
});
