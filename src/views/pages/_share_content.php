<?php
// Max level constant (matches XP formula ceiling)
$maxSkillLevel = 250;
?>

<div style="max-width: 720px; margin: var(--space-3xl) auto; padding: 0 var(--space-lg); text-align: center;">

    <p class="hero-subtitle">CHARACTER PROFILE</p>
    <h1 style="margin-bottom: var(--space-2xl);"><?= h($character['name']) ?></h1>

    <!-- Character card (matches dashboard/landing layout) -->
    <div class="character-card character-card--demo" style="margin: 0 auto var(--space-2xl);">
        <div class="character-card__portrait">
            <?php if ($imgUrl): ?>
                <img src="<?= h($imgUrl) ?>"
                     alt="<?= h($character['class_name']) ?>"
                     onerror="this.parentElement.style.display='none'">
            <?php endif; ?>
        </div>

        <div class="character-card__body">

            <div class="character-card__header">
                <div class="character-card__info">
                    <h3 class="character-card__name"><?= h($character['name']) ?></h3>
                    <p class="character-card__class" style="color: <?= h($character['class_color'] ?? 'var(--color-text-secondary)') ?>;">
                        Level <?= (int)$overallLevel ?> &middot; <?= h($character['class_name']) ?>
                    </p>
                    <?php if (!empty($character['quote'])): ?>
                    <div class="character-card__quote-area">
                        <p class="character-card__quote"><em><?= h($character['quote']) ?></em></p>
                    </div>
                    <?php endif; ?>
                </div>
            </div>

            <!-- Attributes -->
            <?php if (!empty($attributes)): ?>
            <div class="character-card__stats">
                <h4>Attributes</h4>
                <?php foreach ($attributes as $attr): ?>
                    <?php $score = round($attrScores[$attr['id']] ?? 0); ?>
                    <div class="stat-row">
                        <span class="stat-icon" style="color: <?= h($attr['color'] ?? '#888') ?>;">&#9670;</span>
                        <span class="stat-name"><?= h($attr['name']) ?></span>
                        <span class="stat-value"><?= $score ?></span>
                    </div>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>

            <!-- Top skills -->
            <?php if (!empty($topSkills)): ?>
            <div class="character-card__skills">
                <h4>Top Skills</h4>
                <?php foreach ($topSkills as $skill):
                    $pct = min(100, round(($skill['current_level'] / $maxSkillLevel) * 100));
                ?>
                    <div class="card-skill-row">
                        <div class="card-skill-info">
                            <span class="card-skill-name"><?= h($skill['name']) ?></span>
                            <span class="card-skill-level">Lv. <?= (int)$skill['current_level'] ?></span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-bar__fill" style="width: <?= $pct ?>%" data-percent="<?= $pct ?>"></div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
            <?php else: ?>
            <p style="color: var(--color-text-secondary); font-size: 0.9rem; font-style: italic;">
                No skills activated yet.
            </p>
            <?php endif; ?>

        </div>
    </div>

    <!-- CTA -->
    <div style="margin-top: var(--space-2xl);">
        <p style="color: var(--color-text-secondary); margin-bottom: var(--space-lg);">Want to build your own RPG character?</p>
        <a href="/register" class="btn-fantasy btn-primary btn-large">Create Your Character</a>
    </div>

</div>
