// DOM overlay above the canvas: speech bubble and modal panels (text, links, video, zoom).
const UI = (() => {
  const root = document.getElementById('ui');
  const bubble = document.createElement('div'); bubble.className = 'bubble'; root.appendChild(bubble);
  const label = document.createElement('div'); label.className = 'label'; root.appendChild(label);
  let queue = [], timer = 0, anchor = null, modal = null;

  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  // Speech bubble: show lines one by one above an anchor {x,y} in internal pixels.
  function say(lines, at) {
    if (!lines?.length) return;
    queue = [...lines]; anchor = at; showNext();
  }
  function showNext() {
    const line = queue.shift();
    if (line === undefined) { bubble.classList.remove('on'); return; }
    bubble.textContent = line; bubble.classList.add('on');
    timer = 2.2 + line.length * 0.05;
  }
  function hush() { queue = []; timer = 0; bubble.classList.remove('on'); }
  function bubbleOn() { return bubble.classList.contains('on'); }

  function setLabel(text, bottom) { label.textContent = text || ''; label.classList.toggle('on', !!text); label.classList.toggle('bottom', !!bottom); }

  // Modal panel. `html` is trusted markup built by the game; returns the element.
  function open(html, opts = {}) {
    close(true);
    hush();
    modal = document.createElement('div');
    modal.className = 'panel ' + (opts.cls || '');
    modal.innerHTML = `<div class="body">${html}</div><div class="bar"><button data-close>${esc(Data.t('close'))} [B]</button></div>`;
    modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
    modal.onClose = opts.onClose;
    modal.onKey = opts.onKey;
    root.appendChild(modal);
    focusables()[0]?.focus({ preventScroll: true });
    return modal;
  }
  function close(silent) {
    if (!modal) return;
    const m = modal; modal = null;
    m.remove();
    if (m.querySelector('iframe')) Audio8.setHold(false); // TV off: BGM back
    if (!silent) m.onClose?.();
    document.activeElement?.blur?.();
  }
  // ---- full-size image viewer (fixed over the whole browser window) ----
  let viewer = null;
  function openViewer(src, title, nav = null) { // nav(d) -> {src, title} switches to the previous/next image (d = -1 / 1)
    closeViewer();
    const v = document.createElement('div'); v.className = 'viewer';
    v.innerHTML = `<div class="vscroll"><img alt="${esc(title)}"></div>${nav ? '<button class="vnav prev" data-vnav="-1" aria-label="prev">◀</button><button class="vnav next" data-vnav="1" aria-label="next">▶</button>' : ''}<div class="vbar"><span class="ratio"></span><span class="vt">${esc(title)}</span><button data-vclose>✕ Esc</button></div>`;
    document.body.appendChild(v);
    const img = v.querySelector('img'), box = v.querySelector('.vscroll'), ratio = v.querySelector('.ratio');
    let z = 0, fit = 1;
    const apply = (cx, cy) => {
      const nw = img.naturalWidth || 1200, nh = img.naturalHeight || 1200;
      fit = Math.min(box.clientWidth / nw, box.clientHeight / nh);
      const s = z || fit, fx = cx ?? 0.5, fy = cy ?? 0.5;
      const sx = box.scrollLeft + box.clientWidth * fx, sy = box.scrollTop + box.clientHeight * fy, old = img.width || 1;
      img.width = Math.round(nw * s); img.height = Math.round(nh * s);
      box.classList.toggle('zoomed', !!z && s > fit);
      box.scrollLeft = sx * img.width / old - box.clientWidth * fx; box.scrollTop = sy * img.width / old - box.clientHeight * fy;
      ratio.textContent = `${Math.round(s * 100)}%  (${nw}×${nh})`;
    };
    const zoom = (f, cx, cy) => { z = Math.min(4, Math.max(fit, (z || fit) * f)); if (z <= fit * 1.001) z = 0; apply(cx, cy); };
    img.onload = () => apply(); img.src = src;
    const show = d => { const n = nav?.(d); if (!n) return; z = 0; img.alt = n.title; v.querySelector('.vt').textContent = n.title; img.src = n.src; };
    v.querySelectorAll('[data-vnav]').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); show(+b.dataset.vnav); }));
    box.addEventListener('wheel', e => { e.preventDefault(); const r = box.getBoundingClientRect(); zoom(Math.min(1.25, Math.max(0.8, Math.exp(-e.deltaY * 0.002))), (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); }, { passive: false });
    let drag = null, moved = false;
    const fingers = new Map(); let pinch = 0; // pinch = last distance between two fingers (0 = not pinching)
    const gap = () => { const [a, b] = [...fingers.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
    box.addEventListener('pointerdown', e => {
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY }); box.setPointerCapture(e.pointerId);
      if (fingers.size === 2) { pinch = gap(); drag = null; moved = true; return; }
      drag = [e.clientX, e.clientY, box.scrollLeft, box.scrollTop]; moved = false;
    });
    box.addEventListener('pointermove', e => {
      if (fingers.has(e.pointerId)) fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch) {
        if (fingers.size < 2) return;
        const d = gap(), [a, b] = [...fingers.values()], r = box.getBoundingClientRect();
        zoom(d / pinch, ((a.x + b.x) / 2 - r.left) / r.width, ((a.y + b.y) / 2 - r.top) / r.height); pinch = d; return;
      }
      if (!drag) return; const dx = e.clientX - drag[0], dy = e.clientY - drag[1]; if (Math.abs(dx) + Math.abs(dy) > 4) moved = true; box.scrollLeft = drag[2] - dx; box.scrollTop = drag[3] - dy; });
    const endFinger = e => { fingers.delete(e.pointerId); if (fingers.size < 2) pinch = 0; };
    box.addEventListener('pointercancel', e => { endFinger(e); drag = null; });
    box.addEventListener('pointerup', e => {
      if (moved && fingers.size > 1) { endFinger(e); drag = null; return; } // end of a pinch: no tap, no swipe
      endFinger(e);
      if (drag && !moved) { const r = box.getBoundingClientRect(); z ? (z = 0, apply()) : zoom(2, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); }
      else if (drag && nav && !z) { const dx = e.clientX - drag[0], dy = e.clientY - drag[1]; if (Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(dy)) show(dx < 0 ? 1 : -1); } // swipe at fit size
      drag = null;
    });
    v.querySelector('[data-vclose]').addEventListener('click', closeViewer);
    addEventListener('resize', v.onResize = () => apply());
    viewer = { el: v, zoom, nav: show, hasNav: !!nav, atFit: () => !z };
  }
  function closeViewer() { if (!viewer) return; removeEventListener('resize', viewer.el.onResize); viewer.el.remove(); viewer = null; }
  function updateViewer() {
    if (Input.consume('b') || Input.consume('a')) { closeViewer(); return; }
    if (viewer.hasNav && viewer.atFit()) { if (Input.consume('dir:left')) viewer.nav(-1); else if (Input.consume('dir:right')) viewer.nav(1); }
    if (Input.consume('zin')) viewer.zoom(1.25); if (Input.consume('zout')) viewer.zoom(0.8);
  }

  function focusables() { return modal ? [...modal.querySelectorAll('a[href]:not([tabindex="-1"]), button')].filter(el => el.offsetParent !== null) : []; }

  // Called every frame while a panel is open: game input drives the panel.
  function updateModal() {
    if (Input.consume('b')) { close(); return; }
    const f = focusables(), i = f.indexOf(document.activeElement);
    const body = modal.querySelector('.body');
    if (modal.onKey?.()) return;
    if (Input.consume('dir:down') || Input.consume('dir:right')) {
      if (f.length) f[(i + 1) % f.length].focus(); else body.scrollTop += 24;
    }
    if (Input.consume('dir:up') || Input.consume('dir:left')) {
      if (f.length) f[(i - 1 + f.length) % f.length].focus(); else body.scrollTop -= 24;
    }
    if (Input.consume('a') && f.includes(document.activeElement)) document.activeElement.click();
  }

  function update(dt, scale) {
    if (bubbleOn()) {
      timer -= dt; if (timer <= 0) showNext();
      if (anchor) {
        const a = typeof anchor === 'function' ? anchor() : anchor;
        // keep the whole bubble on screen; the tail still points at the speaker
        const x = (a.x - View.x) * scale, bw = bubble.offsetWidth, rw = root.clientWidth, m = 4;
        const cx = Math.min(Math.max(x, bw / 2 + m), rw - bw / 2 - m);
        bubble.style.left = cx + 'px'; bubble.style.top = (a.y - View.y) * scale + 'px';
        bubble.style.setProperty('--tail', (x - cx) + 'px');
      }
    }
  }

  return { say, hush, bubbleOn, setLabel, open, close, update, updateModal, esc, openViewer, closeViewer, updateViewer,
    get modal() { return modal; }, get viewer() { return viewer; } };
})();
