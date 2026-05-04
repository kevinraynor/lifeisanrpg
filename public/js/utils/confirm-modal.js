/**
 * Promise-based styled confirm dialog.
 *
 * WHY THIS EXISTS
 * ---------------
 * Three places used the browser's native confirm() — guild kick/dissolve/leave,
 * unfriend, clear announcement. The native dialog is un-styled and blocks the
 * thread. This replaces it with a modal that:
 *  - matches the fantasy theme
 *  - returns a Promise so async callers stay clean
 *  - supports custom confirm/cancel labels
 *
 * USAGE
 *   import { confirmModal } from '../utils/confirm-modal.js';
 *
 *   if (!await confirmModal('Kick this member?')) return;
 *   if (!await confirmModal('Dissolve guild?', { confirmLabel: 'Dissolve', danger: true })) return;
 */
import { openModal } from '../components/modal.js';
import { escapeHtml } from './html.js';

/**
 * Show a styled confirmation dialog.
 *
 * @param {string}  message
 * @param {Object}  [opts]
 * @param {string}  [opts.confirmLabel='Confirm']
 * @param {string}  [opts.cancelLabel='Cancel']
 * @param {boolean} [opts.danger=false]  Use btn-danger styling on the confirm button
 * @returns {Promise<boolean>}  Resolves true if confirmed, false if cancelled/dismissed
 */
export function confirmModal(message, { confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = {}) {
    return new Promise(resolve => {
        const confirmClass = danger ? 'btn-danger' : 'btn-primary';

        const { el, close } = openModal({
            className: 'modal-overlay',
            content: `
                <div class="confirm-dialog">
                    <p class="confirm-dialog__message">${escapeHtml(message)}</p>
                    <div class="confirm-dialog__actions">
                        <button class="btn-fantasy btn-secondary btn-small" id="confirm-cancel">${escapeHtml(cancelLabel)}</button>
                        <button class="btn-fantasy ${confirmClass} btn-small" id="confirm-ok">${escapeHtml(confirmLabel)}</button>
                    </div>
                </div>
            `,
            animate: true,
            onClose: () => resolve(false),
        });

        el.querySelector('#confirm-ok').addEventListener('click', () => {
            close();
            resolve(true);
        });
        el.querySelector('#confirm-cancel').addEventListener('click', () => {
            close();
            resolve(false);
        });
    });
}
