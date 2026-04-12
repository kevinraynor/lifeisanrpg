<?php

/**
 * Send a JSON response and exit.
 */
function json_response(mixed $data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Send a JSON error response and exit.
 */
function json_error(string $message, int $statusCode = 400): void
{
    json_response(['error' => $message], $statusCode);
}

/**
 * Redirect to a URL and exit.
 */
function redirect(string $url, int $statusCode = 302): void
{
    http_response_code($statusCode);
    header("Location: $url");
    exit;
}

/**
 * Get the request body as parsed JSON.
 */
function get_json_body(): array
{
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);
    return is_array($data) ? $data : [];
}

/**
 * Generate or retrieve the CSRF token for the current session.
 */
function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Validate CSRF token from request header.
 */
function validate_csrf(): bool
{
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    return hash_equals(csrf_token(), $token);
}

/**
 * Sanitize a string for HTML output.
 */
function h(string $str): string
{
    return htmlspecialchars($str, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

/**
 * Get the current authenticated user ID from session, or null.
 */
function current_user_id(): ?int
{
    return $_SESSION['user_id'] ?? null;
}

/**
 * Check if the current user is logged in.
 */
function is_logged_in(): bool
{
    return current_user_id() !== null;
}

/**
 * Check if the current user is an admin.
 */
function is_admin(): bool
{
    return ($_SESSION['user_role'] ?? '') === 'admin';
}

/**
 * Generate a URL-friendly slug from a string.
 */
function slugify(string $text): string
{
    $text = strtolower(trim($text));
    $text = preg_replace('/[^a-z0-9\s-]/', '', $text);
    $text = preg_replace('/[\s-]+/', '-', $text);
    return trim($text, '-');
}

/**
 * Render a PHP view template with variables.
 */
function render(string $view, array $data = []): void
{
    extract($data);
    $viewPath = dirname(__DIR__) . '/src/views/' . $view . '.php';
    if (!file_exists($viewPath)) {
        http_response_code(500);
        echo "View not found: $view";
        exit;
    }
    require $viewPath;
}
