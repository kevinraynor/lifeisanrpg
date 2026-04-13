/**
 * Attributes page — breakdown of attribute scores and contributing skills.
 */
import Store from '../store.js';
import { renderProgressBar } from '../components/progress-bar.js';

export function renderAttributes(container) {
    const attributes = Store.allAttributes;
    const scores = Store.attributeScores;

    const maxScore = Math.max(1, ...Object.values(scores));

    const attrHTML = attributes.map(attr => {
        const score = scores[attr.id] || 0;
        const barPercent = (score / maxScore) * 100;

        // Find contributing skills
        const contributors = Store.skillAttrMap
            .filter(m => m.attribute_id == attr.id)
            .map(m => {
                const us = Store.getUserSkill(m.skill_id);
                if (!us || us.current_level == 0) return null;
                const skill = Store.getSkillById(m.skill_id);
                const contribution = Math.round(us.current_level * parseFloat(m.ratio));
                return { name: skill?.name || '?', level: us.current_level, ratio: m.ratio, contribution };
            })
            .filter(Boolean)
            .sort((a, b) => b.contribution - a.contribution);

        const contribHTML = contributors.length > 0
            ? contributors.slice(0, 5).map(c =>
                `<div class="contrib-row">
                    <span class="contrib-name">${c.name} (Lv. ${c.level})</span>
                    <span class="contrib-value">+${c.contribution}</span>
                </div>`
            ).join('')
            : '<p class="text-muted text-small">No contributing skills yet</p>';

        return `
            <div class="attribute-card card-ornate">
                <div class="attribute-header">
                    <span class="attribute-icon" style="color: ${attr.color || 'inherit'}">&#9670;</span>
                    <h3 class="attribute-name">${attr.name}</h3>
                    <span class="attribute-score">${score}</span>
                </div>
                <div class="attribute-bar">
                    ${renderProgressBar(barPercent)}
                </div>
                <p class="attribute-desc">${attr.description || ''}</p>
                <div class="attribute-contributors">
                    <h4>Top Contributors</h4>
                    ${contribHTML}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <h2>Attributes</h2>
        <p class="section-subtitle">Your attributes are derived from your skill levels</p>
        <div class="attributes-grid">${attrHTML}</div>
    `;
}
