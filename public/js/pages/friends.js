/**
 * Friends page — view friends, manage requests, add new friends.
 */
import { get, post, del } from '../api.js';
import Store from '../store.js';
import { updateFriendBadge } from '../utils/badge.js';
import { escapeHtml } from '../utils/html.js';
import { showToast } from '../utils/toast.js';
import { confirmModal } from '../utils/confirm-modal.js';
import { renderSearchResult } from '../utils/user-row.js';
import { renderLoading, renderLoadError, bindLoadErrorRetry } from '../components/loading.js';

export async function renderFriends(container) {
    container.innerHTML = `
        <div class="friends-page">
            <div class="friends-page__header">
                <h2>Friends</h2>
                <p class="section-subtitle">Your adventuring companions</p>
            </div>
            <div id="friends-loading">${renderLoading('Loading your friends…')}</div>
            <div id="friends-pending-section"></div>
            <div id="friends-grid-section"></div>
            <div id="friends-add-section"></div>
        </div>
    `;

    try {
        const [friends, pending] = await Promise.all([
            get('/api/friends').catch(e => { console.warn('Friends list failed:', e); return []; }),
            get('/api/friends/pending').catch(e => { console.warn('Pending list failed:', e); return []; }),
        ]);

        // Sync store
        Store.friends = friends;
        Store.setPendingFriendCount(pending.length);
        updateFriendBadge();

        document.getElementById('friends-loading').remove();

        renderPendingSection(pending, container);
        renderFriendsGrid(friends, container);
        renderAddFriendSection(container);
    } catch (e) {
        console.warn('Friends page load failed:', e);
        const loadingEl = document.getElementById('friends-loading');
        if (loadingEl) {
            loadingEl.innerHTML = renderLoadError('Could not load your friends.');
            bindLoadErrorRetry(loadingEl, () => renderFriends(container));
        }
    }
}

// ---------------------------------------------------------------------------
// Pending Requests
// ---------------------------------------------------------------------------

function renderPendingSection(pending, pageContainer) {
    const el = document.getElementById('friends-pending-section');
    if (!pending.length) { el.innerHTML = ''; return; }

    el.innerHTML = `
        <section class="friends-pending">
            <h3 class="friends-section-title">
                Pending Requests
                <span class="friend-badge friend-badge--inline">${pending.length}</span>
            </h3>
            <div class="friends-pending-list">
                ${pending.map(renderPendingCard).join('')}
            </div>
        </section>
    `;

    el.querySelectorAll('.btn-accept-request').forEach(btn => {
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            try {
                await post(`/api/friends/${btn.dataset.id}/accept`);
                renderFriends(pageContainer);
            } catch (e) {
                btn.disabled = false;
                showToast(e.message || 'Failed to accept');
            }
        });
    });

    el.querySelectorAll('.btn-decline-request').forEach(btn => {
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            try {
                await post(`/api/friends/${btn.dataset.id}/decline`);
                renderFriends(pageContainer);
            } catch (e) {
                btn.disabled = false;
                showToast(e.message || 'Failed to decline');
            }
        });
    });
}

