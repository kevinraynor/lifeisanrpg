<?php
/**
 * Auth API routes.
 */

require_once BASE_PATH . '/src/models/User.php';

// Check character name uniqueness
$router->get('/api/auth/check-name', function () {
    $name = trim($_GET['name'] ?? '');
    if (strlen($name) < 3 || strlen($name) > 50) {
        json_response(['available' => false, 'reason' => 'Name must be 3-50 characters']);
        return;
    }
    $db = Database::getInstance();
    $stmt = $db->prepare('SELECT COUNT(*) FROM characters WHERE name = ?');
    $stmt->execute([$name]);
    $taken = (int) $stmt->fetchColumn() > 0;
    json_response(['available' => !$taken]);
});

// Register
$router->post('/api/auth/register', function () {
    $data = get_json_body();

    // Validate required fields
    $required = ['character_name', 'gender', 'class_id', 'starting_skills', 'email', 'password'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            json_error("Missing required field: $field");
        }
    }

    $email = filter_var($data['email'], FILTER_VALIDATE_EMAIL);
    if (!$email) {
        json_error('Invalid email address');
    }

    $password = $data['password'];
    if (strlen($password) < 8) {
        json_error('Password must be at least 8 characters');
    }

    $characterName = trim($data['character_name']);
    if (strlen($characterName) < 3 || strlen($characterName) > 50) {
        json_error('Character name must be 3-50 characters');
    }
    if (!preg_match('/^[a-zA-Z0-9 _-]+$/', $characterName)) {
        json_error('Character name can only contain letters, numbers, spaces, hyphens, and underscores');
    }

    $gender = $data['gender'];
    if (!in_array($gender, ['male', 'female'])) {
        json_error('Gender must be male or female');
    }

    $classId = (int) $data['class_id'];
    $startingSkills = $data['starting_skills'];
    if (!is_array($startingSkills) || count($startingSkills) < 5) {
        json_error('You must select at least 5 starting skills');
    }

    $db = Database::getInstance();

    // Check email uniqueness
    $stmt = $db->prepare('SELECT COUNT(*) FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ((int) $stmt->fetchColumn() > 0) {
        json_error('An account with this email already exists');
    }

    // Check character name uniqueness
    $stmt = $db->prepare('SELECT COUNT(*) FROM characters WHERE name = ?');
    $stmt->execute([$characterName]);
    if ((int) $stmt->fetchColumn() > 0) {
        json_error('This character name is already taken');
    }

    // Validate class exists
    $stmt = $db->prepare('SELECT COUNT(*) FROM classes WHERE id = ?');
    $stmt->execute([$classId]);
    if ((int) $stmt->fetchColumn() === 0) {
        json_error('Invalid class selected');
    }

    // Create everything in a transaction
    $db->beginTransaction();
    try {
        // Create user
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $db->prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)');
        $stmt->execute([$email, $passwordHash]);
        $userId = (int) $db->lastInsertId();

        // Create character
        $stmt = $db->prepare('INSERT INTO characters (user_id, name, gender, class_id) VALUES (?, ?, ?, ?)');
        $stmt->execute([$userId, $characterName, $gender, $classId]);

        // Create user skills with initial hours
        $stmt = $db->prepare('INSERT INTO user_skills (user_id, skill_id, total_xp, current_level) VALUES (?, ?, ?, ?)');
        foreach ($startingSkills as $skill) {
            $skillId = (int) ($skill['skill_id'] ?? 0);
            $initialHours = max(0, min(10000, (float) ($skill['initial_hours'] ?? 0)));

            // Get skill's xp_multiplier
            $skillStmt = $db->prepare('SELECT xp_multiplier, max_level FROM skills WHERE id = ? AND is_active = 1');
            $skillStmt->execute([$skillId]);
            $skillData = $skillStmt->fetch();
            if (!$skillData) continue;

            $xp = XP::hoursToXP($initialHours, (float) $skillData['xp_multiplier']);
            $level = XP::xpToLevel($xp, (int) $skillData['max_level']);

            $stmt->execute([$userId, $skillId, $xp, $level]);
        }

        $db->commit();

        // Log the user in
        session_regenerate_id(true);
        $_SESSION['user_id'] = $userId;
        $_SESSION['user_email'] = $email;
        $_SESSION['user_role'] = 'user';

        json_response(['success' => true, 'redirect' => '/app']);
    } catch (Exception $e) {
        $db->rollBack();
        json_error('Registration failed. Please try again.', 500);
    }
});

// Login
$router->post('/api/auth/login', function () {
    $data = get_json_body();

    $email = filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL);
    $password = $data['password'] ?? '';

    if (!$email || !$password) {
        json_error('Email and password are required');
    }

    $db = Database::getInstance();
    $stmt = $db->prepare('SELECT id, email, password_hash, role, is_active FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        json_error('Invalid email or password', 401);
    }

    if (!$user['is_active']) {
        json_error('This account has been deactivated', 403);
    }

    // Update last login
    $db->prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?')->execute([$user['id']]);

    // Start session
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $user['id'];
    $_SESSION['user_email'] = $user['email'];
    $_SESSION['user_role'] = $user['role'];

    json_response(['success' => true, 'redirect' => '/app']);
});

// Logout
$router->post('/api/auth/logout', function () {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params['path'], $params['domain'],
            $params['secure'], $params['httponly']
        );
    }
    session_destroy();
    json_response(['success' => true]);
});

// Get current user info
$router->get('/api/auth/me', function () {
    if (!is_logged_in()) {
        json_error('Not authenticated', 401);
    }
    json_response([
        'id'    => current_user_id(),
        'email' => $_SESSION['user_email'] ?? '',
        'role'  => $_SESSION['user_role'] ?? 'user',
    ]);
});
