/**
 * Admin Users Manager — search, filter, toggle active, change role.
 */
import { get, put, del } from '../api.js';

let allUsers = [];
let searchQuery = '';

export async function renderUsersManager(container) {
    container.innerHTML = '<h1>Users Manager</h1><p>Loading...</p>';

    try {
        allUsers = await get('/api/admin/users');
        renderUsersList(container);
    } catch (err) {
        container.innerHTML = `<h1>Users Manager</h1><p class="form-error">${esc(err.message)}</p>`;
    }
}

function renderUsersList(container) {
    container.innerHTML = `
        <div class="admin-header-row">
            <h1>Users Manager</h1>
            <span class="admin-count">${filteredUsers().length} users</span>
        </div>

        <div class="admin-filters">
            <input type="text" class="form-input" id="user-search" placeholder="Search by email or character name..." value="${esc(searchQuery)}">
            <select class="form-input form-select" id="user-role-filter">
                <option value="">All Roles</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
            </select>
            <select class="form-input form-select" id="user-active-filter">
                <option value="">All Status</option>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
            </select>
        </div>

        <table class="admin-table" id="users-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Character</th>
                    <th>Email</th>
                    <th>Class</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="users-tbody">
                ${renderUserRows()}
            </tbody>
        </table>
    `;

    const searchEl = document.getElementById('user-search');
    const roleFilter = document.getElementById('user-role-filter');
    const activeFilter = document.getElementById('user-active-filter');

    function refresh() {
        searchQuery = searchEl.value;
        const tbody = document.getElementById('users-tbody');
        tbody.innerHTML = renderUserRows();
        attachUserHandlers(container);
        document.querySelector('.admin-count').textContent = `${filteredUsers().length} users`;
    }

    searchEl.addEventListener('input', refresh);
    roleFilter.addEventListener('change', refresh);
    activeFilter.addEventListener('change', refresh);
    attachUserHandlers(container);
}

function filteredUsers() {
    const roleFilter = document.getElementById('user-role-filter')?.value || '';
    const activeFilter = document.getElementById('user-active-filter')?.value || '';
    const q = searchQuery.toLowerCase();

    return allUsers.filter(u => {
        if (roleFilter && u.role !== roleFilter) return false;
        if (activeFilter !== '' && String(u.is_active) !== activeFilter) return false;
        if (q) {
            if (!u.email.toLowerCase().includes(q) && !(u.character_name || '').toLowerCase().includes(q)) return false;
        }
        return true;
    });
}

function renderUserRows() {
    const users = filteredUsers();
    if (users.length === 0) return '<tr><td colspan="9" class="text-muted">No users match your filters.</td></tr>';

    return users.map(u => `
        <tr data-id="${u.id}">
            <td>${u.id}</td>
            <td><strong>${esc(u.character_name || '—')}</strong> ${u.gender === 'female' ? '&#9792;' : u.gender === 'male' ? '&#9794;' : ''}</td>
            <td>${esc(u.email)}</td>
            <td>${esc(u.class_name || '—')}</td>
            <td>
                <select class="form-input form-input--small role-select" data-id="${u.id}" data-current="${u.role}">
                    <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
            </td>
            <td>${u.is_active ? '<span class="admin-badge admin-badge--active">Active</span>' : '<span class="admin-badge admin-badge--inactive">Inactive</span>'}</td>
            <td>${formatDate(u.created_at)}</td>
            <td>${formatDate(u.last_login)}</td>
            <td class="admin-actions">
                <button class="btn-fantasy btn-small btn-secondary btn-toggle-active" data-id="${u.id}" data-active="${u.is_active}">
                    ${u.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button class="btn-fantasy btn-small btn-danger btn-delete-user" data-id="${u.id}">Delete</button>
            </td>
        </tr>
    `).join('');
}

function attachUserHandlers(container) {
    // Role change
    container.querySelectorAll('.role-select').forEach(select => {
        select.addEventListener('change', async () => {
            const userId = select.dataset.id;
            const newRole = select.value;
            try {
                await put(`/api/admin/users/${userId}`, { role: newRole });
                const user = allUsers.find(u => u.id == userId);
                if (user) user.role = newRole;
            } catch (err) {
                alert('Failed to change role: ' + err.message);
                select.value = select.dataset.current;
            }
        });
    });

    // Toggle active
    container.querySelectorAll('.btn-toggle-active').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.dataset.id;
            const currentlyActive = btn.dataset.active === '1';
            const newActive = currentlyActive ? 0 : 1;
            btn.disabled = true;
            try {
                await put(`/api/admin/users/${userId}`, { is_active: newActive });
                const user = allUsers.find(u => u.id == userId);
                if (user) user.is_active = newActive;
                renderUsersList(container);
            } catch (err) {
                alert('Failed: ' + err.message);
                btn.disabled = false;
            }
        });
    });

    // Delete user
    container.querySelectorAll('.btn-delete-user').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.dataset.id;
            const user = allUsers.find(u => u.id == userId);
            if (!user) return;
            if (!confirm(`Delete user "${user.character_name || user.email}"? This will permanently remove all their data.`)) return;
            btn.disabled = true;
            try {
                await del(`/api/admin/users/${userId}`);
                allUsers = allUsers.filter(u => u.id != userId);
                renderUsersList(container);
            } catch (err) {
                alert('Delete failed: ' + err.message);
                btn.disabled = false;
            }
        });
    });
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
