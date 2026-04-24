<?php
/**
 * Admin API routes.
 */

// === SKILLS CRUD ===

// List all skills (admin, with search)
$router->get('/api/admin/skills', function () {
    requireAdmin();
    $db = Database::getInstance();

    $search = trim($_GET['search'] ?? '');
    $category = trim($_GET['category'] ?? '');

    $sql = 'SELECT * FROM skills WHERE 1=1';
    $params = [];

    if ($search) {
        $sql .= ' AND (name LIKE ? OR description LIKE ?)';
        $params[] = "%$search%";
        $params[] = "%$search%";
    }
    if ($category) {
        $sql .= ' AND category = ?';
        $params[] = $category;
    }

    $sql .= ' ORDER BY sort_order';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    json_response($stmt->fetchAll());
});

// Create skill
$router->post('/api/admin/skills', function () {
    requireAdmin();
    if (!validate_csrf()) json_error('Invalid CSRF token', 403);

    $data = get_json_body();
    $name = trim($data['name'] ?? '');
    if (!$name) json_error('Name is required');

    $db = Database::getInstance();
    $stmt = $db->prepare('INSERT INTO skills (name, slug, description, icon, max_level, xp_multiplier, category, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $name,
        slugify($name),
        $data['description'] ?? null,
        slugify($name) . '.svg',
        (int) ($data['max_level'] ?? 250),
        (float) ($data['xp_multiplier'] ?? 1.0),
        $data['category'] ?? null,
        (int) ($data['sort_order'] ?? 0),
    ]);

    json_response(['success' => true, 'id' => (int) $db->lastInsertId()]);
});

// Update skill
$router->put('/api/admin/skills/{id}', function (string $id) {
    requireAdmin();
    if (!validate_csrf()) json_error('Invalid CSRF token', 403);

    $data = get_json_body();
    $db = Database::getInstance();

    $fields = ['name', 'slug', 'description', 'icon', 'max_level', 'xp_multiplier', 'category', 'is_active', 'sort_order'];
    $updates = [];
    $params = [];

    foreach ($fields as $field) {
        if (array_key_exists($field, $data)) {
            $updates[] = "$field = ?";
            $params[] = $data[$field];
        }
    }

    if (empty($updates)) json_error('No fields to update');

    $params[] = (int) $id;
    $sql = 'UPDATE skills SET ' . implode(', ', $updates) . ' WHERE id = ?';
    $db->prepare($sql)->execute($params);

    json_response(['success' => true]);
});

// Update skill extended content
$router->put('/api/admin/skills/{id}/content', function (string $id) {
    requireAdmin();
    if (!validate_csrf()) json_error('Invalid CSRF token', 403);

    $data = get_json_body();
    $db = Database::getInstance();

    // Upsert skill content
    $stmt = $db->prepare('SELECT COUNT(*) FROM skill_content WHERE skill_id = ?');
    $stmt->execute([(int) $id]);

    if ((int) $stmt->fetchColumn() > 0) {
        $stmt = $db->prepare('UPDATE skill_content SET body_markdown = ?, celebrities = ?, resources = ?, tips = ? WHERE skill_id = ?');
        $stmt->execute([
            $data['body_markdown'] ?? null,
            isset($data['celebrities']) ? json_encode($data['celebrities']) : null,
            isset($data['resources']) ? json_encode($data['resources']) : null,
            isset($data['tips']) ? json_encode($data['tips']) : null,
            (int) $id,
        ]);
    } else {
        $stmt = $db->prepare('INSERT INTO skill_content (skill_id, body_markdown, celebrities, resources, tips) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([
            (int) $id,
            $data['body_markdown'] ?? null,
            isset($data['celebrities']) ? json_encode($data['celebrities']) : null,
            isset($data['resources']) ? json_encode($data['resources']) : null,
            isset($data['tips']) ? json_encode($data['tips']) : null,
        ]);
    }

    json_response(['success' => true]);
});

// Delete skill
$router->delete('/api/admin/skills/{id}', function (string $id) {
    requireAdmin();
    if (!validate_csrf()) json_error('Invalid CSRF token', 403);

    $db = Database::getInstance();
    $db->prepare('DELETE FROM skills WHERE id = ?')->execute([(int) $id]);
    json_response(['success' => true]);
});

