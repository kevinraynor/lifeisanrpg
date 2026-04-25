/**
 * Quests page — Daily / Weekly / Monthly quest system.
 */
import Store from '../store.js';
import { post, get } from '../api.js';
import { showLevelUp } from '../components/level-up.js';
import { esc } from '../utils/html.js';

const TABS = ['daily', 'weekly', 'monthly'];
const TAB_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
const DISPLAY_LIMITS = { daily: 5, weekly: 3, monthly: 3 };

let currentTab = 'daily';
let container = null;
let currentAvailable = [];
let loadingAvailable = false;

export function renderQuests(el) {
    container = el;
    currentTab = 'daily';
    currentAvailable = [];
    render();
    fetchAvailable(currentTab);
}

function render() {
    const quests = Store.quests;
    const multipliers = Store.questMultipliers;
    const limits = Store.questSlotLimits;

    const activeList = quests[currentTab] || [];
    const limit = limits[currentTab];
    const slotsUsed = activeList.length;
    const slotsLeft = limit - slotsUsed;
    const pct = Math.round((multipliers[currentTab] || 0) * 100);

    const tabsHtml = TABS.map(t => {
        const tList = quests[t] || [];
        const tLimit = limits[t];
        return `
            <button class="quests-tab${t === currentTab ? ' active' : ''}" data-tab="${t}">
                ${TAB_LABELS[t]}
                <span class="quests-tab__slot-info">${tList.length}/${tLimit}</span>
            </button>
        `;
    }).join('');

    // Active section
    let activeSectionHtml = '';
    if (activeList.length > 0) {
        activeSectionHtml = `
            <div class="quests-section">
                <div class="quests-section-header">
                    <h3 class="quests-section-title">Active Quests</h3>
                    <span class="quest-slot-counter">${slotsUsed}/${limit} slots</span>
                </div>
                ${activeList.map(q => renderQuestCard(q)).join('')}
            </div>
        `;
    }

    // Available section
    let availSectionHtml = '';
    if (slotsLeft > 0) {
        const showLimit = DISPLAY_LIMITS[currentTab];
        availSectionHtml = `
            <div class="quests-section">
                <div class="quests-section-header">
                    <h3 class="quests-section-title">Available Quests</h3>
                    <span class="quest-bonus-badge">+${pct}% XP bonus</span>
                </div>
                <p class="quest-avail-hint">${slotsLeft} slot${slotsLeft !== 1 ? 's' : ''} remaining — activate up to ${slotsLeft} quest${slotsLeft !== 1 ? 's' : ''} below</p>
                <div id="quests-available-list">
                    ${renderAvailableList()}
                </div>
            </div>
        `;
    } else if (activeList.length === 0) {
        availSectionHtml = `<p class="quests-empty">All ${TAB_LABELS[currentTab].toLowerCase()} quest slots used for this period.</p>`;
    }

    container.innerHTML = `
        <div class="quests-page">
            <div class="quests-header">
                <h2>Quests</h2>
            </div>
            <div class="quests-tabs">${tabsHtml}</div>
            <div class="quests-body" id="quests-body">
                ${activeSectionHtml}
                ${!activeList.length && slotsLeft > 0 ? '<p class="quests-active-empty">No active quests yet — pick one below.</p>' : ''}
                ${availSectionHtml}
            </div>
        </div>
    `;

    bindEvents();
}

function renderAvailableList() {
    if (loadingAvailable) return '<p class="quests-empty">Loading...</p>';
    if (currentAvailable.length === 0) return '<p class="quests-empty">No quest variations available for your activated skills.</p>';
    return currentAvailable.map(v => renderAvailableRow(v)).join('');
}

