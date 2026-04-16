/**
 * Admin panel bootstrap.
 * Initializes SPA-like routing for admin sidebar navigation.
 */
import { setCsrfToken } from '../api.js';
import { renderOverview } from './overview.js';
import { renderSkillsManager } from './skills-manager.js';
import { renderUsersManager } from './users-manager.js';
import { renderClassesManager } from './classes-manager.js';

const adminData = window.__ADMIN_DATA__ || {};
setCsrfToken(adminData.csrfToken);

// Store attributes globally for skill editor
export const attributes = adminData.attributes || [];

const routes = {
    overview: renderOverview,
    skills: renderSkillsManager,
    users: renderUsersManager,
    classes: renderClassesManager,
};

let currentPage = null;
const mainEl = document.getElementById('admin-main');
const sidebarLinks = document.querySelectorAll('.sidebar-link[data-page]');

function resolve(path, pushState = false) {
    const page = pathToPage(path);
    if (page === currentPage) return;
    currentPage = page;

    // Update active sidebar link
    sidebarLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });

    // Render page
    const handler = routes[page];
    if (handler) {
        handler(mainEl);
    } else {
        mainEl.innerHTML = '<h2>Page not found</h2>';
    }

    if (pushState) {
        history.pushState(null, '', path);
    }
}

function pathToPage(path) {
    const segment = path.replace(/^\/admin\/?/, '').split('/').filter(Boolean)[0];
    return segment || 'overview';
}

// Intercept sidebar clicks
sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        resolve(href, true);
    });
});

// Handle browser back/forward
window.addEventListener('popstate', () => {
    resolve(window.location.pathname);
});

// Resolve initial route
resolve(window.location.pathname);
