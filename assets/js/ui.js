/**
 * ui.js — VTA ICT L5 Community
 * Premium 2026 UI enhancements
 * Preserves all existing functionality:
 *  - Theme toggle (localStorage)
 *  - Mobile menu toggle (nav-menu / show class)
 * Adds:
 *  - Navbar scroll glass effect
 *  - Scroll-reveal for sections
 *  - Active nav link detection
 *  - Smooth hamburger icon
 */

document.addEventListener('DOMContentLoaded', () => {
  /* ─────────────────────────────────────────────
     1. THEME TOGGLE
     Preserves original logic exactly
  ───────────────────────────────────────────── */
  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    body.classList.add('light-theme');
    if (themeToggle) themeToggle.textContent = '🌙';
  } else {
    if (themeToggle) themeToggle.textContent = '☀️';
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      body.classList.toggle('light-theme');
      const isLight = body.classList.contains('light-theme');
      themeToggle.textContent = isLight ? '🌙' : '☀️';
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
    });
  }

  /* ─────────────────────────────────────────────
     2. MOBILE MENU — Side-panel drawer
     Injects: #menu-overlay + .menu-header
     Toggle: .active on both nav-menu + overlay
     Slide: translateX(-100%) → translateX(0)
  ───────────────────────────────────────────── */
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const navMenu = document.querySelector('.nav-menu');

  /* ── Inject full-screen overlay ── */
  let overlay = document.getElementById('menu-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'menu-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);
  }

  /* ── Inject drawer header (logo + close btn) ── */
  if (navMenu && !navMenu.querySelector('.menu-header')) {
    const header = document.createElement('div');
    header.className = 'menu-header';
    header.innerHTML = `
      <span class="menu-header-logo">VTA ICT L5</span>
      <button class="menu-header-close" aria-label="Close menu" type="button">✕</button>
    `;
    // Insert as very first child of nav-menu
    navMenu.insertBefore(header, navMenu.firstChild);
  }

  function openMenu() {
    navMenu.classList.add('active');
    overlay.classList.add('active');
    mobileMenuBtn.setAttribute('aria-expanded', 'true');
    mobileMenuBtn.classList.add('is-open');
    document.body.classList.add('menu-open');
    document.documentElement.classList.add('menu-open');
  }

  function closeMenu() {
    navMenu.classList.remove('active');
    overlay.classList.remove('active');
    mobileMenuBtn.setAttribute('aria-expanded', 'false');
    mobileMenuBtn.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    document.documentElement.classList.remove('menu-open');
  }

  if (mobileMenuBtn && navMenu) {
    /* Hamburger toggles drawer */
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navMenu.classList.contains('active') ? closeMenu() : openMenu();
    });

    /* Close button inside drawer header */
    const closeBtn = navMenu.querySelector('.menu-header-close');
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);

    /* Tapping overlay closes drawer */
    overlay.addEventListener('click', closeMenu);

    /* Nav link tap closes drawer */
    navMenu.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', closeMenu);
    });

    /* Auto-close on resize to desktop */
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1024 && navMenu.classList.contains('active')) {
        closeMenu();
      }
    }, { passive: true });
  }

  /* ─────────────────────────────────────────────
     3. NAVBAR SCROLL GLASS EFFECT
     Adds .scrolled class after 20px scroll
  ───────────────────────────────────────────── */
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    const handleNavbarScroll = () => {
      if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', handleNavbarScroll, { passive: true });
    handleNavbarScroll(); // run on load
  }

  /* ─────────────────────────────────────────────
     4. ACTIVE NAV LINK DETECTION
     Marks current page link with .active class
  ───────────────────────────────────────────── */
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const linkHref = link.getAttribute('href');
    if (linkHref) {
      const linkPage = linkHref.split('/').pop();
      if (
        linkPage === currentPath ||
        (currentPath === '' && linkHref === '#') ||
        (currentPath === 'index.html' && linkHref === '#')
      ) {
        link.classList.add('active');
      }
    }
  });

  /* ─────────────────────────────────────────────
     5. SCROLL REVEAL
     Adds .is-visible to .reveal elements
     when they enter the viewport
  ───────────────────────────────────────────── */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));



  /* ─────────────────────────────────────────────
     7. CARD STAGGER — trigger animation on scroll
     Re-animate grid cards visible in viewport
  ───────────────────────────────────────────── */
  const cardObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
        }
      });
    },
    { threshold: 0.05 }
  );

  document.querySelectorAll('.grid > .card').forEach(card => {
    card.style.animationPlayState = 'paused';
    cardObserver.observe(card);
  });

});
