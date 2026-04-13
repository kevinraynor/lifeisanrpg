/**
 * Landing page: login modal + scroll animations + demo card animation.
 */
import { post, setCsrfToken } from '../api.js';

// --- CSRF ---
if (window.__CSRF_TOKEN__) {
    setCsrfToken(window.__CSRF_TOKEN__);
}

// --- Login Modal ---
const modal = document.getElementById('login-modal');
const loginLink = document.getElementById('login-link');
const modalClose = document.getElementById('login-modal-close');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

function openModal() {
    if (modal) modal.classList.add('visible');
}

function closeModal() {
    if (modal) modal.classList.remove('visible');
}

if (loginLink) {
    loginLink.addEventListener('click', (e) => {
        e.preventDefault();
        openModal();
    });
}

if (modalClose) {
    modalClose.addEventListener('click', closeModal);
}

if (modal) {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

// Handle login form
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.textContent = '';

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            loginError.textContent = 'Please fill in all fields.';
            return;
        }

        const btn = loginForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Logging in...';

        try {
            const result = await post('/api/auth/login', { email, password });
            if (result.redirect) {
                window.location.href = result.redirect;
            }
        } catch (err) {
            loginError.textContent = err.message || 'Login failed. Please try again.';
            btn.disabled = false;
            btn.textContent = 'Log In';
        }
    });
}

// --- Scroll Reveal ---
const reveals = document.querySelectorAll('.features-overview, .feature-item, .cta-section');
reveals.forEach(el => el.classList.add('scroll-reveal'));

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.15 });

reveals.forEach(el => observer.observe(el));

// --- Demo Card Progress Bar Animation ---
function animateDemoCard() {
    const card = document.querySelector('.character-card--demo');
    if (!card) return;

    const statValues = card.querySelectorAll('.stat-value');
    statValues.forEach((el) => {
        const target = parseInt(el.textContent);
        el.textContent = '0';
        let current = 0;
        const step = Math.max(1, Math.floor(target / 20));
        const interval = setInterval(() => {
            current = Math.min(current + step, target);
            el.textContent = current;
            if (current >= target) clearInterval(interval);
        }, 50);
    });
}

// Trigger demo animation when card scrolls into view
const demoCard = document.querySelector('.character-card--demo');
if (demoCard) {
    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateDemoCard();
                cardObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });
    cardObserver.observe(demoCard);
}

// Open modal if URL is /login
if (window.location.pathname === '/login') {
    openModal();
}
