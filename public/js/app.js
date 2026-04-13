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
import { loadActivityFeed } from './components/social-feed.js';

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

// Skill detail: /app/skill/{id}
Router.on('skill', (el) => {
    const segments = window.location.pathname.replace(/^\/app\/?/, '').split('/').filter(Boolean);
    const skillId = segments[1];
    if (skillId) {
        renderSkillDetail(el, skillId);
    } else {
        el.innerHTML = '<p>Skill not found.</p>';
    }
});

// Boot router (resolves initial URL)
Router.init('#dashboard-main');

// Load activity feed into right panel
loadActivityFeed();
