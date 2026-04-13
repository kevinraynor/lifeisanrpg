/**
 * Dashboard page — character card + recent skills with XP logging.
 */
import Store from '../store.js';
import { post } from '../api.js';
import { renderCharacterCard } from '../components/character-card.js';
import { renderProgressBar, animateAllBars, animateProgressBar } from '../components/progress-bar.js';
import { showLevelUp, showXPFloat } from '../components/level-up.js';

export function renderDashboard(container) {
    const card = renderCharacterCard({
        character: Store.character,
        skills: Store.userSkills,
        attributeScores: Store.attributeScores,
        isOwn: true,
        topN: 5,
    });

    const recentSkills = Store.getRecentSkills(10);
    const recentHTML = recentSkills.length > 0
        ? recentSkills.map(us => renderSkillRow(us)).join('')
        : '<p class="text-muted">No skills activated yet. <a href="/app/explore">Explore skills</a> to get started!</p>';

    container.innerHTML = `
        <div class="dashboard-content">
            <div class="dashboard-card-section">
                ${card}
            </div>

            <div class="dashboard-skills-section">
                <h2>Recent Skills</h2>
                <p class="section-subtitle">Log hours to earn XP and level up your skills</p>
                <div class="skill-rows" id="skill-rows">
                    ${recentHTML}
                </div>
            </div>
        </div>
    `;

    // Animate progress bars
    animateAllBars(container);

    // Attach log-hours handlers
    container.querySelectorAll('.log-form').forEach(form => {
        form.addEventListener('submit', handleLogHours);
    });
}

function renderSkillRow(us) {
    const maxLevel = parseInt(us.max_level) || 250;
    const level = parseInt(us.current_level) || 0;
    const totalXP = parseInt(us.total_xp) || 0;
    const progress = Store.levelProgress(totalXP, maxLevel);
    const xpCurrent = Store.xpForLevel(level, maxLevel);
    const xpNext = Store.xpForLevel(level + 1, maxLevel);

    return `
        <div class="skill-log-row" data-skill-id="${us.skill_id}" id="skill-row-${us.skill_id}">
            <div class="skill-log-info">
                <div class="skill-log-header">
                    <span class="skill-log-name">${escapeHtml(us.name)}</span>
                    <span class="skill-log-category">${us.category || ''}</span>
                </div>
                <div class="skill-log-level">
                    <span>Level ${level} / ${maxLevel}</span>
                    <span class="skill-log-xp">${totalXP.toLocaleString()} / ${xpNext.toLocaleString()} XP</span>
                </div>
                <div class="skill-log-bar" id="bar-${us.skill_id}">
                    ${renderProgressBar(progress, true)}
                </div>
            </div>
            <form class="log-form" data-skill-id="${us.skill_id}" data-skill-name="${escapeHtml(us.name)}">
                <input type="number" class="form-input form-input--small log-hours-input"
                       min="0.25" max="24" step="0.25" placeholder="Hrs" required>
                <input type="text" class="form-input form-input--note log-note-input"
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

    try {
        const result = await post(`/api/user/skills/${skillId}/log`, {
            hours,
            note: noteInput.value.trim(),
        });

        // Update store
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

        // Update level/XP display
        const row = document.getElementById(`skill-row-${skillId}`);
        if (row) {
            const us = Store.getUserSkill(skillId);
            const skill = Store.getSkillById(skillId);
            const maxLevel = parseInt(skill?.max_level || us?.max_level) || 250;
            const xpNext = Store.xpForLevel(result.level_after + 1, maxLevel);
            const levelEl = row.querySelector('.skill-log-level');
            if (levelEl) {
                levelEl.innerHTML = `
                    <span>Level ${result.level_after} / ${maxLevel}</span>
                    <span class="skill-log-xp">${result.total_xp.toLocaleString()} / ${xpNext.toLocaleString()} XP</span>
                `;
            }
        }

        // Show XP float
        showXPFloat(btn, result.xp_earned);

        // Level up animation
        if (result.leveled_up) {
            setTimeout(() => {
                showLevelUp(skillName, result.level_after, result.xp_earned);
            }, 400);
        }

        // Update character card attribute scores
        const cardSection = document.querySelector('.dashboard-card-section');
        if (cardSection) {
            cardSection.innerHTML = renderCharacterCard({
                character: Store.character,
                skills: Store.userSkills,
                attributeScores: Store.attributeScores,
                isOwn: true,
                topN: 5,
            });
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
