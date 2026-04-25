/**
 * Admin Skills Manager — full CRUD with search, attribute mapping, and content editor.
 */
import { get, post, put, del } from '../api.js';
import { renderVariationsEditor } from './variations-editor.js';
import { attributes } from './admin-app.js';
import { esc } from '../utils/html.js';

let allSkills = [];
let currentFilter = { search: '', category: '' };

export async function renderSkillsManager(container) {
    container.innerHTML = '<h1>Skills Manager</h1><p>Loading...</p>';

    try {
        allSkills = await get('/api/admin/skills');
        renderSkillsList(container);
    } catch (err) {
        container.innerHTML = `<h1>Skills Manager</h1><p class="form-error">${esc(err.message)}</p>`;
    }
}

function renderSkillsList(container) {
    const categories = ['', 'physical', 'mental', 'creative', 'technical', 'practical', 'knowledge', 'social'];
    const catLabels = { '': 'All', physical: 'Physical', mental: 'Mental', creative: 'Creative', technical: 'Technical', practical: 'Practical', knowledge: 'Knowledge', social: 'Social' };

    container.innerHTML = `
        <div class="admin-header-row">
            <h1>Skills Manager</h1>
            <button class="btn-fantasy btn-primary btn-small" id="btn-add-skill">+ New Skill</button>
        </div>

        <div class="admin-filters">
            <input type="text" class="form-input" id="skill-search" placeholder="Search skills..." value="${esc(currentFilter.search)}">
            <select class="form-input form-select" id="skill-cat-filter">
                ${categories.map(c => `<option value="${c}" ${c === currentFilter.category ? 'selected' : ''}>${catLabels[c]}</option>`).join('')}
            </select>
            <span class="admin-count">${filteredSkills().length} of ${allSkills.length} skills</span>
        </div>

        <table class="admin-table" id="skills-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Max Lv.</th>
                    <th>XP Mult.</th>
                    <th>Active</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="skills-tbody">
                ${renderSkillRows()}
            </tbody>
        </table>
    `;

    // Event handlers
    document.getElementById('skill-search').addEventListener('input', (e) => {
        currentFilter.search = e.target.value;
        updateTable();
    });
    document.getElementById('skill-cat-filter').addEventListener('change', (e) => {
        currentFilter.category = e.target.value;
        updateTable();
    });
    document.getElementById('btn-add-skill').addEventListener('click', () => showSkillEditor(container, null));
    attachRowHandlers(container);
}

function filteredSkills() {
    return allSkills.filter(s => {
        if (currentFilter.category && s.category !== currentFilter.category) return false;
        if (currentFilter.search) {
            const q = currentFilter.search.toLowerCase();
            if (!s.name.toLowerCase().includes(q) && !(s.description || '').toLowerCase().includes(q)) return false;
        }
        return true;
    });
}

function renderSkillRows() {
    const skills = filteredSkills();
    if (skills.length === 0) return '<tr><td colspan="7" class="text-muted">No skills match your filters.</td></tr>';
    return skills.map(s => `
        <tr data-id="${s.id}">
            <td>${s.id}</td>
            <td><strong>${esc(s.name)}</strong></td>
            <td>${s.category || '—'}</td>
            <td>${s.max_level}</td>
            <td>${s.xp_multiplier}</td>
            <td>${s.is_active ? '<span class="admin-badge admin-badge--active">Yes</span>' : '<span class="admin-badge admin-badge--inactive">No</span>'}</td>
            <td class="admin-actions">
                <button class="btn-fantasy btn-small btn-secondary btn-edit" data-id="${s.id}">Edit</button>
                <button class="btn-fantasy btn-small btn-secondary btn-content" data-id="${s.id}">Content</button>
                <button class="btn-fantasy btn-small btn-secondary btn-attrs" data-id="${s.id}">Attrs</button>
                <button class="btn-fantasy btn-small btn-secondary btn-quests" data-id="${s.id}">Quests</button>
                <button class="btn-fantasy btn-small btn-danger btn-delete" data-id="${s.id}">Delete</button>
            </td>
        </tr>
    `).join('');
}

function updateTable() {
    const tbody = document.getElementById('skills-tbody');
    if (tbody) {
        tbody.innerHTML = renderSkillRows();
        attachRowHandlers(document.getElementById('admin-main'));
    }
    const count = document.querySelector('.admin-count');
    if (count) count.textContent = `${filteredSkills().length} of ${allSkills.length} skills`;
}

