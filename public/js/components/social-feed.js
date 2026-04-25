/**
 * Social feed component.
 * Displays own activity and accepted friends' activity for today.
 * Friends' items include a cheer toggle button.
 * A banner at the top shows how many cheers your activities received today.
 */
import { get, post } from '../api.js';
import { escapeHtml } from '../utils/html.js';

export async function loadActivityFeed() {
    const container = document.getElementById('feed-content');
    if (!container) return;

    try {
        const activities = await get('/api/feed');

        if (!activities || activities.length === 0) {
            container.innerHTML = '<p class="feed-empty">No activity today yet. Start logging some hours!</p>';
            return;
        }

        // Banner: cheers received on own activities today
        const totalCheers = activities
            .filter(a => a.is_own)
            .reduce((sum, a) => sum + (a.cheer_count || 0), 0);

        const bannerHTML = totalCheers > 0
            ? `<div class="feed-cheer-banner">
                   &#10022; Your activities received
                   <strong>${totalCheers}</strong> cheer${totalCheers !== 1 ? 's' : ''} today!
               </div>`
            : '';

        container.innerHTML = bannerHTML + activities.map(renderFeedItem).join('');

        // Wire cheer buttons
        container.querySelectorAll('.btn-cheer').forEach(btn => {
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                try {
                    const res = await post(`/api/activities/${btn.dataset.id}/cheer`);
                    const item    = btn.closest('.feed-item');
                    const countEl = item.querySelector('.feed-item__cheer-count');
                    if (countEl) countEl.textContent = res.cheer_count;
                    btn.classList.toggle('btn-cheer--active', res.cheered);
                    btn.title = res.cheered ? 'Remove cheer' : 'Cheer this on!';
                } catch {
                    // silently restore
                } finally {
                    btn.disabled = false;
                }
            });
        });

    } catch {
        container.innerHTML = '<p class="feed-empty">Could not load activity feed.</p>';
    }
}

function renderFeedItem(a) {
    const leveledUp = a.level_after > a.level_before;
    const isFriend  = !a.is_own;
    const timeAgo   = formatTimeAgo(new Date(a.logged_at));

    const avatarHTML = isFriend
        ? `<div class="feed-item__avatar">
               <img src="/img/classes/${escapeHtml(a.class_slug)}-${escapeHtml(a.character_gender)}.webp"
                    alt="${escapeHtml(a.character_name)}"
                    onerror="this.style.display='none'">
           </div>`
        : '';

    const namePrefix = isFriend
        ? `<span class="feed-item__character">${escapeHtml(a.character_name)}</span>` +
          `<span class="feed-item__skill-sep">&middot;</span>`
        : '';

    // Cheer button on friend items; read-only count on own items
    const cheerHTML = isFriend
        ? `<button class="btn-cheer ${a.i_cheered ? 'btn-cheer--active' : ''}"
                   data-id="${a.id}"
                   title="${a.i_cheered ? 'Remove cheer' : 'Cheer this on!'}"
                   aria-label="Cheer">
               &#10022;
               <span class="feed-item__cheer-count">${a.cheer_count}</span>
           </button>`
        : (a.cheer_count > 0
            ? `<span class="feed-item__cheer-readonly">&#10022; ${a.cheer_count}</span>`
            : '');

    return `
        <div class="feed-item ${leveledUp ? 'feed-item--levelup' : ''} ${isFriend ? 'feed-item--friend' : ''}">
            ${avatarHTML}
            <div class="feed-item__content">
                <div class="feed-item__header">
                    <span class="feed-item__skill">${namePrefix}${escapeHtml(a.skill_name)}</span>
                    <span class="feed-item__time">${timeAgo}</span>
                </div>
                <div class="feed-item__body">
                    <span class="feed-item__xp">+${parseInt(a.xp_earned).toLocaleString()} XP</span>
                    <span class="feed-item__hours">${parseFloat(a.hours)}h</span>
                    ${cheerHTML}
                </div>
                ${leveledUp ? `<div class="feed-item__levelup">Level up! Lv.${a.level_after}</div>` : ''}
                ${a.note ? `<div class="feed-item__note">${escapeHtml(a.note)}</div>` : ''}
            </div>
        </div>
    `;
}

function formatTimeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}
