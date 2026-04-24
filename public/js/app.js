/**
 * Dashboard bootstrap.
 * Initializes Store from pre-loaded data, registers Router pages, loads feed.
 */
import Store from './store.js';
import Router from './router.js';
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

// Register page routes
Router.on('dashboard', (el) => renderDashboard(el));
Router.on('skills', (el) => renderSkills(el));
Router.on('explore', (el) => renderExplore(el));
Router.on('attributes', (el) => renderAttributes(el));
Router.on('quests', (el) => renderQuests(el));
Router.on('friends', (el) => renderFriends(el));
Router.on('guild', (el) => renderGuild(el));
Router.on('tree', (el) => renderSkillTree(el));

// Skill detail: /app/skill/{slug}
Router.on('skill', (el) => {
    const segments = window.location.pathname.replace(/^\/app\/?/, '').split('/').filter(Boolean);
    const skillSlug = segments[1];
    if (skillSlug) {
        renderSkillDetail(el, skillSlug);
    } else {
        el.innerHTML = '<p>Skill not found.</p>';
    }
});

// Boot router (resolves initial URL)
Router.init('#dashboard-main');

// Initialize sidebar notification badges from pre-loaded counts
updateFriendBadge();
updateGuildBadge();

// Load activity feed into right panel
loadActivityFeed();
