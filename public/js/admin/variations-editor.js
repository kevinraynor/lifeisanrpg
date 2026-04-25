/**
 * Admin Quest Variations Editor — sub-panel for a single skill.
 */
import { get, post, put, del } from '../api.js';
import { esc } from '../utils/html.js';

const PERIODS = ['daily', 'weekly', 'monthly'];
const PERIOD_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
const PERIOD_HINTS = {
    daily: 'e.g. 0.25 – 1h',
    weekly: 'e.g. 2 – 5h',
    monthly: 'e.g. 8 – 20h',
};

let currentPeriod = 'daily';

export async function renderVariationsEditor(container, skill, onBack) {
    currentPeriod = 'daily';
    await renderEditor(container, skill, onBack);
}

async function renderEditor(container, skill, onBack) {
    container.innerHTML = `
        <div class="admin-editor">
            <button class="btn-fantasy btn-secondary btn-small" id="btn-back">&larr; Back to Skills</button>
            <h2>Quest Variations: ${esc(skill.name)}</h2>
            <p class="section-subtitle">Manage quest templates for each period. Click a row to edit.</p>
            <p>Loading...</p>
        </div>
    `;
    document.getElementById('btn-back').addEventListener('click', onBack);

    let variations = [];
    try {
        variations = await get(`/api/admin/skills/${skill.id}/variations`);
    } catch (err) {
        container.querySelector('.admin-editor').innerHTML += `<p class="form-error">${esc(err.message)}</p>`;
        return;
    }

    renderContent(container, skill, onBack, variations);
}

function renderContent(container, skill, onBack, variations) {
    const tabsHtml = PERIODS.map(p => `
        <button class="quest-variations-editor__period-tab${p === currentPeriod ? ' active' : ''}" data-period="${p}">
            ${PERIOD_LABELS[p]}
        </button>
    `).join('');

    const periodVariations = variations.filter(v => v.period === currentPeriod);

    const rowsHtml = periodVariations.length === 0
        ? `<p class="text-muted">No ${currentPeriod} variations yet.</p>`
        : periodVariations.map(v => `
            <div class="quest-variation-row" data-id="${v.id}">
                <input type="text" class="form-input qv-name" value="${esc(v.name)}" placeholder="Name" maxlength="150">
                <input type="text" class="form-input qv-desc" value="${esc(v.description || '')}" placeholder="Description (optional)" maxlength="255">
                <input type="number" class="form-input qv-hours" name="hours" value="${v.hours}" step="0.25" min="0.25" max="200" style="width:90px">
                <label class="qv-active-label">
                    <input type="checkbox" class="qv-active" ${v.is_active ? 'checked' : ''}> Active
                </label>
                <button class="btn-fantasy btn-small btn-secondary qv-save" data-id="${v.id}">Save</button>
                <button class="btn-fantasy btn-small btn-danger qv-delete" data-id="${v.id}">&#128465;</button>
            </div>
        `).join('');

    const editor = container.querySelector('.admin-editor');
    editor.innerHTML = `
        <button class="btn-fantasy btn-secondary btn-small" id="btn-back">&larr; Back to Skills</button>
        <h2>Quest Variations: ${esc(skill.name)}</h2>
        <p class="section-subtitle">Manage quest templates for each period.</p>

        <div class="quest-variations-editor">
            <div class="quest-variations-editor__period-tabs">${tabsHtml}</div>

            <div id="qv-rows">${rowsHtml}</div>

            <div class="qv-add-row">
                <h4>Add ${PERIOD_LABELS[currentPeriod]} variation <span class="form-hint">${PERIOD_HINTS[currentPeriod]}</span></h4>
                <div class="quest-variation-row">
                    <input type="text" class="form-input" id="new-qv-name" placeholder="Name *" maxlength="150">
                    <input type="text" class="form-input" id="new-qv-desc" placeholder="Description (optional)" maxlength="255">
                    <input type="number" class="form-input" id="new-qv-hours" name="hours" placeholder="Hours" step="0.25" min="0.25" max="200" style="width:90px">
                    <button class="btn-fantasy btn-primary btn-small" id="qv-add-btn">+ Add</button>
                </div>
                <div class="form-error" id="qv-add-error"></div>
            </div>
        </div>
    `;

    document.getElementById('btn-back').addEventListener('click', onBack);

    editor.querySelectorAll('.quest-variations-editor__period-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            currentPeriod = tab.dataset.period;
            renderContent(container, skill, onBack, variations);
        });
    });

    editor.querySelectorAll('.qv-save').forEach(btn => {
        btn.addEventListener('click', async () => {
            const row = btn.closest('.quest-variation-row');
            const id = btn.dataset.id;
            const name = row.querySelector('.qv-name').value.trim();
            const desc = row.querySelector('.qv-desc').value.trim();
            const hours = parseFloat(row.querySelector('.qv-hours').value);
            const isActive = row.querySelector('.qv-active').checked ? 1 : 0;

            if (!name || name.length < 2) { alert('Name must be at least 2 characters'); return; }
            if (!hours || hours <= 0) { alert('Hours must be > 0'); return; }

            btn.disabled = true;
            btn.textContent = '...';
            try {
                await put(`/api/admin/quest-variations/${id}`, { name, description: desc || null, hours, is_active: isActive });
                const v = variations.find(x => x.id == id);
                if (v) { v.name = name; v.description = desc; v.hours = hours; v.is_active = isActive; }
                btn.textContent = 'Saved!';
                setTimeout(() => { btn.disabled = false; btn.textContent = 'Save'; }, 1200);
            } catch (err) {
                alert(err.message || 'Save failed');
                btn.disabled = false;
                btn.textContent = 'Save';
            }
        });
    });

    editor.querySelectorAll('.qv-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('Delete this variation? Any active user quests using it will be removed.')) return;
            const id = btn.dataset.id;
            btn.disabled = true;
            try {
                await del(`/api/admin/quest-variations/${id}`);
                variations = variations.filter(v => v.id != id);
                renderContent(container, skill, onBack, variations);
            } catch (err) {
                alert(err.message || 'Delete failed');
                btn.disabled = false;
            }
        });
    });

    document.getElementById('qv-add-btn').addEventListener('click', async () => {
        const nameEl = document.getElementById('new-qv-name');
        const descEl = document.getElementById('new-qv-desc');
        const hoursEl = document.getElementById('new-qv-hours');
        const errorEl = document.getElementById('qv-add-error');
        const btn = document.getElementById('qv-add-btn');

        const name = nameEl.value.trim();
        const desc = descEl.value.trim();
        const hours = parseFloat(hoursEl.value);

        errorEl.textContent = '';
        if (!name || name.length < 2) { errorEl.textContent = 'Name must be at least 2 characters'; return; }
        if (!hours || hours <= 0) { errorEl.textContent = 'Hours must be > 0'; return; }

        btn.disabled = true;
        btn.textContent = '...';
        try {
            const result = await post(`/api/admin/skills/${skill.id}/variations`, {
                period: currentPeriod, name, description: desc || null, hours,
            });
            variations.push({ id: result.id, skill_id: skill.id, period: currentPeriod, name, description: desc, hours, is_active: 1, sort_order: 0 });
            nameEl.value = '';
            descEl.value = '';
            hoursEl.value = '';
            renderContent(container, skill, onBack, variations);
        } catch (err) {
            errorEl.textContent = err.message || 'Failed to add variation';
            btn.disabled = false;
            btn.textContent = '+ Add';
        }
    });
}
