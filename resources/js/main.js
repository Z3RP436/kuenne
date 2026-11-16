/* Greeting by time of day */
(() => {
  const greeting = document.getElementById('welcome');
  if (!greeting) return;
  const hour = new Date().getHours();
  greeting.textContent = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';
})();

/* Scroll-to-top button */
(() => {
  const toTop = document.getElementById('scroll-to-top');
  const sentinel = document.getElementById('top-sentinel');
  if (!toTop || !sentinel) return;

  const setVisible = (visible) => toTop.classList.toggle('is-visible', visible);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting)).observe(sentinel);
  } else {
    addEventListener('scroll', () => setVisible(scrollY > 20), { passive: true });
  }
  toTop.addEventListener('click', () => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    document.getElementById('main')?.focus({ preventScroll: true });
  });
})();

/* Reveal on scroll: blocks rise in. The hidden state is added here (never in plain CSS),
   skipped for reduced motion, and everything stays visible if anything fails. The first section (hero) is exempt. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;
  const all = [...document.querySelectorAll('.reveal')];
  const firstSection = document.querySelector('main section');
  const items = all.filter((el) => !(firstSection && firstSection.contains(el)));
  if (!items.length) return;

  const done = (el) => {
    el.classList.remove('will-reveal', 'is-in');
    el.style.removeProperty('--d');
  };
  try {
    items.forEach((el) => el.classList.add('will-reveal'));
    void document.body.offsetHeight; // commit the start state before any transition
    const show = (el, delay) => {
      el.style.setProperty('--d', `${delay}ms`);
      el.classList.add('is-in');
      const onEnd = (ev) => {
        if (ev.target !== el || ev.propertyName !== 'opacity') return;
        el.removeEventListener('transitionend', onEnd);
        done(el);
      };
      el.addEventListener('transitionend', onEnd);
      setTimeout(() => done(el), delay + 2000); // safety net if transitionend never fires
    };

    const pending = new Set();
    const io = new IntersectionObserver((entries) => {
      let n = 0;
      entries.forEach((e) => {
        if (e.isIntersecting) { io.unobserve(e.target); pending.delete(e.target); show(e.target, n++ * 90); }
        else if (e.boundingClientRect.bottom < 0) { io.unobserve(e.target); pending.delete(e.target); done(e.target); } // jumped past it: no animation
      });
    }, { threshold: 0.12 });

    requestAnimationFrame(() => requestAnimationFrame(() => {
      let n = 0;
      items.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight * 0.92 && r.bottom > 0) show(el, 80 + n++ * 90); // already on screen: staggered entrance
        else { pending.add(el); io.observe(el); }
      });
      // observers do not fire for elements skipped by a jump (End key, anchor): reveal them without animation
      let sweeping = false;
      addEventListener('scroll', () => {
        if (sweeping) return;
        sweeping = true;
        requestAnimationFrame(() => {
          sweeping = false;
          pending.forEach((el) => { if (el.getBoundingClientRect().bottom < 0) { io.unobserve(el); pending.delete(el); done(el); } });
        });
      }, { passive: true });
    }));
  } catch {
    items.forEach(done);
  }
})();

/* Navigation: mark the section in view (index page only) */
(() => {
  if (!('IntersectionObserver' in window)) return;
  const links = [...document.querySelectorAll('.site-nav a[href*="#"]')]
    .map((a) => ({ a, id: a.hash.slice(1) }))
    .filter(({ id }) => id && document.getElementById(id));
  if (!links.length) return; // sub pages: nothing to mark
  const setCurrent = (id) => links.forEach(({ a, id: lid }) => (lid === id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) setCurrent(e.target.id); });
  }, { rootMargin: '-35% 0px -60% 0px' });
  links.forEach(({ id }) => io.observe(document.getElementById(id)));
})();

/* Smooth in-page links: no reload, native smooth scroll (offset comes from CSS scroll-padding-top), URL hash updated, focus moved for keyboard/screen-reader users */
(() => {
  const samePage = (a) => {
    if (!a.hash || a.origin !== location.origin) return false;
    const norm = (p) => p.replace(/index\.html$/, '');
    return norm(a.pathname) === norm(location.pathname);
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target) return;
    if (!samePage(a)) return;
    const target = document.getElementById(decodeURIComponent(a.hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    history.pushState(null, '', a.hash);
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
})();
