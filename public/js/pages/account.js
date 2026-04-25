/**
 * Account settings page.
 */
import { get, post, setCsrfToken } from '../api.js';
import { escapeHtml } from '../utils/html.js';

if (window.__CSRF_TOKEN__) {
    setCsrfToken(window.__CSRF_TOKEN__);
}

const container = document.getElementById('account-settings');
if (!container) throw new Error('Account settings container not found');

async function init() {
    try {
        const user = await get('/api/auth/me');

        container.innerHTML = `
            <div class="account-card card-ornate">
                <h2>Your Account</h2>
                <div class="account-info">
                    <div class="account-row">
                        <span class="account-label">Email</span>
                        <span class="account-value">${escapeHtml(user.email)}</span>
                    </div>
                    <div class="account-row">
                        <span class="account-label">Role</span>
                        <span class="account-value">${user.role}</span>
                    </div>
                </div>
            </div>

            <div class="account-card card-ornate">
                <h3>Change Password</h3>
                <form id="password-form" class="account-form">
                    <div class="form-group">
                        <label class="form-label">Current Password</label>
                        <input type="password" class="form-input" name="current_password" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">New Password</label>
                        <input type="password" class="form-input" name="new_password" required minlength="8">
                        <div class="form-hint">Minimum 8 characters</div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Confirm New Password</label>
                        <input type="password" class="form-input" name="confirm_password" required>
                    </div>
                    <div class="form-error" id="password-error"></div>
                    <div class="form-hint success" id="password-success" style="display:none"></div>
                    <button type="submit" class="btn-fantasy btn-primary">Update Password</button>
                </form>
            </div>

            <div class="account-card card-ornate">
                <h3>Session</h3>
                <p class="text-muted">Logged in as ${escapeHtml(user.email)}</p>
                <button class="btn-fantasy btn-secondary" id="btn-logout" style="margin-top: var(--space-md)">Log Out</button>
            </div>
        `;

        // Logout
        document.getElementById('btn-logout').addEventListener('click', async () => {
            try {
                await post('/api/auth/logout');
                window.location.href = '/';
            } catch {
                window.location.href = '/';
            }
        });

        // Password change
        document.getElementById('password-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const errorEl = document.getElementById('password-error');
            const successEl = document.getElementById('password-success');
            const btn = form.querySelector('button[type="submit"]');

            const currentPassword = form.current_password.value;
            const newPassword = form.new_password.value;
            const confirmPassword = form.confirm_password.value;

            errorEl.textContent = '';
            successEl.style.display = 'none';

            if (newPassword !== confirmPassword) {
                errorEl.textContent = 'New passwords do not match';
                return;
            }
            if (newPassword.length < 8) {
                errorEl.textContent = 'Password must be at least 8 characters';
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Updating...';

            try {
                await post('/api/auth/change-password', {
                    current_password: currentPassword,
                    new_password: newPassword,
                });
                successEl.textContent = 'Password updated successfully!';
                successEl.style.display = 'block';
                form.reset();
            } catch (err) {
                errorEl.textContent = err.message || 'Failed to update password';
            } finally {
                btn.disabled = false;
                btn.textContent = 'Update Password';
            }
        });
    } catch {
        container.innerHTML = '<p class="form-error">Failed to load account info. Please try again.</p>';
    }
}

init();
