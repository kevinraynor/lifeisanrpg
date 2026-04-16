/**
 * Dashboard page — character card + skill logging by category.
 */
import Store from '../store.js';
import { post } from '../api.js';
import { renderCharacterCard } from '../components/character-card.js';
import { renderProgressBar, animateAllBars, animateProgressBar } from '../components/progress-bar.js';
import { showLevelUp, showXPFloat } from '../components/level-up.js';

const CATEGORY_ICONS = {
    physical: '💪', mental: '🧠', creative: '🎨', technical: '⚙️',
    practical: '🔧', knowledge: '📚', social: '🤝',
};

const CATEGORY_LABELS = {
    physical: 'Physical', mental: 'Mental', creative: 'Creative',
    technical: 'Technical', practical: 'Practical', knowledge: 'Knowledge', social: 'Social',
};

export function renderDashboard(container) {
    const card = renderCharacterCard({
        character: Store.character,
        skills: Store.userSkills,
        attributeScores: Store.attributeScores,
        isOwn: true,
        topN: 5,
    });

    // Group activated skills by category
    const skillsByCategory = groupByCategory(Store.userSkills);
    const hasSkills = Store.userSkills.length > 0;

    const skillsHTML = hasSkills
        ? renderSkillsGrid(skillsByCategory)
        : '<p class="text-muted">No skills activated yet. <a href="/app/explore">Explore skills</a> to get started!</p>';

    const characterId = Store.character?.user_id || Store.user?.id;

    container.innerHTML = `
        <div class="dashboard-content">
            <div class="dashboard-card-section">
                ${card}
                <div class="dashboard-share-row">
                    <button class="btn-fantasy btn-secondary btn-small" id="share-character-btn">
                        &#128279; Share Character
                    </button>
                    <span class="share-toast" id="share-toast">Link copied!</span>
                </div>
            </div>

            <div class="dashboard-skills-section">
                <h2>Your Skills</h2>
                <p class="section-subtitle">Log hours to earn XP and level up your skills</p>
                <div id="skills-content">
                    ${skillsHTML}
                </div>
            </div>
        </div>
    `;

    animateAllBars(container);

    // Attach log-hours handlers
    container.querySelectorAll('.log-form').forEach(form => {
        form.addEventListener('submit', handleLogHours);
    });

    // Share button
    const shareBtn = document.getElementById('share-character-btn');
    if (shareBtn && characterId) {
        shareBtn.addEventListener('click', () => {
            const url = `${window.location.origin}/share/${characterId}`;
            navigator.clipboard.writeText(url).then(() => {
                const toast = document.getElementById('share-toast');
                if (toast) {
                    toast.classList.add('visible');
                    setTimeout(() => toast.classList.remove('visible'), 2500);
                }
            });
        });
    }
}

function groupByCategory(skills) {
    const order = ['physical', 'mental', 'creative', 'technical', 'practical', 'knowledge', 'social'];
    const groups = {};
    for (const cat of order) groups[cat] = [];
    for (const s of skills) {
        const cat = s.category || 'other';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(s);
    }
    // Remove empty categories
    return Object.fromEntries(Object.entries(groups).filter(([, arr]) => arr.length > 0));
}

function renderSkillsGrid(skillsByCategory) {
    return Object.entries(skillsByCategory).map(([cat, skills]) => `
        <div class="skills-category-section">
            <h3 class="skills-category-title">
                <span class="skills-category-icon">${CATEGORY_ICONS[cat] || '⭐'}</span>
                ${CATEGORY_LABELS[cat] || cat}
            </h3>
            <div class="skills-category-grid">
                ${skills.map(us => renderSkillCard(us)).join('')}
            </div>
        </div>
    `).join('');
}

