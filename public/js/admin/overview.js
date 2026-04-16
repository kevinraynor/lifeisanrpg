/**
 * Admin overview page — stats dashboard.
 */
import { get } from '../api.js';

export async function renderOverview(container) {
    container.innerHTML = '<h1>Admin Dashboard</h1><p>Loading stats...</p>';

    try {
        const [skills, users, classes] = await Promise.all([
            get('/api/admin/skills'),
            get('/api/admin/users'),
            get('/api/admin/classes'),
        ]);

        const activeUsers = users.filter(u => u.is_active);
        const adminUsers = users.filter(u => u.role === 'admin');
        const activeSkills = skills.filter(s => s.is_active);

        const categories = {};
        skills.forEach(s => {
            const cat = s.category || 'uncategorized';
            categories[cat] = (categories[cat] || 0) + 1;
        });

        container.innerHTML = `
            <h1>Admin Dashboard</h1>
            <p class="section-subtitle">Overview of your Life Is An RPG instance</p>

            <div class="admin-stats-grid">
                <div class="admin-stat-card card-ornate">
                    <div class="admin-stat-number">${users.length}</div>
                    <div class="admin-stat-label">Total Users</div>
                    <div class="admin-stat-sub">${activeUsers.length} active &middot; ${adminUsers.length} admin</div>
                </div>
                <div class="admin-stat-card card-ornate">
                    <div class="admin-stat-number">${skills.length}</div>
                    <div class="admin-stat-label">Total Skills</div>
                    <div class="admin-stat-sub">${activeSkills.length} active</div>
                </div>
                <div class="admin-stat-card card-ornate">
                    <div class="admin-stat-number">${classes.length}</div>
                    <div class="admin-stat-label">Classes</div>
                    <div class="admin-stat-sub">Character archetypes</div>
                </div>
                <div class="admin-stat-card card-ornate">
                    <div class="admin-stat-number">${Object.keys(categories).length}</div>
                    <div class="admin-stat-label">Skill Categories</div>
                    <div class="admin-stat-sub">${Object.entries(categories).map(([k, v]) => `${k}: ${v}`).join(', ')}</div>
                </div>
            </div>

            <div class="admin-section">
                <h2>Recent Users</h2>
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Character</th>
                            <th>Email</th>
                            <th>Class</th>
                            <th>Role</th>
                            <th>Joined</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.slice(0, 10).map(u => `
                            <tr>
                                <td>${esc(u.character_name || '—')}</td>
                                <td>${esc(u.email)}</td>
                                <td>${esc(u.class_name || '—')}</td>
                                <td><span class="admin-badge admin-badge--${u.role}">${u.role}</span></td>
                                <td>${formatDate(u.created_at)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<h1>Admin Dashboard</h1><p class="form-error">Failed to load: ${esc(err.message)}</p>`;
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
