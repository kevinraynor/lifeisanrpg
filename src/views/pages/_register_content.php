<section class="register-wizard">
    <div class="wizard-container" id="register-wizard">
        <!-- Step indicators -->
        <div class="wizard-steps">
            <div class="wizard-step active" data-step="1">
                <span class="step-number">1</span>
                <span class="step-label">Identity</span>
            </div>
            <div class="wizard-step" data-step="2">
                <span class="step-number">2</span>
                <span class="step-label">Class</span>
            </div>
            <div class="wizard-step" data-step="3">
                <span class="step-number">3</span>
                <span class="step-label">Skills</span>
            </div>
            <div class="wizard-step" data-step="4">
                <span class="step-number">4</span>
                <span class="step-label">Account</span>
            </div>
        </div>

        <!-- Wizard content - populated by JS -->
        <div class="wizard-content" id="wizard-content">
            <p>Loading...</p>
        </div>
    </div>
</section>

<!-- Pre-load classes and skills data for the wizard -->
<?php
$db = Database::getInstance();
$allSkills = $db->query('SELECT id, name, slug, description, icon, max_level, xp_multiplier, category FROM skills WHERE is_active = 1 ORDER BY sort_order')->fetchAll();
$allClasses = $db->query('SELECT * FROM classes ORDER BY sort_order')->fetchAll();
$allAttributes = $db->query('SELECT * FROM attributes ORDER BY sort_order')->fetchAll();
?>
<script>
    window.__REGISTER_DATA__ = <?= json_encode([
        'skills'     => $allSkills,
        'classes'    => $allClasses,
        'attributes' => $allAttributes,
        'csrfToken'  => csrf_token(),
    ], JSON_UNESCAPED_UNICODE) ?>;
</script>
<script type="module" src="/js/pages/register.js"></script>
