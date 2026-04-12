<?php
/**
 * Admin panel SPA shell.
 */
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
                <a href="/admin" class="sidebar-link active" data-page="overview">Overview</a>
                <a href="/admin/skills" class="sidebar-link" data-page="skills">Skills</a>
                <a href="/admin/users" class="sidebar-link" data-page="users">Users</a>
                <a href="/admin/classes" class="sidebar-link" data-page="classes">Classes</a>
            </nav>
        </aside>

        <main class="admin-main" id="admin-main">
            <h1>Admin Dashboard</h1>
            <p>Welcome to the admin panel.</p>
        </main>
    </div>

    <script>
        window.__CSRF_TOKEN__ = <?= json_encode(csrf_token()) ?>;
    </script>
    <script type="module" src="/js/admin/admin-app.js"></script>
</body>
</html>