function attachRowHandlers(container) {
    container.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const skill = allSkills.find(s => s.id == btn.dataset.id);
            if (skill) showSkillEditor(container, skill);
        });
    });
    container.querySelectorAll('.btn-content').forEach(btn => {
        btn.addEventListener('click', () => {
            const skill = allSkills.find(s => s.id == btn.dataset.id);
            if (skill) showContentEditor(container, skill);
        });
    });
    container.querySelectorAll('.btn-attrs').forEach(btn => {
        btn.addEventListener('click', () => {
            const skill = allSkills.find(s => s.id == btn.dataset.id);
            if (skill) showAttrEditor(container, skill);
        });
    });
    container.querySelectorAll('.btn-quests').forEach(btn => {
        btn.addEventListener('click', () => {
            const skill = allSkills.find(s => s.id == btn.dataset.id);
            if (skill) renderVariationsEditor(container, skill, () => renderSkillsList(container));
        });
    });
    container.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const skill = allSkills.find(s => s.id == btn.dataset.id);
            if (!skill) return;
            if (!confirm(`Delete skill "${skill.name}"? This cannot be undone.`)) return;
            try {
                await del(`/api/admin/skills/${skill.id}`);
                allSkills = allSkills.filter(s => s.id !== skill.id);
                updateTable();
            } catch (err) {
                alert('Delete failed: ' + err.message);
            }
        });
    });
}

// ========================
// SKILL EDITOR (Create/Edit)
// ========================
function showSkillEditor(container, skill) {
    const isNew = !skill;
    const title = isNew ? 'Create New Skill' : `Edit: ${skill.name}`;

    container.innerHTML = `
        <div class="admin-editor">
            <button class="btn-fantasy btn-secondary btn-small admin-back" id="btn-back">&larr; Back to Skills</button>
            <h2>${title}</h2>

            <form id="skill-form" class="admin-form">
                <div class="admin-form-grid">
                    <div class="form-group">
                        <label class="form-label">Name *</label>
                        <input type="text" class="form-input" name="name" value="${esc(skill?.name || '')}" required maxlength="100">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Category</label>
                        <select class="form-input form-select" name="category">
                            <option value="">— Select —</option>
                            ${['physical','mental','creative','technical','practical','knowledge','social'].map(c =>
                                `<option value="${c}" ${skill?.category === c ? 'selected' : ''}>${c.charAt(0).toUpperCase() + c.slice(1)}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Max Level</label>
                        <input type="number" class="form-input" name="max_level" value="${skill?.max_level ?? 250}" min="1" max="1000">
                    </div>
                    <div class="form-group">
                        <label class="form-label">XP Multiplier</label>
                        <input type="number" class="form-input" name="xp_multiplier" value="${skill?.xp_multiplier ?? 1.0}" min="0.1" max="10" step="0.1">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Sort Order</label>
                        <input type="number" class="form-input" name="sort_order" value="${skill?.sort_order ?? 0}" min="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <input type="checkbox" name="is_active" ${(skill?.is_active ?? 1) ? 'checked' : ''}>
                            Active
                        </label>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea class="form-input form-textarea" name="description" rows="3" maxlength="500">${esc(skill?.description || '')}</textarea>
                </div>

                <div class="form-error" id="skill-error"></div>
                <div class="admin-form-actions">
                    <button type="submit" class="btn-fantasy btn-primary">${isNew ? 'Create Skill' : 'Save Changes'}</button>
                    <button type="button" class="btn-fantasy btn-secondary" id="btn-cancel">Cancel</button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('btn-back').addEventListener('click', () => renderSkillsList(container));
    document.getElementById('btn-cancel').addEventListener('click', () => renderSkillsList(container));

    document.getElementById('skill-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const errorEl = document.getElementById('skill-error');
        const data = {
            name: form.name.value.trim(),
            category: form.category.value,
            max_level: parseInt(form.max_level.value) || 250,
            xp_multiplier: parseFloat(form.xp_multiplier.value) || 1.0,
            sort_order: parseInt(form.sort_order.value) || 0,
            is_active: form.is_active.checked ? 1 : 0,
            description: form.description.value.trim(),
        };

        if (!data.name) {
            errorEl.textContent = 'Name is required';
            return;
        }

        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Saving...';
        errorEl.textContent = '';

        try {
            if (isNew) {
                const result = await post('/api/admin/skills', data);
                data.id = result.id;
                data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                data.icon = data.slug + '.svg';
                allSkills.push(data);
            } else {
                data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                await put(`/api/admin/skills/${skill.id}`, data);
                Object.assign(skill, data);
            }
            renderSkillsList(container);
        } catch (err) {
            errorEl.textContent = err.message || 'Failed to save';
            btn.disabled = false;
            btn.textContent = isNew ? 'Create Skill' : 'Save Changes';
        }
    });
}