// Update skill attribute mappings
$router->put('/api/admin/skills/{id}/attributes', function (string $id) {
    requireAdmin();
    if (!validate_csrf()) json_error('Invalid CSRF token', 403);

    $data = get_json_body();
    $mappings = $data['mappings'] ?? [];
    $db = Database::getInstance();

    $db->beginTransaction();
    try {
        $db->prepare('DELETE FROM skill_attribute_map WHERE skill_id = ?')->execute([(int) $id]);
        $stmt = $db->prepare('INSERT INTO skill_attribute_map (skill_id, attribute_id, ratio) VALUES (?, ?, ?)');
        foreach ($mappings as $m) {
            $stmt->execute([(int) $id, (int) $m['attribute_id'], (float) $m['ratio']]);
        }
        $db->commit();
        json_response(['success' => true]);
    } catch (Exception $e) {
        $db->rollBack();
        json_error('Failed to update attribute mappings', 500);
    }
});

// === USERS MANAGEMENT ===

$router->get('/api/admin/users', function () {
    requireAdmin();
    $db = Database::getInstance();

    $search = trim($_GET['search'] ?? '');
    $sql = '
        SELECT u.id, u.email, u.role, u.is_active, u.created_at, u.last_login,
               c.name as character_name, c.gender, cl.name as class_name
        FROM users u
        LEFT JOIN characters c ON c.user_id = u.id
        LEFT JOIN classes cl ON cl.id = c.class_id
        WHERE 1=1
    ';
    $params = [];

    if ($search) {
        $sql .= ' AND (u.email LIKE ? OR c.name LIKE ?)';
        $params[] = "%$search%";
        $params[] = "%$search%";
    }

    $sql .= ' ORDER BY u.created_at DESC';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    json_response($stmt->fetchAll());
});

$router->put('/api/admin/users/{id}', function (string $id) {
    requireAdmin();
    if (!validate_csrf()) json_error('Invalid CSRF token', 403);

    $data = get_json_body();
    $db = Database::getInstance();

    $updates = [];
    $params = [];

    if (isset($data['is_active'])) {
        $updates[] = 'is_active = ?';
        $params[] = (int) $data['is_active'];
    }
    if (isset($data['role'])) {
        $updates[] = 'role = ?';
        $params[] = $data['role'];
    }

    if (empty($updates)) json_error('No fields to update');

    $params[] = (int) $id;
    $db->prepare('UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = ?')->execute($params);

    json_response(['success' => true]);
});

$router->delete('/api/admin/users/{id}', function (string $id) {
    requireAdmin();
    if (!validate_csrf()) json_error('Invalid CSRF token', 403);

    // Prevent self-deletion
    if ((int) $id === current_user_id()) {
        json_error('Cannot delete your own account');
    }

    $db = Database::getInstance();
    $db->prepare('DELETE FROM users WHERE id = ?')->execute([(int) $id]);
    json_response(['success' => true]);
});

// === APP SETTINGS ===

$router->get('/api/admin/settings', function () {
    requireAdmin();
    json_response(Settings::all());
});

$router->put('/api/admin/settings', function () {
    requireAdmin();
    if (!validate_csrf()) json_error('Invalid CSRF token', 403);
    $allowed = [
        'quest_bonus_multiplier_daily',
        'quest_bonus_multiplier_weekly',
        'quest_bonus_multiplier_monthly',
    ];
    foreach (get_json_body() as $k => $v) {
        if (in_array($k, $allowed, true)) Settings::set($k, $v);
    }
    json_response(['success' => true]);
});

// === QUEST VARIATIONS ===

$router->get('/api/admin/skills/{id}/variations', function (string $id) {
    requireAdmin();
    $db = Database::getInstance();
    $period = $_GET['period'] ?? '';
    $params = [(int) $id];
    $sql = 'SELECT * FROM quest_variations WHERE skill_id = ?';
    if (in_array($period, ['daily', 'weekly', 'monthly'], true)) {
        $sql .= ' AND period = ?';
        $params[] = $period;
    }
    $sql .= ' ORDER BY period, sort_order, id';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) $r['hours'] = (float) $r['hours'];
    json_response($rows);
});

