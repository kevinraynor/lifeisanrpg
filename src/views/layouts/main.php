<?php
/**
 * Main layout: Full HTML shell with header and footer.
 * Variables: $pageTitle, $pageContent (or include content via $contentView)
 */
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= h($pageTitle ?? 'Life Is An RPG') ?> - Life Is An RPG</title>
    <link rel="stylesheet" href="/css/theme.css">
    <link rel="stylesheet" href="/css/layout.css">
    <link rel="stylesheet" href="/css/components.css">
    <link rel="stylesheet" href="/css/pages.css">
    <link rel="stylesheet" href="/css/animations.css">
</head>
<body>
    <?php require __DIR__ . '/../partials/header.php'; ?>

    <main id="main-content">
        <?php
        if (isset($contentView)) {
            require __DIR__ . '/../' . $contentView;
        }
        ?>
    </main>

    <?php require __DIR__ . '/../partials/footer.php'; ?>
</body>
</html>
