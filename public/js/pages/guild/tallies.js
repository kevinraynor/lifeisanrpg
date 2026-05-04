/**
 * Guild tally rendering and activation.
 */
import { get, post } from '../../api.js';
import { escapeHtml } from '../../utils/html.js';
import { showToast } from '../../utils/toast.js';
import { renderProgressBar } from '../../components/progress-bar.js';

/**
 * Lazy-load and render the available-tallies list for officers.
 * @param {HTMLElement} container
 * @param {Function}    refresh   - async () => void
 */
export async function loadAvailableTallies(container, refresh) {
    const el = container.querySelector('#guild-avail-tallies-list');
    if (!el) return;
    try {
        const rows = await get('/api/guild/tallies/available');
        if (!rows.length) {
            el.innerHTML = `<p class="guild-empty">All tallies for this period are already active.</p>`;
            return;
        }
        const byPeriod = {
            weekly:  rows.filter(r => r.period === 'weekly'),
            monthly: rows.filter(r => r.period === 'monthly'),
        };
        el.innerHTML = ['weekly', 'monthly'].map(period => {
            if (!byPeriod[period].length) return '';
            return `
                <div class="guild-avail-period">
                    <p class="guild-avail-period__label">${period.charAt(0).toUpperCase() + period.slice(1)}</p>
                    ${byPeriod[period].map(r => `
                        <div class="guild-avail-row">
                            <div class="guild-avail-row__info">
                                <span class="guild-avail-row__name">${escapeHtml(r.name)}</span>
                                <span class="guild-avail-row__meta">
                                    ${r.base_hours_per_member}h/member &middot; +${r.bonus_xp.toLocaleString()} guild XP
                                    ${r.description ? `&middot; ${escapeHtml(r.description)}` : ''}
                                </span>
                            </div>
                            <button class="btn-fantasy btn-primary btn-small btn-activate-tally"
                                    data-id="${r.id}">Activate</button>
                        </div>
                    `).join('')}
                </div>
            `;
        }).join('');

        el.querySelectorAll('.btn-activate-tally').forEach(btn => {
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                btn.textContent = 'Activating…';
                try {
                    await post('/api/guild/tallies/activate', { variation_id: parseInt(btn.dataset.id) });
                    await refresh();
                } catch (err) {
                    showToast(err.message || 'Failed to activate tally');
                    btn.disabled = false;
                    btn.textContent = 'Activate';
                }
            });
        });
    } catch (err) {
        console.warn('Available tallies fetch failed:', err);
        el.innerHTML = `<p class="guild-empty">Could not load available tallies.</p>`;
    }
}

/**
 * Render a single active tally card.
 * @param {Object} t - Tally object from API
 */
export function renderTallyCard(t) {
    const pct  = t.target_hours > 0
        ? Math.min(100, (t.hours_logged / t.target_hours * 100)).toFixed(1)
        : 0;
    const done = t.status === 'completed';
    return `
        <div class="guild-tally-card${done ? ' guild-tally-card--done' : ''}">
            <div class="guild-tally-card__header">
                <span class="guild-tally-card__name">${escapeHtml(t.name)}</span>
                <span class="guild-tally-card__period">${t.period}</span>
                ${done ? `<span class="badge-activated">&#10003; Complete</span>` : ''}
            </div>
            ${t.description ? `<p class="guild-tally-card__desc">${escapeHtml(t.description)}</p>` : ''}
            <div class="guild-tally-card__progress">
                ${renderProgressBar(pct)}
                <span class="guild-tally-card__hours">
                    ${t.hours_logged.toFixed(1)}h / ${t.target_hours.toFixed(1)}h
                    ${done
                        ? `&middot; +${t.xp_awarded.toLocaleString()} guild XP awarded`
                        : `&middot; +${t.bonus_xp.toLocaleString()} guild XP on completion`}
                </span>
            </div>
        </div>
    `;
}
