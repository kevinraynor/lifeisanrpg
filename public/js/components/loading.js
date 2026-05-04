/**
 * Shared loading + load-error helpers.
 *
 * Replaces the five different "Loading…" strings that lived inline across
 * friends, quests, skill-detail, guild/index, and guild/in-guild. Adds a
 * consistent retry pattern for page-load failures so users aren't stuck
 * on a hung request with no recovery path.
 *
 * Usage:
 *   import { renderLoading, renderLoadError } from '../components/loading.js';
 *
 *   container.innerHTML = renderLoading('Loading guild…');
 *   try {
 *       const data = await get('/api/...');
 *       container.innerHTML = renderActualContent(data);
 *   } catch (e) {
 *       container.innerHTML = renderLoadError('Could not load guild', () => init());
 *       // The retry callback is wired up by bindLoadErrorRetry below.
 *       bindLoadErrorRetry(container, () => init());
 *   }
 */

/**
 * Returns HTML for a centered loading indicator.
 * @param {string} [message='Loading…']
 * @returns {string}
 */
export function renderLoading(message = 'Loading…') {
    return `
        <div class="app-loading">
            <span class="app-loading__spinner" aria-hidden="true">&#10024;</span>
            <p class="app-loading__message">${escape(message)}</p>
        </div>
    `;
}

/**
 * Returns HTML for an inline load-error card with a Retry button.
 * Pair with `bindLoadErrorRetry(container, retryFn)` to wire up the click.
 *
 * @param {string} message
 * @returns {string}
 */
export function renderLoadError(message = 'Could not load this page.') {
    return `
        <div class="app-load-error">
            <p class="app-load-error__message">${escape(message)}</p>
            <button class="btn-fantasy btn-secondary btn-small app-load-error__retry">Retry</button>
        </div>
    `;
}

/**
 * Wires the Retry button rendered by `renderLoadError()` to a callback.
 * @param {HTMLElement} container - Element containing the load-error card
 * @param {Function}    onRetry   - Function to call when Retry is clicked
 */
export function bindLoadErrorRetry(container, onRetry) {
    container.querySelector('.app-load-error__retry')?.addEventListener('click', onRetry);
}

// Tiny inline escape — kept local so this module has no dependencies.
function escape(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
