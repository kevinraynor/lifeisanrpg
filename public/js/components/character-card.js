/**
 * Reusable character card component.
 * Renders a character's avatar, name, class, attributes, and top skills.
 */
import Store from '../store.js';
import { renderProgressBar } from './progress-bar.js';

/**
 * Render a character card.
 * @param {Object} opts
 * @param {Object} opts.character - Character data
 * @param {Array} opts.skills - User skills array
 * @param {Object} opts.attributeScores - {attr_id: score}
 * @param {boolean} opts.isOwn - Whether this is the logged-in user's card
 * @param {number} opts.topN - Number of top skills to show
 * @returns {string} HTML string
 */
export function renderCharacterCard({ character, skills = [], attributeScores = {}, isOwn = true, topN = 5 }) {
    if (!character) {
        return '<div class="character-card"><p>No character found.</p></div>';
    }

    const imgUrl = character.gender === 'female'
        ? character.image_url_female
        : character.image_url_male;

    // Compute overall level (average of top attribute scores, rough approximation)
    const attrValues = Object.values(attributeScores).filter(v => v > 0);
    const overallLevel = attrValues.length > 0
        ? Math.round(attrValues.reduce((a, b) => a + b, 0) / attrValues.length)
        : 0;

    // Attributes display
    const attributes = Store.allAttributes || [];
    const attrHTML = attributes.map(attr => {
        const score = attributeScores[attr.id] || 0;
        return `
            <div class="stat-row">
                <span class="stat-icon" style="color: ${attr.color || 'inherit'}">&#9670;</span>
                <span class="stat-name">${attr.name}</span>
                <span class="stat-value">${score}</span>
            </div>
        `;
    }).join('');

    // Top skills
    const topSkills = [...skills]
        .sort((a, b) => (b.current_level || 0) - (a.current_level || 0))
        .slice(0, topN);

    const skillsHTML = topSkills.map(us => {
        const maxLevel = parseInt(us.max_level) || 250;
        const level = parseInt(us.current_level) || 0;
        const progress = Store.levelProgress(parseInt(us.total_xp) || 0, maxLevel);
        return `
            <div class="card-skill-row">
                <div class="card-skill-info">
                    <span class="card-skill-name">${us.name}</span>
                    <span class="card-skill-level">Lv. ${level}</span>
                </div>
                ${renderProgressBar(progress)}
            </div>
        `;
    }).join('');

    return `
        <div class="character-card">
            ${imgUrl ? `<div class="character-card__portrait">
                <img src="${imgUrl}" alt="${character.class_name}" onerror="this.parentElement.style.display='none'">
            </div>` : ''}
            <div class="character-card__body">
                <div class="character-card__header">
                    <div class="character-card__info">
                        <h3 class="character-card__name">${escapeHtml(character.name)}</h3>
                        <p class="character-card__class" style="color: ${character.class_color || 'inherit'}">
                            Level ${overallLevel} &middot; ${escapeHtml(character.class_name || 'Adventurer')}
                        </p>
                    </div>
                </div>

                <div class="character-card__stats">
                    <h4>Attributes</h4>
                    ${attrHTML}
                </div>

                ${topSkills.length > 0 ? `
                    <div class="character-card__skills">
                        <h4>Top Skills</h4>
                        ${skillsHTML}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