$router->post('/api/admin/skills/{id}/variations', function (string $id) {
    requireAdmin();
    if (!validate_csrf()) json_error('Invalid CSRF token', 403);
    $data = get_json_body();
    $period = $data['period'] ?? '';
    if (!in_array($period, ['daily', 'weekly', 'monthly'], true)) json_error('Invalid period', 400);
    $name = trim($data['name'] ?? '');
    if (strlen($name) < 2) json_error('Name must be at least 2 characters', 400);
    $hours = (float) ($data['hours'] ?? 0);
    if ($hours <= 0 || $hours > 200) json_error('Hours must be between 0 and 200', 400);

    $db = Database::getInstance();
    $stmt = $db->prepare('SELECT 1 FROM skills WHERE id = ?');
    $stmt->execute([(int) $id]);
    if (!$stmt->fetchColumn()) json_error('Skill not found', 404);

    $stmt = $db->prepare('INSERT INTO quest_variations (skill_id, period, name, description, hours, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([(int) $id, $period, $name, $data['description'] ?? null, $hours, (int) ($data['sort_order'] ?? 0)]);
    json_response(['success' => true, 'id' => (int) $db->lastInsertId()]);
});

$router->put('/api/admin/quest-variations/{id}', function (string $id) {
    requireAdmin();
    if (!validate_csrf()) json_error('Invalid CSRF token', 403);
    $data = get_json_body();
    $db = Database::getInstance();

    $updates = [];
    $params = [];

    if (isset($data['name'])) {
        if (strlen(trim($data['name'])) < 2) json_error('Name must be at least 2 characters', 400);
        $updates[] = 'name = ?';
        $params[] = trim($data['name']);
    }
    if (array_key_exists('description', $data)) {
        $updates[] = 'description = ?';
        $params[] = $data['description'];
    }
    if (isset($data['hours'])) {
        $hours = (float) $data['hours'];
        if ($hours <= 0 || $hours > 200) json_error('Hours must be between 0 and 200', 400);
        $updates[] = 'hours = ?';
        $params[] = $hours;
    }
    if (isset($data['is_active'])) {
        $updates[] = 'is_active = ?';
        $params[] = (int) $data['is_active'];
    }
    if (empty($updates)) json_error('No fields to update', 400);

    $params[] = (int) $id;
    $db->prepare('UPDATE quest_variations SET ' . implode(', ', $updates) . ' WHERE id = ?')->execute($params);
    json_response(['success' => true]);
});

$router->delete('/api/admin/quest-variations/{id}', function (string $id) {
    requireAdmin();
    if (!validate_csrf()) json_error('Invalid CSRF token', 403);
    $db = Database::getInstance();
    $db->prepare('DELETE FROM quest_variations WHERE id = ?')->execute([(int) $id]);
    json_response(['success' => true]);
});

// === GUILD TALLY VARIATIONS ===

$router->get('/api/admin/guild-tally-variations', function () {
    requireAdmin();
    $db = Database::getInstance();
    $period = $_GET['period'] ?? '';
    $sql = 'SELECT * FROM guild_tally_variations';
    $params = [];
    if (in_array($period, ['weekly', 'monthly'], true)) {
        $sql .= ' WHERE period = ?';
        $params[] = $period;
    }
    $sql .= ' ORDER BY period, sort_order, id';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        $r['base_hours_per_member'] = (float) $r['base_hours_per_member'];
        $r['bonus_xp']              = (int) $r['bonus_xp'];
        $r['min_guild_level']       = (int) $r['min_guild_level'];
        $r['sort_order']            = (int) $r['sort_order'];
        $r['is_active']             = (int) $r['is_active'];
    }
    json_response($rows);
});

