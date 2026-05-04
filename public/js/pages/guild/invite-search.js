/**
 * Guild invite search — search players by name and send invitations.
 */
import { get, post } from '../../api.js';
import Store from '../../store.js';
import { escapeHtml } from '../../utils/html.js';
import { showToast } from '../../utils/toast.js';
import { renderSearchResult } from '../../utils/user-row.js';

/**
 * Search for players to invite and render results.
 * @param {string}      q         - Search query (min 2 chars)
 * @param {HTMLElement} container
 */
export async function handleInviteSearch(q, container) {
    const results = container.querySelector('#guild-invite-results');
    if (!results) return;
    if (q.length < 2) { results.innerHTML = ''; return; }

    results.innerHTML = `<p class="guild-searching">Searching…</p>`;
    try {
        const data = await get(`/api/friends/search?q=${encodeURIComponent(q)}`);
        if (!data.length) {
            results.innerHTML = `<p class="guild-empty">No players found for "${escapeHtml(q)}".</p>`;
            return;
        }

        const memberIds = (Store.guild?.members || []).map(m => m.user_id);

        results.innerHTML = data.map(u => {
            const alreadyIn = memberIds.includes(u.user_id);
            const action = alreadyIn
                ? `<span class="badge-activated">In guild</span>`
                : `<button class="btn-fantasy btn-primary btn-small btn-send-guild-invite" data-id="${u.user_id}">Invite</button>`;
            return renderSearchResult(u, action);
        }).join('');

        results.querySelectorAll('.btn-send-guild-invite').forEach(btn => {
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                btn.textContent = 'Sending…';
                try {
                    await post('/api/guild/invite', { user_id: parseInt(btn.dataset.id) });
                    btn.textContent = 'Invited!';
                    btn.classList.replace('btn-primary', 'btn-secondary');
                } catch (err) {
                    showToast(err.message || 'Failed to send invite');
                    btn.disabled = false;
                    btn.textContent = 'Invite';
                }
            });
        });
    } catch (err) {
        console.warn('Invite search failed:', err);
        results.innerHTML = `<p class="guild-empty">Search failed. Please try again.</p>`;
    }
}

/**
 * Wire up the invite search input with debounce.
 * @param {HTMLElement} container
 */
export function bindInviteSearch(container) {
    let debounce;
    container.querySelector('#guild-invite-input')?.addEventListener('input', (e) => {
        clearTimeout(debounce);
        debounce = setTimeout(() => handleInviteSearch(e.target.value.trim(), container), 300);
    });
}
