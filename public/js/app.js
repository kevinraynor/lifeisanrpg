/**
 * Dashboard bootstrap.
 * Initializes Store from pre-loaded data, registers Router pages, loads feed.
 */
import Store from './store.js';
import Router from './router.js';
import { runPageCleanups } from './page-lifecycle.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderSkills } from './pages/skills.js';
import { renderExplore } from './pages/explore.js';
import { renderAttributes } from './pages/attributes.js';
import { renderSkillDetail } from './pages/skill-detail.js';
import { renderQuests } from './pages/quests.js';
import { renderFriends } from './pages/friends.js';
import { renderGuild } from './pages/guild.js';
import { renderSkillTree } from './pages/skill-tree.js';
import { loadActivityFeed } from './components/social-feed.js';
import { updateFriendBadge, updateGuildBadge } from './utils/badge.js';

// Initialize store from inline JSON
Store.init(window.__INITIAL_DATA__);

/**
 * Wrap a page render function so that any Store subscriptions registered by
 * the outgoing page (via addPageCleanup) are torn down before the new page
 * mounts. This prevents stale listeners from accumulating across navigations.
 */
function withCleanup(renderFn) {
    return (el) => {
        runPageCleanups();
        renderFn(el);
    };
}

// Register page routes
Router.on('dashboard', withCleanup(renderDashboard));
Router.on('skills',    withCleanup(renderSkills));
Router.on('explore',   withCleanup(renderExplore));
Router.on('attributes',withCleanup(renderAttributes));
Router.on('quests',    withCleanup(renderQuests));
Router.on('friends',   withCleanup(renderFriends));
Router.on('guild',     withCleanup(renderGuild));
Router.on('tree',      withCleanup(renderSkillTree));

// Skill detail: /app/skill/{slug}
Router.on('skill', withCleanup((el) => {
    const segments = window.location.pathname.replace(/^\/app\/?/, '').split('/').filter(Boolean);
    const skillSlug = segments[1];
    if (skillSlug) {
        renderSkillDetail(el, skillSlug);
    } else {
        el.innerHTML = '<p>Skill not found.</p>';
    }
}));

// Boot router (resolves initial URL)
Router.init('#dashboard-main');

// Sidebar notification badges — update on boot and reactively on every Store mutation
Store.on('pendingFriendCount', updateFriendBadge);
Store.on('pendingGuildInviteCount', updateGuildBadge);
updateFriendBadge();
updateGuildBadge();

// Load activity feed into right panel
loadActivityFeed();
