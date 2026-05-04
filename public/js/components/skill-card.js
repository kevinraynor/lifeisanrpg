/**
 * Shared skill card renderers.
 *
 * WHY THIS EXISTS
 * ---------------
 * "Name + Level + Progress bar" for an activated skill was reimplemented
 * independently in character-card.js and was at risk of diverging further.
 * Any change to how a compact skill row looks (label text, icon, etc.) now
 * happens once here.
 *
 * EXPORTS
 * -------
 * renderSkillRow(us)
 *   Compact row: skill name, level badge, and a progress bar.
 *   Used inside the character card's "Top Skills" section.
 *   CSS classes: card-skill-row / card-skill-info / card-skill-name / card-skill-level
 */
import Store from '../store.js';
import { renderProgressBar } from './progress-bar.js';
import { escapeHtml } from '../utils/html.js';

/**
 * Render a compact skill row (name + level + progress bar).
 *
 * @param {Object} us - A user_skill row with: name, current_level, total_xp, max_level
 */
export function renderSkillRow(us) {
    const maxLevel = parseInt(us.max_level) || 250;
    const level    = parseInt(us.current_level) || 0;
    const progress = Store.levelProgress(parseInt(us.total_xp) || 0, maxLevel);

    return `
        <div class="card-skill-row">
            <div class="card-skill-info">
                <span class="card-skill-name">${escapeHtml(us.name)}</span>
                <span class="card-skill-level">Lv. ${level}</span>
            </div>
            ${renderProgressBar(progress)}
        </div>
    `;
}
