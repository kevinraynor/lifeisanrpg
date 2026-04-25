/**
 * Admin Classes Manager — edit class descriptions, images, colors, suggested skills.
 */
import { get, put } from '../api.js';
import { esc } from '../utils/html.js';

let allClasses = [];

export async function renderClassesManager(container) {
    container.innerHTML = '<h1>Classes Manager</h1><p>Loading...</p>';

    try {
        allClasses = await get('/api/admin/classes');
        renderClassesList(container);
    } catch (err) {
        container.innerHTML = `<h1>Classes Manager</h1><p class="form-error">${esc(err.message)}</p>`;
    }
}

function renderClassesList(container) {
    container.innerHTML = `
        <div class="admin-header-row">
            <h1>Classes Manager</h1>
            <span class="admin-count">${allClasses.length} classes</span>
        </div>

        <div class="admin-classes-grid">
            ${allClasses.map(cls => `
                <div class="admin-class-card card-ornate" data-id="${cls.id}">
                    <div class="admin-class-header" style="border-left: 4px solid ${cls.color || '#8b7355'}">
                        <h3>${esc(cls.name)}</h3>
                        <span class="admin-class-slug">${esc(cls.slug)}</span>
                    </div>
                    <p class="admin-class-desc">${esc(truncate(cls.description, 120))}</p>
                    <div class="admin-class-meta">
                        <span>Color: <span class="admin-color-swatch" style="background: ${cls.color || '#888'}"></span> ${cls.color || '—'}</span>
                        <span>Sort: ${cls.sort_order}</span>
                    </div>
                    <div class="admin-class-images">
                        ${cls.image_url_male ? `<span>♂ ${esc(cls.image_url_male)}</span>` : '<span class="text-muted">No male image</span>'}
                        ${cls.image_url_female ? `<span>♀ ${esc(cls.image_url_female)}</span>` : '<span class="text-muted">No female image</span>'}
                    </div>
                    <button class="btn-fantasy btn-small btn-secondary btn-edit-class" data-id="${cls.id}">Edit</button>
                </div>
            `).join('')}
        </div>
    `;

    container.querySelectorAll('.btn-edit-class').forEach(btn => {
        btn.addEventListener('click', () => {
            const cls = allClasses.find(c => c.id == btn.dataset.id);
            if (cls) showClassEditor(container, cls);
        });
    });
}

function showClassEditor(container, cls) {
    // Parse suggested_skills - could be JSON string or already an array
    let suggestedSkills = cls.suggested_skills || [];
    if (typeof suggestedSkills === 'string') {
        try { suggestedSkills = JSON.parse(suggestedSkills); } catch { suggestedSkills = []; }
    }

    container.innerHTML = `
        <div class="admin-editor">
            <button class="btn-fantasy btn-secondary btn-small admin-back" id="btn-back">&larr; Back to Classes</button>
            <h2 style="border-left: 4px solid ${cls.color || '#8b7355'}; padding-left: 12px;">Edit: ${esc(cls.name)}</h2>

            <form id="class-form" class="admin-form">
                <div class="admin-form-grid">
                    <div class="form-group">
                        <label class="form-label">Name</label>
                        <input type="text" class="form-input" name="name" value="${esc(cls.name)}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Color (hex)</label>
                        <div class="admin-color-input">
                            <input type="color" name="color_picker" value="${cls.color || '#8b7355'}">
                            <input type="text" class="form-input" name="color" value="${esc(cls.color || '')}" placeholder="#8b7355" maxlength="7">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Sort Order</label>
                        <input type="number" class="form-input" name="sort_order" value="${cls.sort_order}" min="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Male Image URL</label>
                        <input type="text" class="form-input" name="image_url_male" value="${esc(cls.image_url_male || '')}" placeholder="/img/classes/warrior-male.webp">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Female Image URL</label>
                        <input type="text" class="form-input" name="image_url_female" value="${esc(cls.image_url_female || '')}" placeholder="/img/classes/warrior-female.webp">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea class="form-input form-textarea" name="description" rows="4">${esc(cls.description)}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label">Suggested Skill IDs (comma-separated)</label>
                    <input type="text" class="form-input" name="suggested_skills" value="${suggestedSkills.join(', ')}" placeholder="1, 2, 5, 10">
                    <div class="form-hint">Skill IDs that are pre-checked during registration for this class</div>
                </div>

                <div class="form-error" id="class-error"></div>
                <div class="admin-form-actions">
                    <button type="submit" class="btn-fantasy btn-primary">Save Changes</button>
                    <button type="button" class="btn-fantasy btn-secondary" id="btn-cancel">Cancel</button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('btn-back').addEventListener('click', () => renderClassesList(container));
    document.getElementById('btn-cancel').addEventListener('click', () => renderClassesList(container));

    // Sync color picker with text input
    const colorPicker = document.querySelector('[name="color_picker"]');
    const colorText = document.querySelector('[name="color"]');
    colorPicker.addEventListener('input', () => { colorText.value = colorPicker.value; });
    colorText.addEventListener('input', () => {
        if (/^#[0-9a-fA-F]{6}$/.test(colorText.value)) {
            colorPicker.value = colorText.value;
        }
    });

    document.getElementById('class-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const errorEl = document.getElementById('class-error');
        const btn = form.querySelector('button[type="submit"]');

        // Parse suggested skills
        const sugSkillsRaw = form.suggested_skills.value.trim();
        const sugSkillsArr = sugSkillsRaw
            ? sugSkillsRaw.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
            : [];

        const data = {
            name: form.name.value.trim(),
            slug: form.name.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            description: form.description.value.trim(),
            color: form.color.value.trim() || null,
            image_url_male: form.image_url_male.value.trim() || null,
            image_url_female: form.image_url_female.value.trim() || null,
            sort_order: parseInt(form.sort_order.value) || 0,
            suggested_skills: sugSkillsArr,
        };

        if (!data.name) {
            errorEl.textContent = 'Name is required';
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Saving...';
        errorEl.textContent = '';

        try {
            await put(`/api/admin/classes/${cls.id}`, data);
            // Update local data
            Object.assign(cls, data);
            cls.suggested_skills = sugSkillsArr;
            renderClassesList(container);
        } catch (err) {
            errorEl.textContent = err.message || 'Failed to save';
            btn.disabled = false;
            btn.textContent = 'Save Changes';
        }
    });
}

function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
}