function renderQuestCard(q) {
    const progress = Math.min(1, (q.hours_in_period || 0) / (q.hours || 1));
    const fillPct = Math.round(progress * 100);
    const period = q.period;
    const bonusPreview = Math.floor(Store.hoursToXP(q.hours, 1.0) * (Store.questMultipliers[period] || 0));

    const statusClass = q.status === 'completed' ? 'quest-card--completed' : 'quest-card--pending';
    const pendingAttr = q.status === 'pending' ? `data-slug="${esc(q.skill_slug)}"` : '';

    let statusHtml;
    if (q.status === 'completed') {
        statusHtml = `
            <div class="quest-card__status quest-card__status--done">
                &#10003; +${q.bonus_xp.toLocaleString()} bonus XP earned
            </div>`;
    } else {
        statusHtml = `
            <div class="quest-card__actions">
                <span class="quest-card__meta">${(q.hours_in_period || 0).toFixed(2)}h / ${q.hours}h &nbsp;·&nbsp; +${bonusPreview.toLocaleString()} XP on completion</span>
            </div>`;
    }

    const iconHtml = q.skill_icon ? `<img src="${esc(q.skill_icon)}" class="quest-card__skill-icon" alt="">` : '';

    return `
        <div class="quest-card ${statusClass}" ${pendingAttr}>
            <div class="quest-card__body">
                <div class="quest-card__header">
                    ${iconHtml}
                    <span class="quest-card__skill">${esc(q.skill_name)}</span>
                    <span class="quest-card__title">${esc(q.name)}</span>
                </div>
                ${q.description ? `<p class="quest-card__desc">${esc(q.description)}</p>` : ''}
                <div class="quest-card__progress">
                    <div class="quest-card__progress-fill" style="width:${fillPct}%"></div>
                </div>
                ${statusHtml}
            </div>
        </div>
    `;
}

function renderAvailableRow(v) {
    const bonusPreview = Math.floor(Store.hoursToXP(v.hours, 1.0) * (Store.questMultipliers[currentTab] || 0));
    const iconHtml = v.skill_icon ? `<img src="${esc(v.skill_icon)}" class="quest-avail-icon" alt="">` : '';
    return `
        <div class="quest-avail-row">
            ${iconHtml}
            <div class="quest-avail-info">
                <span class="quest-avail-skill">${esc(v.skill_name)}</span>
                <span class="quest-avail-name">${esc(v.name)}</span>
                ${v.description ? `<span class="quest-avail-desc">${esc(v.description)}</span>` : ''}
            </div>
            <div class="quest-avail-meta">
                <span class="quest-avail-hours">${v.hours}h</span>
                <span class="quest-avail-bonus">+${bonusPreview.toLocaleString()} XP</span>
            </div>
            <button class="btn-fantasy btn-primary btn-small quest-activate-btn" data-variation-id="${v.id}">Activate</button>
        </div>
    `;
}

function bindEvents() {
    container.querySelectorAll('.quests-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.tab !== currentTab) {
                currentTab = btn.dataset.tab;
                currentAvailable = [];
                loadingAvailable = false;
                render();
                fetchAvailable(currentTab);
            }
        });
    });

    container.querySelectorAll('.quest-card--pending').forEach(card => {
        card.addEventListener('click', () => {
            const slug = card.dataset.slug;
            if (slug) {
                history.pushState({}, '', `/app/skill/${slug}`);
                window.dispatchEvent(new PopStateEvent('popstate'));
            }
        });
    });

    bindActivateButtons(container);
}

function bindActivateButtons(root) {
    root.querySelectorAll('.quest-activate-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleActivate(parseInt(btn.dataset.variationId), btn);
        });
    });
}

async function fetchAvailable(period) {
    loadingAvailable = true;
    refreshAvailableList();                // paint the "Loading..." state
    try {
        const data = await get(`/api/user/quests/available?period=${period}`);
        if (period !== currentTab) return;
        currentAvailable = data;
    } catch {
        currentAvailable = [];              // silent fail — show empty state
    } finally {
        loadingAvailable = false;
        refreshAvailableList();             // repaint with the results
    }
}

function refreshAvailableList() {
    const listEl = container?.querySelector('#quests-available-list');
    if (!listEl) return;
    listEl.innerHTML = renderAvailableList();
    bindActivateButtons(listEl);
}

async function handleActivate(variationId, btn) {
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    try {
        await post('/api/user/quests/activate', { variation_id: variationId });
        const fresh = await get('/api/user/quests');
        Store.setQuests(fresh);
        currentAvailable = currentAvailable.filter(v => v.id !== variationId);
        render();
        fetchAvailable(currentTab);
    } catch (err) {
        alert(err.message || 'Failed to activate quest');
        if (btn) { btn.disabled = false; btn.textContent = 'Activate'; }
    }
}
