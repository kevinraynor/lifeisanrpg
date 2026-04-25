<?php
/**
 * Guilds model — static class, mirrors the Quests.php style.
 *
 * Guild level curve is independent from user-skill XP:
 *   maxLevel = 20, maxXP = 250_000, same sqrt curve.
 *
 * Perks (see unlockedFeatures):
 *   L2  — chat
 *   L3  — dashboard announcement
 *   L5  — member cap 15 -> 20
 *   L7  — custom icon upload
 *   L10 — access to high-tier tally variations (via guild_tally_variations.min_guild_level)
 */
class Guilds
{
    const MIN_MEMBERS_FOR_TALLY = 4;
    const BASE_MEMBER_CAP       = 15;
    const EXPANDED_MEMBER_CAP   = 20;
    const GUILD_MAX_LEVEL       = 20;
    const GUILD_MAX_XP          = 250000;
    const NAME_MIN              = 3;
    const NAME_MAX              = 60;
    const MESSAGE_MAX_LEN       = 500;
    const ANNOUNCEMENT_MAX_LEN  = 500;

    // ---------------------------------------------------------------
    // Level / perk helpers
    // ---------------------------------------------------------------

    public static function xpToLevel(int $totalXp): int
    {
        if ($totalXp <= 0) return 1;
        if ($totalXp >= self::GUILD_MAX_XP) return self::GUILD_MAX_LEVEL;
        return max(1, min(self::GUILD_MAX_LEVEL, (int) floor(self::GUILD_MAX_LEVEL * sqrt($totalXp / self::GUILD_MAX_XP))));
    }

    public static function xpForLevel(int $level): int
    {
        if ($level <= 1) return 0;
        if ($level >= self::GUILD_MAX_LEVEL) return self::GUILD_MAX_XP;
        return (int) ceil(self::GUILD_MAX_XP * pow($level / self::GUILD_MAX_LEVEL, 2));
    }

    /**
     * Recompute and persist current_level for a guild from its stored total_xp.
     *
     * This is the single authoritative writer for guilds.current_level.
     * Always prefer this over inline UPDATE … SET current_level = self::xpToLevel(…).
     * The onLog() method already computes both in one atomic UPDATE — that is correct.
     * Use this helper for NEW code paths that need to touch current_level in isolation
     * (e.g. admin corrections, XP adjustments, migration fixes).
     *
     * @return int  The newly persisted level (0 if the guild does not exist).
     */
    public static function recomputeLevel(int $guildId): int
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT total_xp FROM guilds WHERE id = ?');
        $stmt->execute([$guildId]);
        $totalXp = $stmt->fetchColumn();
        if ($totalXp === false) return 0;

