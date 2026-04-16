<?php
// $character_id is the character's user_id (characters are 1:1 with users)
$db = Database::getInstance();

// Get character with class info
$stmt = $db->prepare('
    SELECT c.*, cl.name as class_name, cl.color as class_color, cl.slug as class_slug,
           cl.image_url_male, cl.image_url_female
    FROM characters c
    JOIN classes cl ON cl.id = c.class_id
    WHERE c.user_id = ?
');
$stmt->execute([$character_id]);
$character = $stmt->fetch();

if (!$character) {
    http_response_code(404);
    $pageTitle = 'Character Not Found';
    // render simple 404
    echo '<p>Character not found.</p>';
    exit;
}

// Get user skills
$stmt = $db->prepare('
    SELECT us.skill_id, us.current_level, us.total_xp, s.name
    FROM user_skills us JOIN skills s ON s.id = us.skill_id
    WHERE us.user_id = ?
    ORDER BY us.current_level DESC
');
$stmt->execute([$character_id]);
$skills = $stmt->fetchAll();

// Get attributes
$stmt = $db->query('SELECT id, name, slug, color FROM attributes ORDER BY sort_order');
$attributes = $stmt->fetchAll();

// Get skill-attribute map for this user's skills
$skillIds   = array_column($skills, 'skill_id');
$attrScores = [];
if (!empty($skillIds)) {
    $placeholders = implode(',', array_fill(0, count($skillIds), '?'));
    $stmt = $db->prepare("
        SELECT sam.attribute_id, sam.ratio, us.current_level
        FROM skill_attribute_map sam
        JOIN user_skills us ON us.skill_id = sam.skill_id
        WHERE us.user_id = ? AND sam.skill_id IN ($placeholders)
    ");
    $stmt->execute(array_merge([$character_id], $skillIds));
    foreach ($stmt->fetchAll() as $row) {
        $attrScores[$row['attribute_id']] = ($attrScores[$row['attribute_id']] ?? 0)
            + ($row['current_level'] * $row['ratio']);
    }
}

// Overall level: average of attr scores (same as JS)
$attrValues   = array_filter(array_values($attrScores));
$overallLevel = count($attrValues) > 0 ? round(array_sum($attrValues) / count($attrValues)) : 0;

// Top 5 skills
$topSkills = array_slice($skills, 0, 5);

$imgUrl = $character['gender'] === 'female'
    ? $character['image_url_female']
    : $character['image_url_male'];

$pageTitle   = h($character['name']) . ' - ' . h($character['class_name']);
$contentView = 'pages/_share_content.php';
require __DIR__ . '/../layouts/main.php';
