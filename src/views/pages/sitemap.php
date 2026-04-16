<?php
header('Content-Type: application/xml; charset=utf-8');
$db     = Database::getInstance();
$skills = $db->query('SELECT slug FROM skills WHERE is_active = 1')->fetchAll();
$today  = date('Y-m-d');
$base   = 'https://lifeisanrpg.app';
echo '<?xml version="1.0" encoding="UTF-8"?>';
?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc><?= $base ?>/</loc><lastmod><?= $today ?></lastmod><priority>1.0</priority></url>
  <url><loc><?= $base ?>/features</loc><lastmod><?= $today ?></lastmod><priority>0.7</priority></url>
  <url><loc><?= $base ?>/about</loc><lastmod><?= $today ?></lastmod><priority>0.6</priority></url>
  <url><loc><?= $base ?>/skills</loc><lastmod><?= $today ?></lastmod><priority>0.9</priority></url>
  <?php foreach ($skills as $skill): ?>
  <url><loc><?= $base ?>/skills/<?= h($skill['slug']) ?></loc><lastmod><?= $today ?></lastmod><priority>0.8</priority></url>
  <?php endforeach; ?>
</urlset>
