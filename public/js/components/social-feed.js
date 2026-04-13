/**
 * Social feed component (stub).
 * Displays own activity in the right panel. Will later include friends/guild.
 */
import { get } from '../api.js';

/**
 * Load and render activity feed into the feed container.
 */
export async function loadActivityFeed() {
    const container = document.getElementById('feed-content');
    if (!container) return;

    try {
        const activities = await get('/api/feed');

        if (!activities || activities.length === 0) {
            container.innerHTML = '<p class="feed-empty">No activity yet. Start logging progress to see updates here!</p>';
            return;
        }

        container.innerHTML = activities.slice(0, 20).map(a => {
            const leveledUp = a.level_after > a.level_before;
            const timeAgo = formatTimeAgo(new Date(a.logged_at));

            return `
                <div class="feed-item ${leveledUp ? 'feed-item--levelup' : ''}">
                    <div class="feed-item__header">
                        <span class="feed-item__skill">${escapeHtml(a.skill_name)}</span>
                        <span class="feed-item__time">${timeAgo}</span>
                    </div>
                    <div class="feed-item__body">
                        <span class="feed-item__xp">+${parseInt(a.xp_earned).toLocaleString()} XP</span>
                        <span class="feed-item__hours">${parseFloat(a.hours)}h logged</span>
                    </div>
                    ${leveledUp ? `<div class="feed-item__levelup">Level up! Lv. ${a.level_after}</div>` : ''}
                    ${a.note ? `<div class="feed-item__note">${escapeHtml(a.note)}</div>` : ''}
                </div>
            `;
        }).join('');
    } catch {
        container.innerHTML = '<p class="feed-empty">Could not load activity feed.</p>';
    }
}

function formatTimeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
