// Mobile menu.
(() => {
  const burger = document.querySelector('.burger');
  const menu = document.querySelector('.menu');
  if (!burger || !menu) return;

  const setOpen = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
  };

  burger.addEventListener('click', () => {
    setOpen(burger.getAttribute('aria-expanded') !== 'true');
  });

  for (const a of menu.querySelectorAll('a')) {
    a.addEventListener('click', () => setOpen(false));
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      burger.focus();
    }
  });

  // Leaving phone width with the menu open would otherwise strand it on screen.
  matchMedia('(min-width: 861px)').addEventListener('change', (e) => {
    if (e.matches) setOpen(false);
  });
})();

// Moving plates. Nothing is fetched until a clip is actually on screen, and
// playback stops when it scrolls away, so the page costs no bandwidth or
// battery for video the reader never sees.
//
// Phones refuse autoplay far more often than desktops do — Low Power Mode,
// Reduce Motion and Data Saver all block it, and mobile Safari will reject a
// play() issued before any data has arrived. So: load first and play on the
// data, never assume it worked, and always leave a control behind so a
// poster frame is a still the reader can start rather than a dead end.
(() => {
  const clips = [...document.querySelectorAll('.shot__media, .hero__video')];
  if (!clips.length || !('IntersectionObserver' in window)) return;

  const stillness = matchMedia('(prefers-reduced-motion: reduce)');

  const host = (clip) => clip.closest('.plate, .shot, .hero') ?? clip.parentElement;

  const showControl = (clip) => {
    const parent = host(clip);
    if (!parent || parent.querySelector('.playpoke')) return;
    parent.classList.add('has-playpoke');

    const SVG = 'http://www.w3.org/2000/svg';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'playpoke';

    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const tri = document.createElementNS(SVG, 'path');
    tri.setAttribute('d', 'M8 5v14l11-7z');
    svg.appendChild(tri);

    const label = document.createElement('span');
    label.textContent = 'Play';

    btn.append(svg, label);
    btn.addEventListener('click', async () => {
      try {
        clip.muted = true;              // a muted clip is allowed far more often
        if (clip.readyState === 0) clip.load();
        await clip.play();
        btn.remove();
        parent.classList.remove('has-playpoke');
      } catch { /* leave the control up so it can be tried again */ }
    });
    parent.appendChild(btn);
  };

  const start = async (clip) => {
    if (stillness.matches) { showControl(clip); return; }
    clip.muted = true;
    if (clip.preload === 'none') clip.preload = 'auto';

    // Safari rejects play() issued before any frames exist, so wait for data.
    if (clip.readyState < 2) {
      clip.load();
      await new Promise((resolve) => {
        const done = () => { clip.removeEventListener('loadeddata', done); resolve(); };
        clip.addEventListener('loadeddata', done);
        setTimeout(done, 4000);
      });
    }
    try {
      await clip.play();
    } catch {
      showControl(clip);
    }
  };

  const io = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting) start(target);
      else target.pause?.();
    }
  }, { rootMargin: '150px 0px', threshold: 0 });

  for (const clip of clips) io.observe(clip);

  stillness.addEventListener('change', (e) => {
    for (const clip of clips) {
      if (e.matches) { clip.pause(); showControl(clip); }
      else start(clip);
    }
  });
})();

// Scroll reveal. Elements settle in as they enter view and lift back out as
// they leave, so moving either direction reads as one continuous motion.
(() => {
  const targets = document.querySelectorAll('[data-reveal]');
  if (!targets.length) return;

  if (!('IntersectionObserver' in window) ||
      matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (const el of targets) el.classList.add('is-in', 'is-settled');
    return;
  }

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      entry.target.classList.toggle('is-in', entry.isIntersecting);
      if (entry.isIntersecting) {
        // Keep the compositing hint only for the length of the entrance.
        setTimeout(() => entry.target.classList.add('is-settled'), 900);
      } else {
        entry.target.classList.remove('is-settled');
      }
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });

  for (const el of targets) io.observe(el);
})();

// Header picks up a harder edge once you have left the top of the page.
(() => {
  const header = document.querySelector('.titleblock');
  if (!header) return;
  const sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px';
  document.body.prepend(sentinel);
  new IntersectionObserver(
    ([e]) => header.classList.toggle('is-stuck', !e.isIntersecting)
  ).observe(sentinel);
})();

// Links the parts list to the item balloons on the detail drawing and to the
// plate below it. Hover, focus or tap an item on either side and all three
// move together. Item 01 is the resting state, so nothing is ever blank.

(() => {
  const DEFAULT_ITEM = '01';

  const drawing = document.querySelector('.dw');
  const items = [...document.querySelectorAll('.part')];
  const balloons = [...document.querySelectorAll('.bl')];
  const plates = [...document.querySelectorAll('.ps__img')];
  const capNo = document.querySelector('.ps__no');
  const capTxt = document.querySelector('.ps__txt');
  const list = document.querySelector('.parts__list');

  if (!drawing || !items.length) return;

  const nameOf = (id) =>
    items.find((el) => el.dataset.item === id)?.querySelector('.part__name')?.textContent ?? '';

  const setActive = (id) => {
    for (const el of items) el.classList.toggle('is-active', el.dataset.item === id);
    for (const el of balloons) el.classList.toggle('is-active', el.dataset.item === id);
    for (const el of plates) el.classList.toggle('is-shown', el.dataset.item === id);
    drawing.classList.add('has-active');
    if (capNo) capNo.textContent = id;
    if (capTxt) capTxt.textContent = nameOf(id);
  };

  const rest = () => setActive(DEFAULT_ITEM);

  for (const el of items) {
    const id = el.dataset.item;
    el.addEventListener('mouseenter', () => setActive(id));
    el.addEventListener('focus', () => setActive(id));
    el.addEventListener('click', () => setActive(id));
  }

  list?.addEventListener('mouseleave', rest);
  list?.addEventListener('focusout', (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) rest();
  });

  for (const el of balloons) {
    el.addEventListener('mouseenter', () => setActive(el.dataset.item));
    el.addEventListener('mouseleave', rest);
  }

  rest();

  // On phones nobody hovers, so the active item follows the scroll instead:
  // whichever service is crossing the middle of the screen is the live one.
  const narrow = matchMedia('(max-width: 1000px)');
  let scrollSpy = null;

  const startSpy = () => {
    if (scrollSpy || !('IntersectionObserver' in window)) return;
    scrollSpy = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setActive(entry.target.dataset.item);
      }
    }, { rootMargin: '-48% 0px -48% 0px', threshold: 0 });
    for (const el of items) scrollSpy.observe(el);
  };

  const stopSpy = () => {
    scrollSpy?.disconnect();
    scrollSpy = null;
    rest();
  };

  if (narrow.matches) startSpy();
  narrow.addEventListener('change', (e) => (e.matches ? startSpy() : stopSpy()));
})();
