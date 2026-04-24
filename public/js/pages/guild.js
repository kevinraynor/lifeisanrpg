/**
 * Guild page — three states:
 *  1. No guild + no invites  → create form
 *  2. Pending invites        → accept/decline cards + create form
 *  3. In a guild             → full guild view
 */
import { get, post, put, del } from '../api.js';
import Store from '../store.js';
import { updateGuildBadge } from '../utils/badge.js';

// ─────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────

export async function renderGuild(container) {
    container.innerHTML = `<div class="guild-page"><p class="guild-loading">Loading guild…</p></div>`;

    try {
        const [guildData, invitations] = await Promise.all([
            get('/api/guild').catch(() => null),
            get('/api/guild/invitations').catch(() => []),
        ]);

        Store.setGuild(guildData);
        Store.setGuildInvitations(invitations);
        updateGuildBadge();

        render(container);
    } catch {
        container.innerHTML = `<div class="guild-page"><p class="guild-error">Failed to load guild data. Please refresh.</p></div>`;
    }
}

function render(container) {
    const guild       = Store.guild;
    const invitations = Store.guildInvitations;

    if (guild) {
        renderInGuild(container, guild);
    } else {
        renderNoGuild(container, invitations);
    }
}

async function refresh(container) {
    try {
        const [guildData, invitations] = await Promise.all([
            get('/api/guild').catch(() => null),
            get('/api/guild/invitations').catch(() => []),
        ]);
        Store.setGuild(guildData);
        Store.setGuildInvitations(invitations);
        updateGuildBadge();
        render(container);
    } catch { /* silently ignore */ }
}

// ─────────────────────────────────────────────
// State 1 & 2: No guild
// ─────────────────────────────────────────────

function renderNoGuild(container, invitations) {
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

    bindInvitationActions(container);

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
            await refresh(container);
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

function bindInvitationActions(container) {
    container.querySelectorAll('.btn-accept-invite').forEach(btn => {
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            try {
                await post(`/api/guild/invitations/${btn.dataset.id}/accept`);
                await refresh(container);
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
                await refresh(container);
            } catch (e) {
                showToast(e.message || 'Failed to decline invitation');
                btn.disabled = false;
            }
        });
    });
}

// ─────────────────────────────────────────────
// State 3: In a guild
// ─────────────────────────────────────────────

