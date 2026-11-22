// Unified input: keyboard, virtual console and mouse/touch all feed the same state.
const Input = (() => {
  const held = { up: false, down: false, left: false, right: false };
  const sources = {}; // per-source held dirs, merged into `held`
  let pressed = new Set(); // one-shot 'a' / 'b'
  let tap = null; // {x, y} in internal pixels

  const KEYS = {
    // Letter keys A/B match the on-screen buttons (A = Enter, B = Esc). WASD dropped: A must mean confirm.
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    KeyA: 'a', KeyZ: 'a', Enter: 'a', NumpadEnter: 'a', Space: 'a',
    KeyB: 'b', KeyX: 'b', Escape: 'b', Backspace: 'b',
    Equal: 'zin', NumpadAdd: 'zin', Minus: 'zout', NumpadSubtract: 'zout',
  };

  const DIRS4 = ['up', 'down', 'left', 'right'];
  let hover = null; // pointer position over the canvas (internal pixels), for captions
  let anyInput = () => {}, wheelOn = () => false;
  function setDir(src, dir, on) {
    (sources[src] ||= {})[dir] = on;
    const was = held[dir];
    held[dir] = Object.values(sources).some(s => s[dir]);
    if (held[dir] && !was) { pressed.add('dir:' + dir); anyInput(); }
  }
  function press(btn) { pressed.add(btn); anyInput(); }

  function attach(canvas, toInternal) {
    addEventListener('keydown', e => {
      const k = KEYS[e.code]; if (!k) return;
      e.preventDefault();
      if (!DIRS4.includes(k)) { if (!e.repeat) press(k); } else setDir('key', k, true);
    });
    addEventListener('keyup', e => { const k = KEYS[e.code]; if (k && held[k] !== undefined) setDir('key', k, false); });
    addEventListener('blur', () => { for (const s in sources) for (const d in sources[s]) setDir(s, d, false); });

    canvas.addEventListener('pointerdown', e => { e.preventDefault(); tap = toInternal(e.clientX, e.clientY); anyInput(); });
    // mouse wheel: one notch = one step (throttled), consumed by scenes that use it (gallery)
    let lastWheel = 0;
    canvas.parentElement.addEventListener('wheel', e => {
      if (!wheelOn()) return;
      e.preventDefault();
      const now = performance.now(); if (now - lastWheel < 160 || Math.abs(e.deltaY) < 1) return;
      lastWheel = now; pressed.add(e.deltaY < 0 ? 'wheel:up' : 'wheel:down'); anyInput();
    }, { passive: false });
    canvas.addEventListener('pointermove', e => { hover = toInternal(e.clientX, e.clientY); });
    canvas.addEventListener('pointerleave', () => { hover = null; });

    // Ball joystick: drag (or tap toward an edge) = one direction, dominant axis wins.
    const stick = document.getElementById('stick');
    if (stick) {
      const knob = stick.querySelector('.knob'), shaft = stick.querySelector('.shaft');
      let active = null;
      const release = () => {
        active = null; knob.style.transform = shaft.style.transform = '';
        ['up', 'down', 'left', 'right'].forEach(d => setDir('pad', d, false));
      };
      const move = e => {
        const r = stick.getBoundingClientRect();
        let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        const len = Math.hypot(dx, dy), max = r.width * 0.28;
        if (len > max) { dx *= max / len; dy *= max / len; }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        shaft.style.transform = `rotate(${Math.atan2(dx, -dy)}rad) scaleY(${0.6 + Math.min(len, max) / max * 0.6})`;
        const d = len < 10 ? null : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        ['up', 'down', 'left', 'right'].forEach(k => setDir('pad', k, k === d));
      };
      stick.addEventListener('pointerdown', e => { e.preventDefault(); active = e.pointerId; stick.setPointerCapture?.(e.pointerId); move(e); });
      stick.addEventListener('pointermove', e => { if (e.pointerId === active) move(e); });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stick.addEventListener(t, release));
    }
    document.querySelectorAll('#console [data-alias]').forEach(el => {
      el.addEventListener('pointerdown', e => { e.preventDefault(); el.classList.add('on'); document.getElementById(el.dataset.alias).click(); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => el.addEventListener(t, () => el.classList.remove('on')));
    });
    document.querySelectorAll('#console [data-btn]').forEach(el => {
      el.addEventListener('pointerdown', e => { e.preventDefault(); el.classList.add('on'); press(el.dataset.btn); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => el.addEventListener(t, () => el.classList.remove('on')));
    });
  }

  // Current direction: held, or tapped this frame (a quick tap still moves one tile).
  function dir() { return ['up', 'down', 'left', 'right'].find(d => held[d] || pressed.has('dir:' + d)) || null; }
  function consume(btn) { return pressed.delete(btn); }
  function takeTap() { const t = tap; tap = null; return t; }
  function endFrame() { pressed.clear(); tap = null; }

  function onAny(fn) { anyInput = fn; }
  function wheelWhen(fn) { wheelOn = fn; }
  return { attach, dir, consume, takeTap, endFrame, onAny, wheelWhen, get hover() { return hover; } };
})();
