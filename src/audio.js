// Self-generated chiptune BGM and SFX via WebAudio. Starts after the first user input.
// All melodies are original (no copyrighted themes). Tracks are composed once at load from
// chord progressions with a fixed seed, so they are long (30-60 s) yet always identical.
const Audio8 = (() => {
  let ctx = null, master = null, noiseBuf = null, on = Save.get('bgm', true), vol = Save.get('vol', 0.2);
  let timer = null, step = 0, nextT = 0, hold = false, track = 'main';
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);

  // ---- composer ----
  function rng(seed) { return () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }; }
  const CH = { // chord tones as MIDI around octave 4-5
    C: [60, 64, 67], Am: [57, 60, 64], F: [53, 57, 60], G: [55, 59, 62], Dm: [50, 53, 57], Em: [52, 55, 59], E: [52, 56, 59],
    Bb: [58, 62, 65], Eb: [51, 55, 58], Gm: [55, 58, 62], Cm: [48, 51, 55], Ab: [56, 60, 63],
  };
  const RHY = [ // 16-step rhythm templates (x = onset)
    'x.x.x..xx.x.x...', 'x..x..x.x.x.x...', 'x.xxx.x.x...x.x.', 'x...x.x.x.x.xx..', 'xx.x.x..x.x.x...', 'x.x.x.x.x...x...',
  ];
  function compose({ bars, scale, lead0, seed, rhythms, phraseEnd = 4, octave = 12 }) {
    const R = rng(seed), lead = [], bass = [], arp = [];
    let prev = lead0;
    bars.forEach((chord, b) => {
      const tones = CH[chord], end = (b + 1) % phraseEnd === 0;
      const rh = end ? 'x...x...x.......' : rhythms[Math.floor(R() * rhythms.length)];
      for (let s = 0; s < 16; s++) {
        if (rh[s] !== 'x') { lead.push(0); continue; }
        // candidates: chord tones (two octaves) + scale steps near the previous note
        const cands = [...tones.map(t => t + octave), ...tones.map(t => t + octave + 12)];
        if (!end && s % 4) scale.forEach(d => { const n = prev + d; if (Math.abs(d) <= 2) cands.push(n); });
        cands.sort((x, y) => Math.abs(x - prev) - Math.abs(y - prev) + (R() - 0.5) * 3);
        let n = cands[Math.min(cands.length - 1, Math.floor(R() * 2))];
        if (end && s === 8) n = tones[0] + octave + 12;
        if (n > 88) n -= 12; if (n < 64) n += 12;
        lead.push(n); prev = n;
      }
      for (let s = 0; s < 8; s++) bass.push(tones[0] - 24 + (s % 4 === 3 ? 7 : 0));
      for (let s = 0; s < 16; s++) arp.push(tones[s % 3] + (s % 6 < 3 ? 12 : 24));
    });
    return { lead, bass, arp };
  }
  const MAJ = [-2, -1, 1, 2];
  function seq(list) { return [].concat(...list); }
  function buildMain() {
    const A = ['C', 'Am', 'F', 'G', 'C', 'Am', 'Dm', 'G'], B = ['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'];
    const A2 = ['C', 'Am', 'F', 'G', 'C', 'E', 'Dm', 'G'], Cb = ['Am', 'F', 'C', 'G'];
    const a = compose({ bars: A, scale: MAJ, lead0: 72, seed: 7, rhythms: RHY.slice(0, 3) });
    const b = compose({ bars: B, scale: MAJ, lead0: 76, seed: 21, rhythms: RHY.slice(2, 6), octave: 24 });
    const a2 = compose({ bars: A2, scale: MAJ, lead0: 72, seed: 33, rhythms: RHY.slice(1, 4) });
    const c = compose({ bars: Cb, scale: MAJ, lead0: 69, seed: 5, rhythms: ['x.......x.......'] });
    return {
      bpm: 112,
      lead: seq([a.lead, b.lead, a2.lead, c.lead]),
      bass: seq([a.bass, b.bass, a2.bass, c.bass]),
      arp: seq([new Array(128).fill(0), b.arp, new Array(128).fill(0), c.arp]),
      drums: true,
    };
  }
  function buildSpace() {
    // bars 1-4: the fanfare the user liked; then development and a climax, ~30 s at 96 bpm
    const fan = [65, 65, 65, 70, 0, 0, 0, 0, 77, 0, 0, 0, 75, 74, 72, 82, 0, 0, 0, 77, 0, 0, 75, 74, 75, 72, 0, 0, 0, 0, 0, 0,
      65, 65, 65, 70, 0, 0, 0, 0, 77, 0, 0, 0, 75, 74, 72, 82, 0, 0, 0, 77, 0, 0, 79, 77, 75, 77, 0, 0, 0, 0, 0, 0];
    const fanBass = [46, 46, 46, 46, 51, 51, 53, 53, 46, 46, 43, 43, 51, 51, 53, 53, 46, 46, 46, 46, 51, 51, 53, 53, 44, 44, 51, 51, 53, 53, 46, 46];
    const dev = compose({ bars: ['Gm', 'Eb', 'Bb', 'F'], scale: MAJ, lead0: 74, seed: 11, rhythms: [RHY[0], RHY[5]] });
    const up = fan.map(n => (n ? n + 5 : 0)); // fanfare up a fourth (E flat) as the climax
    const upBass = fanBass.map(n => n + 5);
    const outro = compose({ bars: ['Eb', 'F', 'Bb', 'Bb'], scale: MAJ, lead0: 77, seed: 4, rhythms: ['x.x.x...x.......'] });
    return {
      bpm: 96,
      lead: seq([fan, dev.lead, up, outro.lead]),
      bass: seq([fanBass, dev.bass, upBass, outro.bass]),
      arp: seq([new Array(64).fill(0), dev.arp, new Array(64).fill(0), outro.arp]),
      drums: true,
    };
  }
  const TRACKS = { main: buildMain(), space: buildSpace() };

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination); apply();
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function apply() { if (master) master.gain.value = on && !hold ? vol * 0.5 : 0; }

  function note(type, n, t, dur, g, out = master) {
    const o = ctx.createOscillator(), a = ctx.createGain();
    o.type = type; o.frequency.value = hz(n);
    a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(a); a.connect(out); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t, dur, g, out = master, hp = 6000) {
    const s = ctx.createBufferSource(), a = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
    a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(a); a.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  function schedule() {
    const tr = TRACKS[track], s16 = 60 / tr.bpm / 4, len = tr.lead.length;
    while (nextT < ctx.currentTime + 0.2) {
      const i = step % len, l = tr.lead[i];
      if (l) note('square', l, nextT, s16 * 1.7, 0.11);
      if (i % 2 === 0) { const b = tr.bass[(i / 2) % tr.bass.length]; if (b) note('triangle', b, nextT, s16 * 1.9, 0.33); }
      const ar = tr.arp[i]; if (ar) note('square', ar, nextT, s16 * 0.8, 0.035);
      if (tr.drums) { if (i % 8 === 0) note('sine', 36, nextT, 0.12, 0.35); if (i % 4 === 2) noise(nextT, 0.04, 0.05); }
      step++; nextT += s16;
    }
  }
  function unlock() {
    ensure(); if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!timer) { nextT = ctx.currentTime + 0.05; timer = setInterval(schedule, 50); }
  }
  function restart() { step = 0; if (ctx) nextT = ctx.currentTime + 0.05; }
  function setTrack(name) { if (TRACKS[name] && name !== track) { track = name; restart(); } }
  function sfx(kind) {
    if (!ctx || !on) return;
    const t = ctx.currentTime, out = ctx.destination, g = vol;
    if (kind === 'bell') { note('square', 88, t, 0.35, 0.4 * g, out); note('square', 84, t + 0.35, 0.5, 0.4 * g, out); }
    else if (kind === 'click') note('square', 100, t, 0.04, 0.3 * g, out);
    else if (kind === 'door') { note('triangle', 60, t, 0.1, 0.6 * g, out); note('triangle', 67, t + 0.08, 0.12, 0.6 * g, out); }
    else if (kind === 'static') { noise(t, 0.7, 0.5 * g, out, 800); note('sawtooth', 40, t, 0.15, 0.2 * g, out); }
    else if (kind === 'ring') { // old phone: fast two-tone trill, twice
      for (const base of [0, 0.9]) for (let i = 0; i < 14; i++) note('square', i % 2 ? 91 : 88, t + base + i * 0.04, 0.04, 0.25 * g, out);
    }
  }
  // Video playing: mute BGM. TV off or video ended: BGM back from the beginning.
  function setHold(v) { if (hold && !v) restart(); hold = v; apply(); }
  function setOn(v) { on = v; Save.set('bgm', v); apply(); }
  function setVol(v) { vol = v; Save.set('vol', v); apply(); }
  const seconds = name => TRACKS[name].lead.length * 60 / TRACKS[name].bpm / 4;
  return { unlock, sfx, setOn, setVol, setTrack, setHold, restart, seconds,
    get on() { return on; }, get vol() { return vol; }, get hold() { return hold; }, get track() { return track; } };
})();
