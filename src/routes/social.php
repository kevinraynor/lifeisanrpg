<?php
/**
 * Social / Friends API routes.
 *
 * Registration order matters: literal paths before {id} wildcards.
 */

// -----------------------------------------------------------------------
// Activity Feed — own + accepted friends, today only, with cheer data
// -----------------------------------------------------------------------
$router->get('/api/feed', function () {
    requireAuth();
    $db     = Database::getInstance();
    $userId = current_user_id();

    // Bidirectional friend lookup (accepted only)
    $stmt = $db->prepare('
        SELECT CASE WHEN user_id = :me1 THEN friend_id ELSE user_id END AS friend_id
        FROM friendships
        WHERE status = \'accepted\' AND (user_id = :me2 OR friend_id = :me3)
    ');
    $stmt->execute([':me1' => $userId, ':me2' => $userId, ':me3' => $userId]);
    $friendIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

    $allIds = array_merge([$userId], $friendIds);
    $ph     = implode(',', array_fill(0, count($allIds), '?'));

    $stmt = $db->prepare("
        SELECT
            al.id,
            al.user_id,
            al.hours,
            al.xp_earned,
            al.level_before,
            al.level_after,
            al.note,
            al.logged_at,
            s.name   AS skill_name,
            s.slug   AS skill_slug,
            c.name   AS character_name,
            c.gender AS character_gender,
            cl.slug  AS class_slug,
            (SELECT COUNT(*) FROM activity_cheers ac WHERE ac.activity_id = al.id)
                AS cheer_count,
            (SELECT COUNT(*) FROM activity_cheers ac
             WHERE ac.activity_id = al.id AND ac.user_id = ?)
                AS i_cheered
        FROM activity_log al
        JOIN skills     s  ON s.id      = al.skill_id
        JOIN characters c  ON c.user_id = al.user_id
        JOIN classes    cl ON cl.id     = c.class_id
        WHERE al.user_id IN ($ph)
          AND al.logged_at >= CURDATE()
        ORDER BY al.logged_at DESC
        LIMIT 100
    ");

    // First param for i_cheered sub-select, then the IN list
    $params = array_merge([$userId], $allIds);
    $stmt->execute($params);

    $activities = $stmt->fetchAll();
    foreach ($activities as &$a) {
        $a['i_cheered']   = (bool)(int)$a['i_cheered'];
        $a['is_own']      = ((int)$a['user_id'] === $userId);
        $a['cheer_count'] = (int)$a['cheer_count'];
    }
    unset($a);

    json_response($activities);
});

// -----------------------------------------------------------------------
// Friends — accepted list with character data, top skills, active today
// -----------------------------------------------------------------------
$router->get('/api/friends', function () {
    requireAuth();
    $db = Database::getInstance();
    $me = current_user_id();

    $stmt = $db->prepare('
        SELECT
            CASE WHEN f.user_id = :me1 THEN f.friend_id ELSE f.user_id END AS friend_user_id,
            f.id         AS friendship_id,
            f.created_at AS friends_since,
            c.id         AS character_id,
            c.name       AS character_name,
            c.gender,
            c.quote,
            cl.name      AS class_name,
            cl.slug      AS class_slug,
            cl.color     AS class_color,
            cl.image_url_male,
            cl.image_url_female,
            EXISTS(
                SELECT 1 FROM activity_log al
                WHERE al.user_id = CASE WHEN f.user_id = :me2 THEN f.friend_id ELSE f.user_id END
                  AND al.logged_at >= CURDATE()
            ) AS active_today
        FROM friendships f
        JOIN characters c  ON c.user_id = CASE WHEN f.user_id = :me3 THEN f.friend_id ELSE f.user_id END
        JOIN classes    cl ON cl.id     = c.class_id
        WHERE f.status = \'accepted\'
          AND (f.user_id = :me4 OR f.friend_id = :me5)
        ORDER BY c.name
    ');
    $stmt->execute([
        ':me1' => $me, ':me2' => $me, ':me3' => $me,
        ':me4' => $me, ':me5' => $me,
    ]);
    $friends = $stmt->fetchAll();

    // Fetch all activated skills per friend
    $uids = array_column($friends, 'friend_user_id');
    $skillsByUser = [];
    if (!empty($uids)) {
        $ph2   = implode(',', array_fill(0, count($uids), '?'));
        $stmt2 = $db->prepare("
            SELECT us.user_id, us.current_level, s.name, s.slug
            FROM user_skills us
            JOIN skills s ON s.id = us.skill_id
            WHERE us.user_id IN ($ph2)
            ORDER BY us.user_id, us.current_level DESC
        ");
        $stmt2->execute($uids);
        foreach ($stmt2->fetchAll() as $row) {
            $skillsByUser[$row['user_id']][] = $row;
        }
    }

    foreach ($friends as &$f) {
        $uid  = $f['friend_user_id'];
        $all  = $skillsByUser[$uid] ?? [];
        $f['top_skills']    = array_slice($all, 0, 3);
        $f['skill_slugs']   = array_column($all, 'slug');
        $levels             = array_column($all, 'current_level');
        $f['overall_level'] = $levels ? (int)round(array_sum($levels) / count($levels)) : 0;
        $f['active_today']  = (bool)(int)$f['active_today'];
    }
    unset($f);

    json_response($friends);
});

// -----------------------------------------------------------------------
// Pending incoming friend requests
// -----------------------------------------------------------------------
$router->get('/api/friends/pending', function () {
    requireAuth();
    $db = Database::getInstance();
    $me = current_user_id();

    $stmt = $db->prepare('
        SELECT
            f.id         AS friendship_id,
            f.user_id    AS requester_id,
            f.created_at,
            c.name       AS character_name,
            c.gender,
            cl.slug      AS class_slug,
            cl.name      AS class_name,
            cl.color     AS class_color,
            cl.image_url_male,
            cl.image_url_female
        FROM friendships f
        JOIN characters c  ON c.user_id = f.user_id
        JOIN classes    cl ON cl.id     = c.class_id
        WHERE f.friend_id = ? AND f.status = \'pending\'
        ORDER BY f.created_at DESC
    ');
    $stmt->execute([$me]);
    json_response($stmt->fetchAll());
});

// -----------------------------------------------------------------------
// Search users by character name (LIKE) or exact email
// -----------------------------------------------------------------------
$router->get('/api/friends/search', function () {
    requireAuth();
    $db = Database::getInstance();
    $me = current_user_id();
    $q  = trim($_GET['q'] ?? '');

    if (strlen($q) < 2) {
        json_response([]);
        return;
    }

    $like = '%' . $q . '%';
    $stmt = $db->prepare('
        SELECT
            u.id         AS user_id,
            c.name       AS character_name,
            c.gender,
            cl.slug      AS class_slug,
            cl.name      AS class_name,
            cl.color     AS class_color,
            (SELECT status FROM friendships
             WHERE (user_id = :me2 AND friend_id = u.id)
                OR (user_id = u.id AND friend_id = :me3)
             LIMIT 1) AS friendship_status,
            (SELECT id FROM friendships
             WHERE (user_id = :me4 AND friend_id = u.id)
                OR (user_id = u.id AND friend_id = :me5)
             LIMIT 1) AS friendship_id
        FROM users u
        JOIN characters c  ON c.user_id = u.id
        JOIN classes    cl ON cl.id     = c.class_id
        WHERE u.is_active = 1
          AND u.id != :me1
          AND (c.name LIKE :like OR u.email = :exact)
        LIMIT 10
    ');
    $stmt->execute([
        ':me1'  => $me,  ':me2'  => $me,  ':me3'  => $me,
        ':me4'  => $me,  ':me5'  => $me,
        ':like' => $like, ':exact' => $q,
    ]);
    json_response($stmt->fetchAll());
});

// -----------------------------------------------------------------------
// Send a friend request
// -----------------------------------------------------------------------
$router->post('/api/friends/request', function () {
    requireAuth();
    if (!validate_csrf()) { json_error('Invalid CSRF token', 403); }

    $db           = Database::getInstance();
    $me           = current_user_id();
    $data         = get_json_body();
    $targetUserId = (int)($data['user_id'] ?? 0);

    if (!$targetUserId)        { json_error('user_id required'); }
    if ($targetUserId === $me) { json_error('Cannot add yourself as a friend'); }

    // Verify target exists and is active
    $stmt = $db->prepare('SELECT id FROM users WHERE id = ? AND is_active = 1');
    $stmt->execute([$targetUserId]);
    if (!$stmt->fetch()) { json_error('User not found', 404); }

    // Check for any existing relationship (either direction)
    $stmt = $db->prepare('
        SELECT status FROM friendships
        WHERE (user_id = ? AND friend_id = ?)
           OR (user_id = ? AND friend_id = ?)
    ');
    $stmt->execute([$me, $targetUserId, $targetUserId, $me]);
    $existing = $stmt->fetch();

    if ($existing) {
        if ($existing['status'] === 'accepted') { json_error('Already friends'); }
        if ($existing['status'] === 'pending')  { json_error('Request already pending'); }
        if ($existing['status'] === 'blocked')  { json_error('Cannot send request', 403); }
    }

    $db->prepare('INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, \'pending\')')
       ->execute([$me, $targetUserId]);

    json_response(['success' => true]);
});

// -----------------------------------------------------------------------
// Accept a pending friend request (recipient only)
// -----------------------------------------------------------------------
$router->post('/api/friends/{id}/accept', function (string $id) {
    requireAuth();
    if (!validate_csrf()) { json_error('Invalid CSRF token', 403); }

    $db           = Database::getInstance();
    $me           = current_user_id();
    $friendshipId = (int)$id;

    $stmt = $db->prepare('
        SELECT id FROM friendships
        WHERE id = ? AND friend_id = ? AND status = \'pending\'
    ');
    $stmt->execute([$friendshipId, $me]);
    if (!$stmt->fetch()) { json_error('Request not found', 404); }

    $db->prepare('UPDATE friendships SET status = \'accepted\' WHERE id = ?')
       ->execute([$friendshipId]);

    json_response(['success' => true]);
});

// -----------------------------------------------------------------------
// Decline a pending friend request (deletes row so re-invite is possible)
// -----------------------------------------------------------------------
$router->post('/api/friends/{id}/decline', function (string $id) {
    requireAuth();
    if (!validate_csrf()) { json_error('Invalid CSRF token', 403); }

    $db           = Database::getInstance();
    $me           = current_user_id();
    $friendshipId = (int)$id;

    $stmt = $db->prepare('
        SELECT id FROM friendships
        WHERE id = ? AND friend_id = ? AND status = \'pending\'
    ');
    $stmt->execute([$friendshipId, $me]);
    if (!$stmt->fetch()) { json_error('Request not found', 404); }

    $db->prepare('DELETE FROM friendships WHERE id = ?')->execute([$friendshipId]);

    json_response(['success' => true]);
});

// -----------------------------------------------------------------------
// Unfriend (either party may remove an accepted friendship)
// -----------------------------------------------------------------------
$router->delete('/api/friends/{id}', function (string $id) {
    requireAuth();
    if (!validate_csrf()) { json_error('Invalid CSRF token', 403); }

    $db           = Database::getInstance();
    $me           = current_user_id();
    $friendshipId = (int)$id;

    $stmt = $db->prepare('
        SELECT id FROM friendships
        WHERE id = ? AND (user_id = ? OR friend_id = ?) AND status = \'accepted\'
    ');
    $stmt->execute([$friendshipId, $me, $me]);
    if (!$stmt->fetch()) { json_error('Friendship not found', 404); }

    $db->prepare('DELETE FROM friendships WHERE id = ?')->execute([$friendshipId]);

    json_response(['success' => true]);
});

// -----------------------------------------------------------------------
// Toggle cheer on an activity (friends only, not own)
// -----------------------------------------------------------------------
$router->post('/api/activities/{id}/cheer', function (string $id) {
    requireAuth();
    if (!validate_csrf()) { json_error('Invalid CSRF token', 403); }

    $db         = Database::getInstance();
    $me         = current_user_id();
    $activityId = (int)$id;

    // Verify activity exists
    $stmt = $db->prepare('SELECT user_id FROM activity_log WHERE id = ?');
    $stmt->execute([$activityId]);
    $activity = $stmt->fetch();
    if (!$activity) { json_error('Activity not found', 404); }

    // Cannot cheer own activity
    if ((int)$activity['user_id'] === $me) {
        json_error('Cannot cheer your own activity');
    }

    // Must be friends with the activity owner
    $stmt = $db->prepare('
        SELECT id FROM friendships
        WHERE status = \'accepted\'
          AND ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
    ');
    $stmt->execute([$me, $activity['user_id'], $activity['user_id'], $me]);
    if (!$stmt->fetch()) { json_error('Not friends with this user', 403); }

    // Toggle: check existing cheer
    $stmt = $db->prepare('SELECT id FROM activity_cheers WHERE activity_id = ? AND user_id = ?');
    $stmt->execute([$activityId, $me]);
    $existing = $stmt->fetch();

    if ($existing) {
        $db->prepare('DELETE FROM activity_cheers WHERE id = ?')->execute([$existing['id']]);
        $cheered = false;
    } else {
        $db->prepare('INSERT INTO activity_cheers (activity_id, user_id) VALUES (?, ?)')
           ->execute([$activityId, $me]);
        $cheered = true;
    }

    $stmt = $db->prepare('SELECT COUNT(*) FROM activity_cheers WHERE activity_id = ?');
    $stmt->execute([$activityId]);
    $count = (int)$stmt->fetchColumn();

    json_response(['cheered' => $cheered, 'cheer_count' => $count]);
});
