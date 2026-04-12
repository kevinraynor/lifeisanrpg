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
