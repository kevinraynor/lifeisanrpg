/**
 * Guild page — entry point.
 *
 * Three states:
 *  1. No guild + no invites  → create form
 *  2. Pending invitations    → accept/decline cards + create form
 *  3. In a guild             → full guild view
 */
import { get } from '../../api.js';
import Store from '../../store.js';
import { updateGuildBadge } from '../../utils/badge.js';
import { showToast } from '../../utils/toast.js';
import { renderLoading, renderLoadError, bindLoadErrorRetry } from '../../components/loading.js';
import { renderInGuild } from './in-guild.js';
import { renderNoGuild } from './no-guild.js';

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function renderGuild(container) {
    container.innerHTML = `<div class="guild-page">${renderLoading('Loading guild…')}</div>`;

    try {
        const [guildData, invitations] = await Promise.all([
            get('/api/guild').catch(e => { console.warn('Guild fetch failed:', e); return null; }),
            get('/api/guild/invitations').catch(e => { console.warn('Invitations fetch failed:', e); return []; }),
        ]);

        Store.setGuild(guildData);
        Store.setGuildInvitations(invitations);
        updateGuildBadge();

        render(container);
    } catch (e) {
        console.warn('Guild page load failed:', e);
        container.innerHTML = `<div class="guild-page">${renderLoadError('Could not load your guild.')}</div>`;
        bindLoadErrorRetry(container, () => renderGuild(container));
    }
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function render(container) {
    const guild       = Store.guild;
    const invitations = Store.guildInvitations;

    if (guild) {
        renderInGuild(container, guild, () => refresh(container));
    } else {
        renderNoGuild(container, invitations, () => refresh(container));
    }
}

async function refresh(container) {
    try {
        const [guildData, invitations] = await Promise.all([
            get('/api/guild').catch(e => { console.warn('Guild refresh failed:', e); return null; }),
            get('/api/guild/invitations').catch(e => { console.warn('Invitations refresh failed:', e); return []; }),
        ]);
        Store.setGuild(guildData);
        Store.setGuildInvitations(invitations);
        updateGuildBadge();
        render(container);
    } catch (e) {
        // Refresh fired after a user action (kick, invite, etc.). The action itself
        // already succeeded — only the post-action refresh failed. Surface it as a
        // toast so the user knows the view may be stale, but keep the page alive.
        console.warn('Guild refresh failed:', e);
        showToast('Could not refresh guild — try reloading the page', 'error');
    }
}
