/**
 * Guild member row rendering and action bindings.
 */
import Store from '../../store.js';
import { post } from '../../api.js';
import { escapeHtml } from '../../utils/html.js';
import { showToast } from '../../utils/toast.js';
import { confirmModal } from '../../utils/confirm-modal.js';

/**
 * Render a single member row.
 * @param {Object} m       - Member object from API
 * @param {string} myRole  - Viewer's role: 'leader' | 'officer' | 'member'
 * @param {Object} guild   - Guild object (unused directly but available for future use)
 */
export function renderMemberRow(m, myRole, guild) {
    const isMe      = m.user_id === Store.user?.id;
    const roleLabel = { leader: '&#128081; Leader', officer: '&#9876; Officer', member: 'Member' }[m.role] || m.role;
    const canManage  = (myRole === 'leader' || myRole === 'officer') && !isMe;
    const canKick    = canManage && m.role !== 'leader';
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

/**
 * Bind kick/promote/demote button events inside container.
 * @param {HTMLElement} container
 * @param {Function}    refresh   - async () => void
 */
export function bindMemberActions(container, refresh) {
    container.querySelectorAll('.btn-kick-member').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!await confirmModal(`Kick ${btn.dataset.name} from the guild?`, { confirmLabel: 'Kick', danger: true })) return;
            btn.disabled = true;
            try {
                await post(`/api/guild/members/${btn.dataset.id}/kick`);
                await refresh();
            } catch (err) { showToast(err.message); btn.disabled = false; }
        });
    });

    container.querySelectorAll('.btn-promote-member').forEach(btn => {
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            try {
                await post(`/api/guild/members/${btn.dataset.id}/promote`);
                await refresh();
            } catch (err) { showToast(err.message); btn.disabled = false; }
        });
    });

    container.querySelectorAll('.btn-demote-member').forEach(btn => {
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            try {
                await post(`/api/guild/members/${btn.dataset.id}/demote`);
                await refresh();
            } catch (err) { showToast(err.message); btn.disabled = false; }
        });
    });
}
