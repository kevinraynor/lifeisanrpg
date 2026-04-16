<?php
$demoCharacters = [
    [
        'name' => 'Marcus the Warrior',
        'class' => 'Warrior', 'gender' => 'male', 'slug' => 'warrior',
        'color' => '#8B0000', 'level' => 38,
        'attrs' => ['Strength'=>28, 'Stamina'=>22, 'Dexterity'=>14, 'Intelligence'=>8, 'Wisdom'=>10, 'Creativity'=>6, 'Charisma'=>12],
        'skills' => [['name'=>'Weight Training','level'=>65,'pct'=>52],['name'=>'Running','level'=>48,'pct'=>38],['name'=>'Boxing','level'=>31,'pct'=>25]],
    ],
    [
        'name' => 'Elena the Scholar',
        'class' => 'Scholar', 'gender' => 'female', 'slug' => 'scholar',
        'color' => '#1B3A6B', 'level' => 45,
        'attrs' => ['Strength'=>5, 'Stamina'=>8, 'Dexterity'=>10, 'Intelligence'=>32, 'Wisdom'=>26, 'Creativity'=>18, 'Charisma'=>14],
        'skills' => [['name'=>'Mathematics','level'=>78,'pct'=>62],['name'=>'Physics','level'=>61,'pct'=>49],['name'=>'Research','level'=>52,'pct'=>42]],
    ],
    [
        'name' => 'Garrett the Artisan',
        'class' => 'Artisan', 'gender' => 'male', 'slug' => 'artisan',
        'color' => '#8B6914', 'level' => 41,
        'attrs' => ['Strength'=>18, 'Stamina'=>12, 'Dexterity'=>25, 'Intelligence'=>14, 'Wisdom'=>10, 'Creativity'=>30, 'Charisma'=>10],
        'skills' => [['name'=>'Woodworking','level'=>72,'pct'=>58],['name'=>'Metalworking','level'=>55,'pct'=>44],['name'=>'Drawing','level'=>40,'pct'=>32]],
    ],
    [
        'name' => 'Lyra the Ranger',
        'class' => 'Ranger', 'gender' => 'female', 'slug' => 'ranger',
        'color' => '#2D5A27', 'level' => 36,
        'attrs' => ['Strength'=>16, 'Stamina'=>20, 'Dexterity'=>22, 'Intelligence'=>12, 'Wisdom'=>18, 'Creativity'=>8, 'Charisma'=>10],
        'skills' => [['name'=>'Archery','level'=>60,'pct'=>48],['name'=>'Hiking','level'=>45,'pct'=>36],['name'=>'Survival Skills','level'=>38,'pct'=>30]],
    ],
    [
        'name' => 'Sophia the Diplomat',
        'class' => 'Diplomat', 'gender' => 'female', 'slug' => 'diplomat',
        'color' => '#6B3A8A', 'level' => 44,
        'attrs' => ['Strength'=>6, 'Stamina'=>8, 'Dexterity'=>10, 'Intelligence'=>20, 'Wisdom'=>22, 'Creativity'=>14, 'Charisma'=>32],
        'skills' => [['name'=>'Public Speaking','level'=>75,'pct'=>60],['name'=>'Negotiation','level'=>58,'pct'=>46],['name'=>'Writing','level'=>42,'pct'=>34]],
    ],
    [
        'name' => 'Aldric the Sage',
        'class' => 'Sage', 'gender' => 'male', 'slug' => 'sage',
        'color' => '#4A6B82', 'level' => 50,
        'attrs' => ['Strength'=>7, 'Stamina'=>10, 'Dexterity'=>8, 'Intelligence'=>28, 'Wisdom'=>35, 'Creativity'=>16, 'Charisma'=>18],
        'skills' => [['name'=>'Meditation','level'=>82,'pct'=>66],['name'=>'Philosophy','level'=>68,'pct'=>54],['name'=>'Yoga','level'=>50,'pct'=>40]],
    ],
    [
        'name' => 'Arin the Tinkerer',
        'class' => 'Tinkerer', 'gender' => 'male', 'slug' => 'tinkerer',
        'color' => '#5A5A5A', 'level' => 42,
        'attrs' => ['Strength'=>8, 'Stamina'=>12, 'Dexterity'=>15, 'Intelligence'=>24, 'Wisdom'=>18, 'Creativity'=>20, 'Charisma'=>10],
        'skills' => [['name'=>'Programming','level'=>79,'pct'=>68],['name'=>'Web Development','level'=>65,'pct'=>52],['name'=>'Mathematics','level'=>45,'pct'=>35]],
    ],
    [
        'name' => 'Mira the Bard',
        'class' => 'Bard', 'gender' => 'female', 'slug' => 'bard',
        'color' => '#8B4585', 'level' => 39,
        'attrs' => ['Strength'=>7, 'Stamina'=>10, 'Dexterity'=>18, 'Intelligence'=>14, 'Wisdom'=>12, 'Creativity'=>28, 'Charisma'=>26],
        'skills' => [['name'=>'Singing','level'=>70,'pct'=>56],['name'=>'Guitar','level'=>58,'pct'=>46],['name'=>'Songwriting','level'=>44,'pct'=>35]],
    ],
];

