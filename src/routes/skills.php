<?php
/**
 * Skills API routes.
 */

// Get all global skills
$router->get('/api/skills', function () {
    $db = Database::getInstance();
    $skills = $db->query('
        SELECT id, name, slug, description, icon, max_level, xp_multiplier, category, sort_order
        FROM skills WHERE is_active = 1 ORDER BY sort_order
    ')->fetchAll();
    json_response($skills);
});

// Get single skill by slug (for public and in-app slug-based URLs)
$router->get('/api/skills/by-slug/{slug}', function (string $slug) {
    $db = Database::getInstance();
    $stmt = $db->prepare('
        SELECT s.*, sc.body_markdown, sc.celebrities, sc.resources, sc.tips
        FROM skills s
        LEFT JOIN skill_content sc ON sc.skill_id = s.id
        WHERE s.slug = ? AND s.is_active = 1
    ');
    $stmt->execute([$slug]);
    $skill = $stmt->fetch();

    if (!$skill) {
        json_error('Skill not found', 404);
    }

    $skill['celebrities'] = json_decode($skill['celebrities'] ?? 'null', true);
    $skill['resources']   = json_decode($skill['resources']   ?? 'null', true);
    $skill['tips']        = json_decode($skill['tips']        ?? 'null', true);

    $stmt = $db->prepare('
        SELECT sam.attribute_id, a.name as attribute_name, a.slug as attribute_slug, sam.ratio
        FROM skill_attribute_map sam
        JOIN attributes a ON a.id = sam.attribute_id
        WHERE sam.skill_id = ?
        ORDER BY sam.ratio DESC
    ');
    $stmt->execute([(int) $skill['id']]);
    $skill['attributes'] = $stmt->fetchAll();

    $stmt = $db->prepare('
        SELECT sp.required_skill_id, s2.name as required_skill_name, sp.required_level
        FROM skill_prerequisites sp
        JOIN skills s2 ON s2.id = sp.required_skill_id
        WHERE sp.skill_id = ?
    ');
    $stmt->execute([(int) $skill['id']]);
    $skill['prerequisites'] = $stmt->fetchAll();

    json_response($skill);
});

// Get single skill with extended content
$router->get('/api/skills/{id}', function (string $id) {
    $db = Database::getInstance();
    $stmt = $db->prepare('
        SELECT s.*, sc.body_markdown, sc.celebrities, sc.resources, sc.tips
        FROM skills s
        LEFT JOIN skill_content sc ON sc.skill_id = s.id
        WHERE s.id = ?
    ');
    $stmt->execute([(int) $id]);
    $skill = $stmt->fetch();

    if (!$skill) {
        json_error('Skill not found', 404);
    }

    // Decode JSON fields
    $skill['celebrities'] = json_decode($skill['celebrities'] ?? 'null', true);
    $skill['resources'] = json_decode($skill['resources'] ?? 'null', true);
    $skill['tips'] = json_decode($skill['tips'] ?? 'null', true);

    // Get attribute mappings
    $stmt = $db->prepare('
        SELECT sam.attribute_id, a.name as attribute_name, a.slug as attribute_slug, sam.ratio
        FROM skill_attribute_map sam
        JOIN attributes a ON a.id = sam.attribute_id
        WHERE sam.skill_id = ?
        ORDER BY sam.ratio DESC
    ');
    $stmt->execute([(int) $id]);
    $skill['attributes'] = $stmt->fetchAll();

    // Get prerequisites
    $stmt = $db->prepare('
        SELECT sp.required_skill_id, s2.name as required_skill_name, sp.required_level
        FROM skill_prerequisites sp
        JOIN skills s2 ON s2.id = sp.required_skill_id
        WHERE sp.skill_id = ?
    ');
    $stmt->execute([(int) $id]);
    $skill['prerequisites'] = $stmt->fetchAll();

    json_response($skill);
});

// Get current user's skills
$router->get('/api/user/skills', function () {
    requireAuth();
    $db = Database::getInstance();
    $stmt = $db->prepare('
        SELECT us.*, s.name, s.slug, s.description, s.icon, s.max_level, s.xp_multiplier, s.category
        FROM user_skills us
        JOIN skills s ON s.id = us.skill_id
        WHERE us.user_id = ?
        ORDER BY us.last_logged DESC
    ');
    $stmt->execute([current_user_id()]);
    json_response($stmt->fetchAll());
});

// Activate a skill
$router->post('/api/user/skills/{id}/activate', function (string $id) {
    requireAuth();
    if (!validate_csrf()) {
        json_error('Invalid CSRF token', 403);
    }

    $skillId = (int) $id;
    $userId = current_user_id();
    $db = Database::getInstance();

    // Check skill exists
    $stmt = $db->prepare('SELECT id, max_level FROM skills WHERE id = ? AND is_active = 1');
    $stmt->execute([$skillId]);
    if (!$stmt->fetch()) {
        json_error('Skill not found', 404);
    }

    // Check not already activated
    $stmt = $db->prepare('SELECT COUNT(*) FROM user_skills WHERE user_id = ? AND skill_id = ?');
    $stmt->execute([$userId, $skillId]);
    if ((int) $stmt->fetchColumn() > 0) {
        json_error('Skill already activated');
    }

    // Check prerequisites
    $stmt = $db->prepare('
        SELECT sp.required_skill_id, s.name as required_name, sp.required_level
        FROM skill_prerequisites sp
        JOIN skills s ON s.id = sp.required_skill_id
        WHERE sp.skill_id = ?
    ');
    $stmt->execute([$skillId]);
    $prereqs = $stmt->fetchAll();

    foreach ($prereqs as $prereq) {
        $stmt = $db->prepare('SELECT current_level FROM user_skills WHERE user_id = ? AND skill_id = ?');
        $stmt->execute([$userId, $prereq['required_skill_id']]);
        $userLevel = (int) ($stmt->fetchColumn() ?: 0);
        if ($userLevel < (int) $prereq['required_level']) {
            json_error("Requires {$prereq['required_name']} level {$prereq['required_level']}");
        }
    }

    // Activate
    $stmt = $db->prepare('INSERT INTO user_skills (user_id, skill_id, total_xp, current_level) VALUES (?, ?, 0, 0)');
    $stmt->execute([$userId, $skillId]);

    json_response(['success' => true]);
});

// Log hours on a skill
$router->post('/api/user/skills/{id}/log', function (string $id) {
    requireAuth();
    if (!validate_csrf()) {
        json_error('Invalid CSRF token', 403);
    }

    $data = get_json_body();
    $skillId = (int) $id;
    $userId = current_user_id();
    $hours = (float) ($data['hours'] ?? 0);
    $note = trim($data['note'] ?? '');

    if ($hours <= 0 || $hours > 24) {
        json_error('Hours must be between 0 and 24');
    }

    $db = Database::getInstance();

    // Get user's skill
    $stmt = $db->prepare('SELECT us.*, s.xp_multiplier, s.max_level FROM user_skills us JOIN skills s ON s.id = us.skill_id WHERE us.user_id = ? AND us.skill_id = ?');
    $stmt->execute([$userId, $skillId]);
    $userSkill = $stmt->fetch();

    if (!$userSkill) {
        json_error('Skill not activated', 404);
    }

    $xpEarned = XP::hoursToXP($hours, (float) $userSkill['xp_multiplier']);
    $levelBefore = (int) $userSkill['current_level'];
    $newTotalXP = (int) $userSkill['total_xp'] + $xpEarned;
    $levelAfter = XP::xpToLevel($newTotalXP, (int) $userSkill['max_level']);

    $db->beginTransaction();
    try {
        // Update user_skills
        $stmt = $db->prepare('UPDATE user_skills SET total_xp = ?, current_level = ?, last_logged = CURRENT_TIMESTAMP WHERE user_id = ? AND skill_id = ?');
        $stmt->execute([$newTotalXP, $levelAfter, $userId, $skillId]);

        // Log activity
        $stmt = $db->prepare('INSERT INTO activity_log (user_id, skill_id, hours, xp_earned, level_before, level_after, note) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$userId, $skillId, $hours, $xpEarned, $levelBefore, $levelAfter, $note ?: null]);

        $db->commit();

        $progress = XP::levelProgress($newTotalXP, (int) $userSkill['max_level']);

        json_response([
            'success'      => true,
            'xp_earned'    => $xpEarned,
            'total_xp'     => $newTotalXP,
            'level_before' => $levelBefore,
            'level_after'  => $levelAfter,
            'leveled_up'   => $levelAfter > $levelBefore,
            'progress'     => round($progress, 1),
        ]);
    } catch (Exception $e) {
        $db->rollBack();
        json_error('Failed to log hours', 500);
    }
});

// Deactivate a skill
$router->delete('/api/user/skills/{id}', function (string $id) {
    requireAuth();
    if (!validate_csrf()) {
        json_error('Invalid CSRF token', 403);
    }

    $db = Database::getInstance();
    $stmt = $db->prepare('DELETE FROM user_skills WHERE user_id = ? AND skill_id = ?');
    $stmt->execute([current_user_id(), (int) $id]);

    json_response(['success' => true]);
});
