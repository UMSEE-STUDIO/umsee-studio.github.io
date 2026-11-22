// M3 career room: CRT credits crawl, with a plain text view. Text is shown exactly as in data/career.json.
const CareerScene = (() => {
  let t = 0, opened = false, resumeAt = 0, rollEl = null, openedAt = 0, startAt = 0; // seconds into the crawl
  const e = s => UI.esc(s);

  function section(key, items, fmt) {
    if (!items?.length) return '';
    return `<section><h3>${e(Data.t(key))}</h3>${items.map(fmt).join('')}</section>`;
  }
  // Each entry: date / exhibition / venue on three lines. The stored text is not changed: "title - venue, city"
  // is only split for display at the last dash ("-" or "–") whose right side holds a comma (venue, city).
  const split = t => { const m = String(t).match(/^(.*\S)\s*[-–]\s*([^-–]*,[^-–]*)$/); return m ? [m[1], m[2].trim()] : [String(t), '']; };
  const entry = (date, text, venue) => `<div class="entry">${date ? `<div class="d">${e(date)}</div>` : ''}<div class="t">${e(text)}</div>${venue ? `<div class="v">${e(venue)}</div>` : ''}</div>`;
  const line = x => typeof x === 'string' ? entry('', ...split(x)) : entry(x.date, ...split(x.title || ''));
  const para = x => `<p class="note">${e(x)}</p>`;
  // Collaboration: date / title / event · partner. Confidential items show as a mystery line.
  const collab = c => c.confidential
    ? entry('?', Data.t('secretCollab'), '')
    : entry(c.date, c.title, [c.event, c.partner].filter(Boolean).join(' · '));

  // Order (user, 2026-11-22): collaboration > solo > group > personal work > artist note. Profile/education excluded.
  function content() {
    const c = Data.career;
    return section('collaboration', c.collaboration, collab) +
      section('solo', c.solo, line) +
      section('group', c.group, line) +
      section('other', c.other, line) +
      section('artistNote', c.artistNote, para);
  }

  // remember the crawl position (seconds) when the room is left
  function remember() { if (openedAt) { resumeAt = startAt + (performance.now() - openedAt) / 1000; openedAt = 0; } }

  function open() {
    opened = true;
    const p = UI.open(`<div class="crawl"><div class="roll">${content()}</div></div><div class="list">${content()}</div>
      <p class="hint"><button data-mode>${e(Data.t('textView'))} [A]</button></p>`, {
      cls: 'crt',
      onClose: () => { remember(); Scenes.go(HubScene, 'career'); },
      onKey: () => { if (!document.activeElement?.matches('a') && Input.consume('a')) { toggle(p); return true; } return false; },
    });
    const roll = p.querySelector('.roll');
    roll.querySelectorAll('a').forEach(a => a.setAttribute('tabindex', '-1'));
    p.querySelector('[data-mode]').focus({ preventScroll: true });
    roll.style.setProperty('--dist', -(roll.scrollHeight + p.querySelector('.crawl').clientHeight * 1.6) + 'px');
    const dur = Math.max(20, roll.scrollHeight / 36); // ~2x the first preview speed
    roll.style.animationDuration = dur + 's';
    startAt = resumeAt % dur; openedAt = performance.now();
    roll.style.animationDelay = -startAt + 's'; // later visits continue where the crawl was left
    rollEl = roll;
    p.addEventListener('click', ev => { if (ev.target.closest('[data-mode]')) toggle(p); });
  }
  function toggle(p) {
    const text = p.classList.toggle('textmode');
    p.querySelector('[data-mode]').textContent = `${Data.t(text ? 'crawlView' : 'textView')} [A]`;
    if (text) p.querySelector('.body').scrollTop = 0;
  }

  return {
    camera: true, camTarget: () => ({ x: W / 2, y: H / 2 }),
    leave() { remember(); },
    enter() {
      t = 0; opened = false;
      Audio8.setTrack('space');
      if (!Save.get('enter.career', false)) { Save.set('enter.career', true); UI.say(Data.say('ENTER_CAREER'), { x: 160, y: 110 }); }
      else t = 2;
    },
    update(dt) {
      t += dt;
      if (Input.consume('b')) { remember(); Scenes.go(HubScene, 'career'); return; }
      if (!opened && (t > 2.2 || Input.consume('a') || Input.takeTap())) open();
    },
    draw(ctx) {
      rect(ctx, '#05040c', 0, 0, W, H);
      rect(ctx, '#6a6f8c', 60, 26, 200, 120); rect(ctx, '#1b1d33', 70, 34, 168, 104);
      rect(ctx, t % 1 < 0.5 ? '#2a5070' : '#28506c', 74, 38, 160, 96);
      ctx.fillStyle = 'rgba(127,224,255,0.08)'; ctx.fillRect(40, 20, 240, 150);
    },
  };
})();
