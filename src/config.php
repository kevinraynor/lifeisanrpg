<?php
/**
 * Default application configuration.
 * Local overrides go in config.local.php (gitignored).
 */

$config = [
    'app' => [
        'name'        => 'Life Is An RPG',
        'url'         => 'http://liferpg.local',
        'debug'       => true,
        'environment' => 'development', // 'development' or 'production'
    ],

    'db' => [
        'host'     => '127.0.0.1',
        'port'     => 3306,
        'name'     => 'liferpg',
        'user'     => 'root',
        'password' => '',
        'charset'  => 'utf8mb4',
    ],

    'session' => [
        'name'     => 'liferpg_session',
        'lifetime' => 60 * 60 * 24 * 7, // 7 days
        'path'     => '/',
        'secure'   => false, // set true in production (HTTPS)
        'httponly'  => true,
        'samesite' => 'Lax',
    ],

    'xp' => [
        'base_per_hour' => 100,
        'max_xp'        => 1000000, // 10,000 hours * 100 base
        'max_level'     => 250,
    ],
];

// Load local overrides if they exist
$localConfigPath = __DIR__ . '/config.local.php';
if (file_exists($localConfigPath)) {
    $localConfig = require $localConfigPath;
    $config = array_replace_recursive($config, $localConfig);
}

// Configure error reporting based on environment
if ($config['app']['debug']) {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
} else {
    error_reporting(0);
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
    ini_set('error_log', dirname(__DIR__) . '/storage/logs/php-errors.log');
}

return $config;
