<?php
/**
 * Life Is An RPG - Front Controller
 * All requests are routed through this file.
 */

// Base path for includes
define('BASE_PATH', dirname(__DIR__));

// Load configuration
$config = require BASE_PATH . '/src/config.php';

// Start session
session_set_cookie_params([
    'lifetime' => $config['session']['lifetime'],
    'path'     => $config['session']['path'],
    'secure'   => $config['session']['secure'],
    'httponly'  => $config['session']['httponly'],
    'samesite' => $config['session']['samesite'],
]);
session_name($config['session']['name']);
session_start();

// Load core files
require BASE_PATH . '/src/helpers.php';
require BASE_PATH . '/src/Router.php';
require BASE_PATH . '/src/Middleware.php';
require BASE_PATH . '/src/models/Database.php';
require BASE_PATH . '/src/models/XP.php';

// Initialize router
$router = new Router();

// Get request info
$method = $_SERVER['REQUEST_METHOD'];
$uri = $_SERVER['REQUEST_URI'] ?? '/';

// Parse the path (remove query string)
$path = strtok($uri, '?');

// ============================================================
// PAGE ROUTES (render HTML views)
// ============================================================

// Landing page (redirect to /app if logged in)
$router->get('/', function () {
    if (is_logged_in()) {
        redirect('/app');
    }
    render('pages/landing');
});

// Registration
$router->get('/register', function () {
    if (is_logged_in()) {
        redirect('/app');
    }
    render('pages/register');
});

// Login page
$router->get('/login', function () {
    if (is_logged_in()) {
        redirect('/app');
    }
    render('pages/landing'); // Login modal on landing page
});

// Static pages
$router->get('/features', function () {
    render('pages/features');
});

$router->get('/about', function () {
    render('pages/about');
});

// Account settings (requires auth)
$router->get('/account', function () {
    render('pages/account');
}, ['requireAuth']);

// Dashboard SPA shell (all /app/* routes serve the same shell)
$router->get('/app/*', function () {
    render('pages/app');
}, ['requireAuth']);

$router->get('/app', function () {
    render('pages/app');
}, ['requireAuth']);

// Public skills pages (SEO-friendly, Google-indexable)
$router->get('/skills', function () {
    render('pages/skills');
});

$router->get('/skills/{slug}', function (string $slug) {
    render('pages/skill-detail', ['slug' => $slug]);
});

// Sitemap
$router->get('/sitemap.xml', function () {
    render('pages/sitemap');
});

// Shareable character card (public, no auth required)
$router->get('/share/{id}', function (string $id) {
    render('pages/share', ['character_id' => (int) $id]);
});

// Admin panel
$router->get('/admin/*', function () {
    render('pages/admin/index');
}, ['requireAdmin']);

$router->get('/admin', function () {
    render('pages/admin/index');
}, ['requireAdmin']);

// ============================================================
// API ROUTES (return JSON)
// ============================================================

// Load API route files
$apiRouteFiles = ['auth', 'character', 'skills', 'explore', 'social', 'admin'];
foreach ($apiRouteFiles as $routeFile) {
    $filePath = BASE_PATH . '/src/routes/' . $routeFile . '.php';
    if (file_exists($filePath)) {
        require $filePath;
    }
}

// ============================================================
// DISPATCH
// ============================================================

$router->dispatch($method, $path);