function renderPendingCard(req) {
    const imgUrl = req.gender === 'female' ? req.image_url_female : req.image_url_male;
    return `
        <div class="friend-pending-card">
            <div class="friend-pending-card__avatar">
                ${imgUrl
                    ? `<img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(req.class_name)}">`
                    : `<span class="friend-pending-card__avatar-fallback">&#128100;</span>`}
            </div>
            <div class="friend-pending-card__info">
                <span class="friend-pending-card__name">${escapeHtml(req.character_name)}</span>
                <span class="friend-pending-card__class" style="color:${req.class_color || 'inherit'}">
                    ${escapeHtml(req.class_name)}
                </span>
            </div>
            <div class="friend-pending-card__actions">
                <button class="btn-fantasy btn-primary btn-small btn-accept-request"
                        data-id="${req.friendship_id}">Accept</button>
                <button class="btn-fantasy btn-secondary btn-small btn-decline-request"
                        data-id="${req.friendship_id}">Decline</button>
            </div>
        </div>
    `;
}

// ---------------------------------------------------------------------------
// Friends Grid
// ---------------------------------------------------------------------------

function renderFriendsGrid(friends, pageContainer) {
    const el = document.getElementById('friends-grid-section');

    if (!friends.length) {
        el.innerHTML = `
            <section class="friends-grid-section">
                <h3 class="friends-section-title">Your Friends</h3>
                <p class="friends-empty">
                    You have no friends yet. Search below to add your first adventuring companion!
                </p>
            </section>
        `;
        return;
    }

    el.innerHTML = `
        <section class="friends-grid-section">
            <h3 class="friends-section-title">Your Friends (${friends.length})</h3>
            <div class="friends-grid">
                ${friends.map(renderFriendCard).join('')}
            </div>
        </section>
    `;

    el.querySelectorAll('.btn-unfriend').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!await confirmModal(`Remove ${btn.dataset.name} from your friends?`, { confirmLabel: 'Unfriend', danger: true })) return;
            btn.disabled = true;
            try {
                await del(`/api/friends/${btn.dataset.id}`);
                // Clear friends cache so Explore re-fetches
                Store.friends = [];
                renderFriends(pageContainer);
            } catch (e) {
                btn.disabled = false;
                showToast(e.message || 'Failed to unfriend');
            }
        });
    });
}

function renderFriendCard(f) {
    const imgUrl    = f.gender === 'female' ? f.image_url_female : f.image_url_male;
    const activeDot = f.active_today
        ? `<span class="friend-card__active-badge" title="Active today"></span>`
        : '';
    const skillsHTML = (f.top_skills || []).map(s =>
        `<span class="friend-card__skill-tag">${escapeHtml(s.name)} <strong>Lv.${s.current_level}</strong></span>`
    ).join('');

    return `
        <div class="friend-card">
            <div class="friend-card__portrait">
                ${imgUrl
                    ? `<img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(f.class_name)}">`
                    : `<span class="friend-card__portrait-fallback">&#128100;</span>`}
                ${activeDot}
            </div>
            <div class="friend-card__body">
                <div class="friend-card__name">${escapeHtml(f.character_name)}</div>
                <div class="friend-card__class" style="color:${f.class_color || 'inherit'}">
                    Lv.${f.overall_level} &middot; ${escapeHtml(f.class_name)}
                </div>
                ${f.quote
                    ? `<p class="friend-card__quote"><em>${escapeHtml(f.quote)}</em></p>`
                    : ''}
                ${skillsHTML
                    ? `<div class="friend-card__skills">${skillsHTML}</div>`
                    : ''}
                <div class="friend-card__actions">
                    <a href="/share/${f.character_id}" target="_blank"
                       class="btn-fantasy btn-secondary btn-small">View Profile</a>
                    <button class="btn-fantasy btn-secondary btn-small btn-unfriend"
                            data-id="${f.friendship_id}"
                            data-name="${escapeHtml(f.character_name)}">Unfriend</button>
                </div>
            </div>
        </div>
    `;
}

// ---------------------------------------------------------------------------
// Add Friend
// ---------------------------------------------------------------------------

function renderAddFriendSection() {
    const el = document.getElementById('friends-add-section');
    el.innerHTML = `
        <section class="friends-add-section">
            <h3 class="friends-section-title">Add a Friend</h3>
            <div class="friends-search-bar">
                <input type="text" id="friend-search-input" class="form-input"
                       placeholder="Search by character name or email..."
                       autocomplete="off">
            </div>
            <div id="friend-search-results" class="friends-search-results"></div>
        </section>
    `;

    let debounceTimer;
    el.querySelector('#friend-search-input').addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => handleSearch(e.target.value.trim()), 300);
    });
}

async function handleSearch(q) {
    const results = document.getElementById('friend-search-results');
    if (!results) return;
    if (q.length < 2) { results.innerHTML = ''; return; }

    results.innerHTML = `<p class="friends-searching">Searching...</p>`;
    try {
        const data = await get(`/api/friends/search?q=${encodeURIComponent(q)}`);
        if (!data.length) {
            results.innerHTML = `<p class="friends-empty">No adventurers found for &ldquo;${escapeHtml(q)}&rdquo;.</p>`;
            return;
        }
        results.innerHTML = data.map(renderFriendSearchResult).join('');

        results.querySelectorAll('.btn-send-request').forEach(btn => {
            btn.addEventListener('click', async () => {
                const userId = parseInt(btn.dataset.userId);
                btn.disabled = true;
                btn.textContent = 'Sending…';
                try {
                    await post('/api/friends/request', { user_id: userId });
                    btn.textContent = 'Sent!';
                    btn.classList.remove('btn-primary');
                    btn.classList.add('btn-secondary');
                } catch (e) {
                    // Show a toast and restore the button so the user can retry —
                    // previously the error was burned into the button label and
                    // could render as a permanent "Sent!"-looking failure.
                    showToast(e.message || 'Could not send friend request', 'error');
                    btn.disabled = false;
                    btn.textContent = 'Add Friend';
                }
            });
        });
    } catch (e) {
        console.warn('Friend search failed:', e);
        results.innerHTML = `<p class="friends-empty">Search failed. Please try again.</p>`;
    }
}

function buildSearchResultAction(u) {
    if (u.friendship_status === 'accepted') return `<span class="badge-activated">Already friends</span>`;
    if (u.friendship_status === 'pending')  return `<span class="badge-locked">Pending</span>`;
    if (u.friendship_status === 'blocked')  return '';
    return `<button class="btn-fantasy btn-primary btn-small btn-send-request"
                    data-user-id="${u.user_id}">Add Friend</button>`;
}

function renderFriendSearchResult(u) {
    return renderSearchResult(u, buildSearchResultAction(u));
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

