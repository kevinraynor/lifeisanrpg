/**
 * Dashboard page — character card + quote editing.
 * Skills logging has moved to the Skills page (/app/skills).
 */
import Store from '../store.js';
import { put } from '../api.js';
import { renderCharacterCard } from '../components/character-card.js';
import { escapeHtml } from '../utils/html.js';
import { showToast } from '../utils/toast.js';

export function renderDashboard(container) {
    const characterId = Store.character?.user_id || Store.user?.id;

    const card = renderCharacterCard({
        character: Store.character,
        skills: Store.userSkills,
        attributeScores: Store.attributeScores,
        isOwn: true,
        topN: 5,
    });

    container.innerHTML = `
        <div class="dashboard-character-section">
            <div class="dashboard-card-wrapper">
                ${card}
                ${characterId ? `
                    <button class="btn-share-icon" id="share-character-btn" title="Copy share link" aria-label="Share character">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                    </button>
                ` : ''}
            </div>
        </div>
    `;

    // Share button
    const shareBtn = document.getElementById('share-character-btn');
    if (shareBtn && characterId) {
        shareBtn.addEventListener('click', () => {
            const url = `${window.location.origin}/share/${characterId}`;
            navigator.clipboard.writeText(url).then(() => showToast('Link copied!'));
        });
    }

    // Quote inline editing
    const quoteArea = container.querySelector('.character-card__quote-area');
    if (quoteArea) {
        quoteArea.addEventListener('click', () => {
            if (quoteArea.querySelector('.quote-editor')) return;
            showQuoteEditor(quoteArea, container);
        });
    }
}

function showQuoteEditor(quoteArea, container) {
    const currentQuote = Store.character?.quote || '';

    quoteArea.innerHTML = `
        <div class="quote-editor">
            <textarea class="form-input quote-textarea" maxlength="200" placeholder="Add a short quote... (30 words max)">${escapeHtml(currentQuote)}</textarea>
            <div class="quote-editor-footer">
                <span class="quote-word-count" id="quote-wc">0 / 30 words</span>
                <div class="quote-editor-actions">
                    <button class="btn-fantasy btn-secondary btn-small" id="quote-cancel">Cancel</button>
                    <button class="btn-fantasy btn-primary btn-small" id="quote-save">Save</button>
                </div>
            </div>
            <div class="form-hint error" id="quote-error"></div>
        </div>
    `;

    const ta = quoteArea.querySelector('.quote-textarea');
    const wcEl = quoteArea.querySelector('#quote-wc');
    const saveBtn = quoteArea.querySelector('#quote-save');
    const errorEl = quoteArea.querySelector('#quote-error');

    function wordCount(str) {
        return str.trim() ? str.trim().split(/\s+/).length : 0;
    }
    function updateWc() {
        const wc = wordCount(ta.value);
        wcEl.textContent = `${wc} / 30 words`;
        saveBtn.disabled = wc > 30;
        errorEl.textContent = wc > 30 ? 'Quote cannot exceed 30 words.' : '';
    }

    ta.addEventListener('input', updateWc);
    updateWc();
    ta.focus();

    quoteArea.querySelector('#quote-cancel').addEventListener('click', () => {
        renderDashboard(container);
    });

    quoteArea.querySelector('#quote-save').addEventListener('click', async () => {
        const quote = ta.value.trim();
        if (wordCount(quote) > 30) return;

        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';

        try {
            await put('/api/character', { quote });
            if (Store.character) Store.character.quote = quote;
            renderDashboard(container);
        } catch (err) {
            errorEl.textContent = err.message || 'Failed to save quote.';
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
        }
    });
}
