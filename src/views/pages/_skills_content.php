<?php
$db    = Database::getInstance();
$stmt  = $db->query('SELECT id, name, slug, description, category, max_level, xp_multiplier FROM skills WHERE is_active = 1 ORDER BY category, sort_order');
$allSkills = $stmt->fetchAll();

// Group by category
$grouped = [];
foreach ($allSkills as $skill) {
    $cat = $skill['category'] ?? 'Other';
    $grouped[$cat][] = $skill;
}

$categories = ['Physical', 'Mental', 'Creative', 'Technical', 'Practical', 'Knowledge', 'Social'];
?>

<div class="page-content" style="max-width: 1200px; margin: 0 auto; padding: var(--space-3xl) var(--space-lg);">

    <!-- Hero -->
    <div style="text-align: center; margin-bottom: var(--space-3xl);">
        <p class="hero-subtitle">SKILL CATALOG</p>
        <h1 style="margin-bottom: var(--space-lg);">Explore All Skills</h1>
        <p style="color: var(--color-text-secondary); max-width: 560px; margin: 0 auto var(--space-xl);">
            Over 100 real-world skills across 7 categories. Activate any skill, log your hours, and watch your character grow.
        </p>
        <input
            type="text"
            id="skills-search"
            class="form-input"
            placeholder="Search skills..."
            autocomplete="off"
            style="max-width: 400px; width: 100%;"
        >
    </div>

    <!-- Category filter tabs -->
    <div class="filter-row" style="margin-bottom: var(--space-xl);">
        <div class="filter-tabs" id="category-tabs">
            <button class="filter-tab active" data-filter="all">All</button>
            <?php foreach ($categories as $cat): ?>
                <button class="filter-tab" data-filter="<?= h(strtolower($cat)) ?>"><?= h($cat) ?></button>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- Skills grid -->
    <div class="explore-grid" id="skills-grid">
        <?php foreach ($allSkills as $skill):
            $desc      = $skill['description'] ?? '';
            $truncated = mb_strlen($desc) > 100 ? mb_substr($desc, 0, 100) . '…' : $desc;
            $catLower  = strtolower($skill['category'] ?? 'other');
        ?>
        <a href="/skills/<?= h($skill['slug']) ?>"
           class="explore-skill-card"
           data-category="<?= h($catLower) ?>"
           data-name="<?= h(strtolower($skill['name'])) ?>"
           style="cursor: pointer; text-decoration: none; color: inherit;">

            <div class="skill-icon skill-icon--placeholder" aria-hidden="true">&#9876;</div>
            <div class="explore-skill-card__content">
                <div class="explore-skill-header">
                    <span class="explore-skill-name"><?= h($skill['name']) ?></span>
                    <span class="explore-skill-cat"><?= h($skill['category'] ?? '') ?></span>
                </div>

                <p class="explore-skill-desc"><?= h($truncated) ?></p>

                <div class="explore-skill-meta">
                    <span>Max Lv. <?= (int)$skill['max_level'] ?></span>
                    <?php if ((float)$skill['xp_multiplier'] !== 1.0): ?>
                        <span><?= h(number_format((float)$skill['xp_multiplier'], 1)) ?>x XP</span>
                    <?php endif; ?>
                </div>
            </div>

        </a>
        <?php endforeach; ?>
    </div>

    <!-- Empty state -->
    <p id="no-results" style="display: none; text-align: center; color: var(--color-text-secondary); padding: var(--space-3xl) 0;">
        No skills match your search.
    </p>

    <!-- CTA -->
    <div style="text-align: center; margin-top: var(--space-3xl); padding-top: var(--space-3xl); border-top: 1px solid var(--border-card-light);">
        <p style="color: var(--color-text-secondary); margin-bottom: var(--space-lg);">
            Track your progress across every skill you pursue.
        </p>
        <a href="/register" class="btn-fantasy btn-primary btn-large">Create Your Character</a>
    </div>

</div>

<script>
(function () {
    const searchInput = document.getElementById('skills-search');
    const tabs        = document.querySelectorAll('#category-tabs .filter-tab');
    const cards       = document.querySelectorAll('#skills-grid .explore-skill-card');
    const noResults   = document.getElementById('no-results');
    let activeFilter  = 'all';

    function applyFilters() {
        const query = searchInput.value.trim().toLowerCase();
        let visible = 0;

        cards.forEach(card => {
            const nameMatch = card.dataset.name.includes(query);
            const catMatch  = activeFilter === 'all' || card.dataset.category === activeFilter;
            const show      = nameMatch && catMatch;
            card.style.display = show ? '' : 'none';
            if (show) visible++;
        });

        noResults.style.display = visible === 0 ? 'block' : 'none';
    }

    searchInput.addEventListener('input', applyFilters);

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeFilter = tab.dataset.filter;
            applyFilters();
        });
    });
})();
</script>
