/**
 * HTML utilities shared across pages.
 *
 * Single source of truth for escaping user-provided strings before
 * interpolating them into `innerHTML`. Replaces ~20 ad-hoc copies
 * that used to live in individual page modules.
 */

/**
 * Escape a value for safe interpolation into HTML. Returns '' for
 * null/undefined so callers can do `${escapeHtml(maybe)}` freely.
 */
export function escapeHtml(str) {
    if (str === null || str === undefined || str === '') return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
}

// Short alias — several admin modules historically used `esc`.
// Re-exporting keeps those files tidy without forcing a rename.
export { escapeHtml as esc };
