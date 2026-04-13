/**
 * Client-side SPA router for dashboard.
 * Handles sidebar navigation via History API — swaps center panel content
 * without reloading sidebar or social feed.
 */

const Router = {
    routes: {},
    currentPage: null,
    mainEl: null,
    sidebarLinks: null,

    /**
     * Initialize the router.
     * @param {string} mainSelector - CSS selector for the content container
     */
    init(mainSelector = '#dashboard-main') {
        this.mainEl = document.querySelector(mainSelector);
        this.sidebarLinks = document.querySelectorAll('.sidebar-link[data-page]');

        // Intercept sidebar link clicks
        this.sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                this.navigate(href);
            });
        });

        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            this.resolve(window.location.pathname, false);
        });

        // Resolve initial route
        this.resolve(window.location.pathname, false);
    },

    /**
     * Register a route handler.
     * @param {string} page - Page name (e.g., 'dashboard', 'skills')
     * @param {Function} handler - Render function, receives the main element
     */
    on(page, handler) {
        this.routes[page] = handler;
    },

    /**
     * Navigate to a path.
     */
    navigate(path) {
        if (path === window.location.pathname) return;
        history.pushState(null, '', path);
        this.resolve(path);
    },

    /**
     * Resolve a path to a page and render it.
     */
    resolve(path, animate = true) {
        const page = this.pathToPage(path);

        if (page === this.currentPage) return;
        this.currentPage = page;

        // Update active sidebar link
        this.sidebarLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.page === page);
        });

        // Render the page
        const handler = this.routes[page];
        if (handler) {
            if (animate) {
                this.mainEl.classList.remove('fade-in');
                // Force reflow to restart animation
                void this.mainEl.offsetWidth;
                this.mainEl.classList.add('fade-in');
            }
            handler(this.mainEl);
        } else {
            this.mainEl.innerHTML = `
                <div class="stub-page">
                    <h2>${this.capitalize(page)}</h2>
                    <p>This feature is coming soon. Stay tuned!</p>
                </div>
            `;
        }
    },

    /**
     * Convert URL path to page name.
     * /app -> dashboard, /app/skills -> skills, etc.
     */
    pathToPage(path) {
        const segments = path.replace(/^\/app\/?/, '').split('/').filter(Boolean);
        return segments[0] || 'dashboard';
    },

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
};

export default Router;