// ========================
// CONTENT EDITOR (Markdown + tips/celebrities/resources)
// ========================
async function showContentEditor(container, skill) {
    container.innerHTML = `
        <div class="admin-editor">
            <button class="btn-fantasy btn-secondary btn-small admin-back" id="btn-back">&larr; Back to Skills</button>
            <h2>Content: ${esc(skill.name)}</h2>
            <p class="section-subtitle">Extended content for the skill detail page</p>
            <p>Loading...</p>
        </div>
    `;

    document.getElementById('btn-back').addEventListener('click', () => renderSkillsList(container));

    let content = {};
    try {
        const skillData = await get(`/api/skills/${skill.id}`);
        content = {
            body_markdown: skillData.body_markdown || '',
            tips: skillData.tips || [],
            celebrities: skillData.celebrities || [],
            resources: skillData.resources || [],
        };
    } catch {
        // No content yet
    }

    const editor = container.querySelector('.admin-editor');
    editor.innerHTML = `
        <button class="btn-fantasy btn-secondary btn-small admin-back" id="btn-back">&larr; Back to Skills</button>
        <h2>Content: ${esc(skill.name)}</h2>
        <p class="section-subtitle">Extended content for the skill detail page</p>

        <form id="content-form" class="admin-form">
            <div class="form-group">
                <label class="form-label">Body (Markdown)</label>
                <textarea class="form-input form-textarea form-textarea--lg" name="body_markdown" rows="12" placeholder="## Getting Started&#10;&#10;Write skill description in Markdown...">${esc(content.body_markdown)}</textarea>
            </div>

            <div class="form-group">
                <label class="form-label">Tips (one per line)</label>
                <textarea class="form-input form-textarea" name="tips" rows="5" placeholder="Start with the basics&#10;Practice 20 minutes daily&#10;Find a mentor">${(content.tips || []).join('\n')}</textarea>
            </div>

            <div class="form-group">
                <label class="form-label">Notable Practitioners (JSON array)</label>
                <textarea class="form-input form-textarea" name="celebrities" rows="4" placeholder='[{"name":"Person Name","description":"Brief description"}]'>${content.celebrities?.length ? JSON.stringify(content.celebrities, null, 2) : ''}</textarea>
                <div class="form-hint">Format: [{"name":"...", "description":"..."}]</div>
            </div>

            <div class="form-group">
                <label class="form-label">Resources (JSON array)</label>
                <textarea class="form-input form-textarea" name="resources" rows="4" placeholder='[{"title":"Resource Name","url":"https://..."}]'>${content.resources?.length ? JSON.stringify(content.resources, null, 2) : ''}</textarea>
                <div class="form-hint">Format: [{"title":"...", "url":"..."}]</div>
            </div>

            <div class="form-error" id="content-error"></div>
            <div class="admin-form-actions">
                <button type="submit" class="btn-fantasy btn-primary">Save Content</button>
                <button type="button" class="btn-fantasy btn-secondary" id="btn-cancel">Cancel</button>
            </div>
        </form>
    `;

    document.getElementById('btn-back').addEventListener('click', () => renderSkillsList(container));
    document.getElementById('btn-cancel').addEventListener('click', () => renderSkillsList(container));

    document.getElementById('content-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const errorEl = document.getElementById('content-error');
        const btn = form.querySelector('button[type="submit"]');

        const tipsRaw = form.tips.value.trim();
        const tips = tipsRaw ? tipsRaw.split('\n').map(t => t.trim()).filter(Boolean) : [];

        let celebrities = [];
        let resources = [];
        try {
            const celRaw = form.celebrities.value.trim();
            if (celRaw) celebrities = JSON.parse(celRaw);
        } catch {
            errorEl.textContent = 'Invalid JSON in celebrities field';
            return;
        }
        try {
            const resRaw = form.resources.value.trim();
            if (resRaw) resources = JSON.parse(resRaw);
        } catch {
            errorEl.textContent = 'Invalid JSON in resources field';
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Saving...';
        errorEl.textContent = '';

        try {
            await put(`/api/admin/skills/${skill.id}/content`, {
                body_markdown: form.body_markdown.value,
                tips,
                celebrities,
                resources,
            });
            renderSkillsList(container);
        } catch (err) {
            errorEl.textContent = err.message || 'Failed to save content';
            btn.disabled = false;
            btn.textContent = 'Save Content';
        }
    });
}

