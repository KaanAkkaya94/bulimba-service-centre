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
// battery for video the reader never sees. The poster frame stands in
// whenever motion is unwelcome or the clip cannot play.
(() => {
  const clips = document.querySelectorAll('.shot__media, .hero__video');
  if (!clips.length) return;

  const stillness = matchMedia('(prefers-reduced-motion: reduce)');
  if (stillness.matches || !('IntersectionObserver' in window)) return;

  const io = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting) {
        if (target.preload === 'none') target.preload = 'auto';
        target.play?.().catch(() => { /* autoplay refused; poster stands in */ });
      } else {
        target.pause?.();
      }
    }
  }, { rootMargin: '150px 0px', threshold: 0 });

  for (const clip of clips) io.observe(clip);

  stillness.addEventListener('change', (e) => {
    if (!e.matches) return;
    io.disconnect();
    for (const clip of clips) clip.pause();
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
