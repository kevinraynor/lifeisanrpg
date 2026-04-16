<?php
// $slug is passed from the router
$db = Database::getInstance();
$stmt = $db->prepare('SELECT s.*, sc.body_markdown, sc.celebrities, sc.resources, sc.tips FROM skills s LEFT JOIN skill_content sc ON sc.skill_id = s.id WHERE s.slug = ? AND s.is_active = 1');
$stmt->execute([$slug]);
$skill = $stmt->fetch();

if (!$skill) {
    http_response_code(404);
    $pageTitle = 'Skill Not Found';
    $contentView = 'pages/_skill_detail_content.php';
    require __DIR__ . '/../layouts/main.php';
    exit;
}

// Get attribute mappings
$stmt = $db->prepare('SELECT a.name as attr_name, a.color, sam.ratio FROM skill_attribute_map sam JOIN attributes a ON a.id = sam.attribute_id WHERE sam.skill_id = ? ORDER BY sam.ratio DESC');
$stmt->execute([$skill['id']]);
$attributes = $stmt->fetchAll();

// Parse JSON content
$skill['celebrities'] = json_decode($skill['celebrities'] ?? 'null', true) ?: [];
$skill['resources']   = json_decode($skill['resources']   ?? 'null', true) ?: [];
$skill['tips']        = json_decode($skill['tips']        ?? 'null', true) ?: [];

$pageTitle       = $skill['name'];
$pageDescription = substr($skill['description'] ?? '', 0, 155);
$contentView     = 'pages/_skill_detail_content.php';
require __DIR__ . '/../layouts/main.php';
