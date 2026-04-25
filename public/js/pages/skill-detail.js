/**
 * Skill detail page — full skill info with extended content.
 */
import Store from '../store.js';
import { get } from '../api.js';
import { renderProgressBar } from '../components/progress-bar.js';
import { escapeHtml } from '../utils/html.js';

export async function renderSkillDetail(container, skillSlug) {
    container.innerHTML = '<p>Loading skill details...</p>';

    try {
        // Accept slug (string) or legacy numeric id
        const endpoint = /^\d+$/.test(skillSlug)
            ? `/api/skills/${skillSlug}`
            : `/api/skills/by-slug/${skillSlug}`;
        const skill = await get(endpoint);
        // Support lookup by either slug or id for userSkill
        const userSkill = Store.getUserSkill(skill.id) || Store.getUserSkill(skillSlug);
        const skillId = skill.id;
        const level = userSkill ? parseInt(userSkill.current_level) || 0 : null;
        const totalXP = userSkill ? parseInt(userSkill.total_xp) || 0 : 0;
        const maxLevel = parseInt(skill.max_level) || 250;
        const progress = userSkill ? Store.levelProgress(totalXP, maxLevel) : 0;

        const attrsHTML = (skill.attributes || []).map(a =>
            `<span class="detail-attr-badge">${a.attribute_name} ${Math.round(parseFloat(a.ratio) * 100)}%</span>`
        ).join('');

        const prereqsHTML = (skill.prerequisites || []).map(p =>
            `<span class="detail-prereq">${p.required_skill_name} Lv. ${p.required_level}</span>`
        ).join(', ');

        // Extended content
        let extendedHTML = '';
        if (skill.body_markdown) {
            extendedHTML += `<div class="skill-detail-body">${simpleMarkdown(skill.body_markdown)}</div>`;
        }
        if (skill.tips && skill.tips.length > 0) {
            extendedHTML += `<div class="skill-detail-tips"><h3>Tips</h3><ul>${skill.tips.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul></div>`;
        }
        if (skill.celebrities && skill.celebrities.length > 0) {
            extendedHTML += `<div class="skill-detail-celebrities"><h3>Notable Practitioners</h3>${skill.celebrities.map(c => `<div class="celebrity-item"><strong>${escapeHtml(c.name)}</strong> — ${escapeHtml(c.description || '')}</div>`).join('')}</div>`;
        }
        if (skill.resources && skill.resources.length > 0) {
            extendedHTML += `<div class="skill-detail-resources"><h3>Resources</h3><ul>${skill.resources.map(r => `<li><a href="${escapeHtml(r.url)}" target="_blank">${escapeHtml(r.title)}</a></li>`).join('')}</ul></div>`;
        }

        container.innerHTML = `
            <div class="skill-detail fade-in">
                <button class="btn-fantasy btn-secondary btn-small back-btn" id="skill-back">&#8592; Back</button>

                <div class="skill-detail-header">
                    <h2>${escapeHtml(skill.name)}</h2>
                    <span class="skill-detail-category">${skill.category || ''} &middot; Max Level ${maxLevel}</span>
                </div>

                ${userSkill ? `
                    <div class="skill-detail-progress card-ornate">
                        <div class="skill-detail-level">
                            <span>Level ${level}</span>
                            <span>${totalXP.toLocaleString()} XP</span>
                        </div>
                        ${renderProgressBar(progress)}
                    </div>
                ` : '<p class="text-muted">You haven\'t activated this skill yet.</p>'}

                <div class="skill-detail-info">
                    <p>${escapeHtml(skill.description || '')}</p>
                    ${attrsHTML ? `<div class="skill-detail-attrs"><strong>Attributes:</strong> ${attrsHTML}</div>` : ''}
                    ${prereqsHTML ? `<div class="skill-detail-prereqs"><strong>Prerequisites:</strong> ${prereqsHTML}</div>` : ''}
                    ${parseFloat(skill.xp_multiplier) !== 1 ? `<div class="skill-detail-mult"><strong>XP Multiplier:</strong> &times;${skill.xp_multiplier}</div>` : ''}
                </div>

                ${extendedHTML}
            </div>
        `;

        document.getElementById('skill-back').addEventListener('click', () => {
            history.back();
        });
    } catch (err) {
        container.innerHTML = `<p class="form-error">Could not load skill: ${escapeHtml(err.message)}</p>`;
    }
}

function simpleMarkdown(md) {
    // Very basic Markdown to HTML (headings, paragraphs, bold, italic, links, lists)
    let html = escapeHtml(md);
    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    return html;
}
