/**
 * API helper — thin fetch wrapper with CSRF and error handling.
 */

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

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
        const error = new Error(data.error || `Request failed (${response.status})`);
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

export const get = (url) => api(url, { method: 'GET' });
export const post = (url, body) => api(url, { method: 'POST', body });
export const put = (url, body) => api(url, { method: 'PUT', body });
export const del = (url) => api(url, { method: 'DELETE' });
