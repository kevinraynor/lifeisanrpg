<?php
/**
 * Dashboard SPA shell.
 * The sidebar + right panel stay fixed; center content is swapped by JS router.
 */
$db = Database::getInstance();
$userId = current_user_id();

// Fetch all data for pre-loading
$character = $db->prepare('
    SELECT c.*, cl.name as class_name, cl.slug as class_slug, cl.color as class_color,
           cl.image_url_male, cl.image_url_female
    FROM characters c
    JOIN classes cl ON cl.id = c.class_id
    WHERE c.user_id = ?
');
$character->execute([$userId]);
$characterData = $character->fetch();

$userSkills = $db->prepare('
    SELECT us.*, s.name, s.slug, s.description, s.icon, s.max_level, s.xp_multiplier, s.category
    FROM user_skills us
    JOIN skills s ON s.id = us.skill_id
    WHERE us.user_id = ?
    ORDER BY us.last_logged DESC
');
$userSkills->execute([$userId]);
$userSkillsData = $userSkills->fetchAll();

$allSkills = $db->query('SELECT ' . Skills::COLS . ' FROM skills WHERE is_active = 1 ORDER BY sort_order')->fetchAll();
$allAttributes = $db->query('SELECT * FROM attributes ORDER BY sort_order')->fetchAll();
$skillAttrMap = $db->query('SELECT skill_id, attribute_id, ratio FROM skill_attribute_map')->fetchAll();
$skillPrereqs = $db->query('SELECT skill_id, required_skill_id, required_level FROM skill_prerequisites')->fetchAll();

$attributeScores = User::computeAttributeScores($userId);

$userData = [
    'id'    => $userId,
    'email' => $_SESSION['user_email'] ?? '',
    'role'  => $_SESSION['user_role'] ?? 'user',
];

// Pending friend request count (for notification badge)
$pendingStmt = $db->prepare('SELECT COUNT(*) FROM friendships WHERE friend_id = ? AND status = \'pending\'');
$pendingStmt->execute([$userId]);
$pendingFriendCount = (int)$pendingStmt->fetchColumn();

// Guild invite count for sidebar badge — lightweight count only; full data fetched lazily by the guild page
$guildInvStmt = $db->prepare('SELECT COUNT(*) FROM guild_invitations WHERE invitee_id = ? AND status = \'pending\'');
$guildInvStmt->execute([$userId]);
$pendingGuildInviteCount = (int) $guildInvStmt->fetchColumn();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Life Is An RPG</title>
    <link rel="stylesheet" href="/css/theme.css">
    <link rel="stylesheet" href="/css/layout.css">
    <link rel="stylesheet" href="/css/components.css">
    <link rel="stylesheet" href="/css/pages.css">
    <link rel="stylesheet" href="/css/animations.css">
</head>
<body class="dashboard-body">
    <?php require __DIR__ . '/../partials/header.php'; ?>

    <div class="dashboard-layout">
        <!-- Left Sidebar -->
        <aside class="sidebar" id="sidebar">
            <nav class="sidebar-nav">
                <a href="/app" class="sidebar-link active" data-page="dashboard">
                    <span class="sidebar-icon">&#9876;</span> Character
                </a>
                <a href="/app/skills" class="sidebar-link" data-page="skills">
                    <span class="sidebar-icon">&#9733;</span> Skills
                </a>
                <a href="/app/explore" class="sidebar-link" data-page="explore">
                    <span class="sidebar-icon">&#128270;</span> Explore
                </a>
                <a href="/app/attributes" class="sidebar-link" data-page="attributes">
                    <span class="sidebar-icon">&#128200;</span> Attributes
                </a>
                <a href="/app/tree" class="sidebar-link" data-page="tree">
                    <span class="sidebar-icon">&#127795;</span> Skill Tree
                </a>
                <a href="/app/quests" class="sidebar-link" data-page="quests">
                    <span class="sidebar-icon">&#128220;</span> Quests
                </a>
                <a href="/app/friends" class="sidebar-link" data-page="friends">
                    <span class="sidebar-icon">&#128101;</span> Friends
                    <span class="friend-badge" id="friend-badge" style="display:none"></span>
                </a>
                <a href="/app/guild" class="sidebar-link" data-page="guild">
                    <span class="sidebar-icon">&#127984;</span> Guild
                    <span class="friend-badge" id="guild-badge" style="display:none"></span>
                </a>
            </nav>
        </aside>

        <!-- Main Content (swapped by JS router) -->
        <main class="dashboard-main" id="dashboard-main">
            <p>Loading...</p>
        </main>

        <!-- Right Panel: Social Feed -->
        <aside class="social-panel" id="social-panel">
            <h3 class="panel-title">Activity Feed</h3>
            <div class="feed-content" id="feed-content">
                <p class="feed-empty">No activity yet. Start logging progress to see updates here!</p>
            </div>
        </aside>
    </div>

    <!-- Pre-loaded data -->
    <script>
        window.__INITIAL_DATA__ = <?= json_encode([
            // Core: always needed at boot
            'user'            => $userData,
            'character'       => $characterData,
            'userSkills'      => $userSkillsData,
            'attributeScores' => $attributeScores,
            'csrfToken'       => csrf_token(),
            // Skill catalog: stable reference data for explore/tree/attributes
            'allSkills'       => $allSkills,
            'allAttributes'   => $allAttributes,
            'skillAttrMap'    => $skillAttrMap,
            'skillPrereqs'    => $skillPrereqs,
            // Sidebar badges
            'pendingFriendCount'      => $pendingFriendCount,
            'pendingGuildInviteCount' => $pendingGuildInviteCount,
            // NOTE: allClasses, quests, guild, and guildInvitations are fetched
            // lazily by the pages that need them (account, quests, guild).
        ], JSON_UNESCAPED_UNICODE) ?>;
    </script>
    <script type="module" src="/js/app.js"></script>
</body>
</html>
