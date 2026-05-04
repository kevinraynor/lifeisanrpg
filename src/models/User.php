<?php

class User
{
    public static function findById(int $id): ?array
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT id, email, role, is_active, created_at, last_login FROM users WHERE id = ?');
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public static function findByEmail(string $email): ?array
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT * FROM users WHERE email = ?');
        $stmt->execute([$email]);
        return $stmt->fetch() ?: null;
    }

    /**
     * Compute attribute scores for a user from their skill levels.
     *
     * Returns an associative array keyed by attribute_id, with integer scores.
     * All attributes in the system are represented (zero-initialised if the user
     * has no skills contributing to them).
     *
     * This is the single source of truth for the attribute calculation —
     * previously the same O(n²) PHP loop lived in app.php, share.php, and
     * character.php independently. Call this instead of reimplementing the loop.
     *
     * @return array<int, int>  attribute_id → rounded score
     */
    public static function computeAttributeScores(int $userId): array
    {
        $db = Database::getInstance();

        // Initialise every attribute to 0 so even uncontributed attributes appear
        $attrs = $db->query('SELECT id FROM attributes')->fetchAll();
        $scores = [];
        foreach ($attrs as $a) {
            $scores[(int) $a['id']] = 0;
        }

        // SUM(level × ratio) per attribute in a single aggregation query
        $stmt = $db->prepare('
            SELECT sam.attribute_id, SUM(us.current_level * sam.ratio) AS total
            FROM user_skills us
            JOIN skill_attribute_map sam ON sam.skill_id = us.skill_id
            WHERE us.user_id = ?
            GROUP BY sam.attribute_id
        ');
        $stmt->execute([$userId]);
        foreach ($stmt->fetchAll() as $row) {
            $scores[(int) $row['attribute_id']] = (int) round((float) $row['total']);
        }

        return $scores;
    }

    /**
     * Recompute and persist current_level for a user skill from its stored total_xp.
     *
     * This is the single authoritative writer for user_skills.current_level.
     * Always prefer this over inline UPDATE … SET current_level = XP::xpToLevel(…).
     * The three existing callers (activate, log-hours, quest bonus) already compute
     * total_xp and level in the same transaction — they write both atomically, which
     * is equivalent and correct. Use this helper for any NEW code paths that need to
     * touch current_level in isolation (e.g. admin corrections, CLI reseeds).
     *
     * @return int  The newly persisted level (0 if the skill row does not exist).
     */
    public static function recomputeSkillLevel(int $userId, int $skillId): int
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('
            SELECT us.total_xp, s.max_level
            FROM user_skills us
            JOIN skills s ON s.id = us.skill_id
            WHERE us.user_id = ? AND us.skill_id = ?
        ');
        $stmt->execute([$userId, $skillId]);
        $row = $stmt->fetch();
        if (!$row) return 0;

        $level = XP::xpToLevel((int) $row['total_xp'], (int) $row['max_level']);
        $db->prepare('UPDATE user_skills SET current_level = ? WHERE user_id = ? AND skill_id = ?')
           ->execute([$level, $userId, $skillId]);
        return $level;
    }
}
