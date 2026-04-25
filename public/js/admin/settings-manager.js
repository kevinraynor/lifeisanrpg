/**
 * Admin Settings Manager — quest bonus multipliers.
 */
import { get, put } from '../api.js';
import { esc } from '../utils/html.js';

export async function renderSettingsManager(container) {
    container.innerHTML = '<h1>Settings</h1><p>Loading...</p>';

    let settings = {};
    try {
        settings = await get('/api/admin/settings');
    } catch (err) {
        container.innerHTML = `<h1>Settings</h1><p class="form-error">${esc(err.message)}</p>`;
        return;
    }

    container.innerHTML = `
        <h1>Settings</h1>
        <p class="section-subtitle">Configure global app behaviour.</p>

        <form id="settings-form" class="admin-form admin-settings-form">
            <h3>Quest Bonus Multipliers</h3>

            <div class="form-group">
                <label class="form-label">Daily Quest Bonus Multiplier</label>
                <input type="number" class="form-input" name="quest_bonus_multiplier_daily"
                       value="${parseFloat(settings.quest_bonus_multiplier_daily || 0.5).toFixed(2)}"
                       step="0.05" min="0" max="5">
                <p class="form-hint">Extra XP on daily quest completion (0.5 = +50%).</p>
            </div>

            <div class="form-group">
                <label class="form-label">Weekly Quest Bonus Multiplier</label>
                <input type="number" class="form-input" name="quest_bonus_multiplier_weekly"
                       value="${parseFloat(settings.quest_bonus_multiplier_weekly || 0.75).toFixed(2)}"
                       step="0.05" min="0" max="5">
                <p class="form-hint">Extra XP on weekly quest completion (0.75 = +75%).</p>
            </div>

            <div class="form-group">
                <label class="form-label">Monthly Quest Bonus Multiplier</label>
                <input type="number" class="form-input" name="quest_bonus_multiplier_monthly"
                       value="${parseFloat(settings.quest_bonus_multiplier_monthly || 1.0).toFixed(2)}"
                       step="0.05" min="0" max="5">
                <p class="form-hint">Extra XP on monthly quest completion (1.0 = +100%).</p>
            </div>

            <div class="form-error" id="settings-error"></div>
            <div class="admin-form-actions">
                <button type="submit" class="btn-fantasy btn-primary">Save Settings</button>
            </div>
        </form>
    `;

    document.getElementById('settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const errorEl = document.getElementById('settings-error');
        const btn = form.querySelector('button[type="submit"]');

        btn.disabled = true;
        btn.textContent = 'Saving...';
        errorEl.textContent = '';

        try {
            await put('/api/admin/settings', {
                quest_bonus_multiplier_daily:   parseFloat(form.quest_bonus_multiplier_daily.value),
                quest_bonus_multiplier_weekly:  parseFloat(form.quest_bonus_multiplier_weekly.value),
                quest_bonus_multiplier_monthly: parseFloat(form.quest_bonus_multiplier_monthly.value),
            });
            btn.textContent = 'Saved!';
            setTimeout(() => { btn.disabled = false; btn.textContent = 'Save Settings'; }, 1500);
        } catch (err) {
            errorEl.textContent = err.message || 'Failed to save';
            btn.disabled = false;
            btn.textContent = 'Save Settings';
        }
    });
}
