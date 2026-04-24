/**
 * Admin Guild Tally Variations editor.
 * Period tabs (weekly / monthly only — no daily for guilds).
 */
import { get, post, put, del } from '../api.js';

const PERIODS = ['weekly', 'monthly'];
const PERIOD_LABELS = { weekly: 'Weekly', monthly: 'Monthly' };
const PERIOD_HINTS  = { weekly: 'e.g. 3–10h/member', monthly: 'e.g. 12–40h/member' };

let currentPeriod = 'weekly';
let variations    = [];

export async function renderGuildTalliesManager(container) {
    currentPeriod = 'weekly';
    container.innerHTML = `<div class="admin-editor"><p>Loading guild tally variations…</p></div>`;
    try {
        variations = await get('/api/admin/guild-tally-variations');
    } catch (err) {
        container.innerHTML = `<div class="admin-editor"><p class="form-error">Failed to load: ${esc(err.message)}</p></div>`;
        return;
    }
    renderContent(container);
}

function renderContent(container) {
    const tabsHtml = PERIODS.map(p => `
        <button class="quest-variations-editor__period-tab${p === currentPeriod ? ' active' : ''}" data-period="${p}">
            ${PERIOD_LABELS[p]}
        </button>
    `).join('');

    const rows = variations.filter(v => v.period === currentPeriod);

    const rowsHtml = rows.length === 0
        ? `<p class="text-muted">No ${currentPeriod} guild tally variations yet.</p>`
        : rows.map(v => `
            <div class="quest-variation-row gtv-row" data-id="${v.id}">
                <input type="text"   class="form-input gtv-name"    value="${esc(v.name)}"          placeholder="Name *" maxlength="150">
                <input type="text"   class="form-input gtv-desc"    value="${esc(v.description||'')}" placeholder="Description (optional)" maxlength="255">
                <input type="number" class="form-input gtv-hours"   value="${v.base_hours_per_member}" placeholder="h/member" step="0.5" min="0.5" max="999" style="width:90px" title="Hours per member">
                <input type="number" class="form-input gtv-xp"      value="${v.bonus_xp}"          placeholder="Bonus XP" min="0" max="1000000" style="width:100px" title="Bonus guild XP on completion">
                <input type="number" class="form-input gtv-minlvl"  value="${v.min_guild_level}"    placeholder="Min lvl" min="1" max="20" style="width:70px" title="Min guild level">
                <input type="number" class="form-input gtv-order"   value="${v.sort_order}"         placeholder="Order" min="0" max="99" style="width:65px" title="Sort order">
                <label class="qv-active-label">
                    <input type="checkbox" class="gtv-active" ${v.is_active ? 'checked' : ''}> Active
                </label>
                <button class="btn-fantasy btn-small btn-secondary gtv-save" data-id="${v.id}">Save</button>
                <button class="btn-fantasy btn-small btn-danger gtv-delete" data-id="${v.id}">&#128465;</button>
            </div>
        `).join('');

    const editor = container.querySelector('.admin-editor') || container;
    editor.innerHTML = `
        <h2>&#127984; Guild Tally Variations</h2>
        <p class="section-subtitle">
            Manage the shared hour tally templates guilds can activate each period.
            <strong>target hours = h/member × member count at activation.</strong>
        </p>

        <div class="quest-variations-editor">
            <div class="quest-variations-editor__period-tabs">${tabsHtml}</div>

            <div id="gtv-rows">${rowsHtml}</div>

            <div class="qv-add-row">
                <h4>Add ${PERIOD_LABELS[currentPeriod]} variation <span class="form-hint">${PERIOD_HINTS[currentPeriod]}</span></h4>
                <div class="quest-variation-row">
                    <input type="text"   class="form-input" id="new-gtv-name"   placeholder="Name *" maxlength="150">
                    <input type="text"   class="form-input" id="new-gtv-desc"   placeholder="Description (optional)" maxlength="255">
                    <input type="number" class="form-input" id="new-gtv-hours"  placeholder="h/member" step="0.5" min="0.5" max="999" style="width:90px" title="Hours per member">
                    <input type="number" class="form-input" id="new-gtv-xp"     placeholder="Bonus XP" min="0" max="1000000" style="width:100px">
                    <input type="number" class="form-input" id="new-gtv-minlvl" placeholder="Min lvl" value="1" min="1" max="20" style="width:70px">
                    <input type="number" class="form-input" id="new-gtv-order"  placeholder="Order" value="0" min="0" max="99" style="width:65px">
                    <button class="btn-fantasy btn-primary btn-small" id="gtv-add-btn">+ Add</button>
                </div>
                <div class="form-error" id="gtv-add-error"></div>
            </div>
        </div>
    `;

    // Period tabs
    editor.querySelectorAll('.quest-variations-editor__period-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            currentPeriod = tab.dataset.period;
            renderContent(container);
        });
    });

    // Save rows
    editor.querySelectorAll('.gtv-save').forEach(btn => {
        btn.addEventListener('click', async () => {
            const row = btn.closest('.gtv-row');
            const id = btn.dataset.id;
            const payload = collectRow(row);
            if (!payload) return;
            btn.disabled = true; btn.textContent = '…';
            try {
                await put(`/api/admin/guild-tally-variations/${id}`, payload);
                const idx = variations.findIndex(v => v.id == id);
                if (idx >= 0) Object.assign(variations[idx], payload);
                btn.textContent = 'Saved!';
                setTimeout(() => { btn.disabled = false; btn.textContent = 'Save'; }, 1200);
            } catch (err) {
                alert(err.message || 'Save failed');
                btn.disabled = false; btn.textContent = 'Save';
            }
        });
    });

    // Delete rows
    editor.querySelectorAll('.gtv-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('Delete this variation? Guilds that have already activated it keep their existing tally.')) return;
            const id = btn.dataset.id;
            btn.disabled = true;
            try {
                await del(`/api/admin/guild-tally-variations/${id}`);
                variations = variations.filter(v => v.id != id);
                renderContent(container);
            } catch (err) {
                alert(err.message || 'Delete failed');
                btn.disabled = false;
            }
        });
    });

    // Add new
    document.getElementById('gtv-add-btn').addEventListener('click', async () => {
        const nameEl   = document.getElementById('new-gtv-name');
        const descEl   = document.getElementById('new-gtv-desc');
        const hoursEl  = document.getElementById('new-gtv-hours');
        const xpEl     = document.getElementById('new-gtv-xp');
        const minlvlEl = document.getElementById('new-gtv-minlvl');
        const orderEl  = document.getElementById('new-gtv-order');
        const errorEl  = document.getElementById('gtv-add-error');
        const btn      = document.getElementById('gtv-add-btn');

        const name      = nameEl.value.trim();
        const desc      = descEl.value.trim();
        const hours     = parseFloat(hoursEl.value);
        const bonusXp   = parseInt(xpEl.value || '0', 10);
        const minLvl    = parseInt(minlvlEl.value || '1', 10);
        const sortOrder = parseInt(orderEl.value || '0', 10);

        errorEl.textContent = '';
        if (!name || name.length < 2) { errorEl.textContent = 'Name must be at least 2 characters'; return; }
        if (!hours || hours <= 0)     { errorEl.textContent = 'Hours per member must be > 0'; return; }
        if (isNaN(bonusXp) || bonusXp < 0) { errorEl.textContent = 'Bonus XP must be ≥ 0'; return; }

        btn.disabled = true; btn.textContent = '…';
        try {
            const result = await post('/api/admin/guild-tally-variations', {
                period: currentPeriod,
                name,
                description: desc || null,
                base_hours_per_member: hours,
                bonus_xp: bonusXp,
                min_guild_level: minLvl,
                sort_order: sortOrder,
                is_active: 1,
            });
            variations.push({
                id: result.id, period: currentPeriod, name, description: desc,
                base_hours_per_member: hours, bonus_xp: bonusXp,
                min_guild_level: minLvl, sort_order: sortOrder, is_active: 1,
            });
            nameEl.value = ''; descEl.value = ''; hoursEl.value = '';
            xpEl.value = ''; minlvlEl.value = '1'; orderEl.value = '0';
            renderContent(container);
        } catch (err) {
            errorEl.textContent = err.message || 'Failed to add variation';
            btn.disabled = false; btn.textContent = '+ Add';
        }
    });
}

function collectRow(row) {
    const name      = row.querySelector('.gtv-name').value.trim();
    const desc      = row.querySelector('.gtv-desc').value.trim();
    const hours     = parseFloat(row.querySelector('.gtv-hours').value);
    const bonusXp   = parseInt(row.querySelector('.gtv-xp').value || '0', 10);
    const minLvl    = parseInt(row.querySelector('.gtv-minlvl').value || '1', 10);
    const sortOrder = parseInt(row.querySelector('.gtv-order').value || '0', 10);
    const isActive  = row.querySelector('.gtv-active').checked ? 1 : 0;

    if (!name || name.length < 2) { alert('Name must be at least 2 characters'); return null; }
    if (!hours || hours <= 0)     { alert('Hours per member must be > 0'); return null; }
    return { name, description: desc || null, base_hours_per_member: hours, bonus_xp: bonusXp, min_guild_level: minLvl, sort_order: sortOrder, is_active: isActive };
}

function esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
}