function renderSkillCard(us) {
    const maxLevel = parseInt(us.max_level) || 250;
    const level = parseInt(us.current_level) || 0;
    const totalXP = parseInt(us.total_xp) || 0;
    const progress = Store.levelProgress(totalXP, maxLevel);
    const xpNext = Store.xpForLevel(level + 1, maxLevel);

    return `
        <div class="skill-card" data-skill-id="${us.skill_id}" id="skill-card-${us.skill_id}">
            <div class="skill-card__info">
                <div class="skill-card__header">
                    <span class="skill-card__name">${escapeHtml(us.name)}</span>
                    <span class="skill-card__level">Lv. ${level}</span>
                </div>
                <div class="skill-card__xp">${totalXP.toLocaleString()} / ${xpNext.toLocaleString()} XP</div>
                <div class="skill-card__bar" id="bar-${us.skill_id}">
                    ${renderProgressBar(progress, true)}
                </div>
            </div>
            <form class="log-form log-form--stacked" data-skill-id="${us.skill_id}" data-skill-name="${escapeHtml(us.name)}">
                <input type="number" class="form-input log-hours-input"
                       min="0.25" max="24" step="0.25" placeholder="Hours" required>
                <input type="text" class="form-input log-note-input"
                       placeholder="Note (optional)" maxlength="255">
                <button type="submit" class="btn-fantasy btn-primary btn-small">Log</button>
            </form>
        </div>
    `;
}

async function handleLogHours(e) {
    e.preventDefault();
    const form = e.target;
    const skillId = parseInt(form.dataset.skillId);
    const skillName = form.dataset.skillName;
    const hoursInput = form.querySelector('.log-hours-input');
    const noteInput = form.querySelector('.log-note-input');
    const btn = form.querySelector('button[type="submit"]');
    const hours = parseFloat(hoursInput.value);

    if (!hours || hours <= 0 || hours > 24) return;

    btn.disabled = true;
    btn.textContent = '...';

    // Snapshot attribute scores before update
    const attrBefore = { ...Store.attributeScores };

    try {
        const result = await post(`/api/user/skills/${skillId}/log`, {
            hours,
            note: noteInput.value.trim(),
        });

        // Update store (triggers attribute score recomputation)
        Store.updateUserSkill(skillId, {
            total_xp: result.total_xp,
            current_level: result.level_after,
            last_logged: new Date().toISOString(),
        });

        // Animate progress bar
        const barContainer = document.getElementById(`bar-${skillId}`);
        if (barContainer) {
            const bar = barContainer.querySelector('.progress-bar');
            if (bar) animateProgressBar(bar, result.progress);
        }

        // Update level/XP display inline
        const card = document.getElementById(`skill-card-${skillId}`);
        if (card) {
            const us = Store.getUserSkill(skillId);
            const skill = Store.getSkillById(skillId);
            const maxLevel = parseInt(skill?.max_level || us?.max_level) || 250;
            const xpNext = Store.xpForLevel(result.level_after + 1, maxLevel);
            const lvlEl = card.querySelector('.skill-card__level');
            const xpEl = card.querySelector('.skill-card__xp');
            if (lvlEl) lvlEl.textContent = `Lv. ${result.level_after}`;
            if (xpEl) xpEl.textContent = `${result.total_xp.toLocaleString()} / ${xpNext.toLocaleString()} XP`;
        }

        // Show XP float
        showXPFloat(btn, result.xp_earned);

        // Compute attribute diff
        const attrAfter = { ...Store.attributeScores };
        const attrDiff = {};
        for (const [id, val] of Object.entries(attrAfter)) {
            const diff = val - (attrBefore[id] || 0);
            if (diff > 0.01) {
                const attr = Store.allAttributes.find(a => a.id == id);
                if (attr) attrDiff[attr.name] = diff;
            }
        }

        // Level up animation with attribute diff
        if (result.leveled_up) {
            setTimeout(() => {
                showLevelUp(skillName, result.level_after, result.xp_earned, attrDiff);
            }, 400);
        }

        // Re-render character card
        const existingCard = document.querySelector('.dashboard-card-section .character-card');
        if (existingCard) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = renderCharacterCard({
                character: Store.character,
                skills: Store.userSkills,
                attributeScores: Store.attributeScores,
                isOwn: true,
                topN: 5,
            });
            existingCard.replaceWith(tempDiv.firstElementChild);
        }

        // Reset form
        hoursInput.value = '';
        noteInput.value = '';
    } catch (err) {
        alert(err.message || 'Failed to log hours');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Log';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
