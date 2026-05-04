/**
 * Skills page — categorized skill cards with inline log forms.
 * Skill title navigates to the skill detail page.
 */
import Store from '../store.js';
import { post } from '../api.js';
import { renderProgressBar, animateAllBars, animateProgressBar } from '../components/progress-bar.js';
import { showLevelUp, showXPFloat } from '../components/level-up.js';
import { loadActivityFeed } from '../components/social-feed.js';
import { skillIconHtml } from '../components/skill-icon.js';
import { escapeHtml } from '../utils/html.js';
import { showToast } from '../utils/toast.js';

const CATEGORY_ICONS = {
    physical: '💪', mental: '🧠', creative: '🎨', technical: '⚙️',
    practical: '🔧', knowledge: '📚', social: '🤝',
};

const CATEGORY_LABELS = {
    physical: 'Physical', mental: 'Mental', creative: 'Creative',
    technical: 'Technical', practical: 'Practical', knowledge: 'Knowledge', social: 'Social',
};

export function renderSkills(container) {
    const userSkills = Store.getActiveUserSkills();

    if (userSkills.length === 0) {
        container.innerHTML = `
            <h2>Your Skills</h2>
            <p class="section-subtitle">No skills activated yet. <a href="/app/explore">Explore skills</a> to get started!</p>
        `;
        return;
    }

    const skillsByCategory = groupByCategory(userSkills);

    container.innerHTML = `
        <h2>Your Skills</h2>
        <p class="section-subtitle">Log hours to earn XP and level up. Click a skill name to view its full page.</p>
        <div id="skills-content">
            ${renderSkillsGrid(skillsByCategory)}
        </div>
    `;

    animateAllBars(container);

    container.querySelectorAll('.log-form').forEach(form => {
        form.addEventListener('submit', handleLogHours);
    });
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
    const slug = us.slug || us.skill_id;

    return `
        <div class="skill-card" data-skill-id="${us.skill_id}" id="skill-card-${us.skill_id}">
            <div class="skill-card__inner">
                ${skillIconHtml(us.slug)}
                <div class="skill-card__info">
                    <div class="skill-card__header">
                        <a class="skill-card__name skill-name-link" href="/app/skill/${escapeHtml(String(slug))}" data-slug="${escapeHtml(String(slug))}">${escapeHtml(us.name)}</a>
                        <span class="skill-card__level">Lv. ${level}</span>
                    </div>
                    <div class="skill-card__xp">${totalXP.toLocaleString()} / ${xpNext.toLocaleString()} XP</div>
                    <div class="skill-card__bar" id="bar-${us.skill_id}">
                        ${renderProgressBar(progress, true)}
                    </div>
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
    // Debounce double-submit: ignore rapid resubmissions while a request is in flight.
    if (form.dataset.submitting === '1') return;
    const skillId = parseInt(form.dataset.skillId);
    const skillName = form.dataset.skillName;
    const hoursInput = form.querySelector('.log-hours-input');
    const noteInput = form.querySelector('.log-note-input');
    const btn = form.querySelector('button[type="submit"]');
    const hours = parseFloat(hoursInput.value);

    if (!hours || hours <= 0 || hours > 24) return;

    form.dataset.submitting = '1';
    btn.disabled = true;
    btn.textContent = 'Logging…';

    const attrBefore = { ...Store.attributeScores };

    try {
        const result = await post(`/api/user/skills/${skillId}/log`, {
            hours,
            note: noteInput.value.trim(),
        });

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

        showXPFloat(btn, result.xp_earned);

        // Compute attribute diff for level-up modal
        const attrAfter = { ...Store.attributeScores };
        const attrDiff = {};
        for (const [id, val] of Object.entries(attrAfter)) {
            const diff = val - (attrBefore[id] || 0);
            if (diff > 0.01) {
                const attr = Store.allAttributes.find(a => a.id == id);
                if (attr) attrDiff[attr.name] = diff;
            }
        }

        // Handle quest completions
        const questsCompleted    = result.quests_completed        || [];
        const guildTallies       = result.guild_tallies_completed || [];
        const guildLevelUps      = result.guild_level_ups         || [];

        if (questsCompleted.length) {
            const completedById = Object.fromEntries(questsCompleted.map(c => [c.quest_id, c]));
            for (const period of ['daily', 'weekly', 'monthly']) {
                Store.quests[period] = (Store.quests[period] || []).map(q => {
                    const done = completedById[q.id];
                    return done
                        ? { ...q, status: 'completed', bonus_xp: done.bonus_xp, completed_at: new Date().toISOString() }
                        : q;
                });
            }
        }

        // Update guild XP/level in store if tallies completed
        if (guildTallies.length && Store.guild) {
            // Refresh guild snapshot after tally completion
            import('../api.js').then(({ get }) =>
                get('/api/guild').then(data => Store.setGuild(data)).catch(() => {})
            );
        }

        const hasGuildEvent = guildTallies.length > 0 || guildLevelUps.length > 0;

        if (result.leveled_up) {
            setTimeout(() => {
                showLevelUp(skillName, result.level_after, result.xp_earned, attrDiff, questsCompleted, guildTallies, guildLevelUps);
            }, 400);
        } else if (questsCompleted.length || hasGuildEvent) {
            setTimeout(() => {
                showLevelUp(skillName, result.level_after, result.xp_earned, {}, questsCompleted, guildTallies, guildLevelUps);
            }, 400);
        } else {
            // No celebration modal will fire — show a simple confirmation toast
            // so the user knows the log went through.
            showToast(`Logged ${hours}h to ${skillName}`, 'success');
        }

        // Refresh activity feed in the right panel
        loadActivityFeed();

        hoursInput.value = '';
        noteInput.value = '';
    } catch (err) {
        showToast(err.message || 'Failed to log hours', 'error');
    } finally {
        form.dataset.submitting = '';
        btn.disabled = false;
        btn.textContent = 'Log';
    }
}

// SPA navigation for skill name links — intercept clicks to avoid full page reload
document.addEventListener('click', (e) => {
    const link = e.target.closest('.skill-name-link');
    if (!link) return;
    e.preventDefault();
    const slug = link.dataset.slug;
    if (slug) {
        history.pushState({}, '', `/app/skill/${slug}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
    }
});
