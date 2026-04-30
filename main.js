/**
 * main.js — combined entry. All shared utils, components and feature inits.
 * Wrapped in an IIFE; safe to load as <script src="main.js" defer>.
 */
(function () {
    'use strict';


    /* === shared/lib/constants.js === */
    /**
     * Shared constants used across modules.
     */
    const ANIMATION = {
        CURSOR_OFFSET: -9999,
        TYPING_PAUSE_MS: 2000,
        TYPING_RESET_MS: 500,
        TYPING_TYPE_SPEED_MS: 100,
        TYPING_DELETE_SPEED_MS: 50,
        TYPING_INITIAL_DELAY_MS: 1500,
        SCROLL_THROTTLE_MS: 100,
        RESIZE_DEBOUNCE_MS: 200,
        PARTICLE_MAX_DIST: 120,
    };
    const STORAGE_KEYS = {
        THEME: 'portfolio-theme',
    };

    /* === shared/lib/utils.js === */
    /**
     * DOM utilities and timing helpers.
     */

    /** @param {string} sel @param {ParentNode} [ctx] */
    const $ = (sel, ctx = document) => ctx.querySelector(sel);

    /** @param {string} sel @param {ParentNode} [ctx] */
    const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
    const prefersReducedMotion =
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /**
     * Delay invoking fn until `delay` ms have elapsed since last call.
     * @param {Function} fn
     * @param {number} delay
     */
    function debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }

    /**
     * Ensure fn is called at most once per `limit` ms.
     * @param {Function} fn
     * @param {number} limit
     */
    function throttle(fn, limit) {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                fn(...args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
    }

    /* === shared/lib/cleanup.js === */
    /**
     * Centralized teardown registry — cancels animation frames, timeouts and
     * intervals on page unload to prevent leaks (especially under bfcache restore).
     */

    const registry = {
        rafs: new Set(),
        timeouts: new Set(),
        intervals: new Set(),
    };

    /** @param {number} id */
    const trackRaf = (id) => { registry.rafs.add(id); return id; };

    /** @param {number} id */
    const trackTimeout = (id) => { registry.timeouts.add(id); return id; };

    /** @param {number} id */
    const trackInterval = (id) => { registry.intervals.add(id); return id; };
    function initCleanup() {
        const teardown = () => {
            registry.rafs.forEach((id) => cancelAnimationFrame(id));
            registry.timeouts.forEach((id) => clearTimeout(id));
            registry.intervals.forEach((id) => clearInterval(id));
            registry.rafs.clear();
            registry.timeouts.clear();
            registry.intervals.clear();
        };
        window.addEventListener('pagehide', teardown);
        window.addEventListener('beforeunload', teardown);
    }

    /* === shared/lib/typing.js === */
    /**
     * Typing effect for the hero role text — clears prior timeouts to avoid stacking.
     */
    function initTyping() {
        const typingText = $('#typing-text');
        if (!typingText) return;

        const roles = ['Software Developer', 'Data Analyst', 'Cloud Architect', 'Tech Innovator'];
        let roleIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let typeTimeout = null;

        function schedule(delay) {
            if (typeTimeout) clearTimeout(typeTimeout);
            typeTimeout = trackTimeout(setTimeout(type, delay));
        }

        function type() {
            const currentRole = roles[roleIndex];
            let typeSpeed;
            if (isDeleting) {
                typingText.textContent = currentRole.substring(0, charIndex - 1);
                charIndex--;
                typeSpeed = ANIMATION.TYPING_DELETE_SPEED_MS;
            } else {
                typingText.textContent = currentRole.substring(0, charIndex + 1);
                charIndex++;
                typeSpeed = ANIMATION.TYPING_TYPE_SPEED_MS;
            }
            if (!isDeleting && charIndex === currentRole.length) {
                typeSpeed = ANIMATION.TYPING_PAUSE_MS;
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                roleIndex = (roleIndex + 1) % roles.length;
                typeSpeed = ANIMATION.TYPING_RESET_MS;
            }
            schedule(typeSpeed);
        }
        schedule(ANIMATION.TYPING_INITIAL_DELAY_MS);
    }

    /* === shared/lib/scroll-anim.js === */
    /**
     * IntersectionObserver-driven entrance animations for [data-animate] elements.
     */
    function initScrollAnimations() {
        const animatedElements = $$('[data-animate]');
        if (prefersReducedMotion) {
            animatedElements.forEach((el) => el.classList.add('visible'));
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const delay = parseInt(entry.target.dataset.delay) || 0;
                    setTimeout(() => entry.target.classList.add('visible'), delay);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
        animatedElements.forEach((el) => observer.observe(el));
    }

    /* === shared/components/theme/theme.js === */
    /**
     * Dark / light theme toggle with localStorage persistence.
     */
    function initTheme() {
        const toggles = $$('.theme-toggle');
        if (!toggles.length) return;

        const root = document.documentElement;
        const stored = localStorage.getItem(STORAGE_KEYS.THEME);
        const initial = stored === 'light' || stored === 'dark' ? stored : 'dark';

        apply(initial);

        toggles.forEach((toggle) => {
            toggle.addEventListener('click', () => {
                const current = root.dataset.theme || 'dark';
                const next = current === 'dark' ? 'light' : 'dark';
                apply(next);
                try { localStorage.setItem(STORAGE_KEYS.THEME, next); } catch (_) {}
            });
        });

        function apply(theme) {
            root.dataset.theme = theme;
            const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
            toggles.forEach((toggle) => {
                const icon = toggle.querySelector('i');
                if (icon) {
                    icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
                }
                toggle.setAttribute('aria-label', label);
            });
        }
    }

    /* === shared/components/cursor/cursor.js === */
    /**
     * Custom dot + outline cursor (desktop only, respects reduced-motion).
     */
    function initCursor() {
        const cursorDot = $('#cursor-dot');
        const cursorOutline = $('#cursor-outline');
        if (!cursorDot || !cursorOutline || prefersReducedMotion) return;
        if (window.matchMedia('(pointer: coarse)').matches) return;
        if (window.innerWidth <= 1024) return;

        let mouseX = 0, mouseY = 0;
        let outlineX = 0, outlineY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            cursorDot.style.transform = `translate(${mouseX - 4}px, ${mouseY - 4}px)`;
        });

        function animateOutline() {
            outlineX += (mouseX - outlineX) * 0.15;
            outlineY += (mouseY - outlineY) * 0.15;
            cursorOutline.style.transform = `translate(${outlineX - 18}px, ${outlineY - 18}px)`;
            trackRaf(requestAnimationFrame(animateOutline));
        }
        animateOutline();

        const interactives = 'a, button, .project-card, .expertise-card, .filter-btn, .skill-tab, .skill-node, .article-card';
        document.addEventListener('mouseover', (e) => {
            if (e.target.closest(interactives)) {
                cursorOutline.classList.add('cursor-hover');
            }
        });
        document.addEventListener('mouseout', (e) => {
            if (e.target.closest(interactives)) {
                cursorOutline.classList.remove('cursor-hover');
            }
        });
    }

    /* === shared/components/nav/nav.js === */
    /**
     * Sticky header behavior, hamburger menu, scroll-spy active link, animated indicator.
     */
    function initNav() {
        const header = $('#site-header');
        const hamburger = $('#hamburger');
        const navLinks = $('#nav-links');
        const navIndicator = $('#nav-indicator');
        if (!header || !hamburger || !navLinks) return;

        let lastScrollY = window.scrollY;

        function syncHeaderHeight() {
            const h = header.getBoundingClientRect().height;
            document.documentElement.style.setProperty('--header-height', `${Math.round(h)}px`);
        }

        syncHeaderHeight();
        window.addEventListener('resize', syncHeaderHeight);

        function setMenuOpen(open) {
            if (open) syncHeaderHeight();
            hamburger.classList.toggle('active', open);
            navLinks.classList.toggle('active', open);
            hamburger.setAttribute('aria-expanded', String(open));
            document.body.classList.toggle('menu-open', open);
        }

        hamburger.addEventListener('click', () => {
            setMenuOpen(!navLinks.classList.contains('active'));
        });

        $$('.nav-link').forEach((link) => {
            link.addEventListener('click', () => setMenuOpen(false));
        });

        document.addEventListener('click', (e) => {
            if (
                navLinks.classList.contains('active') &&
                !navLinks.contains(e.target) &&
                !hamburger.contains(e.target)
            ) {
                setMenuOpen(false);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navLinks.classList.contains('active')) {
                setMenuOpen(false);
            }
        });

        window.addEventListener(
            'scroll',
            throttle(() => {
                const currentY = window.scrollY;
                if (currentY > 50) header.classList.add('scrolled');
                else header.classList.remove('scrolled');
                if (currentY > lastScrollY && currentY > 100) header.classList.add('hide');
                else header.classList.remove('hide');
                lastScrollY = currentY;
            }, ANIMATION.SCROLL_THROTTLE_MS),
        );

        const sections = $$('section[id]');
        const navLinkElements = $$('.nav-link');

        function updateActiveSection() {
            const scrollPos = window.scrollY + window.innerHeight / 3;
            sections.forEach((section) => {
                const top = section.offsetTop;
                const height = section.offsetHeight;
                const id = section.getAttribute('id');
                if (scrollPos >= top && scrollPos < top + height) {
                    navLinkElements.forEach((link) => {
                        link.classList.remove('active');
                        if (link.dataset.section === id) {
                            link.classList.add('active');
                            updateIndicator(link);
                        }
                    });
                }
            });
        }

        function updateIndicator(activeLink) {
            if (!navIndicator || window.innerWidth <= 768) return;
            navIndicator.style.left = activeLink.offsetLeft + 'px';
            navIndicator.style.width = activeLink.offsetWidth + 'px';
        }

        window.addEventListener('scroll', throttle(updateActiveSection, ANIMATION.SCROLL_THROTTLE_MS));
        window.addEventListener('resize', debounce(() => {
            const activeLink = $('.nav-link.active');
            if (activeLink) updateIndicator(activeLink);
        }, ANIMATION.RESIZE_DEBOUNCE_MS));

        const initialActive = $('.nav-link.active');
        if (initialActive) setTimeout(() => updateIndicator(initialActive), 100);
    }

    /* === features/hero/hero-canvas.js === */
    /**
     * 2D constellation/particle canvas behind the hero — paused when offscreen.
     */
    function initHeroCanvas() {
        const heroCanvas = $('#hero-canvas');
        if (!heroCanvas || prefersReducedMotion) return;

        const ctx = heroCanvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        let particles = [];
        let animationId = null;
        const pointer = { x: -9999, y: -9999, active: false };

        const PRIMARY_RGB = '0, 74, 173';
        const ACCENT_RGB = '120, 170, 255';

        function resize() {
            const w = heroCanvas.parentElement.offsetWidth;
            const h = heroCanvas.parentElement.offsetHeight;
            heroCanvas.width = w * dpr;
            heroCanvas.height = h * dpr;
            heroCanvas.style.width = w + 'px';
            heroCanvas.style.height = h + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        const viewW = () => heroCanvas.width / dpr;
        const viewH = () => heroCanvas.height / dpr;

        class Particle {
            constructor() { this.reset(true); }
            reset(initial = false) {
                this.x = Math.random() * viewW();
                this.y = Math.random() * viewH();
                this.baseSize = Math.random() * 1.6 + 0.6;
                this.speedX = (Math.random() - 0.5) * 0.35;
                this.speedY = (Math.random() - 0.5) * 0.35;
                this.opacity = initial ? Math.random() * 0.45 + 0.25 : 0;
                this.pulse = Math.random() * Math.PI * 2;
                this.pulseSpeed = 0.012 + Math.random() * 0.018;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                this.pulse += this.pulseSpeed;
                if (pointer.active) {
                    const dx = pointer.x - this.x;
                    const dy = pointer.y - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 180 && dist > 0.1) {
                        const force = (1 - dist / 180) * 0.22;
                        this.x += (dx / dist) * force;
                        this.y += (dy / dist) * force;
                    }
                }
                if (this.x < -10) this.x = viewW() + 10;
                if (this.x > viewW() + 10) this.x = -10;
                if (this.y < -10) this.y = viewH() + 10;
                if (this.y > viewH() + 10) this.y = -10;
            }
            draw() {
                const breath = (Math.sin(this.pulse) + 1) * 0.5;
                const size = this.baseSize + breath * 0.6;
                const alpha = this.opacity * (0.7 + breath * 0.3);

                const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, size * 6);
                grad.addColorStop(0, `rgba(${ACCENT_RGB}, ${alpha * 0.8})`);
                grad.addColorStop(0.4, `rgba(${PRIMARY_RGB}, ${alpha * 0.25})`);
                grad.addColorStop(1, `rgba(${PRIMARY_RGB}, 0)`);
                ctx.fillStyle = grad;
                drawRoundedRect(ctx, this.x - size * 6, this.y - size * 6, size * 12, size * 12, size * 2);
                ctx.fill();

                ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(alpha + 0.2, 0.95)})`;
                drawRoundedRect(ctx, this.x - size, this.y - size, size * 2, size * 2, Math.min(size * 0.45, 1.2));
                ctx.fill();
            }
        }

        function drawRoundedRect(c, x, y, w, h, r) {
            c.beginPath();
            if (typeof c.roundRect === 'function') { c.roundRect(x, y, w, h, r); return; }
            c.moveTo(x + r, y);
            c.lineTo(x + w - r, y);
            c.quadraticCurveTo(x + w, y, x + w, y + r);
            c.lineTo(x + w, y + h - r);
            c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            c.lineTo(x + r, y + h);
            c.quadraticCurveTo(x, y + h, x, y + h - r);
            c.lineTo(x, y + r);
            c.quadraticCurveTo(x, y, x + r, y);
            c.closePath();
        }

        function init() {
            resize();
            const area = viewW() * viewH();
            const count = Math.min(Math.floor(area / 11000), 110);
            particles = Array.from({ length: count }, () => new Particle());
        }

        function drawConnections() {
            const maxDist = 140;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const a = particles[i];
                    const b = particles[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < maxDist) {
                        const opacity = (1 - dist / maxDist) * 0.32;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.strokeStyle = `rgba(${PRIMARY_RGB}, ${opacity})`;
                        ctx.lineWidth = 0.6;
                        ctx.stroke();
                    }
                }
            }
        }

        function drawPointerLinks() {
            if (!pointer.active) return;
            const maxDist = 200;
            for (const p of particles) {
                const dx = pointer.x - p.x;
                const dy = pointer.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < maxDist) {
                    const t = 1 - dist / maxDist;
                    ctx.beginPath();
                    ctx.moveTo(pointer.x, pointer.y);
                    ctx.lineTo(p.x, p.y);
                    ctx.strokeStyle = `rgba(${ACCENT_RGB}, ${t * 0.55})`;
                    ctx.lineWidth = 0.9;
                    ctx.stroke();
                }
            }
            const halo = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 60);
            halo.addColorStop(0, `rgba(${ACCENT_RGB}, 0.18)`);
            halo.addColorStop(1, `rgba(${PRIMARY_RGB}, 0)`);
            ctx.fillStyle = halo;
            drawRoundedRect(ctx, pointer.x - 60, pointer.y - 60, 120, 120, 18);
            ctx.fill();
        }

        function animate() {
            ctx.clearRect(0, 0, viewW(), viewH());
            drawConnections();
            drawPointerLinks();
            particles.forEach((p) => { p.update(); p.draw(); });
            animationId = trackRaf(requestAnimationFrame(animate));
        }

        init();
        animate();

        const heroEl = heroCanvas.parentElement;
        heroEl.addEventListener('mousemove', (e) => {
            const rect = heroEl.getBoundingClientRect();
            pointer.x = e.clientX - rect.left;
            pointer.y = e.clientY - rect.top;
            pointer.active = true;
        });
        heroEl.addEventListener('mouseleave', () => {
            pointer.active = false;
            pointer.x = -9999;
            pointer.y = -9999;
        });
        heroEl.addEventListener('touchmove', (e) => {
            const rect = heroEl.getBoundingClientRect();
            const t = e.touches[0];
            if (t) {
                pointer.x = t.clientX - rect.left;
                pointer.y = t.clientY - rect.top;
                pointer.active = true;
            }
        }, { passive: true });
        heroEl.addEventListener('touchend', () => { pointer.active = false; });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    if (!animationId) animate();
                } else if (animationId) {
                    cancelAnimationFrame(animationId);
                    animationId = null;
                }
            });
        }, { threshold: 0.05 });
        observer.observe(heroCanvas.parentElement);

        window.addEventListener('resize', debounce(init, 300));
    }

    /* === features/skills/skills.js === */
    /**
     * Skills tabs (panel switching). Legacy orbit positioning kept as no-op safe
     * fallback in case orbit markup is ever reintroduced.
     */
    function initSkills() {
        const tabs = $$('.skill-tab');
        const panels = $$('.skills-panel');
        if (!tabs.length || !panels.length) return;

        tabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                tabs.forEach((t) => t.classList.remove('active'));
                tab.classList.add('active');
                const targetId = 'panel-' + tab.dataset.tab;
                panels.forEach((panel) => {
                    panel.classList.remove('active');
                    if (panel.id === targetId) {
                        panel.classList.add('active');
                        positionOrbitNodes(panel);
                        updateMobileSkills(panel);
                    }
                });
            });
        });

        function positionOrbitNodes(panel) {
            if (window.innerWidth <= 768) return;
            const orbitContainer = panel.querySelector('.skills-orbit');
            if (!orbitContainer) return;
            const nodes = orbitContainer.querySelectorAll('.skill-node');
            const containerSize = orbitContainer.offsetWidth;
            const nodeSize = 72;
            const halfNode = nodeSize / 2;
            const orbitRadii = { 1: containerSize * 0.27, 2: containerSize * 0.42 };
            nodes.forEach((node) => {
                const orbit = parseInt(node.dataset.orbit) || 1;
                const angle = parseInt(node.dataset.angle) || 0;
                const radius = orbitRadii[orbit] || orbitRadii[1];
                const radian = (angle * Math.PI) / 180;
                const centerX = containerSize / 2;
                const centerY = containerSize / 2;
                node.style.left = (centerX + radius * Math.cos(radian) - halfNode) + 'px';
                node.style.top = (centerY + radius * Math.sin(radian) - halfNode) + 'px';
            });
        }

        function updateMobileSkills(panel) {
            if (window.innerWidth > 768) return;
            const mobileContainer = $('#skills-list-mobile');
            if (!mobileContainer) return;
            mobileContainer.innerHTML = '';
            panel.querySelectorAll('.skill-node').forEach((node) => {
                const clone = node.cloneNode(true);
                clone.style.position = 'static';
                clone.style.left = '';
                clone.style.top = '';
                mobileContainer.appendChild(clone);
            });
        }

        const activePanel = $('.skills-panel.active');
        if (activePanel) {
            positionOrbitNodes(activePanel);
            updateMobileSkills(activePanel);
        }

        window.addEventListener('resize', debounce(() => {
            const active = $('.skills-panel.active');
            if (active) {
                positionOrbitNodes(active);
                updateMobileSkills(active);
            }
        }, 200));
    }

    /* === features/projects/project-filters.js === */
    /**
     * Category filtering for project cards (data-filter ↔ data-category).
     */
    function initProjectFilters() {
        const filterBtns = $$('.filter-btn');
        const projectCards = $$('.project-card');
        if (!filterBtns.length || !projectCards.length) return;

        filterBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                filterBtns.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                const filter = btn.dataset.filter;
                projectCards.forEach((card) => {
                    const category = card.dataset.category;
                    const shouldShow = filter === 'all' || category === filter;
                    if (shouldShow) {
                        card.classList.remove('hidden', 'fade-out');
                        void card.offsetHeight;
                        card.classList.add('fade-in');
                    } else {
                        card.classList.add('fade-out');
                        card.classList.remove('fade-in');
                        setTimeout(() => {
                            card.classList.add('hidden');
                            card.classList.remove('fade-out');
                        }, 300);
                    }
                });
            });
        });
    }

    /* === features/projects/tilt.js === */
    /**
     * 3D mouse-tracking tilt on project cards (desktop, fine pointer only).
     */
    function initTilt() {
        if (prefersReducedMotion || window.matchMedia('(pointer: coarse)').matches) return;
        $$('.project-card').forEach((card) => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = ((y - centerY) / centerY) * -5;
                const rotateY = ((x - centerX) / centerX) * 5;
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
                card.style.transition = 'transform 0.5s ease';
                setTimeout(() => (card.style.transition = ''), 500);
            });
            card.addEventListener('mouseenter', () => { card.style.transition = ''; });
        });
    }

    /* === features/contact/contact-form.js === */
    /**
     * Contact form: client-side validation + async submission with UI feedback.
     */
    function initContactForm() {
        const contactForm = $('#contact-form');
        if (!contactForm) return;

        const nameInput = $('#name');
        const emailInput = $('#email');
        const messageInput = $('#message');
        const submitBtn = contactForm.querySelector('.btn-submit');

        function showError(input, message) {
            const errorEl = input.parentElement.querySelector('.form-error');
            if (errorEl) errorEl.textContent = message;
            input.style.borderColor = '#dc3545';
        }
        function clearError(input) {
            const errorEl = input.parentElement.querySelector('.form-error');
            if (errorEl) errorEl.textContent = '';
            input.style.borderColor = '';
        }

        function validateField(input) {
            if (input === nameInput) {
                if (!input.value.trim()) { showError(input, 'Name is required'); return false; }
                if (input.value.trim().length < 2) { showError(input, 'Name must be at least 2 characters'); return false; }
            }
            if (input === emailInput) {
                if (!input.value.trim()) { showError(input, 'Email is required'); return false; }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())) {
                    showError(input, 'Please enter a valid email');
                    return false;
                }
            }
            if (input === messageInput) {
                if (!input.value.trim()) { showError(input, 'Message is required'); return false; }
                if (input.value.trim().length < 10) { showError(input, 'Message must be at least 10 characters'); return false; }
            }
            clearError(input);
            return true;
        }

        [nameInput, emailInput, messageInput].forEach((input) => {
            if (!input) return;
            input.addEventListener('blur', () => validateField(input));
            input.addEventListener('input', () => {
                if (input.style.borderColor) clearError(input);
            });
        });

        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const ok = [nameInput, emailInput, messageInput].every(validateField);
            if (!ok) return;
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
            try {
                const response = await fetch(contactForm.action, {
                    method: 'POST',
                    body: new FormData(contactForm),
                    headers: { Accept: 'application/json' },
                });
                if (!response.ok) throw new Error('Form submission failed');
                submitBtn.classList.remove('loading');
                submitBtn.classList.add('success');
                contactForm.reset();
                setTimeout(() => {
                    submitBtn.classList.remove('success');
                    submitBtn.disabled = false;
                }, 3000);
            } catch (_) {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
                showError(messageInput, 'Something went wrong. Please try again.');
            }
        });
    }

    /* === bootstrap === */
    function boot() {
        initTheme();
        initCursor();
        initNav();
        initHeroCanvas();
        initTyping();
        initScrollAnimations();
        initProjectFilters();
        initTilt();
        initSkills();
        initContactForm();
        initCleanup();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
