<?php
/**
 * Social/Activity feed API routes (stub).
 */

// Get own activity feed
$router->get('/api/feed', function () {
    requireAuth();
    $db = Database::getInstance();
    $userId = current_user_id();

    $stmt = $db->prepare('
        SELECT al.*, s.name as skill_name, s.slug as skill_slug, s.icon as skill_icon
        FROM activity_log al
        JOIN skills s ON s.id = al.skill_id
        WHERE al.user_id = ?
        ORDER BY al.logged_at DESC
        LIMIT 50
    ');
    $stmt->execute([$userId]);

    json_response($stmt->fetchAll());
});
