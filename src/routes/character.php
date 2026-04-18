<?php
/**
 * Character API routes.
 */

// Get own character
$router->get('/api/character', function () {
    requireAuth();
    $db = Database::getInstance();
    $stmt = $db->prepare('
        SELECT c.*, cl.name as class_name, cl.slug as class_slug, cl.color as class_color,
               cl.image_url_male, cl.image_url_female
        FROM characters c
        JOIN classes cl ON cl.id = c.class_id
        WHERE c.user_id = ?
    ');
    $stmt->execute([current_user_id()]);
    $character = $stmt->fetch();

    if (!$character) {
        json_error('Character not found', 404);
    }

    json_response($character);
});

// Get another user's character (public profile)
$router->get('/api/character/{id}', function (string $id) {
    $db = Database::getInstance();
    $stmt = $db->prepare('
        SELECT c.id, c.name, c.gender, c.class_id, c.created_at,
               cl.name as class_name, cl.slug as class_slug, cl.color as class_color,
               cl.image_url_male, cl.image_url_female
        FROM characters c
        JOIN classes cl ON cl.id = c.class_id
        WHERE c.user_id = ?
    ');
    $stmt->execute([(int) $id]);
    $character = $stmt->fetch();

    if (!$character) {
        json_error('Character not found', 404);
    }

    // Also get their skills (public)
    $stmt = $db->prepare('
        SELECT us.skill_id, us.current_level, us.total_xp, s.name, s.slug, s.icon, s.max_level
        FROM user_skills us
        JOIN skills s ON s.id = us.skill_id
        WHERE us.user_id = ?
        ORDER BY us.current_level DESC
    ');
    $stmt->execute([(int) $id]);
    $character['skills'] = $stmt->fetchAll();

    // Derive attribute scores
    $attrMap = $db->query('SELECT skill_id, attribute_id, ratio FROM skill_attribute_map')->fetchAll();
    $attributes = $db->query('SELECT * FROM attributes ORDER BY sort_order')->fetchAll();
    $scores = [];
    foreach ($attributes as $attr) {
        $scores[$attr['id']] = ['id' => $attr['id'], 'name' => $attr['name'], 'slug' => $attr['slug'], 'score' => 0];
    }
    foreach ($character['skills'] as $skill) {
        foreach ($attrMap as $map) {
            if ((int) $map['skill_id'] === (int) $skill['skill_id']) {
                $scores[(int) $map['attribute_id']]['score'] += (int) $skill['current_level'] * (float) $map['ratio'];
            }
        }
    }
    foreach ($scores as &$s) {
        $s['score'] = (int) round($s['score']);
    }
    $character['attributes'] = array_values($scores);

    json_response($character);
});

// Update character
$router->put('/api/character', function () {
    requireAuth();
    if (!validate_csrf()) {
        json_error('Invalid CSRF token', 403);
    }

    $data = get_json_body();
    $db = Database::getInstance();
    $userId = current_user_id();

    $updates = [];
    $params = [];

    if (isset($data['class_id'])) {
        $classId = (int) $data['class_id'];
        $stmt = $db->prepare('SELECT COUNT(*) FROM classes WHERE id = ?');
        $stmt->execute([$classId]);
        if ((int) $stmt->fetchColumn() === 0) {
            json_error('Invalid class');
        }
        $updates[] = 'class_id = ?';
        $params[] = $classId;
    }

    if (isset($data['name'])) {
        $name = trim($data['name']);
        if (strlen($name) < 3 || strlen($name) > 50) {
            json_error('Name must be 3-50 characters');
        }
        // Check uniqueness (excluding own)
        $stmt = $db->prepare('SELECT COUNT(*) FROM characters WHERE name = ? AND user_id != ?');
        $stmt->execute([$name, $userId]);
        if ((int) $stmt->fetchColumn() > 0) {
            json_error('This character name is already taken');
        }
        $updates[] = 'name = ?';
        $params[] = $name;
    }

    if (isset($data['quote'])) {
        $quote = trim($data['quote']);
        if ($quote !== '') {
            $wordCount = preg_match_all('/\S+/', $quote);
            if ($wordCount > 30) {
                json_error('Quote cannot exceed 30 words');
            }
            if (strlen($quote) > 200) {
                json_error('Quote cannot exceed 200 characters');
            }
        }
        $updates[] = 'quote = ?';
        $params[] = $quote !== '' ? $quote : null;
    }

    if (empty($updates)) {
        json_error('No fields to update');
    }

    $params[] = $userId;
    $sql = 'UPDATE characters SET ' . implode(', ', $updates) . ' WHERE user_id = ?';
    $db->prepare($sql)->execute($params);

    json_response(['success' => true]);
});