        $level = self::xpToLevel((int) $totalXp);
        $db->prepare('UPDATE guilds SET current_level = ? WHERE id = ?')
           ->execute([$level, $guildId]);
        return $level;
    }

    public static function unlockedFeatures(int $level): array
    {
        return [
            'chat'              => $level >= 2,
            'announcement'      => $level >= 3,
            'member_cap'        => $level >= 5 ? self::EXPANDED_MEMBER_CAP : self::BASE_MEMBER_CAP,
            'custom_icon'       => $level >= 7,
            'exclusive_tallies' => $level >= 10,
        ];
    }

    private static function periodStart(string $period): string
    {
        return match ($period) {
            'weekly'  => date('Y-m-d', strtotime('monday this week')),
            'monthly' => date('Y-m-01'),
            default   => date('Y-m-d'),
        };
    }

    // ---------------------------------------------------------------
    // Lookups
    // ---------------------------------------------------------------

    public static function membershipForUser(int $userId): ?array
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('
            SELECT gm.guild_id, gm.role, g.name, g.current_level, g.total_xp
            FROM guild_members gm
            JOIN guilds g ON g.id = gm.guild_id
            WHERE gm.user_id = ?
        ');
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function guildById(int $guildId): ?array
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT * FROM guilds WHERE id = ?');
        $stmt->execute([$guildId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    private static function memberCount(int $guildId): int
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT COUNT(*) FROM guild_members WHERE guild_id = ?');
        $stmt->execute([$guildId]);
        return (int) $stmt->fetchColumn();
    }

    /**
     * @throws AuthorizationException if the user is not in the guild or lacks the required role.
     */
    private static function requireRole(int $guildId, int $userId, array $allowedRoles): string
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT role FROM guild_members WHERE guild_id = ? AND user_id = ?');
        $stmt->execute([$guildId, $userId]);
        $role = $stmt->fetchColumn();
        if (!$role) throw new AuthorizationException('Not a member of this guild');
        if (!in_array($role, $allowedRoles, true)) {
            throw new AuthorizationException('Insufficient guild role');
        }
        return $role;
    }

    /**
     * @throws AuthorizationException if the feature is not unlocked at the guild's current level.
     */
    private static function requireFeature(array $guild, string $featureKey): void
    {
        $features = self::unlockedFeatures((int) $guild['current_level']);
        if (empty($features[$featureKey])) {
            throw new AuthorizationException('This feature unlocks at a higher guild level');
        }
    }

    public static function forUser(int $userId): ?array
    {
        $membership = self::membershipForUser($userId);
        if (!$membership) return null;

        $guildId = (int) $membership['guild_id'];
        $db = Database::getInstance();

        $guild = self::guildById($guildId);
        if (!$guild) return null;

        // Members with character + class basics
        $stmt = $db->prepare('
            SELECT
                gm.user_id, gm.role, gm.joined_at,
                c.name AS character_name, c.gender,
                cl.slug AS class_slug, cl.name AS class_name, cl.color AS class_color,
                (SELECT SUM(us.current_level) FROM user_skills us WHERE us.user_id = gm.user_id) AS skill_level_sum
            FROM guild_members gm
            JOIN characters c  ON c.user_id = gm.user_id
            JOIN classes    cl ON cl.id     = c.class_id
            WHERE gm.guild_id = ?
            ORDER BY FIELD(gm.role, "leader", "officer", "member"), c.name
        ');
        $stmt->execute([$guildId]);
        $members = $stmt->fetchAll();
        foreach ($members as &$m) {
            $m['user_id']         = (int) $m['user_id'];
            $m['skill_level_sum'] = (int) ($m['skill_level_sum'] ?? 0);
        }
        unset($m);

        // Active tallies this period
        $weeklyStart  = self::periodStart('weekly');
        $monthlyStart = self::periodStart('monthly');
        $stmt = $db->prepare('
            SELECT
                gt.id, gt.period, gt.period_start, gt.target_hours, gt.hours_logged, gt.status,
                gt.xp_awarded, gt.activated_by, gt.completed_at, gt.created_at,
                gtv.id AS variation_id, gtv.name, gtv.description, gtv.bonus_xp
            FROM guild_tallies gt
            JOIN guild_tally_variations gtv ON gtv.id = gt.guild_tally_variation_id
            WHERE gt.guild_id = ?
              AND (
                 (gt.period = "weekly"  AND gt.period_start = ?)
              OR (gt.period = "monthly" AND gt.period_start = ?)
              )
            ORDER BY gt.period, gt.created_at
        ');
        $stmt->execute([$guildId, $weeklyStart, $monthlyStart]);
        $tallies = $stmt->fetchAll();
        foreach ($tallies as &$t) {
            $t['target_hours'] = (float) $t['target_hours'];
            $t['hours_logged'] = (float) $t['hours_logged'];
            $t['bonus_xp']     = (int) $t['bonus_xp'];
            $t['xp_awarded']   = (int) $t['xp_awarded'];
        }
        unset($t);

        // Pending invitations sent from this guild
        $stmt = $db->prepare('
            SELECT gi.id, gi.invitee_id, gi.inviter_id, gi.created_at,
                   c.name AS invitee_name
            FROM guild_invitations gi
            JOIN characters c ON c.user_id = gi.invitee_id
            WHERE gi.guild_id = ? AND gi.status = "pending"
            ORDER BY gi.created_at DESC
        ');
        $stmt->execute([$guildId]);
        $pendingSent = $stmt->fetchAll();

        // Recent chat messages (capped for initial snapshot)
        $messages = [];
        if ((int) $guild['current_level'] >= 2) {
            $stmt = $db->prepare('
                SELECT gm.id, gm.user_id, gm.body, gm.created_at, c.name AS character_name
                FROM guild_messages gm
                JOIN characters c ON c.user_id = gm.user_id
                WHERE gm.guild_id = ?
                ORDER BY gm.created_at DESC
                LIMIT 50
            ');
            $stmt->execute([$guildId]);
            $messages = array_reverse($stmt->fetchAll());
        }

        $features = self::unlockedFeatures((int) $guild['current_level']);

        return [
            'guild'              => [
                'id'             => (int) $guild['id'],
                'name'           => $guild['name'],
                'description'    => $guild['description'],
                'icon_url'       => $guild['icon_url'],
                'total_xp'       => (int) $guild['total_xp'],
                'current_level'  => (int) $guild['current_level'],
                'announcement'   => $guild['announcement'],
                'leader_id'      => (int) $guild['leader_id'],
                'created_at'     => $guild['created_at'],
                'member_cap'     => $features['member_cap'],
                'xp_for_level'   => self::xpForLevel((int) $guild['current_level']),
                'xp_for_next'    => self::xpForLevel((int) $guild['current_level'] + 1),
                'features'       => $features,
            ],
            'my_role'            => $membership['role'],
            'members'            => $members,
            'tallies'            => $tallies,
            'pending_sent'       => $pendingSent,
            'messages'           => $messages,
        ];
    }

    public static function invitationsForUser(int $userId): array
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('
            SELECT gi.id, gi.guild_id, gi.inviter_id, gi.created_at,
                   g.name AS guild_name, g.icon_url, g.current_level,
                   c.name AS inviter_name
            FROM guild_invitations gi
            JOIN guilds     g ON g.id      = gi.guild_id
            JOIN characters c ON c.user_id = gi.inviter_id
            WHERE gi.invitee_id = ? AND gi.status = "pending"
            ORDER BY gi.created_at DESC
        ');
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    // ---------------------------------------------------------------
    // Create / membership management
    // ---------------------------------------------------------------

    public static function create(int $userId, string $name): array
    {
        $db = Database::getInstance();
        $name = trim($name);
        $len = mb_strlen($name);
        if ($len < self::NAME_MIN || $len > self::NAME_MAX) {
            throw new ValidationException('Guild name must be 3–60 characters');
        }

        if (self::membershipForUser($userId)) {
            throw new ValidationException('You are already in a guild');
        }

        $stmt = $db->prepare('SELECT id FROM guilds WHERE name = ?');
        $stmt->execute([$name]);
        if ($stmt->fetchColumn()) throw new ValidationException('That guild name is taken');

        $db->beginTransaction();
        try {
            $ins = $db->prepare('
                INSERT INTO guilds (name, leader_id, total_xp, current_level)
                VALUES (?, ?, 0, 1)
            ');
            $ins->execute([$name, $userId]);
            $guildId = (int) $db->lastInsertId();

            $db->prepare('
                INSERT INTO guild_members (guild_id, user_id, role) VALUES (?, ?, "leader")
            ')->execute([$guildId, $userId]);

            $db->commit();
            return ['success' => true, 'guild_id' => $guildId];
        } catch (Exception $e) {
            $db->rollBack();
            throw new AppException('Failed to create guild', 500);
        }
    }

    public static function invite(int $inviterId, int $inviteeId): array
    {
        if ($inviterId === $inviteeId) throw new ValidationException('You cannot invite yourself');

        $membership = self::membershipForUser($inviterId);
        if (!$membership) throw new ValidationException('You are not in a guild');

        $guildId = (int) $membership['guild_id'];
        self::requireRole($guildId, $inviterId, ['leader', 'officer']);

        $db = Database::getInstance();

        // Invitee must be active user
        $stmt = $db->prepare('SELECT id FROM users WHERE id = ? AND is_active = 1');
        $stmt->execute([$inviteeId]);
        if (!$stmt->fetchColumn()) throw new NotFoundException('User not found');

        // Invitee must not already be in any guild
        $stmt = $db->prepare('SELECT 1 FROM guild_members WHERE user_id = ?');
        $stmt->execute([$inviteeId]);
        if ($stmt->fetchColumn()) throw new ValidationException('User is already in a guild');

        // Check member cap (against this guild's current cap)
        $guild = self::guildById($guildId);
        $features = self::unlockedFeatures((int) $guild['current_level']);
        if (self::memberCount($guildId) >= $features['member_cap']) {
            throw new ValidationException('Guild is at capacity');
        }

        // Upsert invitation — re-invite flips old row back to pending.
        $stmt = $db->prepare('
            SELECT id, status FROM guild_invitations WHERE guild_id = ? AND invitee_id = ?
        ');
        $stmt->execute([$guildId, $inviteeId]);
        $existing = $stmt->fetch();

        if ($existing) {
            if ($existing['status'] === 'pending') {
                throw new ValidationException('Invitation already pending');
            }
            $db->prepare('
                UPDATE guild_invitations
                SET status = "pending", inviter_id = ?, created_at = CURRENT_TIMESTAMP, responded_at = NULL
                WHERE id = ?
            ')->execute([$inviterId, $existing['id']]);
            return ['success' => true, 'invitation_id' => (int) $existing['id']];
        }

        $db->prepare('
            INSERT INTO guild_invitations (guild_id, invitee_id, inviter_id, status)
            VALUES (?, ?, ?, "pending")
        ')->execute([$guildId, $inviteeId, $inviterId]);

        return ['success' => true, 'invitation_id' => (int) $db->lastInsertId()];
    }

    public static function acceptInvite(int $userId, int $invitationId): array
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('
            SELECT id, guild_id FROM guild_invitations
            WHERE id = ? AND invitee_id = ? AND status = "pending"
        ');
        $stmt->execute([$invitationId, $userId]);
        $invite = $stmt->fetch();
        if (!$invite) throw new NotFoundException('Invitation not found');

        if (self::membershipForUser($userId)) {
            throw new ValidationException('You are already in a guild');
        }

        $guildId = (int) $invite['guild_id'];
        $guild = self::guildById($guildId);
        if (!$guild) throw new NotFoundException('Guild no longer exists');

        $features = self::unlockedFeatures((int) $guild['current_level']);
        if (self::memberCount($guildId) >= $features['member_cap']) {
            throw new ValidationException('Guild is at capacity');
        }

        $db->beginTransaction();
        try {
            $db->prepare('
                INSERT INTO guild_members (guild_id, user_id, role) VALUES (?, ?, "member")
            ')->execute([$guildId, $userId]);

            $db->prepare('
                UPDATE guild_invitations SET status = "accepted", responded_at = CURRENT_TIMESTAMP WHERE id = ?
            ')->execute([$invitationId]);

            // Clean up any OTHER pending invites addressed to this user — they're now in a guild.
            $db->prepare('
                UPDATE guild_invitations SET status = "cancelled", responded_at = CURRENT_TIMESTAMP
                WHERE invitee_id = ? AND status = "pending" AND id != ?
            ')->execute([$userId, $invitationId]);

            $db->commit();
            return ['success' => true, 'guild_id' => $guildId];
        } catch (Exception $e) {
            $db->rollBack();
            throw new AppException('Failed to accept invitation', 500);
        }
    }

    public static function declineInvite(int $userId, int $invitationId): array
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('
            UPDATE guild_invitations
            SET status = "declined", responded_at = CURRENT_TIMESTAMP
            WHERE id = ? AND invitee_id = ? AND status = "pending"
        ');
        $stmt->execute([$invitationId, $userId]);
        if ($stmt->rowCount() === 0) throw new NotFoundException('Invitation not found');
        return ['success' => true];
    }

    public static function cancelInvite(int $userId, int $invitationId): array
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT guild_id FROM guild_invitations WHERE id = ? AND status = "pending"');
        $stmt->execute([$invitationId]);
        $gid = $stmt->fetchColumn();
        if (!$gid) throw new NotFoundException('Invitation not found');

        self::requireRole((int) $gid, $userId, ['leader', 'officer']);

        $db->prepare('
            UPDATE guild_invitations SET status = "cancelled", responded_at = CURRENT_TIMESTAMP WHERE id = ?
        ')->execute([$invitationId]);
        return ['success' => true];
    }

    public static function leave(int $userId): array
    {
        $membership = self::membershipForUser($userId);
        if (!$membership) throw new ValidationException('You are not in a guild');
        $guildId = (int) $membership['guild_id'];

        $db = Database::getInstance();

        if ($membership['role'] === 'leader') {
            // Transfer leadership to the earliest-joined non-leader, else dissolve.
            $stmt = $db->prepare('
                SELECT user_id FROM guild_members
                WHERE guild_id = ? AND role != "leader"
                ORDER BY FIELD(role, "officer", "member"), joined_at ASC
                LIMIT 1
            ');
            $stmt->execute([$guildId]);
            $successor = $stmt->fetchColumn();
            if (!$successor) {
                // Alone — dissolve
                return self::dissolve($userId);
            }
            $db->beginTransaction();
            try {
                $db->prepare('UPDATE guild_members SET role = "leader" WHERE guild_id = ? AND user_id = ?')
                   ->execute([$guildId, $successor]);
                $db->prepare('UPDATE guilds SET leader_id = ? WHERE id = ?')
                   ->execute([$successor, $guildId]);
                $db->prepare('DELETE FROM guild_members WHERE guild_id = ? AND user_id = ?')
                   ->execute([$guildId, $userId]);
                $db->commit();
            } catch (Exception $e) {
                $db->rollBack();
                throw new AppException('Failed to leave guild', 500);
            }
            return ['success' => true, 'new_leader_id' => (int) $successor];
        }

        $db->prepare('DELETE FROM guild_members WHERE guild_id = ? AND user_id = ?')
           ->execute([$guildId, $userId]);
        return ['success' => true];
    }

    public static function kick(int $kickerId, int $targetUserId): array
    {
        $membership = self::membershipForUser($kickerId);
        if (!$membership) throw new ValidationException('You are not in a guild');
        $guildId = (int) $membership['guild_id'];
        self::requireRole($guildId, $kickerId, ['leader', 'officer']);

        if ($targetUserId === $kickerId) throw new ValidationException('Use leave to remove yourself');

        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT role FROM guild_members WHERE guild_id = ? AND user_id = ?');
        $stmt->execute([$guildId, $targetUserId]);
        $targetRole = $stmt->fetchColumn();
        if (!$targetRole) throw new NotFoundException('Member not found');
        if ($targetRole === 'leader') throw new ValidationException('Cannot kick the leader');

        // Officers can only kick members; leaders can kick anyone (except themselves).
        if ($membership['role'] === 'officer' && $targetRole === 'officer') {
            throw new AuthorizationException('Officers cannot kick other officers');
        }

        $db->prepare('DELETE FROM guild_members WHERE guild_id = ? AND user_id = ?')
           ->execute([$guildId, $targetUserId]);
        return ['success' => true];
    }

    public static function setRole(int $leaderId, int $targetUserId, string $newRole): array
    {
        if (!in_array($newRole, ['officer', 'member'], true)) {
            throw new ValidationException('Invalid role');
        }
        $membership = self::membershipForUser($leaderId);
        if (!$membership) throw new ValidationException('You are not in a guild');
        $guildId = (int) $membership['guild_id'];
        self::requireRole($guildId, $leaderId, ['leader']);

        if ($targetUserId === $leaderId) throw new ValidationException('Cannot change your own role here');

        $db = Database::getInstance();
        $stmt = $db->prepare('UPDATE guild_members SET role = ? WHERE guild_id = ? AND user_id = ? AND role != "leader"');
        $stmt->execute([$newRole, $guildId, $targetUserId]);
        if ($stmt->rowCount() === 0) throw new NotFoundException('Member not found');
        return ['success' => true];
    }

    public static function dissolve(int $leaderId): array
    {
        $membership = self::membershipForUser($leaderId);
        if (!$membership) throw new ValidationException('You are not in a guild');
        $guildId = (int) $membership['guild_id'];
        self::requireRole($guildId, $leaderId, ['leader']);

        $db = Database::getInstance();
        $db->prepare('DELETE FROM guilds WHERE id = ?')->execute([$guildId]);
        return ['success' => true];
    }

    // ---------------------------------------------------------------
    // Tallies
    // ---------------------------------------------------------------

    public static function listAvailableTallies(int $userId): array
    {
        $membership = self::membershipForUser($userId);
        if (!$membership) return [];
        $guildId = (int) $membership['guild_id'];
        $guild = self::guildById($guildId);
        if (!$guild) return [];

        $level = (int) $guild['current_level'];
        $db = Database::getInstance();

        $weeklyStart  = self::periodStart('weekly');
        $monthlyStart = self::periodStart('monthly');

        // Already-activated variation IDs for this period.
        $stmt = $db->prepare('
            SELECT guild_tally_variation_id, period FROM guild_tallies
            WHERE guild_id = ?
              AND ((period = "weekly" AND period_start = ?) OR (period = "monthly" AND period_start = ?))
        ');
        $stmt->execute([$guildId, $weeklyStart, $monthlyStart]);
        $usedByPeriod = ['weekly' => [], 'monthly' => []];
        foreach ($stmt->fetchAll() as $row) {
            $usedByPeriod[$row['period']][] = (int) $row['guild_tally_variation_id'];
        }

        $stmt = $db->prepare('
            SELECT id, period, name, description, base_hours_per_member, bonus_xp, min_guild_level, sort_order
            FROM guild_tally_variations
            WHERE is_active = 1 AND min_guild_level <= ?
            ORDER BY period, sort_order, id
        ');
        $stmt->execute([$level]);
        $rows = $stmt->fetchAll();

        $out = [];
        foreach ($rows as $r) {
            $vid = (int) $r['id'];
            if (in_array($vid, $usedByPeriod[$r['period']] ?? [], true)) continue;
            $r['base_hours_per_member'] = (float) $r['base_hours_per_member'];
            $r['bonus_xp']              = (int) $r['bonus_xp'];
            $r['min_guild_level']       = (int) $r['min_guild_level'];
            $out[] = $r;
        }
        return $out;
    }

    public static function activateTally(int $userId, int $variationId): array
    {
        $membership = self::membershipForUser($userId);
        if (!$membership) throw new ValidationException('You are not in a guild');
        $guildId = (int) $membership['guild_id'];
        self::requireRole($guildId, $userId, ['leader', 'officer']);

        $memberCount = self::memberCount($guildId);
        if ($memberCount < self::MIN_MEMBERS_FOR_TALLY) {
            throw new ValidationException(sprintf('Need at least %d members to activate a tally', self::MIN_MEMBERS_FOR_TALLY));
        }

        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT * FROM guild_tally_variations WHERE id = ? AND is_active = 1');
        $stmt->execute([$variationId]);
        $gtv = $stmt->fetch();
        if (!$gtv) throw new NotFoundException('Tally variation not found');

        $guild = self::guildById($guildId);
        if ((int) $guild['current_level'] < (int) $gtv['min_guild_level']) {
            throw new ValidationException('Your guild level is too low for this tally');
        }

        $periodStart = self::periodStart($gtv['period']);
        $target      = (float) $gtv['base_hours_per_member'] * $memberCount;

        try {
            $db->prepare('
                INSERT INTO guild_tallies
                    (guild_id, guild_tally_variation_id, period, period_start,
                     target_hours, hours_logged, status, activated_by)
                VALUES (?, ?, ?, ?, ?, 0, "pending", ?)
            ')->execute([$guildId, $variationId, $gtv['period'], $periodStart, $target, $userId]);
        } catch (PDOException $e) {
            throw new ValidationException('Tally already active this period');
        }
        return ['success' => true, 'id' => (int) $db->lastInsertId(), 'target_hours' => $target];
    }

    /**
     * Called from skills.php after the user-XP commit + Quests::onLog.
     * Runs OUTSIDE the main log transaction — failure here must not
     * roll back the user's hour log.
     */
    public static function onLog(int $userId, float $hours): array
    {
        if ($hours <= 0) return ['tallies_completed' => [], 'guild_level_ups' => []];

        $membership = self::membershipForUser($userId);
        if (!$membership) return ['tallies_completed' => [], 'guild_level_ups' => []];
        $guildId = (int) $membership['guild_id'];

        $db = Database::getInstance();

        $weeklyStart  = self::periodStart('weekly');
        $monthlyStart = self::periodStart('monthly');

        $stmt = $db->prepare('
            SELECT gt.id, gt.period, gt.target_hours, gt.hours_logged,
                   gtv.name, gtv.bonus_xp
            FROM guild_tallies gt
            JOIN guild_tally_variations gtv ON gtv.id = gt.guild_tally_variation_id
            WHERE gt.guild_id = ? AND gt.status = "pending"
              AND (
                (gt.period = "weekly"  AND gt.period_start = ?)
             OR (gt.period = "monthly" AND gt.period_start = ?)
              )
        ');
        $stmt->execute([$guildId, $weeklyStart, $monthlyStart]);
        $pending = $stmt->fetchAll();

        $completed = [];
        foreach ($pending as $t) {
            // Increment hours_logged for this tally.
            $upd = $db->prepare('
                UPDATE guild_tallies SET hours_logged = hours_logged + ?
                WHERE id = ? AND status = "pending"
            ');
            $upd->execute([$hours, $t['id']]);
            if ($upd->rowCount() === 0) continue;

            $newLogged = (float) $t['hours_logged'] + $hours;
            if ($newLogged + 1e-9 < (float) $t['target_hours']) continue;

            // Complete + award XP atomically.
            $db->beginTransaction();
            try {
                $u = $db->prepare('
                    UPDATE guild_tallies
                    SET status = "completed", completed_at = NOW(), xp_awarded = ?
                    WHERE id = ? AND status = "pending"
                ');
                $u->execute([(int) $t['bonus_xp'], $t['id']]);
                if ($u->rowCount() === 0) { $db->rollBack(); continue; }

                $sel = $db->prepare('SELECT total_xp, current_level FROM guilds WHERE id = ? FOR UPDATE');
                $sel->execute([$guildId]);
                $g = $sel->fetch();
                $oldXp  = (int) $g['total_xp'];
                $oldLvl = (int) $g['current_level'];
                $newXp  = $oldXp + (int) $t['bonus_xp'];
                $newLvl = self::xpToLevel($newXp);

                $db->prepare('UPDATE guilds SET total_xp = ?, current_level = ? WHERE id = ?')
                   ->execute([$newXp, $newLvl, $guildId]);

                $db->commit();

                $completed[] = [
                    'tally_id' => (int) $t['id'],
                    'name'     => $t['name'],
                    'period'   => $t['period'],
                    'bonus_xp' => (int) $t['bonus_xp'],
                ];

                if ($newLvl > $oldLvl) {
                    return [
                        'tallies_completed' => $completed,
                        'guild_level_ups'   => [[
                            'from'     => $oldLvl,
                            'to'       => $newLvl,
                            'features' => self::unlockedFeatures($newLvl),
                        ]],
                    ];
                }
            } catch (Exception $e) {
                $db->rollBack();
            }
        }

        return ['tallies_completed' => $completed, 'guild_level_ups' => []];
    }

    // ---------------------------------------------------------------
    // Chat (L2) / announcement (L3) / icon (L7)
    // ---------------------------------------------------------------

    public static function postMessage(int $userId, string $body): array
    {
        $body = trim($body);
        if ($body === '') throw new ValidationException('Message cannot be empty');
        if (mb_strlen($body) > self::MESSAGE_MAX_LEN) {
            throw new ValidationException('Message too long (max ' . self::MESSAGE_MAX_LEN . ' chars)');
        }

        $membership = self::membershipForUser($userId);
        if (!$membership) throw new ValidationException('You are not in a guild');
        $guildId = (int) $membership['guild_id'];

        $guild = self::guildById($guildId);
        self::requireFeature($guild, 'chat');

        $db = Database::getInstance();
        $db->prepare('INSERT INTO guild_messages (guild_id, user_id, body) VALUES (?, ?, ?)')
           ->execute([$guildId, $userId, $body]);
        return ['success' => true, 'id' => (int) $db->lastInsertId()];
    }

    public static function listMessages(int $userId, int $limit = 100): array
    {
        $membership = self::membershipForUser($userId);
        if (!$membership) throw new ValidationException('You are not in a guild');
        $guildId = (int) $membership['guild_id'];

        $guild = self::guildById($guildId);
        self::requireFeature($guild, 'chat');

        $limit = max(1, min(200, $limit));
        $db = Database::getInstance();
        $stmt = $db->prepare('
            SELECT gm.id, gm.user_id, gm.body, gm.created_at, c.name AS character_name
            FROM guild_messages gm
            JOIN characters c ON c.user_id = gm.user_id
            WHERE gm.guild_id = ?
            ORDER BY gm.created_at DESC
            LIMIT ' . (int) $limit . '
        ');
        $stmt->execute([$guildId]);
        return array_reverse($stmt->fetchAll());
    }

    public static function setAnnouncement(int $userId, ?string $text): array
    {
        $membership = self::membershipForUser($userId);
        if (!$membership) throw new ValidationException('You are not in a guild');
        $guildId = (int) $membership['guild_id'];
        self::requireRole($guildId, $userId, ['leader', 'officer']);

        $guild = self::guildById($guildId);
        self::requireFeature($guild, 'announcement');

        if ($text !== null) {
            $text = trim($text);
            if ($text === '') $text = null;
            elseif (mb_strlen($text) > self::ANNOUNCEMENT_MAX_LEN) {
                throw new ValidationException('Announcement too long (max ' . self::ANNOUNCEMENT_MAX_LEN . ' chars)');
            }
        }

        Database::getInstance()
            ->prepare('UPDATE guilds SET announcement = ? WHERE id = ?')
            ->execute([$text, $guildId]);
        return ['success' => true];
    }

    public static function setIcon(int $userId, ?string $url): array
    {
        $membership = self::membershipForUser($userId);
        if (!$membership) throw new ValidationException('You are not in a guild');
        $guildId = (int) $membership['guild_id'];
        self::requireRole($guildId, $userId, ['leader', 'officer']);

        $guild = self::guildById($guildId);
        self::requireFeature($guild, 'custom_icon');

        if ($url !== null) {
            $url = trim($url);
            if ($url === '') $url = null;
            elseif (!filter_var($url, FILTER_VALIDATE_URL)) {
                throw new ValidationException('Invalid URL');
            } elseif (strlen($url) > 255) {
                throw new ValidationException('URL too long');
            }
        }

        Database::getInstance()
            ->prepare('UPDATE guilds SET icon_url = ? WHERE id = ?')
            ->execute([$url, $guildId]);
        return ['success' => true];
    }
}
