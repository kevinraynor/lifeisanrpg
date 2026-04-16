<header class="site-header">
    <div class="header-container">
        <a href="/" class="logo">
            <span class="logo-icon">&#9876;</span>
            <span class="logo-text">LIFE IS AN RPG</span>
        </a>
        <nav class="header-nav">
            <a href="<?= is_logged_in() ? '/app' : '/' ?>" class="nav-link">Home</a>
            <a href="/skills" class="nav-link">Skills</a>
            <a href="/features" class="nav-link">Features</a>
            <a href="/about" class="nav-link">About</a>
            <?php if (is_logged_in()): ?>
                <a href="/account" class="nav-link">Account</a>
            <?php else: ?>
                <a href="#" class="nav-link" id="login-link">Log In</a>
                <a href="/register" class="btn-fantasy btn-primary">Start Your Journey</a>
            <?php endif; ?>
        </nav>
    </div>
</header>
