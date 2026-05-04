<?php
/**
 * Explore API routes.
 */

// Get suggested skills for user's class
$router->get('/api/explore/suggested', function () {
    requireAuth();
    $db = Database::getInstance();
    $userId = current_user_id();

    // Get user's class
    $stmt = $db->prepare('SELECT c.class_id, cl.suggested_skills FROM characters c JOIN classes cl ON cl.id = c.class_id WHERE c.user_id = ?');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();

    if (!$row) {
        json_response([]);
        return;
    }

    $suggestedIds = json_decode($row['suggested_skills'] ?? '[]', true);
    if (empty($suggestedIds)) {
        json_response([]);
        return;
    }

    // Get skills not yet activated by user
    $placeholders = implode(',', array_fill(0, count($suggestedIds), '?'));
    $stmt = $db->prepare("
        SELECT ' . Skills::COLS . '
        FROM skills s
        WHERE s.id IN ($placeholders)
        AND s.is_active = 1
        AND s.id NOT IN (SELECT skill_id FROM user_skills WHERE user_id = ?)
        ORDER BY s.sort_order
    ");
    $params = array_merge($suggestedIds, [$userId]);
    $stmt->execute($params);

    json_response($stmt->fetchAll());
});
