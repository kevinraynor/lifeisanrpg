<?php
/**
 * Admin panel SPA shell.
 * Pre-loads attributes (for skill-attribute mapping editor).
 */
$db = Database::getInstance();
$allAttributes = $db->query('SELECT * FROM attributes ORDER BY sort_order')->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin - Life Is An RPG</title>
    <link rel="stylesheet" href="/css/theme.css">
    <link rel="stylesheet" href="/css/layout.css">
    <link rel="stylesheet" href="/css/components.css">
    <link rel="stylesheet" href="/css/pages.css">
    <link rel="stylesheet" href="/css/admin.css">
</head>
<body class="admin-body">
    <header class="site-header admin-header">
        <div class="header-container">
            <a href="/admin" class="logo">
                <span class="logo-icon">&#9876;</span>
                <span class="logo-text">ADMIN PANEL</span>
            </a>
            <nav class="header-nav">
                <a href="/app" class="nav-link">Back to App</a>
                <a href="/" class="nav-link">Home</a>
            </nav>
        </div>
    </header>

    <div class="admin-layout">
        <aside class="admin-sidebar">
            <nav class="sidebar-nav">
                <a href="/admin" class="sidebar-link active" data-page="overview">
                    <span class="sidebar-icon">&#128200;</span> Overview
                </a>
                <a href="/admin/skills" class="sidebar-link" data-page="skills">
                    <span class="sidebar-icon">&#9733;</span> Skills
                </a>
                <a href="/admin/users" class="sidebar-link" data-page="users">
                    <span class="sidebar-icon">&#128101;</span> Users
                </a>
                <a href="/admin/classes" class="sidebar-link" data-page="classes">
                    <span class="sidebar-icon">&#127984;</span> Classes
                </a>
            </nav>
        </aside>

        <main class="admin-main" id="admin-main">
            <p>Loading...</p>
        </main>
    </div>

    <script>
        window.__ADMIN_DATA__ = <?= json_encode([
            'attributes' => $allAttributes,
            'csrfToken'  => csrf_token(),
        ], JSON_UNESCAPED_UNICODE) ?>;
    </script>
    <script type="module" src="/js/admin/admin-app.js"></script>
</body>
</html>
