/**
 * Explore page — browse all available skills with filters.
 */
import Store from '../store.js';
import { get, post } from '../api.js';
import { openSkillExperienceModal } from '../components/skill-experience-modal.js';
import { skillIconHtml } from '../components/skill-icon.js';
import { escapeHtml } from '../utils/html.js';
import { showToast } from '../utils/toast.js';

export async function renderExplore(container) {
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

        // Track how many locked skills are being hidden so we can hint at them.
        let hiddenLocked = 0;

        // Available only (not already activated, prerequisites met)
        if (showAvailableOnly) {
            skills = skills.filter(s => {
                if (Store.isSkillActivated(s.id)) return false;
                const can = Store.canActivateSkill(s.id).can;
                if (!can) hiddenLocked++;
                return can;
            });
        } else {
            // Annotate with activation state
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

        // Hint about locked skills hidden by the filter, so users know what's coming.
        const lockedHintHTML = hiddenLocked > 0
            ? `<p class="explore-locked-hint">
                   &#128274; ${hiddenLocked} skill${hiddenLocked !== 1 ? 's are' : ' is'} locked.
                   <button class="link-button" id="explore-show-locked">Show all</button>
                   to see what's coming.
               </p>`
            : '';

        grid.innerHTML = lockedHintHTML + skills.map(s => {
            const activated = s._activated || Store.isSkillActivated(s.id);
            const available = s._available !== undefined ? s._available : Store.canActivateSkill(s.id).can;
            const prereqs = Store.getPrerequisites(s.id);
            const prereqText = prereqs.map(p => `${p.skill?.name || '?'} Lv. ${p.required_level}`).join(', ');

            const friendsWithSkill = (Store.friends || []).filter(f =>
                (f.skill_slugs || []).includes(s.slug)
            );
            const friendCount = friendsWithSkill.length;
            const friendNames = friendsWithSkill.map(f => f.character_name).join(', ');
            const friendsIndicator = friendCount > 0
                ? `<span class="explore-skill-friends" title="${escapeHtml(friendNames)}">
                       &#128101; ${friendCount} friend${friendCount !== 1 ? 's' : ''}
                   </span>`
                : '';

            return renderExploreCard(s, { activated, available, prereqText, friendsIndicator });
        }).join('');

        bindCardClicks(grid);
        renderSuggested();
        attachActivateHandlers(grid);

        // Wire up the "Show all" button on the locked-skills hint
        document.getElementById('explore-show-locked')?.addEventListener('click', () => {
            const cb = document.getElementById('explore-available');
            if (cb) { cb.checked = false; renderSkills(); }
        });
    }

    // Opens the experience modal, then activates with the computed hours.
    function openActivateModal(skillId, btn) {
        const skill = Store.getSkillById(skillId);
        if (!skill) return;

        openSkillExperienceModal({
            skillName: skill.name,
            xpMultiplier: parseFloat(skill.xp_multiplier) || 1,
            maxLevel: parseInt(skill.max_level) || 250,
            age: null,
            saveLabel: 'Activate Skill',
            onSave: async (hours) => {
                btn.disabled = true;
                btn.textContent = 'Activating…';
                try {
                    const result = await post(`/api/user/skills/${skillId}/activate`, {
                        initial_hours: hours,
                    });
                    Store.addUserSkill({
                        skill_id: skillId,
                        total_xp: result.total_xp ?? 0,
                        current_level: result.level ?? 0,
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
                    showToast(err.message || 'Could not activate skill');
                    btn.disabled = false;
                    btn.textContent = 'Activate';
                }
            },
        });
    }

    function attachActivateHandlers(root) {
        root.querySelectorAll('.activate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const skillId = parseInt(btn.dataset.skillId);
                openActivateModal(skillId, btn);
            });
        });
    }

    /** Navigate to skill detail on card click (not on the activate button). */
    function bindCardClicks(root) {
        root.querySelectorAll('.explore-skill-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.activate-btn')) return;
                const slug = card.dataset.skillSlug;
                if (slug) {
                    history.pushState({}, '', `/app/skill/${slug}`);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                }
            });
        });
    }

    function renderSuggested() {
        const host = document.getElementById('explore-suggested');
        if (!host) return;

        // Need at least 3 activated skills with meaningful progress to suggest
        const active = Store.userSkills.filter(us => (us.current_level || 0) > 0);
        if (active.length < 3) { host.innerHTML = ''; return; }

        // Top-3 attributes by score
        const scored = Object.entries(Store.attributeScores || {})
            .map(([id, v]) => ({ id: parseInt(id), score: v }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
        if (scored.length === 0) { host.innerHTML = ''; return; }

        const rankWeight = [3, 2, 1];
        const weights = {};
        scored.forEach((a, i) => { weights[a.id] = rankWeight[i]; });

        // Score each non-activated, available skill
        const candidates = [];
        for (const s of Store.allSkills) {
            if (Store.isSkillActivated(s.id)) continue;
            if (!Store.canActivateSkill(s.id).can) continue;
            const maps = (Store.skillAttrMap || []).filter(m => m.skill_id == s.id);
            if (maps.length === 0) continue;
            let score = 0;
            for (const m of maps) {
                const w = weights[m.attribute_id];
                if (w) score += parseFloat(m.ratio) * w;
            }
            if (score > 0) candidates.push({ skill: s, score });
        }

        candidates.sort((a, b) => b.score - a.score);
        const top = candidates.slice(0, 6);
        if (top.length < 3) { host.innerHTML = ''; return; }

        const topAttrNames = scored
            .map(a => Store.getAttributeById(a.id)?.name)
            .filter(Boolean).join(', ');

        host.innerHTML = `
            <h3 class="suggested-title">Suggested for You</h3>
            <p class="suggested-desc">Based on your strongest attributes: ${escapeHtml(topAttrNames)}</p>
            <div class="suggested-grid">
                ${top.map(({ skill: s }) => renderExploreCard(s, { suggested: true })).join('')}
            </div>
        `;

        bindCardClicks(host);
        attachActivateHandlers(host);
    }

    // Load friends data once (for "N friends have this skill" indicator)
    if (!Store.friends || Store.friends.length === 0) {
        try {
            Store.friends = await get('/api/friends');
        } catch (err) {
            console.warn('Friends list fetch failed (indicator hidden):', err);
            Store.friends = [];
        }
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

// ─── Shared card renderer ────────────────────────────────────────────────────

/**
 * Render a single explore skill card.
 *
 * @param {Object}  s
 * @param {Object}  [opts]
 * @param {boolean} [opts.activated=false]
 * @param {boolean} [opts.available=true]
 * @param {string}  [opts.prereqText='']
 * @param {string}  [opts.friendsIndicator='']  Pre-built HTML string
 * @param {boolean} [opts.suggested=false]       Suggested cards omit meta/prereq rows
 */
function renderExploreCard(s, {
    activated = false,
    available = true,
    prereqText = '',
    friendsIndicator = '',
    suggested = false,
} = {}) {
    const stateClass = activated ? 'activated' : (!available ? 'locked' : '');
    return `
        <div class="explore-skill-card ${stateClass} ${suggested ? 'suggested' : ''}"
             data-skill-id="${s.id}" data-skill-slug="${s.slug || ''}" style="cursor:pointer">
            ${skillIconHtml(s.slug)}
            <div class="explore-skill-card__content">
                <div class="explore-skill-header">
                    <span class="explore-skill-name">${escapeHtml(s.name)}</span>
                    <span class="explore-skill-cat">${s.category || ''}</span>
                </div>
                <p class="explore-skill-desc">${escapeHtml(s.description || '')}</p>
                ${!suggested ? `
                    <div class="explore-skill-meta">
                        <span>Max Lv. ${s.max_level}</span>
                        ${parseFloat(s.xp_multiplier) !== 1 ? `<span>XP &times;${s.xp_multiplier}</span>` : ''}
                        ${friendsIndicator}
                    </div>
                    ${prereqText ? `<div class="explore-skill-prereq">Requires: ${escapeHtml(prereqText)}</div>` : ''}
                ` : ''}
                <div class="explore-skill-action">
                    ${activated
                        ? '<span class="badge-activated">Active</span>'
                        : available
                            ? `<button class="btn-fantasy btn-small btn-primary activate-btn" data-skill-id="${s.id}">Activate</button>`
                            : '<span class="badge-locked">Locked</span>'}
                </div>
            </div>
        </div>
    `;
}
