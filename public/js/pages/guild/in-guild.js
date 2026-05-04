/**
 * Guild page — "in a guild" state: header, tallies, members, chat, icon, leave/dissolve.
 */
import { put, del, post } from '../../api.js';
import { escapeHtml } from '../../utils/html.js';
import { showToast } from '../../utils/toast.js';
import { confirmModal } from '../../utils/confirm-modal.js';
import { renderMemberRow, bindMemberActions } from './members.js';
import { loadAvailableTallies, renderTallyCard } from './tallies.js';
import { renderChatMessage, scrollChatToBottom, bindChatForm } from './chat.js';
import { bindInviteSearch } from './invite-search.js';

/**
 * Render the full guild view and bind all interactions.
 * @param {HTMLElement} container
 * @param {Object}      guildData - Full guild snapshot from API
 * @param {Function}    refresh   - async () => void, refreshes guild data and re-renders
 */
export function renderInGuild(container, guildData, refresh) {
    const { guild, my_role, members, tallies, pending_sent, messages } = guildData;
    const features    = guild.features;
    const isOfficer   = my_role === 'officer' || my_role === 'leader';
    const isLeader    = my_role === 'leader';
    const memberCount = members.length;
    const xpPct = guild.xp_for_next > guild.xp_for_level
        ? Math.min(100, ((guild.total_xp - guild.xp_for_level) / (guild.xp_for_next - guild.xp_for_level)) * 100).toFixed(1)
        : 100;

    // Onboarding nudge: brand-new solo guild → tell the user what to do next.
    // Trigger only when leader, alone, no announcement, no active tallies, and
    // no pending invitations sent yet.
    const isFreshGuild = isLeader
        && memberCount === 1
        && !guild.announcement
        && tallies.length === 0
        && pending_sent.length === 0;

    container.innerHTML = `
        <div class="guild-page">

            <!-- Onboarding nudge (fresh solo guild) -->
            ${isFreshGuild ? `
                <div class="guild-onboarding-nudge">
                    <h3>&#127881; Your guild is ready!</h3>
                    <p>Invite at least <strong>4 members</strong> to unlock guild tallies — co-op challenges that earn everyone bonus XP.</p>
                    <button class="btn-fantasy btn-primary btn-small" id="btn-scroll-to-invite">Invite players</button>
                </div>
            ` : ''}

            <!-- Header Card -->
            <div class="guild-header-card">
                <div class="guild-header-card__icon">
                    ${guild.icon_url
                        ? `<img src="${escapeHtml(guild.icon_url)}" alt="${escapeHtml(guild.name)}">`
                        : `<span class="guild-default-icon">&#127984;</span>`}
                </div>
                <div class="guild-header-card__info">
                    <h2 class="guild-name">${escapeHtml(guild.name)}</h2>
                    <div class="guild-meta-row">
                        <span class="guild-level-badge">Level ${guild.current_level}</span>
                        <span class="guild-member-count">&#128100; ${memberCount}/${guild.member_cap} members</span>
                    </div>
                    <div class="guild-xp-bar-wrap">
                        <div class="guild-xp-bar">
                            <div class="guild-xp-bar__fill" style="width:${xpPct}%"></div>
                        </div>
                        <span class="guild-xp-label">${guild.total_xp.toLocaleString()} / ${guild.xp_for_next.toLocaleString()} XP</span>
                    </div>
                </div>
            </div>

            <!-- Perk Badges -->
            <div class="guild-perks-row">
                ${renderPerkBadge('Chat', features.chat, 'L2')}
                ${renderPerkBadge('Announcement', features.announcement, 'L3')}
                ${renderPerkBadge('+5 Members', features.member_cap >= 20, 'L5')}
                ${renderPerkBadge('Custom Icon', features.custom_icon, 'L7')}
                ${renderPerkBadge('Elite Tallies', features.exclusive_tallies, 'L10')}
            </div>

            <!-- Announcement Banner -->
            ${guild.announcement
                ? `<div class="guild-announcement"><span>&#128227;</span> ${escapeHtml(guild.announcement)}</div>`
                : ''}

            <!-- Announcement Editor (L3, officer+) -->
            ${features.announcement && isOfficer ? `
                <section class="guild-section" id="guild-announcement-section">
                    <h3 class="guild-section-title">&#128227; Guild Announcement</h3>
                    <div class="guild-announcement-editor">
                        <textarea class="form-input" id="guild-announcement-input"
                            maxlength="500" rows="2"
                            placeholder="Set a message visible to all members…">${escapeHtml(guild.announcement || '')}</textarea>
                        <div class="guild-announcement-actions">
                            <button class="btn-fantasy btn-primary btn-small" id="btn-save-announcement">Save</button>
                            ${guild.announcement ? `<button class="btn-fantasy btn-secondary btn-small" id="btn-clear-announcement">Clear</button>` : ''}
                        </div>
                    </div>
                </section>
            ` : ''}

            <!-- Active Tallies -->
            <section class="guild-section">
                <h3 class="guild-section-title">&#9876; Active Tallies</h3>
                ${tallies.length
                    ? tallies.map(renderTallyCard).join('')
                    : `<p class="guild-empty">No active tallies this period. Activate one below!</p>`}
            </section>

            <!-- Available Tallies (officer+) -->
            ${isOfficer ? `
                <section class="guild-section" id="guild-avail-tallies-section">
                    <h3 class="guild-section-title">&#10133; Activate a Tally</h3>
                    ${memberCount < 4
                        ? `<p class="guild-locked-hint">Need at least 4 members to activate tallies (currently ${memberCount}).</p>`
                        : `<div id="guild-avail-tallies-list"><p class="guild-loading">Loading…</p></div>`}
                </section>
            ` : ''}

            <!-- Members -->
            <section class="guild-section">
                <h3 class="guild-section-title">&#128101; Members</h3>
                <div class="guild-members-list">
                    ${members.map(m => renderMemberRow(m, my_role, guild)).join('')}
                </div>
            </section>

            <!-- Invite Search (officer+) -->
            ${isOfficer ? `
                <section class="guild-section">
                    <h3 class="guild-section-title">&#9993; Invite a Player</h3>
                    <div class="guild-invite-search">
                        <input type="text" class="form-input" id="guild-invite-input"
                               placeholder="Search by character name…" autocomplete="off">
                    </div>
                    <div id="guild-invite-results"></div>
                    ${pending_sent.length ? `
                        <div class="guild-pending-sent">
                            <p class="guild-pending-sent__label">Pending invitations</p>
                            ${pending_sent.map(ps => `
                                <div class="guild-pending-sent__row">
                                    <span>${escapeHtml(ps.invitee_name)}</span>
                                    <button class="btn-fantasy btn-secondary btn-small btn-cancel-invite"
                                            data-id="${ps.id}">Cancel</button>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </section>
            ` : ''}

            <!-- Chat (L2) -->
            ${features.chat ? `
                <section class="guild-section guild-chat-section">
                    <h3 class="guild-section-title">&#128172; Guild Chat</h3>
                    <div class="guild-chat-messages" id="guild-chat-messages">
                        ${messages.length
                            ? messages.map(renderChatMessage).join('')
                            : `<p class="guild-empty">No messages yet. Be the first to say something!</p>`}
                    </div>
                    <form class="guild-chat-form" id="guild-chat-form">
                        <input type="text" class="form-input" id="guild-chat-input"
                               placeholder="Send a message…" maxlength="500" autocomplete="off">
                        <button type="submit" class="btn-fantasy btn-primary btn-small">Send</button>
                    </form>
                </section>
            ` : ''}

            <!-- Icon Editor (L7, officer+) -->
            ${features.custom_icon && isOfficer ? `
                <section class="guild-section" id="guild-icon-section">
                    <h3 class="guild-section-title">&#128444; Guild Icon</h3>
                    <div class="guild-icon-editor">
                        <input type="url" class="form-input" id="guild-icon-input"
                               placeholder="https://…" value="${escapeHtml(guild.icon_url || '')}">
                        <div class="guild-icon-actions">
                            <button class="btn-fantasy btn-primary btn-small" id="btn-save-icon">Save URL</button>
                            ${guild.icon_url ? `<button class="btn-fantasy btn-secondary btn-small" id="btn-clear-icon">Remove Icon</button>` : ''}
                        </div>
                    </div>
                </section>
            ` : ''}

            <!-- Danger Zone -->
            <section class="guild-section guild-danger-section">
                <h3 class="guild-section-title">&#9888; Leave / Dissolve</h3>
                <div class="guild-danger-actions">
                    ${!isLeader ? `
                        <button class="btn-fantasy btn-secondary" id="btn-leave-guild">Leave Guild</button>
                    ` : `
                        <button class="btn-fantasy btn-secondary" id="btn-leave-guild">Leave Guild</button>
                        <button class="btn-fantasy btn-danger" id="btn-dissolve-guild">Dissolve Guild</button>
                    `}
                </div>
                ${isLeader ? `<p class="guild-danger-hint">Dissolving deletes all guild data permanently.</p>` : ''}
            </section>

        </div>
    `;

    // ── Bind all interactions ──

    // Onboarding nudge → scroll to invite section
    container.querySelector('#btn-scroll-to-invite')?.addEventListener('click', () => {
        const inviteInput = container.querySelector('#guild-invite-input');
        inviteInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => inviteInput?.focus(), 400);
    });

    // Announcement
    container.querySelector('#btn-save-announcement')?.addEventListener('click', async (e) => {
        const text = container.querySelector('#guild-announcement-input')?.value || '';
        e.target.disabled = true;
        try {
            await put('/api/guild/announcement', { text });
            await refresh();
        } catch (err) { showToast(err.message); e.target.disabled = false; }
    });
    container.querySelector('#btn-clear-announcement')?.addEventListener('click', async (e) => {
        if (!await confirmModal('Clear the guild announcement?', { confirmLabel: 'Clear' })) return;
        e.target.disabled = true;
        try {
            await put('/api/guild/announcement', { text: null });
            await refresh();
        } catch (err) { showToast(err.message); e.target.disabled = false; }
    });

    // Available tallies (lazy load)
    if (isOfficer && memberCount >= 4) {
        loadAvailableTallies(container, refresh);
    }

    // Member actions
    bindMemberActions(container, refresh);

    // Cancel pending invite
    container.querySelectorAll('.btn-cancel-invite').forEach(btn => {
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            try {
                await post(`/api/guild/invitations/${btn.dataset.id}/cancel`);
                await refresh();
            } catch (err) { showToast(err.message); btn.disabled = false; }
        });
    });

    // Invite search
    if (isOfficer) bindInviteSearch(container);

    // Chat
    if (features.chat) {
        bindChatForm(container);
        scrollChatToBottom(container);
    }

    // Icon editor
    container.querySelector('#btn-save-icon')?.addEventListener('click', async (e) => {
        const url = container.querySelector('#guild-icon-input')?.value || '';
        e.target.disabled = true;
        try {
            await put('/api/guild/icon', { url: url || null });
            await refresh();
        } catch (err) { showToast(err.message); e.target.disabled = false; }
    });
    container.querySelector('#btn-clear-icon')?.addEventListener('click', async (e) => {
        if (!await confirmModal('Remove the guild icon?', { confirmLabel: 'Remove' })) return;
        e.target.disabled = true;
        try {
            await put('/api/guild/icon', { url: null });
            await refresh();
        } catch (err) { showToast(err.message); e.target.disabled = false; }
    });

    // Leave / Dissolve
    container.querySelector('#btn-leave-guild')?.addEventListener('click', async (e) => {
        if (!await confirmModal('Leave this guild?', { confirmLabel: 'Leave', danger: true })) return;
        e.target.disabled = true;
        try {
            await post('/api/guild/leave');
            await refresh();
        } catch (err) { showToast(err.message); e.target.disabled = false; }
    });
    container.querySelector('#btn-dissolve-guild')?.addEventListener('click', async (e) => {
        if (!await confirmModal('Dissolve this guild permanently? This cannot be undone.', { confirmLabel: 'Dissolve Forever', danger: true })) return;
        e.target.disabled = true;
        try {
            await del('/api/guild');
            await refresh();
        } catch (err) { showToast(err.message); e.target.disabled = false; }
    });
}

// ─── Private helper ───────────────────────────────────────────────────────────

function renderPerkBadge(label, unlocked, levelLabel) {
    return `
        <span class="guild-perk-badge${unlocked ? ' guild-perk-badge--unlocked' : ''}">
            ${unlocked ? '&#10003;' : '&#128274;'} ${label}
            ${!unlocked ? `<small>${levelLabel}</small>` : ''}
        </span>
    `;
}
