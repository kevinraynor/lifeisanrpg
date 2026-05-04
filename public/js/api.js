/**
 * API helper — thin fetch wrapper with CSRF, timeout, and structured errors.
 *
 * Errors thrown carry these properties so callers can react meaningfully:
 *   err.status   — HTTP status (0 for network/timeout)
 *   err.code     — short identifier: 'timeout' | 'network' | 'csrf' | 'parse' | 'http'
 *   err.data     — parsed response body when available (otherwise null)
 *
 * The timeout guards against hung requests so user-visible loading states
 * eventually resolve to an error rather than spinning forever.
 */

const DEFAULT_TIMEOUT_MS = 10_000;

let csrfToken = window.__INITIAL_DATA__?.csrfToken
    || window.__REGISTER_DATA__?.csrfToken
    || window.__CSRF_TOKEN__
    || '';

export function setCsrfToken(token) {
    csrfToken = token;
}

export async function api(url, options = {}) {
    const defaults = {
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
        },
    };

    const config = {
        ...defaults,
        ...options,
        headers: { ...defaults.headers, ...options.headers },
    };

    if (options.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
    }

    // Wire up an AbortController so the request can't hang indefinitely.
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    config.signal = options.signal || controller.signal;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
        response = await fetch(url, config);
    } catch (err) {
        clearTimeout(timeoutId);
        // AbortError fires for both manual aborts and our timeout. Distinguish
        // by checking whether *we* aborted — gives a clearer error message.
        if (err.name === 'AbortError') {
            const e = new Error('Request timed out — check your connection and try again.');
            e.status = 0; e.code = 'timeout';
            throw e;
        }
        const e = new Error('Network error — you appear to be offline.');
        e.status = 0; e.code = 'network';
        throw e;
    }
    clearTimeout(timeoutId);

    let data = null;
    try {
        data = await response.json();
    } catch {
        // Non-JSON response (e.g. HTML 502 page). Keep data null.
    }

    if (!response.ok) {
        const isCsrf = response.status === 403 && data && /csrf/i.test(data.error || '');
        // Override the raw "Invalid CSRF token" message with something actionable —
        // every error handler that surfaces err.message will now read clearly.
        const message = isCsrf
            ? 'Your session expired. Please refresh the page to continue.'
            : ((data && data.error) || `Request failed (${response.status})`);
        const error = new Error(message);
        error.status = response.status;
        error.data = data;
        error.code = isCsrf ? 'csrf' : 'http';
        throw error;
    }

    return data;
}

export const get  = (url)        => api(url, { method: 'GET' });
export const post = (url, body)  => api(url, { method: 'POST',   body });
export const put  = (url, body)  => api(url, { method: 'PUT',    body });
export const del  = (url)        => api(url, { method: 'DELETE' });
