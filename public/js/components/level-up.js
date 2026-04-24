/**
 * Level-up animation overlay.
 */

let overlay = null;

/**
 * Show a level-up celebration.
 * @param {string} skillName - Name of the skill that leveled up
 * @param {number} newLevel - The new level reached
 * @param {number} xpEarned - XP earned this session
 * @param {Object} attrDiff - Map of attribute name → points gained (optional)
 */
export function showLevelUp(skillName, newLevel, xpEarned, attrDiff = {}, bonusQuests = [], guildTallies = [], guildLevelUps = []) {
    // Remove existing overlay if any
    if (overlay) overlay.remove();

    const attrChanges = Object.entries(attrDiff).filter(([, v]) => v > 0.01);
    const attrsHTML = attrChanges.length > 0
        ? `<div class="level-up-attrs">${attrChanges.map(([name, val]) =>
            `<span class="level-up-attr">▲ ${name} +${Math.round(val)}</span>`
          ).join('')}</div>`
        : '';

    const questsHTML = bonusQuests.length > 0
        ? `<div class="level-up-quests">${bonusQuests.map(q =>
            `<span class="quest-bonus-chip">&#10022; ${escapeHtml(q.period.charAt(0).toUpperCase() + q.period.slice(1))} quest! +${q.bonus_xp.toLocaleString()} XP &mdash; ${escapeHtml(q.name)}</span>`
          ).join('')}</div>`
        : '';

    const guildTalliesHTML = guildTallies.length > 0
        ? `<div class="level-up-guild-tallies">${guildTallies.map(t =>
            `<span class="guild-tally-chip">&#127984; Guild tally complete! +${t.bonus_xp.toLocaleString()} guild XP &mdash; ${escapeHtml(t.name)}</span>`
          ).join('')}</div>`
        : '';

    const guildLevelHTML = guildLevelUps.length > 0
        ? `<div class="level-up-guild-levels">${guildLevelUps.map(lu =>
            `<span class="guild-level-chip">&#9650; Guild reached Level ${lu.to}!</span>`
          ).join('')}</div>`
        : '';

    // Use "Bonus Rewards" heading when only quest/guild events fired (no skill level-up)
    const hasSkillLevelUp = skillName && newLevel > 0;
    const headline = hasSkillLevelUp
        ? `<h2>Level Up!</h2><p class="level-up-skill">${escapeHtml(skillName)}</p><div class="level-number">${newLevel}</div><p class="level-up-xp">+${xpEarned.toLocaleString()} XP</p>`
        : `<h2>Bonus Rewards!</h2><p class="level-up-xp">+${xpEarned.toLocaleString()} XP</p>`;

    overlay = document.createElement('div');
    overlay.className = 'level-up-overlay';
    overlay.innerHTML = `
        <div class="level-up-content">
            <div class="level-up-stars">&#10029; &#10029; &#10029;</div>
            ${headline}
            ${attrsHTML}
            ${questsHTML}
            ${guildTalliesHTML}
            ${guildLevelHTML}
            <button class="btn-fantasy btn-primary level-up-close">Continue</button>
        </div>
    `;

    document.body.appendChild(overlay);

    // Trigger animation
    requestAnimationFrame(() => {
        overlay.classList.add('visible');
    });

    // Close handlers
    const closeBtn = overlay.querySelector('.level-up-close');
    closeBtn.addEventListener('click', closeLevelUp);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeLevelUp();
    });
}

function closeLevelUp() {
    if (overlay) {
        overlay.classList.remove('visible');
        setTimeout(() => {
            overlay.remove();
            overlay = null;
        }, 300);
    }
}

/**
 * Show a floating +XP indicator near an element.
 * @param {HTMLElement} anchorEl - Element to float near
 * @param {number} xp - XP amount
 */
export function showXPFloat(anchorEl, xp) {
    const rect = anchorEl.getBoundingClientRect();
    const floater = document.createElement('div');
    floater.className = 'xp-float';
    floater.textContent = `+${xp.toLocaleString()} XP`;
    floater.style.left = `${rect.left + rect.width / 2}px`;
    floater.style.top = `${rect.top}px`;
    document.body.appendChild(floater);

    setTimeout(() => floater.remove(), 1500);
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
