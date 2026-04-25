/**
 * Reusable character card component.
 * Renders a character's avatar, name, class, quote, attributes, and top skills.
 */
import Store from '../store.js';
import { renderProgressBar } from './progress-bar.js';
import { escapeHtml } from '../utils/html.js';

/**
 * @param {Object} opts
 * @param {Object} opts.character
 * @param {Array}  opts.skills
 * @param {Object} opts.attributeScores
 * @param {boolean} opts.isOwn
 * @param {number}  opts.topN
 */
export function renderCharacterCard({ character, skills = [], attributeScores = {}, isOwn = true, topN = 5 }) {
    if (!character) {
        return '<div class="character-card"><p>No character found.</p></div>';
    }

    const imgUrl = character.gender === 'female'
        ? character.image_url_female
        : character.image_url_male;

    const attrValues = Object.values(attributeScores).filter(v => v > 0);
    const overallLevel = attrValues.length > 0
        ? Math.round(attrValues.reduce((a, b) => a + b, 0) / attrValues.length)
        : 0;

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

    const quote = character.quote || '';
    const quotePlaceholder = isOwn ? 'Click to add your motto...' : '';

    const quoteHTML = (quote || isOwn) ? `
        <div class="character-card__quote-area ${isOwn ? 'is-editable' : ''}" title="${isOwn ? 'Click to edit quote' : ''}">
            <p class="character-card__quote" data-quote="${escapeHtml(quote)}">
                ${quote
                    ? `<em>${escapeHtml(quote)}</em>`
                    : `<span class="character-card__quote-placeholder">${quotePlaceholder}</span>`}
            </p>
            ${isOwn ? '<span class="character-card__quote-edit-hint" aria-hidden="true">✎</span>' : ''}
        </div>
    ` : '';

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
                        ${quoteHTML}
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