// ========================
// ATTRIBUTE MAPPING EDITOR
// ========================
async function showAttrEditor(container, skill) {
    container.innerHTML = `
        <div class="admin-editor">
            <button class="btn-fantasy btn-secondary btn-small admin-back" id="btn-back">&larr; Back to Skills</button>
            <h2>Attribute Mapping: ${esc(skill.name)}</h2>
            <p class="section-subtitle">Define how this skill contributes to each attribute. Ratios should sum to 1.00.</p>
            <p>Loading...</p>
        </div>
    `;

    document.getElementById('btn-back').addEventListener('click', () => renderSkillsList(container));

    // Load current mappings
    let currentMappings = [];
    try {
        const skillData = await get(`/api/skills/${skill.id}`);
        currentMappings = (skillData.attributes || []).map(a => ({
            attribute_id: a.attribute_id,
            ratio: parseFloat(a.ratio),
        }));
    } catch {
        // No mappings yet
    }

    const editor = container.querySelector('.admin-editor');
    editor.innerHTML = `
        <button class="btn-fantasy btn-secondary btn-small admin-back" id="btn-back">&larr; Back to Skills</button>
        <h2>Attribute Mapping: ${esc(skill.name)}</h2>
        <p class="section-subtitle">Define how this skill contributes to each attribute. Ratios should sum to 1.00.</p>

        <form id="attr-form" class="admin-form">
            <div class="attr-mapping-list">
                ${attributes.map(attr => {
                    const mapping = currentMappings.find(m => m.attribute_id == attr.id);
                    const ratio = mapping ? mapping.ratio : 0;
                    return `
                        <div class="attr-mapping-row">
                            <span class="attr-mapping-icon" style="color: ${attr.color || 'inherit'}">&#9670;</span>
                            <span class="attr-mapping-name">${esc(attr.name)}</span>
                            <input type="number" class="form-input form-input--small attr-ratio"
                                   data-attr-id="${attr.id}"
                                   value="${ratio}" min="0" max="1" step="0.05">
                        </div>
                    `;
                }).join('')}
            </div>

            <div class="attr-mapping-total">
                Total: <strong id="ratio-total">0.00</strong>
                <span id="ratio-status" class="form-hint"></span>
            </div>

            <div class="form-error" id="attr-error"></div>
            <div class="admin-form-actions">
                <button type="submit" class="btn-fantasy btn-primary">Save Mappings</button>
                <button type="button" class="btn-fantasy btn-secondary" id="btn-cancel">Cancel</button>
            </div>
        </form>
    `;

    document.getElementById('btn-back').addEventListener('click', () => renderSkillsList(container));
    document.getElementById('btn-cancel').addEventListener('click', () => renderSkillsList(container));

    const ratioInputs = document.querySelectorAll('.attr-ratio');
    const totalEl = document.getElementById('ratio-total');
    const statusEl = document.getElementById('ratio-status');

    function updateTotal() {
        let total = 0;
        ratioInputs.forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        totalEl.textContent = total.toFixed(2);
        if (Math.abs(total - 1.0) < 0.01) {
            statusEl.textContent = '✓';
            statusEl.className = 'form-hint success';
        } else if (total > 0) {
            statusEl.textContent = '(should be 1.00)';
            statusEl.className = 'form-hint error';
        } else {
            statusEl.textContent = '';
            statusEl.className = 'form-hint';
        }
    }

    ratioInputs.forEach(input => input.addEventListener('input', updateTotal));
    updateTotal();

    document.getElementById('attr-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorEl = document.getElementById('attr-error');
        const btn = e.target.querySelector('button[type="submit"]');

        const mappings = [];
        ratioInputs.forEach(input => {
            const ratio = parseFloat(input.value) || 0;
            if (ratio > 0) {
                mappings.push({
                    attribute_id: parseInt(input.dataset.attrId),
                    ratio: ratio,
                });
            }
        });

        btn.disabled = true;
        btn.textContent = 'Saving...';
        errorEl.textContent = '';

        try {
            await put(`/api/admin/skills/${skill.id}/attributes`, { mappings });
            renderSkillsList(container);
        } catch (err) {
            errorEl.textContent = err.message || 'Failed to save mappings';
            btn.disabled = false;
            btn.textContent = 'Save Mappings';
        }
    });
}
