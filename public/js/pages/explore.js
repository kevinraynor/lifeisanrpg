/**
 * Explore page — browse all available skills with filters.
 */
import Store from '../store.js';
import { post } from '../api.js';

export function renderExplore(container) {
    const categories = ['all', 'physical', 'mental', 'creative', 'technical', 'practical', 'knowledge', 'social'];
    const categoryLabels = {
        all: 'All', physical: 'Physical', mental: 'Mental', creative: 'Creative',
        technical: 'Technical', practical: 'Practical', knowledge: 'Knowledge', social: 'Social',
    };

    container.innerHTML = `
        <h2>Explore Skills</h2>
        <p class="section-subtitle">Discover new skills to add to your journey</p>

        <div class="explore-filters">
            <div class="filter-row">
                <input type="text" class="form-input" id="explore-search" placeholder="Search skills...">
                <label class="filter-checkbox">
                    <input type="checkbox" id="explore-available" checked>
                    <span>Only show available skills</span>
                </label>
            </div>
            <div class="filter-tabs" id="explore-tabs">
                ${categories.map(c => `
                    <button class="filter-tab ${c === 'all' ? 'active' : ''}" data-category="${c}">
                        ${categoryLabels[c]}
                    </button>
                `).join('')}
            </div>
        </div>

        <div class="explore-suggested" id="explore-suggested"></div>
        <div class="explore-grid" id="explore-grid"></div>
    `;

    let currentCategory = 'all';
    let showAvailableOnly = true;

    function renderSkills() {
        const search = document.getElementById('explore-search').value.toLowerCase().trim();
        showAvailableOnly = document.getElementById('explore-available').checked;

        let skills = Store.allSkills;

        // Category filter
        if (currentCategory !== 'all') {
            skills = skills.filter(s => s.category === currentCategory);
        }

        // Search filter
        if (search) {
            skills = skills.filter(s =>
                s.name.toLowerCase().includes(search) ||
                (s.description || '').toLowerCase().includes(search)
            );
        }

        // Available only (not already activated, prerequisites met)
        if (showAvailableOnly) {
            skills = skills.filter(s => {
                if (Store.isSkillActivated(s.id)) return false;
                return Store.canActivateSkill(s.id).can;
            });
        } else {
            // Mark which are activated or locked
            skills = skills.map(s => ({
                ...s,
                _activated: Store.isSkillActivated(s.id),
                _available: Store.canActivateSkill(s.id).can,
            }));
        }

        const grid = document.getElementById('explore-grid');
        if (skills.length === 0) {
            grid.innerHTML = '<p class="text-muted">No skills match your filters.</p>';
            return;
        }

        grid.innerHTML = skills.map(s => {
            const activated = s._activated || Store.isSkillActivated(s.id);
            const available = s._available !== undefined ? s._available : Store.canActivateSkill(s.id).can;
            const prereqs = Store.getPrerequisites(s.id);
            const prereqText = prereqs.map(p => `${p.skill?.name || '?'} Lv. ${p.required_level}`).join(', ');

            return `
                <div class="explore-skill-card ${activated ? 'activated' : ''} ${!available && !activated ? 'locked' : ''}"
                     data-skill-id="${s.id}" data-skill-slug="${s.slug || ''}" style="cursor:pointer">
                    <div class="explore-skill-header">
                        <span class="explore-skill-name">${escapeHtml(s.name)}</span>
                        <span class="explore-skill-cat">${s.category || ''}</span>
                    </div>
                    <p class="explore-skill-desc">${escapeHtml(s.description || '')}</p>
                    <div class="explore-skill-meta">
                        <span>Max Lv. ${s.max_level}</span>
                        ${parseFloat(s.xp_multiplier) !== 1 ? `<span>XP &times;${s.xp_multiplier}</span>` : ''}
                    </div>
                    ${prereqText ? `<div class="explore-skill-prereq">Requires: ${escapeHtml(prereqText)}</div>` : ''}
                    <div class="explore-skill-action">
                        ${activated
                            ? '<span class="badge-activated">Active</span>'
                            : available
                                ? `<button class="btn-fantasy btn-small btn-primary activate-btn" data-skill-id="${s.id}">Activate</button>`
                                : '<span class="badge-locked">Locked</span>'}
                    </div>
                </div>
            `;
        }).join('');

        // Navigate to skill detail on card click (not on button click)
        grid.querySelectorAll('.explore-skill-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.activate-btn')) return; // let activate button handle itself
                const slug = card.dataset.skillSlug;
                if (slug) {
                    history.pushState({}, '', `/app/skill/${slug}`);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                }
            });
        });

        // Attach activate handlers
        grid.querySelectorAll('.activate-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const skillId = parseInt(btn.dataset.skillId);
                btn.disabled = true;
                btn.textContent = '...';
                try {
                    await post(`/api/user/skills/${skillId}/activate`);
                    const skill = Store.getSkillById(skillId);
                    Store.addUserSkill({
                        skill_id: skillId,
                        total_xp: 0,
                        current_level: 0,
                        name: skill.name,
                        slug: skill.slug,
                        description: skill.description,
                        icon: skill.icon,
                        max_level: skill.max_level,
                        xp_multiplier: skill.xp_multiplier,
                        category: skill.category,
                        activated_at: new Date().toISOString(),
                        last_logged: null,
                    });
                    renderSkills();
                } catch (err) {
                    alert(err.message || 'Could not activate skill');
                    btn.disabled = false;
                    btn.textContent = 'Activate';
                }
            });
        });
    }

    // Event listeners
    document.getElementById('explore-search').addEventListener('input', renderSkills);
    document.getElementById('explore-available').addEventListener('change', renderSkills);

    document.getElementById('explore-tabs').addEventListener('click', (e) => {
        const tab = e.target.closest('.filter-tab');
        if (!tab) return;
        currentCategory = tab.dataset.category;
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.toggle('active', t === tab));
        renderSkills();
    });

    renderSkills();
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
