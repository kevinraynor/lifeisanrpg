/**
 * Toast notification utility.
 *
 * Replaces three inline showToast implementations that lived in
 * friends.js, guild.js, and (implicitly) dashboard.js share-link.
 * All used the same `friends-toast` class + visible/fade pattern;
 * this centralises them with an optional type variant.
 *
 * Usage:
 *   import { showToast } from '../utils/toast.js';
 *   showToast('Saved!');
 *   showToast('Something went wrong', 'error');
 */

/**
 * Show a brief auto-dismissing toast notification.
 * @param {string} msg   - Message to display.
 * @param {'info'|'error'} [type='info'] - Visual variant (adds a CSS modifier class).
 * @param {number} [duration=3000] - How long the toast is visible (ms).
 */
export function showToast(msg, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `friends-toast${type !== 'info' ? ` friends-toast--${type}` : ''}`;
    toast.textContent = msg;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('visible'));

    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}