function renderInGuild(container, guildData) {
    const { guild, my_role, members, tallies, pending_sent, messages } = guildData;
    const features   = guild.features;
    const isOfficer  = my_role === 'officer' || my_role === 'leader';
    const isLeader   = my_role === 'leader';
    const memberCount = members.length;
    const xpPct = guild.xp_for_next > guild.xp_for_level
        ? Math.min(100, ((guild.total_xp - guild.xp_for_level) / (guild.xp_for_next - guild.xp_for_level)) * 100).toFixed(1)
        : 100;

    container.innerHTML = `
        <div class="guild-page">

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

    // ── Bind everything ──

    // Announcement
    container.querySelector('#btn-save-announcement')?.addEventListener('click', async (e) => {
        const text = container.querySelector('#guild-announcement-input')?.value || '';
        e.target.disabled = true;
        try {
            await put('/api/guild/announcement', { text });
            await refresh(container);
        } catch (err) { showToast(err.message); e.target.disabled = false; }
    });
    container.querySelector('#btn-clear-announcement')?.addEventListener('click', async (e) => {
        if (!confirm('Clear the guild announcement?')) return;
        e.target.disabled = true;
        try {
            await put('/api/guild/announcement', { text: null });
            await refresh(container);
        } catch (err) { showToast(err.message); e.target.disabled = false; }
    });

    // Available tallies — lazy load
    if (isOfficer && memberCount >= 4) {
        loadAvailableTallies(container);
    }

    // Member actions (kick, promote, demote)
    container.querySelectorAll('.btn-kick-member').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm(`Kick ${btn.dataset.name}?`)) return;
            btn.disabled = true;
            try {
                await post(`/api/guild/members/${btn.dataset.id}/kick`);
                await refresh(container);
            } catch (err) { showToast(err.message); btn.disabled = false; }
        });
    });

    container.querySelectorAll('.btn-promote-member').forEach(btn => {
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            try {
                await post(`/api/guild/members/${btn.dataset.id}/promote`);
                await refresh(container);
            } catch (err) { showToast(err.message); btn.disabled = false; }
        });
    });

    container.querySelectorAll('.btn-demote-member').forEach(btn => {
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            try {
                await post(`/api/guild/members/${btn.dataset.id}/demote`);
                await refresh(container);
            } catch (err) { showToast(err.message); btn.disabled = false; }
        });
    });

    // Cancel pending invite
    container.querySelectorAll('.btn-cancel-invite').forEach(btn => {
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            try {
                await post(`/api/guild/invitations/${btn.dataset.id}/cancel`);
                await refresh(container);
            } catch (err) { showToast(err.message); btn.disabled = false; }
        });
    });

    // Invite search
    if (isOfficer) {
        let debounce;
        container.querySelector('#guild-invite-input')?.addEventListener('input', (e) => {
            clearTimeout(debounce);
            debounce = setTimeout(() => handleInviteSearch(e.target.value.trim(), container), 300);
        });
    }

    // Chat
    container.querySelector('#guild-chat-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = container.querySelector('#guild-chat-input');
        const body  = input.value.trim();
        if (!body) return;
        const btn = e.target.querySelector('button[type=submit]');
        btn.disabled = true;
        try {
            await post('/api/guild/messages', { body });
            input.value = '';
            // Refresh just messages
            const msgs = await get('/api/guild/messages').catch(() => []);
            const el = container.querySelector('#guild-chat-messages');
            if (el) el.innerHTML = msgs.length
                ? msgs.map(renderChatMessage).join('')
                : `<p class="guild-empty">No messages yet.</p>`;
            scrollChatToBottom(container);
        } catch (err) { showToast(err.message); }
        btn.disabled = false;
    });
    scrollChatToBottom(container);

    // Icon editor
    container.querySelector('#btn-save-icon')?.addEventListener('click', async (e) => {
        const url = container.querySelector('#guild-icon-input')?.value || '';
        e.target.disabled = true;
        try {
            await put('/api/guild/icon', { url: url || null });
            await refresh(container);
        } catch (err) { showToast(err.message); e.target.disabled = false; }
    });
    container.querySelector('#btn-clear-icon')?.addEventListener('click', async (e) => {
        if (!confirm('Remove the guild icon?')) return;
        e.target.disabled = true;
        try {
            await put('/api/guild/icon', { url: null });
            await refresh(container);
        } catch (err) { showToast(err.message); e.target.disabled = false; }
    });

    // Leave / Dissolve
    container.querySelector('#btn-leave-guild')?.addEventListener('click', async (e) => {
        if (!confirm('Leave this guild?')) return;
        e.target.disabled = true;
        try {
            await post('/api/guild/leave');
            await refresh(container);
        } catch (err) { showToast(err.message); e.target.disabled = false; }
    });

    container.querySelector('#btn-dissolve-guild')?.addEventListener('click', async (e) => {
        if (!confirm('Dissolve this guild permanently? This cannot be undone.')) return;
        e.target.disabled = true;
        try {
            await del('/api/guild');
            await refresh(container);
        } catch (err) { showToast(err.message); e.target.disabled = false; }
    });
}

// ─────────────────────────────────────────────
// Tally helpers
// ─────────────────────────────────────────────

async function loadAvailableTallies(container) {
    const el = container.querySelector('#guild-avail-tallies-list');
    if (!el) return;
    try {
        const rows = await get('/api/guild/tallies/available');
        if (!rows.length) {
            el.innerHTML = `<p class="guild-empty">All tallies for this period are already active.</p>`;
            return;
        }
        const byPeriod = { weekly: rows.filter(r => r.period === 'weekly'), monthly: rows.filter(r => r.period === 'monthly') };
        el.innerHTML = ['weekly', 'monthly'].map(period => {
            if (!byPeriod[period].length) return '';
            return `
                <div class="guild-avail-period">
                    <p class="guild-avail-period__label">${period.charAt(0).toUpperCase() + period.slice(1)}</p>
                    ${byPeriod[period].map(r => `
                        <div class="guild-avail-row">
                            <div class="guild-avail-row__info">
                                <span class="guild-avail-row__name">${escapeHtml(r.name)}</span>
                                <span class="guild-avail-row__meta">
                                    ${r.base_hours_per_member}h/member &middot; +${r.bonus_xp.toLocaleString()} guild XP
                                    ${r.description ? `&middot; ${escapeHtml(r.description)}` : ''}
                                </span>
                            </div>
                            <button class="btn-fantasy btn-primary btn-small btn-activate-tally"
                                    data-id="${r.id}">Activate</button>
                        </div>
                    `).join('')}
                </div>
            `;
        }).join('');

        el.querySelectorAll('.btn-activate-tally').forEach(btn => {
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                btn.textContent = 'Activating…';
                try {
                    await post('/api/guild/tallies/activate', { variation_id: parseInt(btn.dataset.id) });
                    await refresh(container);
                } catch (err) {
                    showToast(err.message || 'Failed to activate tally');
                    btn.disabled = false;
                    btn.textContent = 'Activate';
                }
            });
        });
    } catch {
        el.innerHTML = `<p class="guild-empty">Could not load available tallies.</p>`;
    }
}

function renderTallyCard(t) {
    const pct     = t.target_hours > 0
        ? Math.min(100, (t.hours_logged / t.target_hours * 100)).toFixed(1)
        : 0;
    const done    = t.status === 'completed';
    return `
        <div class="guild-tally-card${done ? ' guild-tally-card--done' : ''}">
            <div class="guild-tally-card__header">
                <span class="guild-tally-card__name">${escapeHtml(t.name)}</span>
                <span class="guild-tally-card__period">${t.period}</span>
                ${done ? `<span class="badge-activated">&#10003; Complete</span>` : ''}
            </div>
            ${t.description ? `<p class="guild-tally-card__desc">${escapeHtml(t.description)}</p>` : ''}
            <div class="guild-tally-card__progress">
                <div class="progress-bar-track">
                    <div class="progress-bar-fill${done ? ' progress-bar-fill--complete' : ''}"
                         style="width:${pct}%"></div>
                </div>
                <span class="guild-tally-card__hours">
                    ${t.hours_logged.toFixed(1)}h / ${t.target_hours.toFixed(1)}h
                    ${done ? `&middot; +${t.xp_awarded.toLocaleString()} guild XP awarded` : `&middot; +${t.bonus_xp.toLocaleString()} guild XP on completion`}
                </span>
            </div>
        </div>
    `;
}

// ─────────────────────────────────────────────
// Member row
// ─────────────────────────────────────────────

function renderMemberRow(m, myRole, guild) {
    const isMe      = m.user_id === Store.user?.id;
    const roleLabel = { leader: '&#128081; Leader', officer: '&#9876; Officer', member: 'Member' }[m.role] || m.role;
    const canManage = (myRole === 'leader' || myRole === 'officer') && !isMe;
    const canKick   = canManage && m.role !== 'leader';
    const canPromote = myRole === 'leader' && m.role === 'member';
    const canDemote  = myRole === 'leader' && m.role === 'officer';

    let actionsHTML = '';
    if (canKick || canPromote || canDemote) {
        actionsHTML = `<div class="guild-member-actions">`;
        if (canPromote) actionsHTML += `<button class="btn-fantasy btn-secondary btn-small btn-promote-member" data-id="${m.user_id}" data-name="${escapeHtml(m.character_name)}">Promote</button>`;
        if (canDemote)  actionsHTML += `<button class="btn-fantasy btn-secondary btn-small btn-demote-member"  data-id="${m.user_id}" data-name="${escapeHtml(m.character_name)}">Demote</button>`;
        if (canKick)    actionsHTML += `<button class="btn-fantasy btn-secondary btn-small btn-kick-member"    data-id="${m.user_id}" data-name="${escapeHtml(m.character_name)}">Kick</button>`;
        actionsHTML += `</div>`;
    }

    return `
        <div class="guild-member-row${isMe ? ' guild-member-row--me' : ''}">
            <div class="guild-member-row__info">
                <span class="guild-member-row__name">${escapeHtml(m.character_name)}${isMe ? ' <em>(you)</em>' : ''}</span>
                <span class="guild-member-row__class">${escapeHtml(m.class_name)}</span>
            </div>
            <span class="guild-member-row__role">${roleLabel}</span>
            ${m.skill_level_sum ? `<span class="guild-member-row__levels">Σ Lv.${m.skill_level_sum}</span>` : ''}
            ${actionsHTML}
        </div>
    `;
}

// ─────────────────────────────────────────────
// Invite search
// ─────────────────────────────────────────────

async function handleInviteSearch(q, container) {
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
            let action;
            if (alreadyIn) {
                action = `<span class="badge-activated">In guild</span>`;
            } else {
                action = `<button class="btn-fantasy btn-primary btn-small btn-send-guild-invite"
                                  data-id="${u.user_id}">Invite</button>`;
            }
            return `
                <div class="friend-search-result">
                    <div class="friend-search-result__info">
                        <span class="friend-search-result__name">${escapeHtml(u.character_name)}</span>
                        <span class="friend-search-result__class"
                              style="color:${u.class_color || 'inherit'}">${escapeHtml(u.class_name)}</span>
                    </div>
                    <div class="friend-search-result__action">${action}</div>
                </div>
            `;
        }).join('');

        results.querySelectorAll('.btn-send-guild-invite').forEach(btn => {
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                btn.textContent = 'Sending…';
                try {
                    await post('/api/guild/invite', { user_id: parseInt(btn.dataset.id) });
                    btn.textContent = 'Invited!';
                    btn.classList.remove('btn-primary');
                    btn.classList.add('btn-secondary');
                } catch (err) {
                    showToast(err.message || 'Failed to send invite');
                    btn.disabled = false;
                    btn.textContent = 'Invite';
                }
            });
        });
    } catch {
        results.innerHTML = `<p class="guild-empty">Search failed. Please try again.</p>`;
    }
}

// ─────────────────────────────────────────────
// Chat
// ─────────────────────────────────────────────

function renderChatMessage(msg) {
    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `
        <div class="guild-chat-msg">
            <span class="guild-chat-msg__author">${escapeHtml(msg.character_name)}</span>
            <span class="guild-chat-msg__time">${time}</span>
            <p class="guild-chat-msg__body">${escapeHtml(msg.body)}</p>
        </div>
    `;
}

function scrollChatToBottom(container) {
    const el = container.querySelector('#guild-chat-messages');
    if (el) el.scrollTop = el.scrollHeight;
}

// ─────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────

function renderPerkBadge(label, unlocked, levelLabel) {
    return `
        <span class="guild-perk-badge${unlocked ? ' guild-perk-badge--unlocked' : ''}">
            ${unlocked ? '&#10003;' : '&#128274;'} ${label}
            ${!unlocked ? `<small>${levelLabel}</small>` : ''}
        </span>
    `;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'friends-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
