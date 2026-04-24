<?php
/**
 * Quest API routes.
 */

// Active quests grouped by period
$router->get('/api/user/quests', function () {
    requireAuth();
    json_response(Quests::getAllActiveForUser(current_user_id()));
});

// Available variations to pick from (all periods)
$router->get('/api/user/quests/available', function () {
    requireAuth();
    $period = $_GET['period'] ?? 'daily';
    if (!in_array($period, ['daily', 'weekly', 'monthly'], true)) json_error('Invalid period', 400);
    $displayLimits = ['daily' => 5, 'weekly' => 3, 'monthly' => 3];
    json_response(Quests::listAvailable(current_user_id(), $period, $displayLimits[$period]));
});

// Activate (opt into) any quest variation
$router->post('/api/user/quests/activate', function () {
    requireAuth();
    if (!validate_csrf()) json_error('Invalid CSRF token', 403);
    $data = get_json_body();
    $vid = (int) ($data['variation_id'] ?? 0);
    if (!$vid) json_error('variation_id is required', 400);
    json_response(Quests::activate(current_user_id(), $vid));
});
