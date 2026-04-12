<?php

/**
 * Middleware: Require authenticated user.
 */
function requireAuth(): void
{
    if (!is_logged_in()) {
        if (str_starts_with($_SERVER['REQUEST_URI'] ?? '', '/api/')) {
            json_error('Authentication required', 401);
        }
        redirect('/');
    }
}

/**
 * Middleware: Require admin role.
 */
function requireAdmin(): void
{
    requireAuth();
    if (!is_admin()) {
        if (str_starts_with($_SERVER['REQUEST_URI'] ?? '', '/api/')) {
            json_error('Forbidden', 403);
        }
        redirect('/');
    }
}

/**
 * Middleware: Validate CSRF token on state-changing requests.
 */
function requireCsrf(): void
{
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (in_array($method, ['POST', 'PUT', 'DELETE'])) {
        if (!validate_csrf()) {
            json_error('Invalid CSRF token', 403);
        }
    }
}
