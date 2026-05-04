/**
 * Shared user/character row renderer.
 *
 * WHY THIS EXISTS
 * ---------------
 * The "search result" card (character_name + class_name + action) was copied
 * identically in friends.js (renderSearchResult) and guild/invite-search.js.
 * Both used the same CSS classes: .friend-search-result / .friend-search-result__info
 * Any styling or data change previously needed two edits.
 *
 * EXPORTS
 * -------
 * renderSearchResult(user, actionHTML)
 *   A search-result row: name, class (with class colour), plus caller-supplied action HTML.
 *   Used by both friend search and guild invite search.
 */
import { escapeHtml } from './html.js';

/**
 * Render a user search result row.
 *
 * @param {Object} user        - Must have: character_name, class_name, class_color
 * @param {string} actionHTML  - Ready-to-insert action HTML (button, badge, etc.)
 */
export function renderSearchResult(user, actionHTML) {
    return `
        <div class="friend-search-result">
            <div class="friend-search-result__info">
                <span class="friend-search-result__name">${escapeHtml(user.character_name)}</span>
                <span class="friend-search-result__class"
                      style="color:${user.class_color || 'inherit'}">${escapeHtml(user.class_name)}</span>
            </div>
            <div class="friend-search-result__action">${actionHTML}</div>
        </div>
    `;
}
