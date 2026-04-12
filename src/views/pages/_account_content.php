<section class="page-section">
    <h1>Account Settings</h1>
    <div class="account-settings" id="account-settings">
        <p>Loading account settings...</p>
    </div>
</section>
<script>
    window.__CSRF_TOKEN__ = <?= json_encode(csrf_token()) ?>;
</script>
<script type="module" src="/js/pages/account.js"></script>
