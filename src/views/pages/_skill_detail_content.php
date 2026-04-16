<?php if (!isset($skill) || !$skill): ?>

    <div style="max-width: 800px; margin: 0 auto; padding: var(--space-3xl) var(--space-lg); text-align: center;">
        <h1>Skill Not Found</h1>
        <p style="color: var(--color-text-secondary); margin-bottom: var(--space-xl);">
            The skill you're looking for doesn't exist or has been removed.
        </p>
        <a href="/skills" class="btn-fantasy btn-secondary">← Back to All Skills</a>
    </div>

<?php else: ?>

<div style="max-width: 800px; margin: 0 auto; padding: var(--space-3xl) var(--space-lg);">

    <!-- Breadcrumb -->
    <nav style="margin-bottom: var(--space-xl);">
        <a href="/skills" style="color: var(--color-text-secondary); text-decoration: none; font-size: 0.9rem;">
            ← All Skills
        </a>
    </nav>

    <!-- Skill hero -->
    <div class="card-ornate" style="margin-bottom: var(--space-xl); padding: var(--space-xl);">
        <div style="display: flex; align-items: flex-start; gap: var(--space-lg); flex-wrap: wrap;">
            <div style="flex: 1; min-width: 240px;">
                <div style="display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-md); flex-wrap: wrap;">
                    <h1 style="margin: 0;"><?= h($skill['name']) ?></h1>
                    <?php if ($skill['category']): ?>
                        <span style="
                            background: var(--color-bg-secondary);
                            border: 1px solid var(--border-card-light);
                            border-radius: 999px;
                            padding: 2px 12px;
                            font-size: 0.8rem;
                            color: var(--color-text-secondary);
                            white-space: nowrap;
                        "><?= h($skill['category']) ?></span>
                    <?php endif; ?>
                </div>
                <?php if ($skill['description']): ?>
                    <p style="color: var(--color-text-secondary); line-height: 1.6; margin: 0;">
                        <?= h($skill['description']) ?>
                    </p>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- Attribute contributions -->
    <?php if (!empty($attributes)): ?>
    <div style="margin-bottom: var(--space-xl);">
        <h2 style="font-size: 1rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-secondary); margin-bottom: var(--space-md);">
            Attribute Contributions
        </h2>
        <div style="display: flex; flex-wrap: wrap; gap: var(--space-sm);">
            <?php foreach ($attributes as $attr): ?>
                <span style="
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: var(--color-bg-secondary);
                    border: 1px solid var(--border-card-light);
                    border-radius: 999px;
                    padding: 4px 14px;
                    font-size: 0.875rem;
                ">
                    <span style="
                        display: inline-block;
                        width: 10px;
                        height: 10px;
                        border-radius: 50%;
                        background-color: <?= h($attr['color'] ?? '#888') ?>;
                        flex-shrink: 0;
                    "></span>
                    <?= h($attr['attr_name']) ?>
                    <strong><?= round($attr['ratio'] * 100) ?>%</strong>
                </span>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>

    <!-- Stats -->
    <div style="margin-bottom: var(--space-xl); display: flex; gap: var(--space-xl); flex-wrap: wrap;">
        <div>
            <p style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-secondary); margin: 0 0 4px;">Max Level</p>
            <p style="font-size: 1.5rem; font-weight: 700; margin: 0;"><?= (int)$skill['max_level'] ?></p>
        </div>
        <?php if ((float)$skill['xp_multiplier'] !== 1.0): ?>
        <div>
            <p style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-secondary); margin: 0 0 4px;">XP Multiplier</p>
            <p style="font-size: 1.5rem; font-weight: 700; margin: 0;"><?= h(number_format((float)$skill['xp_multiplier'], 1)) ?>x</p>
        </div>
        <?php endif; ?>
    </div>

    <!-- Extended content: body -->
    <?php if (!empty($skill['body_markdown'])): ?>
    <div style="margin-bottom: var(--space-xl);">
        <h2>About This Skill</h2>
        <div style="line-height: 1.7; color: var(--color-text-secondary);">
            <?php
            // Render each paragraph separated by blank lines
            $paragraphs = preg_split('/\n{2,}/', trim($skill['body_markdown']));
            foreach ($paragraphs as $para):
                $para = trim($para);
                if ($para === '') continue;
            ?>
                <p><?= nl2br(h($para)) ?></p>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>

    <!-- Tips -->
    <?php if (!empty($skill['tips'])): ?>
    <div style="margin-bottom: var(--space-xl);">
        <h2>Tips for Success</h2>
        <ul style="color: var(--color-text-secondary); line-height: 1.8; padding-left: var(--space-lg);">
            <?php foreach ($skill['tips'] as $tip): ?>
                <li><?= h($tip) ?></li>
            <?php endforeach; ?>
        </ul>
    </div>
    <?php endif; ?>

    <!-- Celebrities / Notable People -->
    <?php if (!empty($skill['celebrities'])): ?>
    <div style="margin-bottom: var(--space-xl);">
        <h2>Notable Practitioners</h2>
        <div style="display: flex; flex-wrap: wrap; gap: var(--space-sm);">
            <?php foreach ($skill['celebrities'] as $person): ?>
                <span style="
                    background: var(--color-bg-secondary);
                    border: 1px solid var(--border-card-light);
                    border-radius: var(--border-radius);
                    padding: 6px 14px;
                    font-size: 0.9rem;
                "><?= h(is_array($person) ? ($person['name'] ?? '') : $person) ?></span>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>

    <!-- Resources -->
    <?php if (!empty($skill['resources'])): ?>
    <div style="margin-bottom: var(--space-xl);">
        <h2>Learning Resources</h2>
        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-sm);">
            <?php foreach ($skill['resources'] as $resource): ?>
                <?php
                $resTitle = is_array($resource) ? ($resource['title'] ?? '') : $resource;
                $resUrl   = is_array($resource) ? ($resource['url'] ?? '') : '';
                ?>
                <li>
                    <?php if ($resUrl): ?>
                        <a href="<?= h($resUrl) ?>"
                           target="_blank"
                           rel="noopener noreferrer"
                           style="color: var(--color-gold-dark);">
                            <?= h($resTitle) ?>
                        </a>
                    <?php else: ?>
                        <span style="color: var(--color-text-secondary);"><?= h($resTitle) ?></span>
                    <?php endif; ?>
                </li>
            <?php endforeach; ?>
        </ul>
    </div>
    <?php endif; ?>

    <!-- CTA -->
    <div style="text-align: center; margin-top: var(--space-3xl); padding-top: var(--space-3xl); border-top: 1px solid var(--border-card-light);">
        <p style="color: var(--color-text-secondary); margin-bottom: var(--space-lg);">
            Ready to start tracking <?= h($skill['name']) ?>?
        </p>
        <a href="/register" class="btn-fantasy btn-primary btn-large">
            Start Tracking <?= h($skill['name']) ?>
        </a>
    </div>

</div>

<?php endif; ?>