$demo = $demoCharacters[array_rand($demoCharacters)];
$imgPath = "/img/classes/{$demo['slug']}-{$demo['gender']}.webp";
?>
<section class="hero">
    <div class="hero-content">
        <p class="hero-subtitle">A GAMIFIED LIFE-GOALS TRACKER</p>
        <h1>Turn Your Life<br>Into an RPG</h1>
        <p class="hero-description">Create your character, activate real-world skills, log hours, earn XP, and level up. Watch your attributes grow as you become the person you're meant to be.</p>
        <div class="hero-buttons">
            <a href="/register" class="btn-fantasy btn-primary btn-large">Start Your Journey</a>
            <a href="/features" class="btn-fantasy btn-secondary btn-large">Learn More</a>
        </div>
    </div>
    <div class="hero-card" id="demo">
        <div class="character-card character-card--demo">
            <div class="character-card__portrait">
                <img src="<?= $imgPath ?>" alt="<?= h($demo['class']) ?>" onerror="this.parentElement.style.display='none'">
            </div>
            <div class="character-card__body">
                <div class="character-card__header">
                    <div class="character-card__info">
                        <h3 class="character-card__name"><?= h($demo['name']) ?></h3>
                        <p class="character-card__class" style="color: <?= h($demo['color']) ?>">Level <?= $demo['level'] ?> &middot; <?= h($demo['class']) ?></p>
                    </div>
                </div>
                <div class="character-card__stats">
                    <h4>Attributes</h4>
                    <?php $attrColors = ['Strength'=>'#8B0000','Stamina'=>'#2D5A27','Dexterity'=>'#8B6914','Intelligence'=>'#1B3A6B','Wisdom'=>'#4A6B82','Creativity'=>'#6B3A8A','Charisma'=>'#8B4585']; ?>
                    <?php foreach ($demo['attrs'] as $attrName => $attrVal): ?>
                    <div class="stat-row">
                        <span class="stat-icon" style="color: <?= $attrColors[$attrName] ?? 'inherit' ?>">&#9670;</span>
                        <span class="stat-name"><?= h($attrName) ?></span>
                        <span class="stat-value"><?= $attrVal ?></span>
                    </div>
                    <?php endforeach; ?>
                </div>
                <div class="character-card__skills">
                    <h4>Top Skills</h4>
                    <?php foreach ($demo['skills'] as $skill): ?>
                    <div class="card-skill-row">
                        <div class="card-skill-info">
                            <span class="card-skill-name"><?= h($skill['name']) ?></span>
                            <span class="card-skill-level">Lv. <?= $skill['level'] ?></span>
                        </div>
                        <div class="progress-bar"><div class="progress-bar__fill" style="width: <?= $skill['pct'] ?>%" data-percent="<?= $skill['pct'] ?>"></div></div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>
    </div>
</section>

<section class="features-overview">
    <h2>How It Works</h2>
    <div class="features-grid">
        <div class="feature-item">
            <div class="feature-icon">&#128100;</div>
            <h3>1. Create Your Character</h3>
            <p>Choose a class, pick your starting skills, and begin with existing experience. Your character represents who you are and who you're becoming.</p>
        </div>
        <div class="feature-item">
            <div class="feature-icon">&#9201;</div>
            <h3>2. Log Your Hours</h3>
            <p>Practiced guitar for an hour? Went for a run? Studied a new language? Log it. Every hour earns XP that feeds into your skill levels.</p>
        </div>
        <div class="feature-item">
            <div class="feature-icon">&#128200;</div>
            <h3>3. Watch Yourself Grow</h3>
            <p>Your skills level up. Your attributes rise. Your character card evolves. 10,000 hours of mastery becomes a journey, not a grind.</p>
        </div>
    </div>
</section>

<section class="features-overview features-overview--alt">
    <h2>Built for Real Life</h2>
    <div class="features-grid">
        <div class="feature-item">
            <div class="feature-icon">&#9733;</div>
            <h3>100+ Skills</h3>
            <p>From Fitness to Programming, Cooking to Creative Writing. Seven categories spanning physical, mental, creative, technical, practical, knowledge, and social skills.</p>
        </div>
        <div class="feature-item">
            <div class="feature-icon">&#9670;</div>
            <h3>7 Attributes</h3>
            <p>Strength, Stamina, Dexterity, Intelligence, Wisdom, Creativity, and Charisma. Each skill contributes to attributes based on real-world mappings.</p>
        </div>
        <div class="feature-item">
            <div class="feature-icon">&#127984;</div>
            <h3>8 Classes</h3>
            <p>Warrior, Scholar, Artisan, Ranger, Diplomat, Sage, Tinkerer, or Bard. Your class reflects your personality and suggests skills to get you started.</p>
        </div>
    </div>
</section>

<section class="cta-section">
    <h2>Your Journey Starts Today</h2>
    <p>Small steps compound into extraordinary growth. Create your character and start leveling up.</p>
    <a href="/register" class="btn-fantasy btn-primary btn-large">Create Your Character</a>
</section>

<!-- Login Modal -->
<div class="modal-overlay" id="login-modal">
    <div class="modal card-ornate">
        <button class="modal-close" id="login-modal-close">&times;</button>
        <h2>Welcome Back</h2>
        <p class="modal-subtitle">Continue your adventure</p>
        <form id="login-form" class="auth-form">
            <div class="form-group">
                <label class="form-label" for="login-email">Email</label>
                <input class="form-input" type="email" id="login-email" placeholder="adventurer@example.com" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="login-password">Password</label>
                <input class="form-input" type="password" id="login-password" placeholder="Enter your password" required>
            </div>
            <div class="form-error" id="login-error"></div>
            <button type="submit" class="btn-fantasy btn-primary btn-large" style="width:100%">Log In</button>
        </form>
        <p class="modal-footer-text">Don't have an account? <a href="/register">Start your journey</a></p>
    </div>
</div>

<script>
    window.__CSRF_TOKEN__ = <?= json_encode(csrf_token()) ?>;
</script>
<script type="module" src="/js/pages/landing.js"></script>
