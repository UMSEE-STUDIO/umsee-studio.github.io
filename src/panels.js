// Panel content builders. Career text is shown exactly as stored (원문 원칙).
const MAIL = 'hurry52@naver.com';
const Panels = (() => {
  const t = k => UI.esc(Data.t(k));
  const e = UI.esc;
  const ext = (url, text) => `<a href="${e(url)}" target="_blank" rel="noopener">${e(text)} ↗</a>`;
  const mailto = subj => `mailto:${MAIL}?subject=${encodeURIComponent(subj)}`;

  function ytId(url) {
    const m = String(url).match(/(?:youtu\.be\/|shorts\/|[?&]v=|embed\/)([\w-]{11})/);
    return m ? m[1] : null;
  }
  // Click-to-load video: no third-party request until the user presses play.
  function videoBlock(url, title) {
    const id = ytId(url);
    return `<div class="video" data-yt="${e(id || '')}">
      <div class="card"><div class="ch">▶</div><div class="tt">${e(title)}</div></div>
      <button data-play>${t('play')}</button> ${ext(url, Data.t('openYoutube'))}</div>`;
  }
  function wireVideo(panel) {
    panel.addEventListener('click', ev => { if (ev.target.closest('[data-play], .video .card')) play(panel); }); // the TV picture plays too
  }
  function play(panel) {
    const box = panel.querySelector('.video'), b = panel.querySelector('[data-play]'), id = box?.dataset.yt;
    if (!id || !b) return;
    const origin = encodeURIComponent(location.origin);
    box.querySelector('.card').outerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&enablejsapi=1&origin=${origin}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="video"></iframe>`;
    b.remove();
    Audio8.setHold(true);
    const f = box.querySelector('iframe');
    f.addEventListener('load', () => f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 'tv' }), '*'));
  }
  // YouTube player messages (no API script): state 0 = ended -> BGM back from the start.
  addEventListener('message', ev => {
    if (!/youtube(-nocookie)?\.com$/.test(new URL(ev.origin).hostname)) return;
    let d; try { d = JSON.parse(ev.data); } catch { return; }
    const st = d.event === 'onStateChange' ? d.info : d.info?.playerState;
    if (st === 0) Audio8.setHold(false);
  });

  // TV: static noise, then the channel card. ◀▶ channels, A plays.
  function tv(ch) {
    const list = Data.career.interviews, n = list.length;
    const render = () => {
      const v = list[ch];
      return `<div class="static"></div><h2>${t('channel')} ${ch + 1}/${n}</h2>${videoBlock(v.url, v.title)}`;
    };
    Audio8.sfx('static');
    const p = UI.open(render(), {
      cls: 'tv',
      onKey: () => {
        const d = Input.consume('dir:left') ? -1 : Input.consume('dir:right') ? 1 : 0;
        if (d && n > 1 && !p.querySelector('iframe')) { ch = (ch + d + n) % n; InterviewScene.def.channel = ch; Audio8.sfx('static'); p.querySelector('.body').innerHTML = render(); return true; }
        if (Input.consume('a')) { play(p); return true; }
        return false;
      },
    });
    wireVideo(p);
  }

  function about() {
    const c = Data.career;
    UI.open(`<h2>${t('about')}</h2><p class="name">${e(c.name)}</p>${Data.about.intro.map(x => `<p class="intro">${e(x)}</p>`).join('')}
      <p>${ext('https://www.instagram.com/ummm.see/', Data.t('instagram'))}</p>`);
  }

  function collabItem(c) {
    if (c.confidential) return `<div class="item secret"><h3>? <span class="tag">${t('ongoing')}</span></h3><p>${t('secretCollab')}</p></div>`;
    const meta = [c.date, c.event, c.partner, c.venue].filter(Boolean).map(e).join(' · ');
    return `<div class="item"><h3>${e(c.title)} ${c.status ? `<span class="tag">${t('ongoing')}</span>` : ''}</h3>
      ${meta ? `<p class="meta">${meta}</p>` : ''}
      ${c.links?.length ? `<p class="links">${c.links.map(l => ext(l.url, l.label)).join('<br>')}</p>` : ''}
      ${c.press_short ? videoBlock(c.press_short.url, c.press_short.label) : ''}</div>`;
  }
  function collab() {
    const p = UI.open(`<h2>${t('collaboration')}</h2>${Data.career.collaboration.map(collabItem).join('')}`);
    wireVideo(p);
  }

  function interview(ch) { tv(ch); }

  function mail() {
    UI.open(`<h2>✉ ${t('contact')}</h2><p class="name">${e(MAIL)}</p><p class="links">
      <a href="${mailto(Data.t('mailSubjectOrder'))}">${t('orderInquiry')}</a><br>
      <a href="${mailto(Data.t('mailSubjectCollab'))}">${t('collabProposal')}</a></p>`);
  }
  function instagram() {
    UI.open(`<h2>☎ ${t('contact')}</h2><p class="name">Instagram @ummm.see</p><p class="links">${ext('https://www.instagram.com/ummm.see/', Data.t('instagram'))}</p>
      <p class="name">✉ ${e(MAIL)}</p><p class="links"><a href="${mailto(Data.t('mailSubjectOrder'))}">${t('orderInquiry')}</a></p>`);
  }

  // Artwork browser: same screen for click and for ◀▶. A = full size (1200px) viewer.
  function artwork(a, index, list = null) {
    list = list || [a];
    let i = Math.max(0, list.indexOf(a));
    const title = k => `${Data.t('untitled')} #${list[k].no}`;
    const render = () => {
      const it = list[i];
      return `<div class="zoom"><button class="nav" data-nav="-1" aria-label="prev">◀</button>
        <img src="${e(it.thumb)}" alt="${e(title(i))}" data-full>
        <button class="nav" data-nav="1" aria-label="next">▶</button></div>
        <h3>${e(title(i))} <span class="meta">${i + 1}/${list.length}</span></h3>
        <p class="meta">${t('series')}: ${t(it.folder)} · ${t('year')}: —</p>
        <p class="links"><button data-full>${t('fullView')}</button>
        <a href="${mailto(`${Data.t('mailSubjectOrder')} - ${it.id}`)}">${t('orderInquiry')}</a></p>`;
    };
    const go = d => { i = (i + d + list.length) % list.length; p.querySelector('.body').innerHTML = render(); Images.get(list[(i + d + list.length) % list.length].thumb); };
    const full = () => UI.openViewer(list[i].web, title(i));
    const p = UI.open(render(), {
      cls: 'art',
      onKey: () => {
        if (Input.consume('dir:left')) { go(-1); return true; }
        if (Input.consume('dir:right')) { go(1); return true; }
        if (Input.consume('a')) { full(); return true; }
        return false;
      },
    });
    p.addEventListener('click', ev => {
      const nav = ev.target.closest('[data-nav]'); if (nav) { go(+nav.dataset.nav); return; }
      if (ev.target.closest('[data-full]')) full();
    });
  }

  return { about, collab, interview, tv, mail, instagram, artwork, ytId };
})();
