/**
 * Notification badge utility.
 * Kept in a separate module to avoid circular imports
 * (friends.js → app.js → friends.js).
 */
import Store from '../store.js';

/**
 * Generic badge updater. Hides the element when count <= 0,
 * shows "9+" for anything above 9.
 */
export function updateBadge(elementId, count) {
    const badge = document.getElementById(elementId);
    if (!badge) return;
    const n = Math.max(0, Number(count) || 0);
    badge.textContent = n > 9 ? '9+' : String(n);
    badge.style.display = n > 0 ? 'inline-flex' : 'none';
}

export function updateFriendBadge() {
    updateBadge('friend-badge', Store.pendingFriendCount);
}

export function updateGuildBadge() {
    updateBadge('guild-badge', Store.pendingGuildInviteCount);
}