$router->post('/api/admin/guild-tally-variations', function () {
    requireAdmin();
    if (!validate_csrf()) json_error('Invalid CSRF token', 403);
    $data = get_json_body();

    $period = $data['period'] ?? '';
    if (!in_array($period, ['weekly', 'monthly'], true)) json_error('Invalid period', 400);
    $name = trim($data['name'] ?? '');
    if (strlen($name) < 2 || strlen($name) > 150) json_error('Name must be 2–150 chars', 400);
    $baseHours = (float) ($data['base_hours_per_member'] ?? 0);
    if ($baseHours <= 0 || $baseHours > 999.99) json_error('base_hours_per_member out of range', 400);
    $bonusXp = (int) ($data['bonus_xp'] ?? 0);
    if ($bonusXp < 0 || $bonusXp > 1000000) json_error('bonus_xp out of range', 400);
    $minLvl = (int) ($data['min_guild_level'] ?? 1);
    if ($minLvl < 1 || $minLvl > 20) json_error('min_guild_level out of range', 400);

    $db = Database::getInstance();
    $stmt = $db->prepare('
        INSERT INTO guild_tally_variations
            (period, name, description, base_hours_per_member, bonus_xp, min_guild_level, sort_order, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([
        $period,
        $name,
        $data['description'] ?? null,
        $baseHours,
        $bonusXp,
        $minLvl,
        (int) ($data['sort_order'] ?? 0),
        isset($data['is_active']) ? (int) !!$data['is_active'] : 1,
    ]);
    json_response(['success' => true, 'id' => (int) $db->lastInsertId()]);
});

$router->put('/api/admin/guild-tally-variations/{id}', function (string $id) {
    requireAdmin();
    if (!validate_csrf()) json_error('Invalid CSRF token', 403);
    $data = get_json_body();
    $db = Database::getInstance();

    $updates = [];
    $params = [];

    if (isset($data['name'])) {
        $name = trim($data['name']);
        if (strlen($name) < 2 || strlen($name) > 150) json_error('Name must be 2–150 chars', 400);
        $updates[] = 'name = ?';
        $params[] = $name;
    }
    if (array_key_exists('description', $data)) {
        $updates[] = 'description = ?';
        $params[] = $data['description'];
    }
    if (isset($data['base_hours_per_member'])) {
        $h = (float) $data['base_hours_per_member'];
        if ($h <= 0 || $h > 999.99) json_error('base_hours_per_member out of range', 400);
        $updates[] = 'base_hours_per_member = ?';
        $params[] = $h;
    }
    if (isset($data['bonus_xp'])) {
        $xp = (int) $data['bonus_xp'];
        if ($xp < 0 || $xp > 1000000) json_error('bonus_xp out of range', 400);
        $updates[] = 'bonus_xp = ?';
        $params[] = $xp;
    }
    if (isset($data['min_guild_level'])) {
        $lvl = (int) $data['min_guild_level'];
        if ($lvl < 1 || $lvl > 20) json_error('min_guild_level out of range', 400);
        $updates[] = 'min_guild_level = ?';
        $params[] = $lvl;
    }
    if (isset($data['sort_order'])) {
        $updates[] = 'sort_order = ?';
        $params[] = (int) $data['sort_order'];
    }
    if (isset($data['is_active'])) {
        $updates[] = 'is_active = ?';
        $params[] = (int) !!$data['is_active'];
    }
    if (empty($updates)) json_error('No fields to update', 400);

    $params[] = (int) $id;
    $db->prepare('UPDATE guild_tally_variations SET ' . implode(', ', $updates) . ' WHERE id = ?')->execute($params);
    json_response(['success' => true]);
});

$router->delete('/api/admin/guild-tally-variations/{id}', function (string $id) {
    requireAdmin();
    if (!validate_csrf()) json_error('Invalid CSRF token', 403);
    $db = Database::getInstance();
    $db->prepare('DELETE FROM guild_tally_variations WHERE id = ?')->execute([(int) $id]);
    json_response(['success' => true]);
});

// === CLASSES MANAGEMENT ===

$router->get('/api/admin/classes', function () {
    requireAdmin();
    $db = Database::getInstance();
    json_response($db->query('SELECT * FROM classes ORDER BY sort_order')->fetchAll());
});

$router->put('/api/admin/classes/{id}', function (string $id) {
    requireAdmin();
    if (!validate_csrf()) json_error('Invalid CSRF token', 403);

    $data = get_json_body();
    $db = Database::getInstance();

    $fields = ['name', 'slug', 'description', 'image_url_male', 'image_url_female', 'color', 'suggested_skills', 'sort_order'];
    $updates = [];
    $params = [];

    foreach ($fields as $field) {
        if (array_key_exists($field, $data)) {
            $updates[] = "$field = ?";
            $value = $data[$field];
            if ($field === 'suggested_skills' && is_array($value)) {
                $value = json_encode($value);
            }
            $params[] = $value;
        }
    }

    if (empty($updates)) json_error('No fields to update');

    $params[] = (int) $id;
    $db->prepare('UPDATE classes SET ' . implode(', ', $updates) . ' WHERE id = ?')->execute($params);

    json_response(['success' => true]);
});
