/**
 * Modal factory — shared open/close/animation logic.
 *
 * Centralises the three repeated concerns found across every ad-hoc
 * modal in the codebase:
 *   1. Creating and appending the overlay element.
 *   2. Optionally animating in via a .visible class (rAF trick).
 *   3. Closing — animated (300ms fade) or immediate — and cleaning up.
 *
 * Backdrop click → close is wired automatically.
 *
 * Usage:
 *   import { openModal } from './modal.js';
 *
 *   const { el, close } = openModal({
 *     className: 'my-overlay',    // CSS class on the root element
 *     content:   '<div>…</div>',  // innerHTML
 *     animate:   true,            // rAF fade-in / 300ms fade-out (default: false)
 *     onClose:   () => {},        // optional callback after removal
 *   });
 *   el.querySelector('.my-btn').addEventListener('click', close);
 */

/**
 * @param {object} opts
 * @param {string}   [opts.className='modal-overlay']
 * @param {string}   [opts.content='']
 * @param {boolean}  [opts.animate=false]
 * @param {boolean}  [opts.escClose=true]   Close on Escape key
 * @param {Function} [opts.onClose]
 * @returns {{ el: HTMLElement, close: Function }}
 */
export function openModal({ className = 'modal-overlay', content = '', animate = false, escClose = true, onClose } = {}) {
    const el = document.createElement('div');
    el.className = className;

    // Immediate modals start visible; animated ones add the class after paint.
    if (!animate) el.classList.add('visible');
    el.innerHTML = content;
    document.body.appendChild(el);

    if (animate) requestAnimationFrame(() => el.classList.add('visible'));

    let closed = false;
    function close() {
        if (closed) return;          // guard against double-close (e.g. ESC + button)
        closed = true;
        document.removeEventListener('keydown', onKeydown);
        if (animate) {
            el.classList.remove('visible');
            setTimeout(() => { el.remove(); onClose?.(); }, 300);
        } else {
            el.remove();
            onClose?.();
        }
    }

    function onKeydown(e) {
        if (e.key === 'Escape') { e.stopPropagation(); close(); }
    }
    if (escClose) document.addEventListener('keydown', onKeydown);

    // Backdrop click
    el.addEventListener('click', (e) => { if (e.target === el) close(); });

    return { el, close };
}
