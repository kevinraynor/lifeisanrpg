/**
 * Skills page — list of user's activated skills with hover tooltips.
 */
import Store from '../store.js';
import { renderProgressBar, animateAllBars } from '../components/progress-bar.js';

export function renderSkills(container) {
    const userSkills = Store.getActiveUserSkills();

    if (userSkills.length === 0) {
        container.innerHTML = `
            <h2>Your Skills</h2>
            <p>You haven't activated any skills yet. <a href="/app/explore" class="sidebar-nav-link" data-page="explore">Explore skills</a> to get started!</p>
        `;
        return;
    }

    // Group by category
    const grouped = {};
    for (const us of userSkills) {
        const cat = us.category || 'other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(us);
    }

    const categoryLabels = {
        physical: 'Physical', mental: 'Mental', creative: 'Creative',
        technical: 'Technical', practical: 'Practical', knowledge: 'Knowledge',
        social: 'Social', other: 'Other',
    };

    let html = '<h2>Your Skills</h2><p class="section-subtitle">Hover over a skill for details. Click to view full info.</p>';

    for (const [cat, skills] of Object.entries(grouped)) {
        // Sort by level descending
        skills.sort((a, b) => (b.current_level || 0) - (a.current_level || 0));

        html += `<div class="skills-group"><h3>${categoryLabels[cat] || cat}</h3><div class="skills-grid">`;

        for (const us of skills) {
            const level = parseInt(us.current_level) || 0;
            const maxLevel = parseInt(us.max_level) || 250;
            const totalXP = parseInt(us.total_xp) || 0;
            const progress = Store.levelProgress(totalXP, maxLevel);
            const attrs = Store.getSkillAttributeRatios(us.skill_id);
            const attrText = attrs.map(a => `${a.attribute?.name || ''} ${Math.round(parseFloat(a.ratio) * 100)}%`).join(', ');

            html += `
                <div class="skill-item" data-skill-id="${us.skill_id}"
                     data-tooltip-name="${escapeAttr(us.name)}"
                     data-tooltip-desc="${escapeAttr(us.description || '')}"
                     data-tooltip-cat="${us.category || ''}"
                     data-tooltip-attrs="${escapeAttr(attrText)}"
                     data-tooltip-max="${maxLevel}">
                    <div class="skill-item__icon">&#9733;</div>
                    <div class="skill-item__info">
                        <div class="skill-item__name">${escapeHtml(us.name)}</div>
                        <div class="skill-item__level">Lv. ${level} / ${maxLevel}</div>
                    </div>
                    <div class="skill-item__progress">
                        ${renderProgressBar(progress)}
                    </div>
                </div>
            `;
        }
        html += '</div></div>';
    }

    container.innerHTML = html;
    animateAllBars(container);
    attachTooltips(container);
    attachSkillClicks(container);
}

function attachTooltips(container) {
    let tooltip = document.getElementById('skill-tooltip-global');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'skill-tooltip-global';
        tooltip.className = 'skill-tooltip';
        document.body.appendChild(tooltip);
    }

    container.querySelectorAll('.skill-item[data-tooltip-name]').forEach(el => {
        el.addEventListener('mouseenter', (e) => {
            const name = el.dataset.tooltipName;
            const desc = el.dataset.tooltipDesc;
            const cat = el.dataset.tooltipCat;
            const attrs = el.dataset.tooltipAttrs;
            const maxLvl = el.dataset.tooltipMax;

            tooltip.innerHTML = `
                <div class="skill-tooltip__name">${name}</div>
                <div class="skill-tooltip__category">${cat} &middot; Max Lv. ${maxLvl}</div>
                ${desc ? `<div class="skill-tooltip__desc">${desc}</div>` : ''}
                ${attrs ? `<div class="skill-tooltip__attrs">Affects: ${attrs}</div>` : ''}
            `;

            const rect = el.getBoundingClientRect();
            tooltip.style.left = `${rect.right + 12}px`;
            tooltip.style.top = `${rect.top}px`;
            tooltip.classList.add('visible');
        });

        el.addEventListener('mouseleave', () => {
            tooltip.classList.remove('visible');
        });
    });
}

function attachSkillClicks(container) {
    container.querySelectorAll('.skill-item[data-skill-id]').forEach(el => {
        el.addEventListener('click', () => {
            const skillId = el.dataset.skillId;
            // Navigate to skill detail (via SPA router)
            import('../router.js').then(({ default: Router }) => {
                Router.navigate(`/app/skill/${skillId}`);
            });
        });
    });
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
