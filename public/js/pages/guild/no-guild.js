/**
 * Guild page — "no guild" state: invitation cards + create form.
 */
import { post } from '../../api.js';
import { escapeHtml } from '../../utils/html.js';
import { showToast } from '../../utils/toast.js';

/**
 * Render the no-guild view (invitations + create form).
 * @param {HTMLElement}  container
 * @param {Array}        invitations
 * @param {Function}     refresh     - async () => void
 */
export function renderNoGuild(container, invitations, refresh) {
    container.innerHTML = `
        <div class="guild-page">
            <div class="guild-page__header">
                <h2>&#127984; Guild</h2>
                <p class="section-subtitle">Join a guild to log hours together and earn shared rewards.</p>
            </div>
            ${invitations.length ? renderInvitationCards(invitations) : ''}
            <section class="guild-create-section">
                <h3 class="guild-section-title">Create a Guild</h3>
                <p class="guild-create-hint">
                    Name your guild (3–60 characters). You'll need at least
                    <strong>4 members</strong> before you can activate tallies.
                </p>
                <form class="guild-create-form" id="guild-create-form">
                    <input type="text" class="form-input" id="guild-name-input"
                           placeholder="Guild name…" maxlength="60" autocomplete="off">
                    <button type="submit" class="btn-fantasy btn-primary">Create Guild</button>
                </form>
                <p class="guild-create-error" id="guild-create-error" style="display:none"></p>
            </section>
        </div>
    `;

    bindInvitationActions(container, refresh);

    const form = container.querySelector('#guild-create-form');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = form.querySelector('#guild-name-input');
        const errEl = form.parentElement.querySelector('#guild-create-error');
        const name  = input.value.trim();
        if (!name) return;

        const btn = form.querySelector('button[type=submit]');
        btn.disabled = true;
        btn.textContent = 'Creating…';
        errEl.style.display = 'none';

        try {
            await post('/api/guilds', { name });
            await refresh();
        } catch (err) {
            errEl.textContent = err.message || 'Failed to create guild.';
            errEl.style.display = 'block';
            btn.disabled = false;
            btn.textContent = 'Create Guild';
        }
    });
}

function renderInvitationCards(invitations) {
    return `
        <section class="guild-invitations-section">
            <h3 class="guild-section-title">
                Guild Invitations
                <span class="friend-badge friend-badge--inline">${invitations.length}</span>
            </h3>
            <div class="guild-invitations-list">
                ${invitations.map(inv => `
                    <div class="guild-invite-card">
                        <div class="guild-invite-card__icon">
                            ${inv.icon_url
                                ? `<img src="${escapeHtml(inv.icon_url)}" alt="${escapeHtml(inv.guild_name)}">`
                                : `<span>&#127984;</span>`}
                        </div>
                        <div class="guild-invite-card__info">
                            <span class="guild-invite-card__name">${escapeHtml(inv.guild_name)}</span>
                            <span class="guild-invite-card__meta">Level ${inv.current_level} &middot; Invited by ${escapeHtml(inv.inviter_name)}</span>
                        </div>
                        <div class="guild-invite-card__actions">
                            <button class="btn-fantasy btn-primary btn-small btn-accept-invite"
                                    data-id="${inv.id}">Accept</button>
                            <button class="btn-fantasy btn-secondary btn-small btn-decline-invite"
                                    data-id="${inv.id}">Decline</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </section>
    `;
}

function bindInvitationActions(container, refresh) {
    container.querySelectorAll('.btn-accept-invite').forEach(btn => {
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            try {
                await post(`/api/guild/invitations/${btn.dataset.id}/accept`);
                await refresh();
            } catch (e) {
                showToast(e.message || 'Failed to accept invitation');
                btn.disabled = false;
            }
        });
    });

    container.querySelectorAll('.btn-decline-invite').forEach(btn => {
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            try {
                await post(`/api/guild/invitations/${btn.dataset.id}/decline`);
                await refresh();
            } catch (e) {
                showToast(e.message || 'Failed to decline invitation');
                btn.disabled = false;
            }
        });
    });
}
