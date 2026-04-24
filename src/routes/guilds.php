<?php
/**
 * Guilds API routes.
 *
 * Registration order matters: literal paths before {id} wildcards.
 */

// -----------------------------------------------------------------------
// Snapshot — current user's guild (or null) + my role, members, tallies,
// pending-sent invites, recent messages (when L2).
// -----------------------------------------------------------------------
$router->get('/api/guild', function () {
    requireAuth();
    json_response(Guilds::forUser(current_user_id()));
});

// -----------------------------------------------------------------------
// Pending invitations for the current user
// -----------------------------------------------------------------------
$router->get('/api/guild/invitations', function () {
    requireAuth();
    json_response(Guilds::invitationsForUser(current_user_id()));
});

// -----------------------------------------------------------------------
// Available tallies (not yet activated this period, within guild level)
// -----------------------------------------------------------------------
$router->get('/api/guild/tallies/available', function () {
    requireAuth();
    json_response(Guilds::listAvailableTallies(current_user_id()));
});

// -----------------------------------------------------------------------
// List chat messages (L2 feature)
// -----------------------------------------------------------------------
$router->get('/api/guild/messages', function () {
    requireAuth();
    $limit = (int) ($_GET['limit'] ?? 100);
    json_response(Guilds::listMessages(current_user_id(), $limit));
});

// -----------------------------------------------------------------------
// Create a new guild (body: {name})
// -----------------------------------------------------------------------
$router->post('/api/guilds', function () {
    requireAuth();
    if (!validate_csrf()) { json_error('Invalid CSRF token', 403); }
    $data = get_json_body();
    $name = trim((string) ($data['name'] ?? ''));
    if ($name === '') { json_error('Name required'); }
    json_response(Guilds::create(current_user_id(), $name));
});

// -----------------------------------------------------------------------
// Invite a user to the guild (body: {user_id}) — officer/leader only
// -----------------------------------------------------------------------
$router->post('/api/guild/invite', function () {
    requireAuth();
    if (!validate_csrf()) { json_error('Invalid CSRF token', 403); }
    $data = get_json_body();
    $inviteeId = (int) ($data['user_id'] ?? 0);
    if (!$inviteeId) { json_error('user_id required'); }
    json_response(Guilds::invite(current_user_id(), $inviteeId));
});

// -----------------------------------------------------------------------
// Accept / decline / cancel invitations
// -----------------------------------------------------------------------
$router->post('/api/guild/invitations/{id}/accept', function (string $id) {
    requireAuth();
    if (!validate_csrf()) { json_error('Invalid CSRF token', 403); }
    json_response(Guilds::acceptInvite(current_user_id(), (int) $id));
});

$router->post('/api/guild/invitations/{id}/decline', function (string $id) {
    requireAuth();
    if (!validate_csrf()) { json_error('Invalid CSRF token', 403); }
    json_response(Guilds::declineInvite(current_user_id(), (int) $id));
});

$router->post('/api/guild/invitations/{id}/cancel', function (string $id) {
    requireAuth();
    if (!validate_csrf()) { json_error('Invalid CSRF token', 403); }
    json_response(Guilds::cancelInvite(current_user_id(), (int) $id));
});

// -----------------------------------------------------------------------
// Leave guild (leader transfers or auto-dissolves if alone)
// -----------------------------------------------------------------------
$router->post('/api/guild/leave', function () {
    requireAuth();
    if (!validate_csrf()) { json_error('Invalid CSRF token', 403); }
    json_response(Guilds::leave(current_user_id()));
});

// -----------------------------------------------------------------------
// Dissolve the guild (leader only)
// -----------------------------------------------------------------------
$router->delete('/api/guild', function () {
    requireAuth();
    if (!validate_csrf()) { json_error('Invalid CSRF token', 403); }
    json_response(Guilds::dissolve(current_user_id()));
});

// -----------------------------------------------------------------------
// Member management: kick / promote / demote
// -----------------------------------------------------------------------
$router->post('/api/guild/members/{user_id}/kick', function (string $user_id) {
    requireAuth();
    if (!validate_csrf()) { json_error('Invalid CSRF token', 403); }
    json_response(Guilds::kick(current_user_id(), (int) $user_id));
});

$router->post('/api/guild/members/{user_id}/promote', function (string $user_id) {
    requireAuth();
    if (!validate_csrf()) { json_error('Invalid CSRF token', 403); }
    json_response(Guilds::setRole(current_user_id(), (int) $user_id, 'officer'));
});

$router->post('/api/guild/members/{user_id}/demote', function (string $user_id) {
    requireAuth();
    if (!validate_csrf()) { json_error('Invalid CSRF token', 403); }
    json_response(Guilds::setRole(current_user_id(), (int) $user_id, 'member'));
});

// -----------------------------------------------------------------------
// Activate a tally (body: {variation_id}) — officer/leader only, ≥4 members
// -----------------------------------------------------------------------
$router->post('/api/guild/tallies/activate', function () {
    requireAuth();
    if (!validate_csrf()) { json_error('Invalid CSRF token', 403); }
    $data = get_json_body();
    $vid = (int) ($data['variation_id'] ?? 0);
    if (!$vid) { json_error('variation_id required'); }
    json_response(Guilds::activateTally(current_user_id(), $vid));
});

// -----------------------------------------------------------------------
// Post a chat message (body: {body}) — L2 feature
// -----------------------------------------------------------------------
$router->post('/api/guild/messages', function () {
    requireAuth();
    if (!validate_csrf()) { json_error('Invalid CSRF token', 403); }
    $data = get_json_body();
    $body = (string) ($data['body'] ?? '');
    json_response(Guilds::postMessage(current_user_id(), $body));
});

// -----------------------------------------------------------------------
// Set announcement (body: {text} or null) — L3 feature, officer/leader
// -----------------------------------------------------------------------
$router->put('/api/guild/announcement', function () {
    requireAuth();
    if (!validate_csrf()) { json_error('Invalid CSRF token', 403); }
    $data = get_json_body();
    $text = array_key_exists('text', $data) ? $data['text'] : null;
    if ($text !== null) { $text = (string) $text; }
    json_response(Guilds::setAnnouncement(current_user_id(), $text));
});

// -----------------------------------------------------------------------
// Set icon URL (body: {url} or null) — L7 feature, officer/leader
// -----------------------------------------------------------------------
$router->put('/api/guild/icon', function () {
    requireAuth();
    if (!validate_csrf()) { json_error('Invalid CSRF token', 403); }
    $data = get_json_body();
    $url = array_key_exists('url', $data) ? $data['url'] : null;
    if ($url !== null) { $url = (string) $url; }
    json_response(Guilds::setIcon(current_user_id(), $url));
});
